export interface TargetingRuleCondition {
  attribute: string;
  operator: string;
  values: (string | number | boolean)[];
  variantValue: string | number | boolean;
  priority: number;
}

export interface DiscoveredCohort {
  id: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  confidence: number;
  user_count: number;
  percentage_of_traffic: number;
  avg_latency_ms: number;
  error_rate: number;
  root_cause_hypothesis: string;
  recommended_action: string;
  suggested_rules: TargetingRuleCondition[];
}

export interface ClusterScatterPoint {
  user_id: string;
  x: number;
  y: number;
  cluster_id: number;
  is_anomaly: boolean;
  latency_ms: number;
  error_rate: number;
  browser: string;
  os: string;
}

export interface DiscoverCohortsResponse {
  success: boolean;
  flag_key: string;
  total_samples: number;
  cohorts: DiscoveredCohort[];
  scatter_points: ClusterScatterPoint[];
}

export interface ApplyCohortRuleDTO {
  flagKey: string;
  environmentId: string;
  cohortId: string;
  rule: TargetingRuleCondition;
  createSuggestionOnly?: boolean;
}
