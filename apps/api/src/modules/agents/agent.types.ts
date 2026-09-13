export interface AgentThoughtTraceItem {
  agent: string;
  role: string;
  status: 'ANALYZING' | 'ALERT' | 'CLEAR' | 'RECOMMENDING' | 'VERIFIED';
  timestamp: string;
  summary: string;
}

export interface AgentPolicyAudit {
  is_safe: boolean;
  violations: string[];
  policy_version: string;
}

export interface AgentDecisionPayload {
  id: string;
  type: 'EXCLUSION_RULE' | 'ROLLBACK' | 'ROLLOUT_STEP' | 'WINNER_PROMOTION';
  title: string;
  rationale: string;
  confidence: number;
  suggested_action: {
    type: string;
    action_title: string;
    description: string;
    confidence: number;
    blast_radius_mitigated_pct: number;
    recommended_action: string;
    suggested_rules?: Array<{
      attribute: string;
      operator: string;
      values: (string | number | boolean)[];
      variantValue: string | number | boolean;
      priority: number;
    }>;
  };
  policy_audit: AgentPolicyAudit;
  requires_hitl_approval: boolean;
  created_at: string;
}

export interface AgentEvaluationResponse {
  success: boolean;
  flag_key: string;
  decision: AgentDecisionPayload | null;
  thought_trace: AgentThoughtTraceItem[];
  metrics: Record<string, unknown>;
  target_cohorts: unknown[];
  historical_context: unknown[];
  policy_violations: string[];
}

export interface ActiveAgentMetadata {
  id: string;
  name: string;
  role: string;
  tools: string[];
  status: 'ONLINE' | 'STANDBY' | 'BUSY';
}

export interface AgentRuntimeStatusResponse {
  runtime: string;
  status: string;
  active_agents: ActiveAgentMetadata[];
}
