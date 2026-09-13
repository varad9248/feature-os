from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.agents.graph import agent_runner

router = APIRouter(prefix="/ai/v1/agents", tags=["LangGraph Multi-Agent Runtime"])


class AgentEvaluateRequest(BaseModel):
    flag_key: str = "dark-mode-v2"
    environment_id: str = "development"
    organization_id: str = "default_org"


class AgentEvaluateResponse(BaseModel):
    success: bool
    flag_key: str
    decision: Optional[Dict[str, Any]]
    thought_trace: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    target_cohorts: List[Dict[str, Any]]
    historical_context: List[Dict[str, Any]]
    policy_violations: List[str]


@router.post("/evaluate", response_model=AgentEvaluateResponse)
async def evaluate_with_multi_agent_graph(request: AgentEvaluateRequest):
    """Execute the LangGraph StateGraph coordinating 5 specialized agents"""
    result = agent_runner.run_evaluation(
        flag_key=request.flag_key,
        environment_id=request.environment_id,
        organization_id=request.organization_id,
    )

    return AgentEvaluateResponse(
        success=True,
        flag_key=request.flag_key,
        decision=result.get("final_decision"),
        thought_trace=result.get("thought_trace", []),
        metrics=result.get("metrics", {}),
        target_cohorts=result.get("target_cohorts", []),
        historical_context=result.get("historical_context", []),
        policy_violations=result.get("policy_violations", []),
    )


@router.get("/status")
async def get_agent_runtime_status():
    """Get the active status and metadata of the 5 specialized agents"""
    return {
        "runtime": "LangGraph v1.2 StateGraph",
        "status": "HEALTHY",
        "active_agents": [
            {
                "id": "telemetry_agent",
                "name": "Telemetry Agent",
                "role": "Metric & Anomaly Monitor",
                "tools": ["query_telemetry", "clickhouse_timeseries"],
                "status": "ONLINE",
            },
            {
                "id": "cohort_agent",
                "name": "Cohort Agent",
                "role": "Unsupervised Behavioral Cluster Specialist",
                "tools": ["dbscan_cluster", "isolation_forest"],
                "status": "ONLINE",
            },
            {
                "id": "memory_agent",
                "name": "Memory Agent",
                "role": "Incident Memory & Postmortem Recall",
                "tools": ["query_incident_memory", "vector_similarity_search"],
                "status": "ONLINE",
            },
            {
                "id": "rollout_agent",
                "name": "Rollout Agent",
                "role": "Progressive Rollout & Intervention Planner",
                "tools": ["synthesize_targeting_rule", "staged_step_planner"],
                "status": "ONLINE",
            },
            {
                "id": "policy_agent",
                "name": "Policy Agent",
                "role": "SRE Safety Guardrail & Compliance Auditor",
                "tools": ["evaluate_safety_policy", "hitl_gatekeeper"],
                "status": "ONLINE",
            },
        ],
    }
