from typing import Any

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr


class RAGRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: StrictStr = Field(
        min_length=1,
        max_length=2000,
    )
    limit: StrictInt = Field(
        default=5,
        ge=1,
        le=20,
    )
    service: StrictStr | None = Field(
        default=None,
        min_length=1,
    )
    document_type: StrictStr | None = Field(
        default=None,
        min_length=1,
    )


class RAGChunk(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    document: StrictStr
    service: StrictStr | None
    document_type: StrictStr
    chunk_index: int
    content: StrictStr
    embedding_model: StrictStr
    similarity: float


class RAGResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: StrictStr
    results: list[RAGChunk]
    count: int