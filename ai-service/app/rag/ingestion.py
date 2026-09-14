from dataclasses import dataclass
from pathlib import Path

from app.rag.chunker import chunk_documents
from app.rag.embeddings import EmbeddingModel, get_embedding_model
from app.rag.loader import load_documents
from app.rag.vector_store import upsert_chunks


@dataclass(frozen=True)
class IngestionResult:
    documents_loaded: int
    chunks_created: int
    chunks_stored: int


def ingest_knowledge(
    knowledge_root: str | Path,
    embedding_model: EmbeddingModel | None = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> IngestionResult:
    documents = load_documents(knowledge_root)

    chunks = chunk_documents(
        documents=documents,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    if not chunks:
        return IngestionResult(
            documents_loaded=len(documents),
            chunks_created=0,
            chunks_stored=0,
        )

    model = embedding_model or get_embedding_model()

    embeddings = model.embed_texts(
        [chunk.content for chunk in chunks]
    )

    chunks_stored = upsert_chunks(
        chunks=chunks,
        embeddings=embeddings,
    )

    return IngestionResult(
        documents_loaded=len(documents),
        chunks_created=len(chunks),
        chunks_stored=chunks_stored,
    )