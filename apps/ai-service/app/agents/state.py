from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel


class AgentThought(BaseModel):
    agent_name: str
    timestamp: str
    status: str  # "ANALYZING" | "ALERT" | "CLEAR" | "RECOMMENDING" | "VERIFIED"
    summary: str
    details: Dict[str, Any] = {}


class AgentState(TypedDict):
    flag_key: str
    environment_id: str
    organization_id: str
    metrics: Dict[str, Any]
    anomalies: List[Dict[str, Any]]
    target_cohorts: List[Dict[str, Any]]
    historical_context: List[Dict[str, Any]]
    proposed_actions: List[Dict[str, Any]]
    policy_violations: List[str]
    thought_trace: List[Dict[str, Any]]
    final_decision: Optional[Dict[str, Any]]
