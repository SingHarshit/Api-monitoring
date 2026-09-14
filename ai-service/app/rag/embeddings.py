from collections.abc import Sequence

import numpy as np
from sentence_transformers import SentenceTransformer


DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


class EmbeddingModel:
    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
    ) -> None:
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

        dimension = self.model.get_sentence_embedding_dimension()

        if dimension != EMBEDDING_DIMENSION:
            raise ValueError(
                f"Expected {EMBEDDING_DIMENSION}-dimensional embeddings, "
                f"but model produces {dimension}"
            )

    def embed_text(self, text: str) -> list[float]:
        embeddings = self.embed_texts([text])
        return embeddings[0]

    def embed_texts(
        self,
        texts: Sequence[str],
        batch_size: int = 32,
    ) -> list[list[float]]:
        if not texts:
            return []

        embeddings = self.model.encode(
            list(texts),
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

        if not isinstance(embeddings, np.ndarray):
            embeddings = np.asarray(embeddings)

        if embeddings.ndim != 2:
            raise ValueError("Embedding output must be a 2D array")

        if embeddings.shape[1] != EMBEDDING_DIMENSION:
            raise ValueError(
                f"Expected embeddings with {EMBEDDING_DIMENSION} dimensions"
            )

        return embeddings.astype(float).tolist()


_embedding_model: EmbeddingModel | None = None


def get_embedding_model() -> EmbeddingModel:
    global _embedding_model

    if _embedding_model is None:
        _embedding_model = EmbeddingModel()

    return _embedding_model