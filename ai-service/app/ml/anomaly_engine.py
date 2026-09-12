from __future__ import annotations

from statistics import median
from typing import Any, Mapping, Sequence

from app.ml.features import build_features
from app.ml.models import IsolationForestModel
from app.models.anomaly import MonitorCheckData, MonitoringPayload


class AnomalyEngine:
    """Combine statistical signals with an optional ML signal."""

    MIN_HISTORY = 30
    MIN_ISOLATION_HISTORY = 10
    LATENCY_WEIGHT = 0.45
    ERROR_WEIGHT = 0.30
    TIMEOUT_WEIGHT = 0.15
    FAILURE_WEIGHT = 0.10
    ANOMALY_THRESHOLD = 0.60
    HIGH_THRESHOLD = 0.80
    CRITICAL_THRESHOLD = 0.90
    BASELINE_CHECK_COUNT = 20

    def __init__(self, min_history: int = MIN_HISTORY) -> None:
        if min_history < 2:
            raise ValueError("min_history must be at least 2")

        self.min_history = min_history

    @staticmethod
    def calculate_median(values: list[float]) -> float:
        return float(median(values)) if values else 0.0

    @staticmethod
    def calculate_mad(values: list[float], center: float) -> float:
        if not values:
            return 0.0

        return float(median([abs(value - center) for value in values]))

    @staticmethod
    def robust_z_score(current: float, center: float, mad: float) -> float:
        if mad > 0:
            return 0.6745 * (current - center) / mad

        if current == center:
            return 0.0

        return 10.0 if current > center else -10.0

    def analyze_latency(
        self,
        checks: Sequence[MonitorCheckData],
    ) -> dict[str, Any]:
        latency_checks = [
            check
            for check in sorted(checks, key=lambda item: item.checked_at)
            if check.latency_ms is not None
        ]

        if not latency_checks:
            return {
                "isAnomaly": False,
                "score": 0.0,
                "current": None,
                "baseline": None,
                "mad": None,
                "robustZScore": None,
                "deviationRatio": None,
            }

        current = float(latency_checks[-1].latency_ms)
        history = [float(check.latency_ms) for check in latency_checks[:-1]]

        if not history:
            return {
                "isAnomaly": False,
                "score": 0.0,
                "current": current,
                "baseline": current,
                "mad": 0.0,
                "robustZScore": 0.0,
                "deviationRatio": 1.0,
            }

        baseline = self.calculate_median(history)
        mad = self.calculate_mad(history, baseline)
        robust_z = self.robust_z_score(current, baseline, mad)
        deviation_ratio = current / baseline if baseline > 0 else (
            1.0 if current == 0 else 10.0
        )

        score = min(abs(robust_z) / 10.0, 1.0)
        if current <= baseline:
            score *= 0.25

        return {
            "isAnomaly": current > baseline and score >= 0.60,
            "score": round(score, 4),
            "current": round(current, 2),
            "baseline": round(baseline, 2),
            "mad": round(mad, 2),
            "robustZScore": round(robust_z, 4),
            "deviationRatio": round(deviation_ratio, 4),
        }

    @staticmethod
    def _is_error(check: MonitorCheckData) -> bool:
        return check.status == "FAILED" or (
            check.http_status_code is not None
            and check.http_status_code >= 500
        )

    @staticmethod
    def _is_timeout(check: MonitorCheckData) -> bool:
        return check.status == "TIMEOUT"

    def analyze_error_rate(
        self,
        checks: Sequence[MonitorCheckData],
    ) -> dict[str, Any]:
        if len(checks) < 2:
            return {
                "isAnomaly": False,
                "score": 0.0,
                "current": 0.0,
                "baseline": 0.0,
            }

        historical = checks[:-1]
        current_error = float(self._is_error(checks[-1]))
        baseline_rate = sum(self._is_error(check) for check in historical) / len(historical)
        score = 0.0

        if current_error:
            score = 1.0 if baseline_rate == 0 else min((1.0 / baseline_rate) / 10.0, 1.0)

        return {
            "isAnomaly": score >= 0.60,
            "score": round(score, 4),
            "current": current_error,
            "baseline": round(baseline_rate, 4),
        }

    def analyze_timeout(
        self,
        checks: Sequence[MonitorCheckData],
    ) -> dict[str, Any]:
        if len(checks) < 2:
            return {
                "isAnomaly": False,
                "score": 0.0,
                "current": 0.0,
                "baseline": 0.0,
            }

        historical = checks[:-1]
        current_timeout = float(self._is_timeout(checks[-1]))
        baseline_rate = sum(self._is_timeout(check) for check in historical) / len(historical)
        score = 0.0

        if current_timeout:
            score = 1.0 if baseline_rate == 0 else min((1.0 / baseline_rate) / 10.0, 1.0)

        return {
            "isAnomaly": score >= 0.60,
            "score": round(score, 4),
            "current": current_timeout,
            "baseline": round(baseline_rate, 4),
        }

    def calculate_composite_score(
        self,
        latency_score: float,
        error_score: float,
        timeout_score: float,
        failure_score: float,
    ) -> float:
        score = (
            self.LATENCY_WEIGHT * latency_score
            + self.ERROR_WEIGHT * error_score
            + self.TIMEOUT_WEIGHT * timeout_score
            + self.FAILURE_WEIGHT * failure_score
        )
        return round(min(max(score, 0.0), 1.0), 4)

    def determine_severity(self, score: float) -> str:
        if score >= self.CRITICAL_THRESHOLD:
            return "CRITICAL"
        if score >= self.HIGH_THRESHOLD:
            return "HIGH"
        if score >= self.ANOMALY_THRESHOLD:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def _isolation_features(features: Mapping[str, Any]) -> dict[str, Any]:
        return {
            "latency_mean_ms": features.get("latency_mean_ms"),
            "latency_median_ms": features.get("latency_median_ms"),
            "latency_p95_ms": features.get("latency_p95_ms"),
            "error_rate": features.get("error_rate"),
            "latest_latency_ms": features.get("latest_latency_ms"),
            "latency_deviation_ratio": features.get("latency_deviation_ratio"),
        }

    def _run_isolation_forest(
        self,
        current_payload: MonitoringPayload,
        historical_features: Sequence[Mapping[str, Any]] | None,
    ) -> dict[str, Any] | None:
        if (
            not historical_features
            or len(historical_features) < self.MIN_ISOLATION_HISTORY
        ):
            return None

        current_features = build_features(current_payload)
        feature_names = tuple(self._isolation_features(current_features))
        model = IsolationForestModel(
            feature_names=feature_names,
            min_training_observations=self.MIN_ISOLATION_HISTORY,
        )
        result = model.fit_predict(
            [self._isolation_features(row) for row in historical_features],
            self._isolation_features(current_features),
        )

        return {
            "isAnomaly": result.is_anomaly,
            "anomalyScore": result.anomaly_score,
            "decisionScore": result.decision_score,
            "trainingObservations": result.training_observations,
        }

    def analyze(
        self,
        payload: MonitoringPayload,
        historical_features: Sequence[Mapping[str, Any]] | None = None,
    ) -> dict[str, Any]:
        checks = sorted(payload.checks, key=lambda item: item.checked_at)
        sample_count = len(checks)

        if sample_count < self.min_history:
            return {
                "isAnomaly": False,
                "score": 0.0,
                "severity": "INSUFFICIENT_DATA",
                "sampleCount": sample_count,
                "minimumRequired": self.min_history,
                "signals": [],
                "message": "Not enough historical checks to establish a reliable baseline.",
            }

        latency_result = self.analyze_latency(checks)
        error_result = self.analyze_error_rate(checks)
        timeout_result = self.analyze_timeout(checks)
        composite_score = self.calculate_composite_score(
            latency_result["score"],
            error_result["score"],
            timeout_result["score"],
            error_result["score"],
        )

        isolation_result = self._run_isolation_forest(
            payload,
            historical_features,
        )
        strongest_rule_score = max(
            latency_result["score"],
            error_result["score"],
            timeout_result["score"],
        )
        effective_score = max(composite_score, strongest_rule_score)
        is_anomaly = effective_score >= self.ANOMALY_THRESHOLD or bool(
            isolation_result and isolation_result["isAnomaly"]
        )

        signals = []
        for signal_type, result, message in (
            ("LATENCY", latency_result, "Latency is significantly above the historical baseline."),
            ("ERROR_RATE", error_result, "The current check failed while historical failures were rare."),
            ("TIMEOUT", timeout_result, "A timeout occurred despite a low historical timeout rate."),
        ):
            if result["isAnomaly"]:
                signals.append({
                    "type": signal_type,
                    "severity": "HIGH",
                    "message": message,
                    "details": result,
                })

        if isolation_result and isolation_result["isAnomaly"]:
            signals.append({
                "type": "ISOLATION_FOREST",
                "severity": "HIGH",
                "message": "The current feature window differs from historical windows.",
                "details": isolation_result,
            })

        return {
            "isAnomaly": is_anomaly,
            "score": effective_score,
            "compositeScore": composite_score,
            "severity": self.determine_severity(effective_score) if is_anomaly else "NORMAL",
            "sampleCount": sample_count,
            "baseline": {
                "latency": latency_result["baseline"],
                "errorRate": error_result["baseline"],
                "timeoutRate": timeout_result["baseline"],
            },
            "current": {
                "latency": latency_result["current"],
                "errorRate": error_result["current"],
                "timeout": timeout_result["current"],
            },
            "signals": signals,
            "isolationForest": isolation_result,
        }
