from fastapi import APIRouter

from app.models.rag import RAGRequest, RAGResponse
from app.services.rag_service import rag_service


router = APIRouter(
    prefix="/v1/rag",
    tags=["rag"],
)


@router.post("/search", response_model=RAGResponse)
def search_knowledge(request: RAGRequest) -> RAGResponse:
    return rag_service.search(request)