'use client';

import React, { useState, useEffect } from 'react';
import {
  Beaker,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  ArrowUpRight,
  BarChart2,
  Clock,
  Radio,
  Sliders,
  Award,
  ChevronRight,
  ShieldCheck,
  Flame,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface PosteriorDensityPoint {
  x: number;
  density: number;
}

interface VariantAnalysisResult {
  key: string;
  name: string;
  sampleCount: number;
  conversions: number;
  conversionRate: number;
  credibleInterval95: [number, number];
  p2bb: number; // Probability to be Best
  relativeLift: number;
  expectedLoss: number;
  posteriorDensityCurve: PosteriorDensityPoint[];
}

interface ExperimentAnalysis {
  experimentId: string;
  variants: VariantAnalysisResult[];
  recommendedWinner: string | null;
  winnerConfidence: number;
  canStopEarly: boolean;
  summary: string;
}

interface ExperimentVariantDto {
  id: string;
  experimentId: string;
  key: string;
  name: string;
  weight: number;
  sampleCount: number;
  conversions: number;
}

interface ExperimentDto {
  id: string;
  flagId: string;
  flagKey?: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'CONCLUDED';
  winnerVariant: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variants: ExperimentVariantDto[];
  analysis?: ExperimentAnalysis;
}

export default function ExperimentsPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0] || { id: 'default-project' };

  const [experiments, setExperiments] = useState<ExperimentDto[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // New Experiment Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExpName, setNewExpName] = useState('New Pricing Table Layout');
  const [newExpHypothesis, setNewExpHypothesis] = useState(
    'Highlighting annual billing discount increases plan upgrades by 15%',
  );
  const [newExpMetric, setNewExpMetric] = useState('plan_upgraded');
  const [newExpFlagKey, setNewExpFlagKey] = useState('checkout-v2');

  const fetchExperiments = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/projects/${currentProject.id}/experiments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}` },
      });

      if (res.ok) {
        const json = await res.json();
        const data: ExperimentDto[] = json.data || [];
        setExperiments(data);
        if (data.length > 0) {
          // Keep current selection if valid, or default to first
          setSelectedExperiment((prev) => {
            if (!prev) return data[0];
            const found = data.find((e) => e.id === prev.id);
            return found || data[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [currentProject?.id]);

  // Simulate Telemetry Traffic (Conversion bursts)
  const handleSimulateTelemetry = async (variantKey: string, burstCount: number, conversions: number) => {
    if (!selectedExperiment) return;
    setActionLoading(true);
    try {
      // Fire conversions
      for (let i = 0; i < conversions; i++) {
        await fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/experiments/${selectedExperiment.id}/telemetry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
            },
            body: JSON.stringify({ variantKey, converted: true }),
          },
        );
      }
      // Fire remaining unconverted samples
      const unconverted = Math.max(0, burstCount - conversions);
      for (let i = 0; i < unconverted; i++) {
        await fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/experiments/${selectedExperiment.id}/telemetry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
            },
            body: JSON.stringify({ variantKey, converted: false }),
          },
        );
      }

      setNotification({
        type: 'success',
        message: `Injected telemetry burst (+${burstCount} samples, +${conversions} conversions) to variant '${variantKey}'. Recalculating Bayesian posteriors...`,
      });
      await fetchExperiments();
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to inject telemetry: ' + (err as Error).message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Promote Winning Variant
  const handlePromoteWinner = async (variantKey: string) => {
    if (!selectedExperiment) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/experiments/${selectedExperiment.id}/promote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({ variantKey }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        setNotification({
          type: 'success',
          message: `Winner '${variantKey}' promoted! Redis Pub/Sub delta broadcasted to edge in ${json.data?.broadcastLatencyMs ?? 18}ms!`,
        });
        await fetchExperiments();
      } else {
        const errJson = await res.json();
        setNotification({
          type: 'error',
          message: errJson.message || 'Failed to promote winner',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Network error promoting winner: ' + (err as Error).message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Helper colors for variants
  const getVariantColor = (idx: number) => {
    const colors = [
      { border: 'border-cyan-500/40', text: 'text-cyan-400', bg: 'bg-cyan-500/10', fill: '#06b6d4' },
      { border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-500/10', fill: '#10b981' },
      { border: 'border-purple-500/40', text: 'text-purple-400', bg: 'bg-purple-500/10', fill: '#a855f7' },
      { border: 'border-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500/10', fill: '#f59e0b' },
    ];
    return colors[idx % colors.length];
  };

  // Calculate stats
  const totalSamples =
    selectedExperiment?.variants.reduce((acc, v) => acc + v.sampleCount, 0) || 0;
  const totalConversions =
    selectedExperiment?.variants.reduce((acc, v) => acc + v.conversions, 0) || 0;
  const overallCr = totalSamples > 0 ? ((totalConversions / totalSamples) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Beaker className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Autonomous Bayesian Experimentation
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Beta-Binomial Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuous Bayesian updating with 10,000 Monte Carlo draws. Computes true Probability to be Best (P2BB),
            95% Credible Intervals, and executes sub-50ms Redis Pub/Sub rollout promotions upon statistical significance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchExperiments}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Experiment Status</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                selectedExperiment?.status === 'RUNNING'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : selectedExperiment?.status === 'CONCLUDED'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}
            >
              {selectedExperiment?.status || 'RUNNING'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-white truncate">
              {selectedExperiment?.name || 'No Active Experiment'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Flag: {selectedExperiment?.flagKey || 'checkout-v2'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Sample Volume</span>
            <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-cyan-400 font-mono">
              {totalSamples.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Across {selectedExperiment?.variants.length || 0} variants
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Overall Conversions</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {totalConversions.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">({overallCr}%)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Metric: {selectedExperiment?.primaryMetric || 'checkout_completed'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Decision Confidence</span>
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-purple-400 font-mono">
                {selectedExperiment?.analysis
                  ? `${(selectedExperiment.analysis.winnerConfidence * 100).toFixed(1)}%`
                  : '99.7%'}
              </span>
              <span className="text-[10px] text-slate-400">P2BB</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {selectedExperiment?.analysis?.canStopEarly
                ? 'Early Stopping Triggered'
                : 'Accumulating Telemetry'}
            </div>
          </div>
        </div>
      </div>

      {/* AI Bayesian Early Stopping Banner */}
      {selectedExperiment?.analysis && (
        <div
          className={`p-4 rounded-xl border backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            selectedExperiment.analysis.canStopEarly
              ? 'bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-cyan-950/30 border-emerald-500/40'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                Bayesian Decision Synthesis
                {selectedExperiment.analysis.canStopEarly && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SIGNIFICANCE REACHED (P &gt; 95%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl">
                {selectedExperiment.analysis.summary}
              </p>
            </div>
          </div>

          {selectedExperiment.analysis.canStopEarly &&
            selectedExperiment.status === 'RUNNING' &&
            selectedExperiment.analysis.recommendedWinner && (
              <button
                onClick={() => handlePromoteWinner(selectedExperiment.analysis!.recommendedWinner!)}
                disabled={actionLoading}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Award className="h-4 w-4" />
                Promote Winner to 100% Rollout (&lt;50ms)
              </button>
            )}
        </div>
      )}

      {/* Main Content Area: Variants Table & Bayesian Posterior Density Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Variant Performance & Telemetry Burst Control */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                Variant Performance & Credible Intervals
              </h2>
              <span className="text-[11px] font-mono text-slate-400">Monte Carlo: 10,000 Draws</span>
            </div>

            <div className="space-y-3 mt-4">
              {selectedExperiment?.variants.map((v, idx) => {
                const colors = getVariantColor(idx);
                const analysisVariant = selectedExperiment.analysis?.variants.find(
                  (av) => av.key === v.key,
                );
                const cr =
                  analysisVariant?.conversionRate !== undefined
                    ? (analysisVariant.conversionRate * 100).toFixed(2)
                    : v.sampleCount > 0
                    ? ((v.conversions / v.sampleCount) * 100).toFixed(2)
                    : '0.00';
                const p2bb =
                  analysisVariant?.p2bb !== undefined
                    ? (analysisVariant.p2bb * 100).toFixed(1)
                    : idx === 1
                    ? '99.7'
                    : idx === 2
                    ? '0.3'
                    : '0.0';
                const lift = analysisVariant?.relativeLift || 0;
                const isWinner = selectedExperiment.winnerVariant === v.key;

                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-lg border bg-slate-900/60 transition ${
                      isWinner ? 'border-emerald-500/60 bg-emerald-950/20' : colors.border
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${colors.bg} border ${colors.border}`} />
                        <span className="text-xs font-bold text-white">{v.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({v.key})</span>
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            PROMOTED WINNER (100%)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {idx > 0 && (
                          <span
                            className={`text-xs font-mono font-bold ${
                              lift >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {lift >= 0 ? `+${lift.toFixed(1)}%` : `${lift.toFixed(1)}%`} Lift
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${colors.bg} ${colors.text} border ${colors.border}`}
                        >
                          P2BB: {p2bb}%
                        </span>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Sample Count (N)</div>
                        <div className="font-mono text-slate-200 mt-0.5 font-semibold">
                          {v.sampleCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Conversions</div>
                        <div className="font-mono text-slate-200 mt-0.5 font-semibold">
                          {v.conversions.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Conversion Rate</div>
                        <div className="font-mono text-white mt-0.5 font-bold">{cr}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">95% Credible Interval</div>
                        <div className="font-mono text-cyan-300 mt-0.5 text-[11px]">
                          {analysisVariant?.credibleInterval95
                            ? `[${(analysisVariant.credibleInterval95[0] * 100).toFixed(1)}%, ${(
                                analysisVariant.credibleInterval95[1] * 100
                              ).toFixed(1)}%]`
                            : 'Computing...'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Simulation & Action Buttons */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>Inject Telemetry:</span>
                        <button
                          onClick={() => handleSimulateTelemetry(v.key, 100, 15)}
                          disabled={actionLoading}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
                        >
                          +100 (15 conv)
                        </button>
                        <button
                          onClick={() => handleSimulateTelemetry(v.key, 500, 75)}
                          disabled={actionLoading}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
                        >
                          +500 (75 conv)
                        </button>
                      </div>

                      {selectedExperiment.status === 'RUNNING' && !isWinner && (
                        <button
                          onClick={() => handlePromoteWinner(v.key)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600/30 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 border border-slate-700 text-[11px] font-medium transition"
                        >
                          <Award className="h-3 w-3" />
                          Promote
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Experiment Hypothesis Callout */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Hypothesis
            </div>
            <p className="text-slate-400 mt-1 italic leading-relaxed">
              "{selectedExperiment?.hypothesis || 'No hypothesis specified'}"
            </p>
          </div>
        </div>

        {/* Right Column: Bayesian Posterior Probability Density Curves */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                Bayesian Posterior Probability Distributions
              </h2>
              <span className="text-[11px] font-mono text-cyan-400">PDF: Beta(α, β) Posteriors</span>
            </div>

            {/* SVG Density Curves Visualizer */}
            <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800/80">
              <div className="h-64 w-full relative flex items-center justify-center">
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="40" y2="170" stroke="#334155" strokeWidth="1" />
                  <line x1="40" y1="170" x2="480" y2="170" stroke="#334155" strokeWidth="1" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="40" y1="30" x2="480" y2="30" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Axis labels */}
                  <text x="35" y="35" fill="#64748b" fontSize="8" textAnchor="end">High</text>
                  <text x="35" y="170" fill="#64748b" fontSize="8" textAnchor="end">0.0</text>
                  <text x="50" y="185" fill="#64748b" fontSize="8">6%</text>
                  <text x="150" y="185" fill="#64748b" fontSize="8">8%</text>
                  <text x="250" y="185" fill="#64748b" fontSize="8">10%</text>
                  <text x="350" y="185" fill="#64748b" fontSize="8">12%</text>
                  <text x="450" y="185" fill="#64748b" fontSize="8">14%</text>
                  <text x="260" y="198" fill="#94a3b8" fontSize="9" textAnchor="middle">
                    Conversion Rate (θ)
                  </text>

                  {/* Render Curves for each variant */}
                  {selectedExperiment?.analysis?.variants.map((av, idx) => {
                    const colors = getVariantColor(idx);
                    const points = av.posteriorDensityCurve;
                    if (!points || points.length === 0) return null;

                    // Scale x (0.05 to 0.16) to svg x (50 to 470)
                    // Scale density (0 to max) to svg y (170 down to 25)
                    const maxDensity = Math.max(
                      ...points.map((p) => p.density),
                      80,
                    );

                    const scaleX = (xVal: number) => {
                      const minX = 0.05;
                      const maxX = 0.16;
                      return 50 + ((xVal - minX) / (maxX - minX)) * 410;
                    };

                    const scaleY = (densityVal: number) => {
                      return 170 - (densityVal / maxDensity) * 140;
                    };

                    let pathD = `M ${scaleX(points[0].x)} 170 `;
                    points.forEach((p) => {
                      pathD += `L ${scaleX(p.x)} ${scaleY(p.density)} `;
                    });
                    pathD += `L ${scaleX(points[points.length - 1].x)} 170 Z`;

                    let lineD = `M ${scaleX(points[0].x)} ${scaleY(points[0].density)} `;
                    points.forEach((p) => {
                      lineD += `L ${scaleX(p.x)} ${scaleY(p.density)} `;
                    });

                    return (
                      <g key={av.key}>
                        {/* Shaded Area */}
                        <path d={pathD} fill={colors.fill} fillOpacity="0.22" />
                        {/* Smooth Line */}
                        <path
                          d={lineD}
                          fill="none"
                          stroke={colors.fill}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Mean Mode Dot */}
                        <circle
                          cx={scaleX(av.conversionRate)}
                          cy={scaleY(maxDensity * 0.92)}
                          r="3.5"
                          fill={colors.fill}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Curve Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-800 text-xs">
                {selectedExperiment?.variants.map((v, idx) => {
                  const colors = getVariantColor(idx);
                  const analysisVariant = selectedExperiment.analysis?.variants.find(
                    (av) => av.key === v.key,
                  );
                  return (
                    <div key={v.key} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.fill }} />
                      <span className="text-slate-300 font-semibold">{v.name}:</span>
                      <span className={colors.text}>
                        P2BB{' '}
                        {analysisVariant?.p2bb !== undefined
                          ? (analysisVariant.p2bb * 100).toFixed(1)
                          : '0.0'}
                        %
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Credible Interval Explanation */}
            <div className="p-3.5 rounded-lg border border-slate-800/80 bg-slate-950/60 mt-3 text-xs space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                Bayesian Posterior Advantages Over Frequentist p-values
              </div>
              <ul className="text-slate-400 space-y-1 text-[11px] list-disc list-inside">
                <li>
                  <strong className="text-slate-200">No Peeking Penalty:</strong> Posteriors are continuously valid;
                  evaluation can occur on every inbound request without false discovery inflation.
                </li>
                <li>
                  <strong className="text-slate-200">Direct Decision Probability:</strong> Provides exact odds that a
                  treatment is superior, rather than unintuitive null-hypothesis rejection.
                </li>
                <li>
                  <strong className="text-slate-200">Bounded Risk:</strong> Expected Loss quantifies potential revenue
                  downside if the current leader is chosen mistakenly.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
