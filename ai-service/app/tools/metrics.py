from __future__ import annotations

from datetime import datetime
from typing import Any

from app.agents.database import get_monitor_checks


def _serialize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()

    if value is None:
        return None

    return str(value)


def _serialize_check(check: dict[str, Any]) -> dict[str, Any]:
    serialized = dict(check)
    serialized["checked_at"] = _serialize_datetime(
        serialized.get("checked_at")
    )
    return serialized


def get_api_metrics(
    monitor_id: str,
    window_hours: int = 1,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    """
    Calculate aggregate API health metrics for a monitor.
    """
    checks = get_monitor_checks(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    total_checks = len(checks)
    failed_checks = sum(
        check["status"] in {"FAILED", "TIMEOUT"}
        for check in checks
    )
    timeout_checks = sum(
        check["status"] == "TIMEOUT"
        for check in checks
    )

    latencies = [
        float(check["latency_ms"])
        for check in checks
        if check.get("latency_ms") is not None
    ]

    http_errors = sum(
        check.get("http_status_code", 0) >= 500
        for check in checks
        if check.get("http_status_code") is not None
    )

    error_rate = (
        failed_checks / total_checks
        if total_checks
        else 0.0
    )

    average_latency = (
        sum(latencies) / len(latencies)
        if latencies
        else None
    )

    sorted_latencies = sorted(latencies)

    if sorted_latencies:
        p95_index = int(round((len(sorted_latencies) - 1) * 0.95))
        p95_latency = sorted_latencies[p95_index]
    else:
        p95_latency = None

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "total_checks": total_checks,
        "failed_checks": failed_checks,
        "timeout_checks": timeout_checks,
        "http_5xx_count": http_errors,
        "error_rate": round(error_rate, 4),
        "average_latency_ms": average_latency,
        "p95_latency_ms": p95_latency,
        "checks": [
            _serialize_check(check)
            for check in checks
        ],
    }


def get_error_rate(
    monitor_id: str,
    window_hours: int = 1,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    metrics = get_api_metrics(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "error_rate": metrics["error_rate"],
        "total_checks": metrics["total_checks"],
        "failed_checks": metrics["failed_checks"],
        "timeout_checks": metrics["timeout_checks"],
        "http_5xx_count": metrics["http_5xx_count"],
    }


def get_latency(
    monitor_id: str,
    window_hours: int = 1,
    end_time: datetime | None = None,
) -> dict[str, Any]:
    metrics = get_api_metrics(
        monitor_id=monitor_id,
        window_hours=window_hours,
        end_time=end_time,
    )

    return {
        "monitor_id": monitor_id,
        "window_hours": window_hours,
        "average_latency_ms": metrics["average_latency_ms"],
        "p95_latency_ms": metrics["p95_latency_ms"],
    }