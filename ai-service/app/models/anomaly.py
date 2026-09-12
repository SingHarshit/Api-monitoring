from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr


CheckStatus = Literal["SUCCESS", "FAILED", "TIMEOUT"]
IncidentStatus = Literal["OPEN", "ACKNOWLEDGED", "RESOLVED"]
MonitorMethod = Literal[
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=False,
    )


class MonitorData(StrictModel):
    name: StrictStr = Field(min_length=1)
    url: StrictStr = Field(min_length=1)
    method: MonitorMethod
    timeout_ms: StrictInt = Field(ge=1)


class AnalysisWindow(StrictModel):
    from_time: datetime = Field(alias="from")
    to: datetime
    hours: StrictInt = Field(ge=1, le=720)


class MonitorCheckData(StrictModel):
    id: StrictStr = Field(min_length=1)
    checked_at: datetime = Field(alias="checkedAt")
    status: CheckStatus
    latency_ms: StrictInt | None = Field(default=None, alias="latencyMs", ge=0)
    http_status_code: StrictInt | None = Field(
        default=None,
        alias="httpStatusCode",
        ge=100,
        le=599,
    )
    response_time_ms: StrictInt | None = Field(
        default=None,
        alias="responseTimeMs",
        ge=0,
    )
    error_message: StrictStr | None = Field(
        default=None,
        alias="errorMessage",
    )
    region: StrictStr | None = None


class IncidentData(StrictModel):
    id: StrictStr = Field(min_length=1)
    status: IncidentStatus
    title: StrictStr = Field(min_length=1)
    reason: StrictStr | None = None
    started_at: datetime = Field(alias="startedAt")
    resolved_at: datetime | None = Field(default=None, alias="resolvedAt")


class MonitoringPayload(StrictModel):
    monitor_id: StrictStr = Field(
        alias="monitor_id",
        min_length=1,
    )
    analysis_window: AnalysisWindow
    monitor: MonitorData
    checks: list[MonitorCheckData]
    incidents: list[IncidentData]


class AnomalyAnalysisRequest(StrictModel):
    monitor_id: StrictStr = Field(
        alias="monitorId",
        min_length=1,
    )
    check_id: StrictStr = Field(
        alias="checkId",
        min_length=1,
    )
    window_hours: StrictInt = Field(
        alias="windowHours",
        ge=1,
        le=720,
    )
    triggered_at: datetime = Field(alias="triggeredAt")
    payload: MonitoringPayload