from __future__ import annotations

from typing import Any, Mapping, Sequence

from app.ml.features import build_features
from app.ml.anomaly_engine import AnomalyEngine
from app.models.anomaly import AnomalyAnalysisRequest, MonitoringPayload


WINDOW_SIZE = 10
WINDOW_STEP = 5

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

        for start_index in range(
            0,
            len(checks) - WINDOW_SIZE,
            WINDOW_STEP,
        ):
            end_index = start_index + WINDOW_SIZE

            window_checks = checks[start_index:end_index]

            historical_payload = payload.model_copy(
                update={"checks": window_checks},
            )

            historical_features.append(
                build_features(historical_payload)
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

