import argparse
import logging
from pathlib import Path

from app.rag.ingestion import ingest_knowledge


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

logger = logging.getLogger(__name__)


def default_knowledge_root() -> Path:
    # ingest_knowledge.py -> services -> app -> ai-service
    ai_service_root = Path(__file__).resolve().parents[2]
    return ai_service_root.parent / "knowledge"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Load Markdown knowledge documents into pgvector."
    )

    parser.add_argument(
        "--knowledge-root",
        type=Path,
        default=default_knowledge_root(),
        help="Path to the knowledge directory.",
    )

    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Maximum chunk size in characters.",
    )

    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=150,
        help="Number of overlapping characters between chunks.",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logger.info(
        "Starting knowledge ingestion from %s",
        args.knowledge_root,
    )

    result = ingest_knowledge(
        knowledge_root=args.knowledge_root,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )

    logger.info(
        "Ingestion complete: documents=%d chunks=%d stored=%d",
        result.documents_loaded,
        result.chunks_created,
        result.chunks_stored,
    )


if __name__ == "__main__":
    main()