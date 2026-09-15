from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agents.database import get_monitor_checks


def get_latency_breakdown(
    monitor_id: str,
    window_hours: int = 1,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    """
    Return latency statistics and the slowest checks.
    """
    checks = get_monitor_checks(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    latency_checks = [
        check
        for check in checks
        if check.get("latency_ms") is not None
    ]

    latencies = sorted(
        float(check["latency_ms"])
        for check in latency_checks
    )

    if not latencies:
        return {
            "monitor_id": monitor_id,
            "window_hours": window_hours,
            "sample_count": 0,
            "average_latency_ms": None,
            "min_latency_ms": None,
            "max_latency_ms": None,
            "p50_latency_ms": None,
            "p95_latency_ms": None,
            "slowest_checks": [],
        }

    def percentile(values: list[float], value: float) -> float:
        index = int(round((len(values) - 1) * value))
        return values[index]

    average_latency = sum(latencies) / len(latencies)

    slowest_checks = sorted(
        latency_checks,
        key=lambda check: float(check["latency_ms"]),
        reverse=True,
    )[:10]

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "sample_count": len(latencies),
        "average_latency_ms": round(average_latency, 2),
        "min_latency_ms": latencies[0],
        "max_latency_ms": latencies[-1],
        "p50_latency_ms": percentile(latencies, 0.50),
        "p95_latency_ms": percentile(latencies, 0.95),
        "slowest_checks": [
            {
                "checked_at": (
                    check["checked_at"].isoformat()
                    if isinstance(
                        check.get("checked_at"),
                        datetime,
                    )
                    else check.get("checked_at")
                ),
                "latency_ms": check.get("latency_ms"),
                "response_time_ms": check.get("response_time_ms"),
                "status": check.get("status"),
                "region": check.get("region"),
            }
            for check in slowest_checks
        ],
    }