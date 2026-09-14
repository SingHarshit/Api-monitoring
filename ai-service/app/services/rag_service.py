from app.models.rag import RAGChunk, RAGRequest, RAGResponse
from app.rag.embeddings import get_embedding_model
from app.rag.vector_store import search_similar_chunks


class RAGService:
    def __init__(self) -> None:
        self.embedding_model = get_embedding_model()

    def search(self, request: RAGRequest) -> RAGResponse:
        query_embedding = self.embedding_model.embed_text(
            request.query
        )

        rows = search_similar_chunks(
            query_embedding=query_embedding,
            limit=request.limit,
            service=request.service,
            document_type=request.document_type,
        )

        results = [
            RAGChunk(
                id=int(row["id"]),
                document=row["document"],
                service=row["service"],
                document_type=row["document_type"],
                chunk_index=int(row["chunk_index"]),
                content=row["content"],
                embedding_model=row["embedding_model"],
                similarity=float(row["similarity"]),
            )
            for row in rows
        ]

        return RAGResponse(
            query=request.query,
            results=results,
            count=len(results),
        )


rag_service = RAGService()