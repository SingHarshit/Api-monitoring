from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr


IncidentStatus = Literal[
    "OPEN",
    "ACKNOWLEDGED",
    "RESOLVED",
]


class RCARequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=False,
    )

    incident_id: StrictStr = Field(
        alias="incidentId",
        min_length=1,
    )

    monitor_id: StrictStr = Field(
        alias="monitorId",
        min_length=1,
    )

    check_id: StrictStr | None = Field(
        default=None,
        alias="checkId",
        min_length=1,
    )

    triggered_at: datetime = Field(
        alias="triggeredAt",
    )

    window_hours: StrictInt = Field(
        default=1,
        alias="windowHours",
        ge=1,
        le=720,
    )

    max_iterations: StrictInt = Field(
        default=3,
        alias="maxIterations",
        ge=1,
        le=10,
    )

    initial_signals: list[dict[str, Any]] = Field(
        default_factory=list,
        alias="initialSignals",
    )


class RCAHypothesis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: StrictStr
    description: StrictStr
    confidence: float = Field(ge=0, le=1)
    supporting_evidence: list[StrictStr] = Field(
        default_factory=list,
    )
    contradicting_evidence: list[StrictStr] = Field(
        default_factory=list,
    )


class RCAEvidence(BaseModel):
    model_config = ConfigDict(extra="allow")

    source: StrictStr
    tool: StrictStr
    summary: StrictStr
    data: dict[str, Any] = Field(default_factory=dict)
    relevance: float = Field(default=0, ge=0, le=1)
    collected_at: datetime | None = None


class RCAValidation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sufficient: bool
    confidence: float = Field(ge=0, le=1)
    explanation: StrictStr
    missing_evidence: list[StrictStr] = Field(
        default_factory=list,
    )


class FinalRCA(BaseModel):
    model_config = ConfigDict(extra="forbid")

    root_cause: StrictStr
    explanation: StrictStr
    confidence: float = Field(ge=0, le=1)
    supporting_evidence: list[StrictStr] = Field(
        default_factory=list,
    )
    alternative_hypotheses: list[StrictStr] = Field(
        default_factory=list,
    )
    recommended_actions: list[StrictStr] = Field(
        default_factory=list,
    )


class RCAResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    success: bool
    incident_id: StrictStr
    monitor_id: StrictStr
    check_id: StrictStr | None
    iterations: StrictInt
    hypotheses: list[RCAHypothesis]
    evidence: list[RCAEvidence]
    validation: RCAValidation | None
    final_rca: FinalRCA
    errors: list[StrictStr] = Field(default_factory=list)


class RCAReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    incident_id: StrictStr = Field(
        min_length=1,
        alias="incidentId",
    )
    root_cause: StrictStr = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    evidence: list[StrictStr] = Field(default_factory=list)
    affected_apis: list[StrictStr] = Field(default_factory=list)
    recommended_actions: list[StrictStr] = Field(
        default_factory=list,
    )