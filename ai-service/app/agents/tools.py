from __future__ import annotations

from datetime import datetime
from typing import Any

from langchain_core.tools import tool

from app.tools.deployement import get_recent_deployments
from app.tools.errors import get_error_summary
from app.tools.incidents import search_previous_incidents
from app.tools.latency import get_latency_breakdown
from app.tools.logs import get_error_logs
from app.tools.metrics import get_api_metrics
from app.tools.runbooks import search_runbooks


@tool
def api_metrics_tool(
    monitor_id: str,
    window_hours: int = 1,
) -> dict[str, Any]:
    """Get aggregate API health metrics for a monitor."""
    return get_api_metrics(
        monitor_id=monitor_id,
        window_hours=window_hours,
    )


@tool
def error_summary_tool(
    monitor_id: str,
    window_hours: int = 1,
) -> dict[str, Any]:
    """Get API error counts grouped by status, HTTP code, and message."""
    return get_error_summary(
        monitor_id=monitor_id,
        window_hours=window_hours,
    )


@tool
def latency_tool(
    monitor_id: str,
    window_hours: int = 1,
) -> dict[str, Any]:
    """Get average, p50, p95, and maximum API latency."""
    return get_latency_breakdown(
        monitor_id=monitor_id,
        window_hours=window_hours,
    )


@tool
def error_logs_tool(
    monitor_id: str,
    window_hours: int = 1,
    limit: int = 50,
) -> dict[str, Any]:
    """Get recent monitoring error records."""
    return get_error_logs(
        monitor_id=monitor_id,
        window_hours=window_hours,
        limit=limit,
    )


@tool
def previous_incidents_tool(
    monitor_id: str,
    query: str = "",
    limit: int = 5,
) -> dict[str, Any]:
    """Search previous incidents for the same monitor."""
    return search_previous_incidents(
        monitor_id=monitor_id,
        query=query or None,
        limit=limit,
    )


@tool
def runbook_search_tool(
    query: str,
    service: str = "",
    limit: int = 5,
) -> dict[str, Any]:
    """Search relevant operational runbooks."""
    return search_runbooks(
        query=query,
        service=service or None,
        limit=limit,
    )


@tool
def deployments_tool(
    monitor_id: str,
    window_hours: int = 24,
) -> dict[str, Any]:
    """Get recent deployment evidence for a monitor."""
    return get_recent_deployments(
        monitor_id=monitor_id,
        window_hours=window_hours,
    )


RCA_TOOLS = [
    api_metrics_tool,
    error_summary_tool,
    latency_tool,
    error_logs_tool,
    previous_incidents_tool,
    runbook_search_tool,
    deployments_tool,
]