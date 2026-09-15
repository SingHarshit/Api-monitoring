from __future__ import annotations

from typing import Any

from app.rag.embeddings import get_embedding_model
from app.rag.vector_store import search_similar_chunks


def search_runbooks(
    query: str,
    service: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """
    Search runbook knowledge chunks using vector similarity.
    """
    if not query or not query.strip():
        raise ValueError("query is required")

    if limit < 1 or limit > 20:
        raise ValueError("limit must be between 1 and 20")

    embedding_model = get_embedding_model()
    query_embedding = embedding_model.embed_text(query.strip())

    rows = search_similar_chunks(
        query_embedding=query_embedding,
        limit=limit,
        service=service,
        document_type="runbook",
    )

    results = [
        {
            "id": int(row["id"]),
            "document": row["document"],
            "service": row["service"],
            "document_type": row["document_type"],
            "chunk_index": int(row["chunk_index"]),
            "content": row["content"],
            "embedding_model": row["embedding_model"],
            "similarity": float(row["similarity"]),
        }
        for row in rows
    ]

    return {
        "query": query,
        "service": service,
        "count": len(results),
        "results": results,
    }