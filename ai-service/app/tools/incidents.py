from __future__ import annotations

from typing import Any

from app.agents.database import get_recent_incidents


def search_previous_incidents(
    monitor_id: str,
    query: str | None = None,
    limit: int = 5,
) -> dict[str, Any]:
    """
    Find previous incidents for the same monitor.

    The initial implementation searches structured incident fields.
    """
    incidents = get_recent_incidents(
        monitor_id=monitor_id,
        limit=limit,
    )

    if query:
        query_terms = {
            term.lower()
            for term in query.split()
            if len(term) > 2
        }

        def matches(incident: dict[str, Any]) -> bool:
            searchable_text = " ".join(
                str(incident.get(field) or "")
                for field in (
                    "title",
                    "reason",
                    "severity",
                    "status",
                )
            ).lower()

            return any(
                term in searchable_text
                for term in query_terms
            )

        incidents = [
            incident
            for incident in incidents
            if matches(incident)
        ]

    return {
        "monitor_id": monitor_id,
        "query": query,
        "count": len(incidents),
        "incidents": incidents,
    }