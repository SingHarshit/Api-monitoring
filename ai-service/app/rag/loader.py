from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class LoadedDocument:
    document: str
    content: str
    metadata: dict[str, Any]


def _parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text.strip()

    lines = text.splitlines()
    closing_index = None

    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            closing_index = index
            break

    if closing_index is None:
        return {}, text.strip()

    metadata: dict[str, str] = {}

    for line in lines[1:closing_index]:
        if ":" not in line:
            continue

        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip().strip("\"'")

    content = "\n".join(lines[closing_index + 1:]).strip()
    return metadata, content


def load_document(path: Path, knowledge_root: Path) -> LoadedDocument:
    raw_text = path.read_text(encoding="utf-8")
    front_matter, content = _parse_front_matter(raw_text)

    document_type = front_matter.get(
        "type",
        path.parent.name.removesuffix("s"),
    )

    service = front_matter.get("service")

    metadata: dict[str, Any] = {
        "document": path.name,
        "document_path": path.relative_to(knowledge_root).as_posix(),
        "type": document_type,
    }

    if service:
        metadata["service"] = service

    return LoadedDocument(
        document=path.name,
        content=content,
        metadata=metadata,
    )


def load_documents(
    knowledge_root: str | Path,
) -> list[LoadedDocument]:
    root = Path(knowledge_root).resolve()

    if not root.exists():
        raise FileNotFoundError(
            f"Knowledge directory does not exist: {root}"
        )

    documents = [
        load_document(path, root)
        for path in sorted(root.rglob("*.md"))
        if path.is_file()
    ]

    if not documents:
        raise ValueError(f"No Markdown documents found in {root}")

    return documents