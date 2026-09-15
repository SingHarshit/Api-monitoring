from __future__ import annotations

import operator
from datetime import datetime
from typing import Annotated, Any, TypedDict


class Evidence(TypedDict, total=False):
    source: str
    tool: str
    summary: str
    data: dict[str, Any]
    relevance: float
    collected_at: str


class Hypothesis(TypedDict, total=False):
    title: str
    description: str
    confidence: float
    supporting_evidence: list[str]
    contradicting_evidence: list[str]


class ValidationResult(TypedDict, total=False):
    sufficient: bool
    confidence: float
    explanation: str
    missing_evidence: list[str]


class RCAState(TypedDict, total=False):
    # Incident identity
    incident_id: str
    monitor_id: str
    check_id: str
    triggered_at: str
    window_hours: int

    # Initial incident data
    incident: dict[str, Any]
    monitor: dict[str, Any]
    initial_signals: list[dict[str, Any]]

    # Investigation history
    hypotheses: Annotated[list[Hypothesis], operator.add]
    current_hypothesis: Hypothesis

    # Evidence gathered by tools
    evidence: Annotated[list[Evidence], operator.add]
    tool_calls: Annotated[list[dict[str, Any]], operator.add]

    # Validation and control flow
    validation: ValidationResult
    iteration: int
    max_iterations: int

    # Final result
    final_rca: dict[str, Any]

    # Non-fatal errors and unavailable integrations
    errors: Annotated[list[str], operator.add]