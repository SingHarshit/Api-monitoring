import hashlib
import os
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg import sql
from psycopg.rows import dict_row

from app.rag.chunker import DocumentChunk


load_dotenv()

EMBEDDING_DIMENSION = 384
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


@dataclass(frozen=True)
class StoredChunk:
    document: str
    service: str | None
    document_type: str
    chunk_index: int
    content: str
    embedding: list[float]


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    return database_url


def _vector_literal(embedding: Sequence[float]) -> str:
    if len(embedding) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION} values, "
            f"received {len(embedding)}"
        )

    values: list[str] = []

    for value in embedding:
        numeric_value = float(value)

        if not (-float("inf") < numeric_value < float("inf")):
            raise ValueError("Embedding contains a non-finite value")

        values.append(repr(numeric_value))

    return f"[{','.join(values)}]"


def _content_hash(content: str) -> str:
    return hashlib.sha256(
        content.encode("utf-8")
    ).hexdigest()


def _chunk_to_row(
    chunk: DocumentChunk,
    embedding: Sequence[float],
) -> tuple[Any, ...]:
    metadata = chunk.metadata

    return (
        chunk.document,
        metadata.get("service"),
        metadata.get("type", "unknown"),
        chunk.chunk_index,
        chunk.content,
        _vector_literal(embedding),
        EMBEDDING_MODEL,
        _content_hash(chunk.content),
    )


def upsert_chunks(
    chunks: Sequence[DocumentChunk],
    embeddings: Sequence[Sequence[float]],
) -> int:
    if len(chunks) != len(embeddings):
        raise ValueError(
            "The number of chunks must match the number of embeddings"
        )

    if not chunks:
        return 0

    rows = [
        _chunk_to_row(chunk, embedding)
        for chunk, embedding in zip(chunks, embeddings)
    ]

    query = """
        INSERT INTO knowledge_chunks (
            document,
            service,
            document_type,
            chunk_index,
            content,
            embedding,
            embedding_model,
            content_hash
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s::vector,
            %s,
            %s
        )
        ON CONFLICT (document, chunk_index)
        DO UPDATE SET
            service = EXCLUDED.service,
            document_type = EXCLUDED.document_type,
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            embedding_model = EXCLUDED.embedding_model,
            content_hash = EXCLUDED.content_hash
    """

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.executemany(query, rows)

    return len(rows)


def search_similar_chunks(
    query_embedding: Sequence[float],
    limit: int = 5,
    service: str | None = None,
    document_type: str | None = None,
) -> list[dict[str, Any]]:
    if limit < 1:
        raise ValueError("limit must be greater than zero")

    vector = _vector_literal(query_embedding)

    conditions = [
        sql.SQL("embedding IS NOT NULL"),
    ]

    parameters: list[Any] = [vector]

    if service is not None:
        conditions.append(sql.SQL("service = %s"))
        parameters.append(service)

    if document_type is not None:
        conditions.append(sql.SQL("document_type = %s"))
        parameters.append(document_type)

    parameters.extend([vector, limit])

    query = sql.SQL(
        """
        SELECT
            id,
            document,
            service,
            document_type,
            chunk_index,
            content,
            embedding_model,
            1 - (embedding <=> %s::vector) AS similarity
        FROM knowledge_chunks
        WHERE {conditions}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
        """
    ).format(
        conditions=sql.SQL(" AND ").join(conditions),
    )

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, parameters)
            return list(cursor.fetchall())


def delete_document(document: str) -> int:
    query = """
        DELETE FROM knowledge_chunks
        WHERE document = %s
    """

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (document,))
            return cursor.rowcount