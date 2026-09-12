from __future__ import annotations

from typing import Any, Mapping, Sequence

from app.ml.features import build_features
from app.ml.anomaly_engine import AnomalyEngine
from app.models.anomaly import AnomalyAnalysisRequest, MonitoringPayload


class AnomalyService:
    """
    Thin service layer for anomaly analysis.

    It coordinates the validated request and anomaly engine.
    Detection logic belongs to AnomalyEngine.
    """

    def __init__(self, engine: AnomalyEngine | None = None) -> None:
        self.engine = engine or AnomalyEngine()

    @staticmethod
    def _build_historical_features(
        payload: MonitoringPayload,
        minimum_observations: int,
    ) -> list[Mapping[str, Any]]:
        """
        Build training rows from earlier check windows.

        The latest check remains the current observation and is never used
        to train Isolation Forest.
        """
        checks = sorted(
            payload.checks,
            key=lambda check: check.checked_at,
        )

        if len(checks) <= minimum_observations:
            return []

        historical_features = []

        for end_index in range(2, len(checks)):
            historical_payload = payload.model_copy(
                update={"checks": checks[:end_index]},
            )
            historical_features.append(
                build_features(historical_payload),
            )

        return historical_features

    def analyze(
        self,
        request: AnomalyAnalysisRequest,
        historical_features: Sequence[Mapping[str, Any]] | None = None,
    ) -> dict[str, Any]:
        if historical_features is None:
            historical_features = self._build_historical_features(
                request.payload,
                self.engine.MIN_ISOLATION_HISTORY,
            )

        result = self.engine.analyze(
            payload=request.payload,
            historical_features=historical_features,
        )

        return {
            "success": True,
            "monitorId": request.monitor_id,
            "checkId": request.check_id,
            "windowHours": request.window_hours,
            "triggeredAt": request.triggered_at.isoformat(),
            "analysis": result,
        }


anomaly_service = AnomalyService()