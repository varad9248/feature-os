'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Cpu,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface TargetingRuleCondition {
  attribute: string;
  operator: string;
  values: (string | number | boolean)[];
  variantValue: string | number | boolean;
  priority: number;
}

interface DiscoveredCohort {
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

interface ClusterScatterPoint {
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

interface DiscoverApiResponse {
  success: boolean;
  flag_key: string;
  total_samples: number;
  cohorts: DiscoveredCohort[];
  scatter_points: ClusterScatterPoint[];
}

export default function CohortDiscoveryPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0] || { id: 'default-project' };

  const [flagKey, setFlagKey] = useState('dark-mode-v2');
  const [environmentKey, setEnvironmentKey] = useState('development');
  const [sampleSize, setSampleSize] = useState(250);
  const [loading, setLoading] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<DiscoveredCohort | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ClusterScatterPoint | null>(null);

  const [cohorts, setCohorts] = useState<DiscoveredCohort[]>([]);
  const [scatterPoints, setScatterPoints] = useState<ClusterScatterPoint[]>([]);
  const [appliedCohorts, setAppliedCohorts] = useState<Record<string, boolean>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchCohorts = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/cohorts/discover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({
            flagKey,
            environmentKey,
            sampleSize,
          }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const data: DiscoverApiResponse = json.data;
        setCohorts(data.cohorts || []);
        setScatterPoints(data.scatter_points || []);
        if (data.cohorts?.length > 0) {
          setSelectedCohort(data.cohorts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to discover cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, [currentProject?.id]);

  const handleApplyRule = async (cohort: DiscoveredCohort, rule: TargetingRuleCondition) => {
    if (!currentProject) return;
    setApplyingId(cohort.id);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/cohorts/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({
            flagKey,
            environmentId: environmentKey,
            cohortId: cohort.id,
            rule,
          }),
        },
      );

      if (res.ok) {
        setAppliedCohorts((prev) => ({ ...prev, [cohort.id]: true }));
        setNotification(`Successfully synthesized & applied targeting rule for ${cohort.name}! Dispatched over SSE to SDKs.`);
        setTimeout(() => setNotification(null), 6000);
      }
    } catch (err) {
      console.error('Failed to apply rule:', err);
    } finally {
      setApplyingId(null);
    }
  };

  // Convert scatter point coordinates to SVG canvas coordinates (width: 500, height: 320)
  const mapCoords = (x: number, y: number) => {
    const scaleX = 70;
    const scaleY = 55;
    const offsetX = 220;
    const offsetY = 160;
    return {
      cx: offsetX + x * scaleX,
      cy: offsetY - y * scaleY,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Brain className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Cohort Discovery Engine</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-3 w-3" /> Unsupervised ML
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detect hidden behavioral clusters, hardware bottlenecks, and anomalies using DBSCAN & Isolation Forest clustering with automatic LaunchDarkly rule synthesis.
          </p>
        </div>

        {/* Scan Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 font-mono">Flag:</span>
            <input
              type="text"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none w-28 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 font-mono">Samples:</span>
            <select
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value={150} className="bg-slate-900">150</option>
              <option value={250} className="bg-slate-900">250</option>
              <option value={500} className="bg-slate-900">500</option>
            </select>
          </div>

          <button
            onClick={fetchCohorts}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Running ML...' : 'Run Cluster Scan'}</span>
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Scanned User Samples</span>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{scatterPoints.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Behavioral telemetry points</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Discovered Anomaly Cohorts</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 font-mono">
            {cohorts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'WARNING').length}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">High risk clusters isolated</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Clustering Confidence</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-400 font-mono">
            {cohorts.length > 0 ? `${Math.round(cohorts[0].confidence * 100)}%` : '96%'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Silhouette / Isolation score</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Rule Synthesis Status</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {Object.keys(appliedCohorts).length > 0 ? 'ACTIVE' : 'READY'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Sub-50ms hot reload via SSE</span>
        </div>
      </div>

      {/* Main Grid: 2D PCA Cluster Map (Left) + Cohort Details & Rule Synthesizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2D PCA Dimensionality Reduction Scatter Plot */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>2D PCA Latency & Error Projection</span>
                <span className="text-[10px] font-mono text-slate-400">DBSCAN + IsolationForest</span>
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Healthy (Baseline)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Critical (Anomaly)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Latency Degraded
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              Hover over telemetry samples in the principal component space to inspect client hardware attributes and latency spikes.
            </p>

            {/* Interactive SVG Projection Canvas */}
            <div className="relative w-full h-80 bg-slate-950/80 rounded-lg border border-slate-800/60 overflow-hidden flex items-center justify-center">
              {/* Coordinate Grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]"></div>

              <svg className="w-full h-full" viewBox="0 0 500 320">
                {/* Axis lines */}
                <line x1="220" y1="20" x2="220" y2="300" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="20" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />

                {/* Cluster Points */}
                {scatterPoints.map((pt, i) => {
                  const { cx, cy } = mapCoords(pt.x, pt.y);
                  let fill = '#10b981'; // healthy
                  let r = 3.5;
                  if (pt.is_anomaly || pt.cluster_id === 1) {
                    fill = '#f43f5e'; // critical
                    r = 4.5;
                  } else if (pt.cluster_id === 2) {
                    fill = '#f59e0b'; // warning
                    r = 4;
                  }

                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={fill}
                      opacity={0.8}
                      className="cursor-pointer transition-all hover:opacity-100 hover:scale-125"
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                  );
                })}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 text-[11px] shadow-xl backdrop-blur-sm pointer-events-none min-w-[200px]">
                  <div className="font-mono text-indigo-400 font-semibold">{hoveredPoint.user_id}</div>
                  <div className="text-slate-300 mt-1 flex justify-between">
                    <span className="text-slate-400">Environment:</span>
                    <span className="font-mono">{hoveredPoint.browser} on {hoveredPoint.os}</span>
                  </div>
                  <div className="text-slate-300 flex justify-between">
                    <span className="text-slate-400">P95 Latency:</span>
                    <span className="font-mono">{Math.round(hoveredPoint.latency_ms)}ms</span>
                  </div>
                  <div className="text-slate-300 flex justify-between">
                    <span className="text-slate-400">Error Rate:</span>
                    <span className={`font-mono font-bold ${hoveredPoint.error_rate > 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {(hoveredPoint.error_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-3">
            <span>Principal Component 1 (Latency Variance)</span>
            <span>Principal Component 2 (Error Ratio)</span>
          </div>
        </div>

        {/* Discovered Cohort Cards & Rule Synthesizer (Right) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Discovered Cohort Clusters ({cohorts.length})</h3>

          {cohorts.map((cohort) => {
            const isApplied = appliedCohorts[cohort.id];
            const isSelected = selectedCohort?.id === cohort.id;

            return (
              <div
                key={cohort.id}
                onClick={() => setSelectedCohort(cohort)}
                className={`rounded-xl border p-4 transition cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500/60 bg-indigo-950/20'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          cohort.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                            : cohort.severity === 'WARNING'
                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                            : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                        }`}
                      >
                        {cohort.severity}
                      </span>
                      <h4 className="text-xs font-semibold text-white">{cohort.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{cohort.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-bold text-indigo-400">
                      {Math.round(cohort.confidence * 100)}% Match
                    </span>
                    <div className="text-[10px] text-slate-400">{cohort.user_count} users ({cohort.percentage_of_traffic}%)</div>
                  </div>
                </div>

                {/* Cohort Stats Ribbon */}
                <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-950/60 rounded-lg p-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Avg Latency:</span>{' '}
                    <span className="font-mono text-white font-semibold">{Math.round(cohort.avg_latency_ms)}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Error Rate:</span>{' '}
                    <span className={`font-mono font-semibold ${cohort.error_rate > 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {(cohort.error_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Root Cause Hypothesis */}
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-indigo-400" /> Root Cause Hypothesis
                  </div>
                  <p className="italic text-slate-300">{cohort.root_cause_hypothesis}</p>
                </div>

                {/* Synthesized Targeting Rules Preview */}
                {cohort.suggested_rules?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Synthesized Targeting Rule:
                    </div>
                    {cohort.suggested_rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] font-mono bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800"
                      >
                        <span className="text-indigo-300">
                          {rule.attribute} {rule.operator} [{rule.values.join(', ')}]
                        </span>
                        <span className="text-rose-400 font-bold">
                          → {String(rule.variantValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (cohort.suggested_rules?.[0]) {
                        handleApplyRule(cohort, cohort.suggested_rules[0]);
                      }
                    }}
                    disabled={isApplied || applyingId === cohort.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                      isApplied
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Targeting Rule Active</span>
                      </>
                    ) : applyingId === cohort.id ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Applying & Broadcasting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Apply Exclusion Rule</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
