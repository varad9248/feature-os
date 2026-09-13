from typing import Dict, Any
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.specialized import specialized_agents


def create_agent_graph():
    """Build and compile the LangGraph Multi-Agent StateGraph"""
    workflow = StateGraph(AgentState)

    # Add agent nodes
    workflow.add_node("telemetry_agent", specialized_agents.telemetry_agent)
    workflow.add_node("cohort_agent", specialized_agents.cohort_agent)
    workflow.add_node("memory_agent", specialized_agents.memory_agent)
    workflow.add_node("rollout_agent", specialized_agents.rollout_agent)
    workflow.add_node("policy_agent", specialized_agents.policy_agent)

    # Establish linear and conditional transitions
    workflow.set_entry_point("telemetry_agent")
    workflow.add_edge("telemetry_agent", "cohort_agent")
    workflow.add_edge("cohort_agent", "memory_agent")
    workflow.add_edge("memory_agent", "rollout_agent")
    workflow.add_edge("rollout_agent", "policy_agent")
    workflow.add_edge("policy_agent", END)

    return workflow.compile()


# Singleton compiled graph runner
agent_runtime_graph = create_agent_graph()


class MultiAgentRunner:
    @staticmethod
    def run_evaluation(
        flag_key: str,
        environment_id: str = "development",
        organization_id: str = "default_org",
    ) -> Dict[str, Any]:
        """Execute the multi-agent graph with initial state and return final decisions"""
        initial_state: AgentState = {
            "flag_key": flag_key,
            "environment_id": environment_id,
            "organization_id": organization_id,
            "metrics": {},
            "anomalies": [],
            "target_cohorts": [],
            "historical_context": [],
            "proposed_actions": [],
            "policy_violations": [],
            "thought_trace": [],
            "final_decision": None,
        }

        final_state = agent_runtime_graph.invoke(initial_state)
        return final_state


agent_runner = MultiAgentRunner()
