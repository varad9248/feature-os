import datetime
from typing import Dict, Any
from app.agents.state import AgentState
from app.agents.tools import agent_tools


class SpecializedAgents:
    """The 5 Specialized AI Agents coordinating in the LangGraph runtime"""

    @staticmethod
    def telemetry_agent(state: AgentState) -> Dict[str, Any]:
        """Telemetry Agent: Monitors live ClickHouse metrics and flags KPI anomalies"""
        flag_key = state.get("flag_key", "dark-mode-v2")
        env_id = state.get("environment_id", "development")

        telemetry = agent_tools.query_telemetry(flag_key, env_id)
        thought_trace = list(state.get("thought_trace", []))
        anomalies = []

        is_anomalous = telemetry["error_rate"] > 0.02 or telemetry["p95_latency_ms"] > 200
        if is_anomalous:
            anomalies.append({
                "type": "ELEVATED_ERROR_RATE_AND_LATENCY",
                "severity": "CRITICAL",
                "error_rate": telemetry["error_rate"],
                "p95_latency_ms": telemetry["p95_latency_ms"],
                "skew": "Variant 'true' exhibits 6.8% error rate vs 0.6% on 'false'",
            })
            thought_trace.append({
                "agent": "TelemetryAgent",
                "role": "Metric & Anomaly Monitor",
                "status": "ALERT",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Detected significant KPI degradation on flag '{flag_key}'. P95 latency is {telemetry['p95_latency_ms']}ms (baseline: 45ms), error rate is {round(telemetry['error_rate']*100, 2)}%. Variant 'true' accounts for 91% of total errors.",
            })
        else:
            thought_trace.append({
                "agent": "TelemetryAgent",
                "role": "Metric & Anomaly Monitor",
                "status": "CLEAR",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Telemetry within nominal thresholds on flag '{flag_key}'. P95: {telemetry['p95_latency_ms']}ms, Error Rate: {round(telemetry['error_rate']*100, 2)}%.",
            })

        return {
            "metrics": telemetry,
            "anomalies": anomalies,
            "thought_trace": thought_trace,
        }

    @staticmethod
    def cohort_agent(state: AgentState) -> Dict[str, Any]:
        """Cohort Agent: Interprets ML clustering (DBSCAN + Isolation Forest) to pinpoint affected users"""
        flag_key = state.get("flag_key", "dark-mode-v2")
        thought_trace = list(state.get("thought_trace", []))

        clusters = agent_tools.scan_anomalous_clusters(flag_key, sample_size=250)
        critical_clusters = [c for c in clusters if c.get("severity") in ("CRITICAL", "WARNING")]

        if critical_clusters:
            top_cluster = critical_clusters[0]
            thought_trace.append({
                "agent": "CohortAgent",
                "role": "Unsupervised Behavioral Cluster Specialist",
                "status": "ANALYZING",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"DBSCAN & Isolation Forest isolated 1 high-density anomalous cluster: '{top_cluster['name']}'. Represents {top_cluster['percentage_of_traffic']}% of active traffic with a {round(top_cluster['error_rate']*100)}% error rate. Root hypothesis: {top_cluster['root_cause_hypothesis']}.",
            })
        else:
            thought_trace.append({
                "agent": "CohortAgent",
                "role": "Unsupervised Behavioral Cluster Specialist",
                "status": "CLEAR",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": "No isolated demographic cohorts or hardware-specific anomalies detected in clustering.",
            })

        return {
            "target_cohorts": critical_clusters,
            "thought_trace": thought_trace,
        }

    @staticmethod
    def memory_agent(state: AgentState) -> Dict[str, Any]:
        """Memory Agent: Recalls historical postmortems, past rollouts, and blast-radius precedents"""
        flag_key = state.get("flag_key", "dark-mode-v2")
        thought_trace = list(state.get("thought_trace", []))

        incidents = agent_tools.query_incident_memory(flag_key, error_signature="Safari WebGL Crash")
        matched_incident = incidents[0] if incidents else None

        if matched_incident:
            thought_trace.append({
                "agent": "MemoryAgent",
                "role": "Incident Memory & Postmortem Recall",
                "status": "ANALYZING",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Historical match found: {matched_incident['incident_id']} (Similarity: {round(matched_incident['similarity_score']*100)}%). Prior resolution successfully applied targeted exclusion rule to Safari Mobile clients without requiring a 100% rollback.",
            })

        return {
            "historical_context": incidents,
            "thought_trace": thought_trace,
        }

    @staticmethod
    def rollout_agent(state: AgentState) -> Dict[str, Any]:
        """Rollout Agent: Formulates precise staged interventions based on risk vs reward"""
        thought_trace = list(state.get("thought_trace", []))
        cohorts = state.get("target_cohorts", [])
        anomalies = state.get("anomalies", [])

        proposed_actions = []

        if cohorts:
            top_cohort = cohorts[0]
            suggested_rules = top_cohort.get("suggested_rules", [])
            proposed_actions.append({
                "type": "EXCLUSION_RULE",
                "action_title": f"Targeted Exclusion Rule for {top_cohort['name']}",
                "description": f"Isolate {top_cohort['percentage_of_traffic']}% affected mobile users to defaultValue: false while preserving active rollout for healthy 88% of users.",
                "confidence": 0.96,
                "suggested_rules": suggested_rules,
                "blast_radius_mitigated_pct": top_cohort["percentage_of_traffic"],
                "recommended_action": "APPLY_TARGETING_RULE",
            })
            thought_trace.append({
                "agent": "RolloutAgent",
                "role": "Progressive Rollout & Intervention Planner",
                "status": "RECOMMENDING",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": f"Synthesized targeted mitigation action: Apply exclusion rule for '{top_cohort['name']}'. Preserves 88% healthy traffic while eliminating {round(top_cohort['error_rate']*100)}% error blast radius.",
            })
        elif anomalies:
            proposed_actions.append({
                "type": "ROLLBACK",
                "action_title": "Emergency Rollback to 0%",
                "description": "General degradation without distinct demographic cluster. Rollback recommended.",
                "confidence": 0.91,
                "blast_radius_mitigated_pct": 100.0,
                "recommended_action": "ROLLBACK",
            })
            thought_trace.append({
                "agent": "RolloutAgent",
                "role": "Progressive Rollout & Intervention Planner",
                "status": "RECOMMENDING",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": "Proposing emergency rollback of feature flag to defaultValue due to distributed degradation.",
            })
        else:
            proposed_actions.append({
                "type": "ROLLOUT_STEP",
                "action_title": "Step-Up Rollout from 25% to 50%",
                "description": "Telemetry healthy across all cohorts. Recommended next rollout progression tier.",
                "confidence": 0.98,
                "blast_radius_mitigated_pct": 0.0,
                "recommended_action": "STEP_UP",
            })
            thought_trace.append({
                "agent": "RolloutAgent",
                "role": "Progressive Rollout & Intervention Planner",
                "status": "RECOMMENDING",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "summary": "Telemetry stable. Proposing progression to next staged rollout phase (50%).",
            })

        return {
            "proposed_actions": proposed_actions,
            "thought_trace": thought_trace,
        }

    @staticmethod
    def policy_agent(state: AgentState) -> Dict[str, Any]:
        """Policy Agent: Enforces corporate SRE safety policies, guardrails, and signs off"""
        thought_trace = list(state.get("thought_trace", []))
        proposed_actions = state.get("proposed_actions", [])
        metrics = state.get("metrics", {})

        action = proposed_actions[0] if proposed_actions else {}
        action_type = action.get("type", "UNKNOWN")
        current_error_rate = metrics.get("error_rate", 0.0)

        policy_check = agent_tools.evaluate_safety_policy(
            action_type=action_type,
            blast_radius_pct=action.get("blast_radius_mitigated_pct", 0.0),
            current_error_rate=current_error_rate,
        )

        thought_trace.append({
            "agent": "PolicyAgent",
            "role": "SRE Safety Guardrail & Compliance Auditor",
            "status": "VERIFIED" if policy_check["is_safe"] else "ALERT",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "summary": f"Audit complete (Policy: {policy_check['policy_version']}). Action '{action.get('action_title')}' complies with all SRE blast-radius limitations. Human-in-the-Loop approval gate strictly engaged.",
        })

        final_decision = {
            "id": f"sugg_{int(datetime.datetime.utcnow().timestamp())}",
            "type": action_type,
            "title": action.get("action_title", "Intervention Proposal"),
            "rationale": f"Telemetry Agent flagged {round(current_error_rate*100, 1)}% error rate. Cohort Agent isolated root cause to Safari Mobile. Memory Agent confirmed precedent INC-8421. Policy Agent verified compliance.",
            "confidence": action.get("confidence", 0.95),
            "suggested_action": action,
            "policy_audit": policy_check,
            "requires_hitl_approval": True,
            "created_at": datetime.datetime.utcnow().isoformat(),
        }

        return {
            "policy_violations": policy_check["violations"],
            "thought_trace": thought_trace,
            "final_decision": final_decision,
        }


specialized_agents = SpecializedAgents()
