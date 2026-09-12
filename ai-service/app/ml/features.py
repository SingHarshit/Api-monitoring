from __future__ import annotations

from math import sin, cos, pi
from statistics import mean, median, pstdev
from typing import Any, Sequence

from app.models.anomaly import MonitorCheckData, MonitoringPayload


def _percentile(values: Sequence[int], percentile: float) -> float | None:
    if not values:
        return None

    ordered = sorted(values)

    if len(ordered) == 1:
        return float(ordered[0])

    position = (len(ordered) - 1) * percentile
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)
    weight = position - lower_index

    return ordered[lower_index] + (
        ordered[upper_index] - ordered[lower_index]
    ) * weight


def _safe_ratio(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0

    return numerator / denominator


def _time_features(timestamp) -> dict[str, float | int]:
    hour = timestamp.hour + timestamp.minute / 60

    return {
        "hour_of_day": hour,
        "hour_sin": sin(2 * pi * hour / 24),
        "hour_cos": cos(2 * pi * hour / 24),
        "day_of_week": timestamp.weekday(),
    }


def _check_features(check: MonitorCheckData) -> dict[str, Any]:
    latency_ms = check.latency_ms or 0

    return {
        "check_id": check.id,
        "status": check.status,
        "latency_ms": latency_ms,
        "http_status_code": check.http_status_code,
        "is_success": int(check.status == "SUCCESS"),
        "is_failed": int(check.status == "FAILED"),
        "is_timeout": int(check.status == "TIMEOUT"),
        "has_error": int(bool(check.error_message)),
        **_time_features(check.checked_at),
    }


def build_features(payload: MonitoringPayload) -> dict[str, Any]:
    """
    Convert monitoring data into features for anomaly detection.

    This function only performs feature engineering. It does not decide
    whether a monitor is anomalous.
    """

    checks = sorted(
        payload.checks,
        key=lambda check: check.checked_at,
    )

    latency_values = [
        check.latency_ms
        for check in checks
        if check.latency_ms is not None
    ]

    successful_checks = sum(
        check.status == "SUCCESS"
        for check in checks
    )
    failed_checks = sum(
        check.status == "FAILED"
        for check in checks
    )
    timeout_checks = sum(
        check.status == "TIMEOUT"
        for check in checks
    )

    total_checks = len(checks)
    failure_count = failed_checks + timeout_checks

    # Exclude the latest observation from the baseline so the current
    # event does not influence its own comparison.
    baseline_latencies = latency_values[:-1] if len(latency_values) > 1 else []

    latest_check = checks[-1] if checks else None
    latest_latency = (
        latest_check.latency_ms
        if latest_check and latest_check.latency_ms is not None
        else None
    )

    baseline_median = (
        median(baseline_latencies)
        if baseline_latencies
        else None
    )

    latency_deviation_ratio = None
    if latest_latency is not None and baseline_median and baseline_median > 0:
        latency_deviation_ratio = latest_latency / baseline_median

    timeout_rate = _safe_ratio(timeout_checks, total_checks)

    latency_std_ms = (
        pstdev(latency_values)
        if len(latency_values) > 1
        else 0.0
    )

    features: dict[str, Any] = {
        "monitor_id": payload.monitor_id,
        "monitor_name": payload.monitor.name,
        "monitor_method": payload.monitor.method,
        "timeout_ms": payload.monitor.timeout_ms,
        "window_hours": payload.analysis_window.hours,
        "total_checks": total_checks,
        "successful_checks": successful_checks,
        "failed_checks": failed_checks,
        "timeout_checks": timeout_checks,
        "failure_count": failure_count,
        "success_rate": _safe_ratio(successful_checks, total_checks),
        "error_rate": _safe_ratio(failure_count, total_checks),
        "latency_sample_count": len(latency_values),
        "latency_mean_ms": (
            mean(latency_values)
            if latency_values
            else None
        ),
        "latency_median_ms": (
            median(latency_values)
            if latency_values
            else None
        ),
        "latency_min_ms": min(latency_values) if latency_values else None,
        "latency_max_ms": max(latency_values) if latency_values else None,
        "latency_p95_ms": _percentile(latency_values, 0.95),
        "baseline_latency_median_ms": baseline_median,
        "latest_latency_ms": latest_latency,
        "latest_status": (
            latest_check.status
            if latest_check
            else None
        ),
        "latency_deviation_ratio": latency_deviation_ratio,
        "checks": [
            _check_features(check)
            for check in checks
        ],
    }

    if latest_check:
        features["latest_check"] = _check_features(latest_check)
    else:
        features["latest_check"] = None

    return features