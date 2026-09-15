from __future__ import annotations

from typing import Any

from app.agents.graph import rca_graph
from app.models.rca import (
    RCAEvidence,
    RCAHypothesis,
    RCARequest,
    RCAResponse,
    RCAValidation,
    FinalRCA,
)


class RCAService:
    """
    Service layer for running the LangGraph RCA investigation.
    """

    def investigate(self, request: RCARequest) -> RCAResponse:
        graph_input = {
            "incident_id": request.incident_id,
            "monitor_id": request.monitor_id,
            "check_id": request.check_id,
            "triggered_at": request.triggered_at.isoformat(),
            "window_hours": request.window_hours,
            "max_iterations": request.max_iterations,
            "initial_signals": request.initial_signals,
            "hypotheses": [],
            "evidence": [],
            "tool_calls": [],
            "errors": [],
        }

        result: dict[str, Any] = rca_graph.invoke(graph_input)

        final_rca = result.get("final_rca")

        if not final_rca:
            raise RuntimeError(
                "RCA graph completed without producing a final RCA"
            )

        hypotheses = [
            RCAHypothesis.model_validate(hypothesis)
            for hypothesis in result.get("hypotheses", [])
        ]

        evidence = [
            RCAEvidence.model_validate(item)
            for item in result.get("evidence", [])
        ]

        validation_data = result.get("validation")
        validation = (
            RCAValidation.model_validate(validation_data)
            if validation_data
            else None
        )

        validated_final_rca = FinalRCA.model_validate(final_rca)

        return RCAResponse(
            success=True,
            incident_id=request.incident_id,
            monitor_id=request.monitor_id,
            check_id=request.check_id,
            iterations=result.get("iteration", 0),
            hypotheses=hypotheses,
            evidence=evidence,
            validation=validation,
            final_rca=validated_final_rca,
            errors=result.get("errors", []),
        )


rca_service = RCAService()