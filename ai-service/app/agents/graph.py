from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from app.agents.database import get_incident
from app.agents.state import RCAState
from app.agents.tools import (
    api_metrics_tool,
    deployments_tool,
    error_logs_tool,
    error_summary_tool,
    latency_tool,
    previous_incidents_tool,
    runbook_search_tool,
)
from app.models.rca import RCAReport


class HypothesisOutput(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    supporting_evidence: list[str] = Field(default_factory=list)
    contradicting_evidence: list[str] = Field(default_factory=list)


class ValidationOutput(BaseModel):
    sufficient: bool
    confidence: float = Field(ge=0, le=1)
    explanation: str
    missing_evidence: list[str] = Field(default_factory=list)


class RCAOutput(BaseModel):
    incident_id: str = Field(min_length=1)
    root_cause: str = Field(min_length=1)
    confidence: float = Field(ge=0, le=1)
    evidence: list[str] = Field(default_factory=list)
    affected_apis: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)


def _get_llm():
    """
    Create the model only when the graph is executed.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not configured")

    return ChatOpenAI(
        model=os.getenv("RCA_MODEL", "gpt-4o-mini"),
        temperature=0,
    )


def _json_safe(value: Any) -> Any:
    """
    Convert database values into LangGraph/checkpoint-safe values.
    """
    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            str(key): _json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [_json_safe(item) for item in value]

    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]

    return value


def _model_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, BaseModel):
        return value.model_dump()

    if isinstance(value, dict):
        return value

    raise TypeError(
        f"Expected a structured model or dictionary, got {type(value)}"
    )


def analyze_incident(state: RCAState) -> dict[str, Any]:
    """
    Load the incident and establish the initial investigation context.
    """
    incident_id = state.get("incident_id")
    monitor_id = state.get("monitor_id")

    if not monitor_id:
        return {
            "errors": ["monitor_id is required"],
        }

    updates: dict[str, Any] = {}

    if incident_id:
        incident = get_incident(incident_id)

        if incident is None:
            return {
                "errors": [
                    f"Incident {incident_id} was not found",
                ],
            }

        updates["incident"] = _json_safe(incident)

        if not monitor_id:
            updates["monitor_id"] = incident["monitor_id"]

    updates.setdefault("iteration", 0)
    updates.setdefault("max_iterations", 3)

    return updates


def generate_hypothesis(state: RCAState) -> dict[str, Any]:
    """
    Generate one hypothesis from the incident and accumulated evidence.
    """
    llm = _get_llm().with_structured_output(HypothesisOutput)

    prompt = {
        "incident": state.get("incident", {}),
        "monitor": state.get("monitor", {}),
        "initial_signals": state.get("initial_signals", []),
        "previous_hypotheses": state.get("hypotheses", []),
        "evidence": state.get("evidence", []),
        "validation": state.get("validation", {}),
    }

    result = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are an API reliability engineer. "
                    "Generate one testable root-cause hypothesis. "
                    "Use only the supplied facts. "
                    "Do not invent metrics, logs, deployments, or incidents."
                )
            ),
            HumanMessage(
                content=json.dumps(_json_safe(prompt), indent=2)
            ),
        ]
    )

    hypothesis = _model_dict(result)
    next_iteration = state.get("iteration", 0) + 1

    return {
        "current_hypothesis": hypothesis,
        "hypotheses": [hypothesis],
        "iteration": next_iteration,
    }


def _run_tool(
    tool: Any,
    arguments: dict[str, Any],
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Invoke a LangChain tool and convert failures into graph data.
    """
    try:
        result = tool.invoke(arguments)
        return _json_safe(result), None
    except Exception as error:
        return None, f"{tool.name} failed: {error}"


def retrieve_evidence(state: RCAState) -> dict[str, Any]:
    """
    Gather deterministic evidence for the current hypothesis.
    """
    monitor_id = state["monitor_id"]
    window_hours = state.get("window_hours", 1)
    hypothesis = state.get("current_hypothesis", {})

    hypothesis_text = (
        hypothesis.get("description")
        or hypothesis.get("title")
        or "Investigate the current incident"
    )

    tool_requests = [
        (
            api_metrics_tool,
            {
                "monitor_id": monitor_id,
                "window_hours": window_hours,
            },
        ),
        (
            error_summary_tool,
            {
                "monitor_id": monitor_id,
                "window_hours": window_hours,
            },
        ),
        (
            latency_tool,
            {
                "monitor_id": monitor_id,
                "window_hours": window_hours,
            },
        ),
        (
            error_logs_tool,
            {
                "monitor_id": monitor_id,
                "window_hours": window_hours,
                "limit": 50,
            },
        ),
        (
            previous_incidents_tool,
            {
                "monitor_id": monitor_id,
                "query": hypothesis_text,
                "limit": 5,
            },
        ),
        (
            runbook_search_tool,
            {
                "query": hypothesis_text,
                "service": "",
                "limit": 5,
            },
        ),
        (
            deployments_tool,
            {
                "monitor_id": monitor_id,
                "window_hours": max(window_hours, 24),
            },
        ),
    ]

    evidence = []
    tool_calls = []
    errors = []

    for tool, arguments in tool_requests:
        result, error = _run_tool(tool, arguments)

        tool_calls.append(
            {
                "tool": tool.name,
                "arguments": arguments,
                "status": "failed" if error else "success",
            }
        )

        if error:
            errors.append(error)
            continue

        evidence.append(
            {
                "source": tool.name,
                "tool": tool.name,
                "summary": f"Evidence returned by {tool.name}",
                "data": result or {},
                "relevance": 1.0,
                "collected_at": datetime.utcnow().isoformat(),
            }
        )

    updates: dict[str, Any] = {
        "evidence": evidence,
        "tool_calls": tool_calls,
    }

    if errors:
        updates["errors"] = errors

    return updates


def validate_hypothesis(state: RCAState) -> dict[str, Any]:
    """
    Ask the model whether the collected evidence supports the hypothesis.
    """
    llm = _get_llm().with_structured_output(ValidationOutput)

    prompt = {
        "current_hypothesis": state.get("current_hypothesis", {}),
        "evidence": state.get("evidence", []),
        "tool_calls": state.get("tool_calls", []),
    }

    result = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You validate incident hypotheses. "
                    "Mark evidence as sufficient only when it directly "
                    "supports the hypothesis with multiple relevant facts. "
                    "Unavailable data must not be treated as negative evidence."
                )
            ),
            HumanMessage(
                content=json.dumps(_json_safe(prompt), indent=2)
            ),
        ]
    )

    validation = _model_dict(result)

    return {
        "validation": validation,
    }


def route_after_validation(
    state: RCAState,
) -> Literal["generate_hypothesis", "generate_rca"]:
    validation = state.get("validation", {})
    iteration = state.get("iteration", 0)
    max_iterations = state.get("max_iterations", 3)

    if validation.get("sufficient") is True:
        return "generate_rca"

    if iteration >= max_iterations:
        return "generate_rca"

    return "generate_hypothesis"


def generate_rca(state: RCAState) -> dict[str, Any]:
    """
    Produce the final root-cause analysis from the full investigation state.
    """
    llm = _get_llm().with_structured_output(RCAReport)

    prompt = {
        "incident_id": state.get("incident_id"),
        "incident": state.get("incident", {}),
        "hypotheses": state.get("hypotheses", []),
        "evidence": state.get("evidence", []),
        "validation": state.get("validation", {}),
        "errors": state.get("errors", []),
    }

    result = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are writing a production incident RCA. "
                    "Use only supplied evidence. "
                    "Clearly mention uncertainty and unavailable data. "
                    "Never claim that missing data proves something did not happen."
                )
            ),
            HumanMessage(
                content=json.dumps(_json_safe(prompt), indent=2)
            ),
        ]
    )

    report = result.model_copy(
        update={
            "incident_id": state["incident_id"],
        }
    )

    return {"final_rca": report.model_dump()}


def build_rca_graph():
    graph = StateGraph(RCAState)

    graph.add_node("analyze_incident", analyze_incident)
    graph.add_node("generate_hypothesis", generate_hypothesis)
    graph.add_node("retrieve_evidence", retrieve_evidence)
    graph.add_node("validate_hypothesis", validate_hypothesis)
    graph.add_node("generate_rca", generate_rca)

    graph.add_edge(START, "analyze_incident")
    graph.add_edge("analyze_incident", "generate_hypothesis")
    graph.add_edge("generate_hypothesis", "retrieve_evidence")
    graph.add_edge("retrieve_evidence", "validate_hypothesis")

    graph.add_conditional_edges(
        "validate_hypothesis",
        route_after_validation,
        {
            "generate_hypothesis": "generate_hypothesis",
            "generate_rca": "generate_rca",
        },
    )

    graph.add_edge("generate_rca", END)

    return graph.compile()


rca_graph = build_rca_graph()