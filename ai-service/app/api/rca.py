from fastapi import APIRouter

from app.models.rca import RCARequest, RCAResponse
from app.services.rca_service import rca_service


router = APIRouter(
    prefix="/v1/rca",
    tags=["rca"],
)


@router.post(
    "/investigate",
    response_model=RCAResponse,
)
def investigate_root_cause(
    request: RCARequest,
) -> RCAResponse:
    """
    Run the LangGraph root-cause investigation.
    """
    return rca_service.investigate(request)