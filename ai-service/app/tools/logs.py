from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agents.database import get_monitor_checks


def get_error_logs(
    monitor_id: str,
    window_hours: int = 1,
    limit: int = 50,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    """
    Return monitoring error records from MonitorCheck.
    """
    if limit < 1 or limit > 200:
        raise ValueError("limit must be between 1 and 200")

    checks = get_monitor_checks(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    error_logs = [
        check
        for check in checks
        if (
            check["status"] in {"FAILED", "TIMEOUT"}
            or check.get("error_message")
        )
    ]

    error_logs = error_logs[-limit:]

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "source": "MonitorCheck",
        "count": len(error_logs),
        "logs": [
            {
                "timestamp": (
                    check["checked_at"].isoformat()
                    if isinstance(
                        check.get("checked_at"),
                        datetime,
                    )
                    else check.get("checked_at")
                ),
                "status": check.get("status"),
                "http_status_code": check.get("http_status_code"),
                "error_message": check.get("error_message"),
                "latency_ms": check.get("latency_ms"),
                "region": check.get("region"),
            }
            for check in error_logs
        ],
    }