from dataclasses import dataclass
from typing import Any

from app.rag.loader import LoadedDocument
import re


@dataclass(frozen=True)
class DocumentChunk:
    document: str
    chunk_index: int
    content: str
    metadata: dict[str, Any]


def _split_text(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be >= 0 and smaller than chunk_size"
        )

    sections = re.split(r"(?=^##\s+)", text, flags=re.MULTILINE)

    chunks: list[str] = []

    for section in sections:
        section = section.strip()

        if not section:
            continue

        if len(section) <= chunk_size:
            chunks.append(section)
            continue

        start = 0
        step = chunk_size - chunk_overlap

        while start < len(section):
            end = start + chunk_size
            chunk = section[start:end].strip()

            if chunk:
                chunks.append(chunk)

            start += step

    return chunks


def chunk_document(
    document: LoadedDocument,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> list[DocumentChunk]:
    text_chunks = _split_text(
        text=document.content,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    return [
        DocumentChunk(
            document=document.document,
            chunk_index=index,
            content=content,
            metadata={
                **document.metadata,
                "chunk_index": index,
            },
        )
        for index, content in enumerate(text_chunks)
    ]


def chunk_documents(
    documents: list[LoadedDocument],
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []

    for document in documents:
        chunks.extend(
            chunk_document(
                document=document,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
        )

    return chunks