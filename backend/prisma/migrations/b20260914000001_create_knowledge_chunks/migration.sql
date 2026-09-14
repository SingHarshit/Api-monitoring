CREATE TABLE "knowledge_chunks" (
    "id" BIGSERIAL PRIMARY KEY,
    "document" TEXT NOT NULL,
    "service" TEXT,
    "document_type" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,
    "embedding_model" TEXT NOT NULL,
    "content_hash" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_document_chunk_unique"
        UNIQUE ("document", "chunk_index")
);

CREATE INDEX "knowledge_chunks_document_idx"
    ON "knowledge_chunks" ("document");

CREATE INDEX "knowledge_chunks_service_idx"
    ON "knowledge_chunks" ("service");

CREATE INDEX "knowledge_chunks_type_idx"
    ON "knowledge_chunks" ("document_type");

CREATE INDEX "knowledge_chunks_embedding_idx"
    ON "knowledge_chunks"
    USING hnsw ("embedding" vector_cosine_ops);