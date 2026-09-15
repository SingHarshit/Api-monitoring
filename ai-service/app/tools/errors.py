from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any

from app.agents.database import get_monitor_checks


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()

    return value


def get_error_summary(
    monitor_id: str,
    window_hours: int = 1,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    """
    Return error counts grouped by status, HTTP status, and message.
    """
    checks = get_monitor_checks(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    failed_checks = [
        check
        for check in checks
        if check["status"] in {"FAILED", "TIMEOUT"}
    ]

    status_counts = Counter(
        check["status"]
        for check in failed_checks
    )

    http_status_counts = Counter(
        str(check["http_status_code"])
        for check in failed_checks
        if check.get("http_status_code") is not None
    )

    message_counts = Counter(
        check["error_message"]
        for check in failed_checks
        if check.get("error_message")
    )

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "total_errors": len(failed_checks),
        "by_status": dict(status_counts),
        "by_http_status": dict(http_status_counts),
        "by_message": dict(message_counts),
        "recent_errors": [
            {
                "checked_at": _serialize(check.get("checked_at")),
                "status": check.get("status"),
                "http_status_code": check.get("http_status_code"),
                "error_message": check.get("error_message"),
                "region": check.get("region"),
            }
            for check in failed_checks[-20:]
        ],
    }