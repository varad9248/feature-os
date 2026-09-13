'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Users,
  Database,
  GitPullRequest,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface AgentThought {
  agent: string;
  role: string;
  status: 'ANALYZING' | 'ALERT' | 'CLEAR' | 'RECOMMENDING' | 'VERIFIED';
  timestamp: string;
  summary: string;
}

interface AISuggestion {
  id: string;
  flagId: string;
  type: 'EXCLUSION_RULE' | 'ROLLBACK' | 'ROLLOUT_STEP' | 'WINNER_PROMOTION';
  rationale: string;
  confidence: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  suggestedAction: {
    type?: string;
    action_title?: string;
    description?: string;
    confidence?: number;
    blast_radius_mitigated_pct?: number;
    recommended_action?: string;
    suggested_rules?: Array<{
      attribute: string;
      operator: string;
      values: (string | number | boolean)[];
      variantValue: string | number | boolean;
      priority: number;
    }>;
  };
  thoughtTrace: AgentThought[];
  createdAt: string;
  flag?: {
    id: string;
    key: string;
    name: string;
  };
}

export default function AIInboxPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0] || { id: 'default-project' };

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedFlagKey, setSelectedFlagKey] = useState('dark-mode-v2');
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/v1/agents/inbox', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.data || []);
        if (json.data?.length > 0) {
          setExpandedTraceId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load inbox suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [activeOrganization?.id]);

  const handleRunEvaluation = async () => {
    if (!currentProject) return;
    setEvaluating(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/agents/evaluate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({
            flagKey: selectedFlagKey,
            environmentKey: 'development',
          }),
        },
      );

      if (res.ok) {
        setNotification(`LangGraph multi-agent evaluation completed! New proposal generated.`);
        setTimeout(() => setNotification(null), 5000);
        await fetchInbox();
      }
    } catch (err) {
      console.error('Failed to run agent evaluation:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleApprove = async (suggestionId: string) => {
    if (!currentProject) return;
    setActionInProgressId(suggestionId);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/agents/suggestions/${suggestionId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
        },
      );

      if (res.ok) {
        setNotification('Human-in-the-Loop Approval Granted! Decision executed & broadcast over SSE in <50ms.');
        setTimeout(() => setNotification(null), 5000);
        await fetchInbox();
      }
    } catch (err) {
      console.error('Failed to approve suggestion:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    if (!currentProject) return;
    setActionInProgressId(suggestionId);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/agents/suggestions/${suggestionId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({ reason: 'Dismissed by operator in web dashboard' }),
        },
      );

      if (res.ok) {
        setNotification('Suggestion dismissed and logged in Audit Log.');
        setTimeout(() => setNotification(null), 4000);
        await fetchInbox();
      }
    } catch (err) {
      console.error('Failed to reject suggestion:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const specializedAgents = [
    {
      id: 'telemetry_agent',
      name: 'Telemetry Agent',
      role: 'ClickHouse KPI Monitor',
      icon: Activity,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      status: 'ONLINE',
    },
    {
      id: 'cohort_agent',
      name: 'Cohort Agent',
      role: 'DBSCAN Cluster Specialist',
      icon: Users,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      status: 'ONLINE',
    },
    {
      id: 'memory_agent',
      name: 'Memory Agent',
      role: 'Incident Memory Recall',
      icon: Database,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      status: 'ONLINE',
    },
    {
      id: 'rollout_agent',
      name: 'Rollout Agent',
      role: 'Staged Rollout Planner',
      icon: GitPullRequest,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      status: 'ONLINE',
    },
    {
      id: 'policy_agent',
      name: 'Policy Agent',
      role: 'SRE Safety Guardrail Auditor',
      icon: ShieldCheck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      status: 'ONLINE',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Bot className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Multi-Agent AI Inbox</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> LangGraph Multi-Agent
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous agent swarm monitoring telemetry, investigating ML clusters, cross-referencing postmortem memory, and formulating safe rollout actions under strict HITL governance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 font-mono">Flag:</span>
            <input
              type="text"
              value={selectedFlagKey}
              onChange={(e) => setSelectedFlagKey(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-28 font-mono"
            />
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Agents Analyzing...' : 'Run Multi-Agent Scan'}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs shadow-lg shadow-emerald-950/50 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* 5 Specialized Agents Status Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {specializedAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.id}
              className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${agent.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{agent.name}</div>
                  <div className="text-[10px] text-slate-400">{agent.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{agent.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestions Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Pending & Recent Agent Interventions</span>
            <span className="text-xs font-mono text-slate-400">({suggestions.length})</span>
          </h2>
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/20">
            <Bot className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <div className="text-xs text-slate-300 font-semibold">AI Inbox is Clear</div>
            <p className="text-[11px] text-slate-500 mt-1">
              No pending intervention proposals. Click &quot;Run Multi-Agent Scan&quot; to execute the LangGraph swarm.
            </p>
          </div>
        ) : (
          suggestions.map((suggestion) => {
            const isPending = suggestion.status === 'PENDING';
            const isExecuted = suggestion.status === 'EXECUTED';
            const isRejected = suggestion.status === 'REJECTED';
            const isExpanded = expandedTraceId === suggestion.id;
            const action = suggestion.suggestedAction;

            return (
              <div
                key={suggestion.id}
                className={`rounded-xl border transition ${
                  isExecuted
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : isRejected
                    ? 'border-slate-800/60 bg-slate-900/20 opacity-70'
                    : 'border-indigo-500/40 bg-slate-900/50 shadow-lg shadow-indigo-950/20'
                } p-5 space-y-4`}
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded border font-mono ${
                        suggestion.type === 'EXCLUSION_RULE'
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : suggestion.type === 'ROLLBACK'
                          ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                          : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {suggestion.type}
                    </span>

                    <span className="text-xs font-semibold text-white">
                      Flag: <span className="font-mono text-indigo-400">{suggestion.flag?.key || 'dark-mode-v2'}</span>
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isExecuted
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : isRejected
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-indigo-900/60 text-indigo-300'
                      }`}
                    >
                      {suggestion.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                    <span>Confidence: <strong className="text-emerald-400">{Math.round(suggestion.confidence * 100)}%</strong></span>
                    <span>•</span>
                    <span>{new Date(suggestion.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Proposal Rationale & Blast Radius */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 space-y-2">
                    <h3 className="text-xs font-semibold text-slate-200">
                      {action?.action_title || suggestion.rationale}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {action?.description || suggestion.rationale}
                    </p>

                    {/* Targeting Rules preview if present */}
                    {action?.suggested_rules && action.suggested_rules.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Synthesized Targeting Rule:
                        </span>
                        {action.suggested_rules.map((r, i) => (
                          <div
                            key={i}
                            className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-[11px] font-mono flex items-center justify-between text-indigo-300"
                          >
                            <span>{r.attribute} {r.operator} [{r.values.join(', ')}]</span>
                            <span className="text-rose-400 font-bold">→ {String(r.variantValue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blast Radius Box */}
                  <div className="lg:col-span-4 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> SRE Safety Impact
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Blast Radius Mitigated:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {action?.blast_radius_mitigated_pct || 12}% of users
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Healthy Traffic Preserved:</span>
                      <span className="font-mono text-white font-bold">88% of users</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">HITL Governance:</span>
                      <span className="font-mono text-indigo-400 font-bold">MANDATORY</span>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Chain-of-Thought Inspector (Expandable) */}
                <div className="border border-slate-800/80 rounded-xl bg-slate-950/40 overflow-hidden">
                  <button
                    onClick={() => setExpandedTraceId(isExpanded ? null : suggestion.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900/40 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="font-semibold">Step-by-Step Agent Thought Process</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(suggestion.thoughtTrace || []).length} Agent Steps)
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/80">
                      {(suggestion.thoughtTrace || []).map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-xs">
                          <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-slate-300">
                            {idx + 1}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-[11px]">{step.agent}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({step.role})</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  step.status === 'ALERT'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : step.status === 'VERIFIED'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{step.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* HITL Action Controls */}
                {isPending && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleReject(suggestion.id)}
                      disabled={actionInProgressId === suggestion.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Dismiss Proposal</span>
                    </button>

                    <button
                      onClick={() => handleApprove(suggestion.id)}
                      disabled={actionInProgressId === suggestion.id}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30 disabled:opacity-50"
                    >
                      {actionInProgressId === suggestion.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Approve & Execute Intervention</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
