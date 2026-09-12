from fastapi import APIRouter

from app.models.anomaly import AnomalyAnalysisRequest
from app.services.anomaly_service import anomaly_service

router = APIRouter(
    prefix="/v1/analyze",
    tags=["anomaly"],
)


@router.post("/monitor")
async def analyze_monitor(request: AnomalyAnalysisRequest):
    """Validate and run the monitoring anomaly analysis pipeline."""
    return anomaly_service.analyze(request)