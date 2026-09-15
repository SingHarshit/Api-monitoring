from __future__ import annotations

from datetime import datetime
from typing import Any


def get_recent_deployments(
    monitor_id: str,
    window_hours: int = 24,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    """
    Return deployment evidence for a monitor.

    Deployment data is not currently connected to this project.
    """
    if not monitor_id:
        raise ValueError("monitor_id is required")

    if window_hours < 1:
        raise ValueError("window_hours must be greater than zero")

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "available": False,
        "source": None,
        "count": 0,
        "deployments": [],
        "reason": (
            "Deployment data is not configured. "
            "This result must not be interpreted as proof "
            "that no deployment occurred."
        ),
    }