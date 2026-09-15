from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv()


def _database_url() -> str:
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")

    return database_url


def get_monitor_checks(
    monitor_id: str,
    window_hours: int,
    end_time: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Return monitor checks for the requested time window.
    """
    if not monitor_id:
        raise ValueError("monitor_id is required")

    if window_hours < 1:
        raise ValueError("window_hours must be greater than zero")

    end_time = end_time or datetime.now().astimezone()
    start_time = end_time - timedelta(hours=window_hours)

    query = """
        SELECT
            id,
            "monitorId" AS monitor_id,
            "checkedAt" AS checked_at,
            status,
            "latencyMs" AS latency_ms,
            "httpStatusCode" AS http_status_code,
            "responseTimeMs" AS response_time_ms,
            "errorMessage" AS error_message,
            region
        FROM "MonitorCheck"
        WHERE "monitorId" = %s
          AND "checkedAt" >= %s
          AND "checkedAt" <= %s
        ORDER BY "checkedAt" ASC
    """

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    monitor_id,
                    start_time,
                    end_time,
                ),
            )
            return list(cursor.fetchall())


def get_incident(
    incident_id: str,
) -> dict[str, Any] | None:
    """
    Return one incident and its monitor identity.
    """
    if not incident_id:
        raise ValueError("incident_id is required")

    query = """
        SELECT
            i.id,
            i."monitorId" AS monitor_id,
            i.status,
            i.severity,
            i.title,
            i.reason,
            i."startedAt" AS started_at,
            i."lastEventAt" AS last_event_at,
            i."resolvedAt" AS resolved_at,
            m.name AS monitor_name,
            m.url AS monitor_url,
            m.method AS monitor_method
        FROM "Incident" AS i
        JOIN "Monitor" AS m
          ON m.id = i."monitorId"
        WHERE i.id = %s
    """

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (incident_id,))
            return cursor.fetchone()


def get_recent_incidents(
    monitor_id: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Return recent incidents for comparison with the current incident.
    """
    if not monitor_id:
        raise ValueError("monitor_id is required")

    if limit < 1 or limit > 50:
        raise ValueError("limit must be between 1 and 50")

    query = """
        SELECT
            id,
            "monitorId" AS monitor_id,
            status,
            severity,
            title,
            reason,
            "startedAt" AS started_at,
            "resolvedAt" AS resolved_at
        FROM "Incident"
        WHERE "monitorId" = %s
        ORDER BY "startedAt" DESC
        LIMIT %s
    """

    with psycopg.connect(
        _database_url(),
        row_factory=dict_row,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query, (monitor_id, limit))
            return list(cursor.fetchall())