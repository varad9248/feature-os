'use client';

import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Globe,
  Layers,
  Percent,
  Sliders,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

type RolloutStrategyType = 'PERCENTAGE' | 'CANARY' | 'RING' | 'REGIONAL';
type RolloutStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ROLLED_BACK';

interface RolloutStep {
  id: string;
  stepNumber: number;
  percentage: number;
  durationMinutes: number;
  passed: boolean;
}

interface RolloutHealthEvaluation {
  isHealthy: boolean;
  healthScore: number;
  errorRate: number;
  baselineErrorRate: number;
  p95LatencyMs: number;
  baselineP95LatencyMs: number;
  message: string;
  evaluatedAt: string;
}

interface RolloutSchedule {
  id: string;
  flagKey: string;
  flagName: string;
  environmentKey: string;
  strategy: RolloutStrategyType;
  status: RolloutStatus;
  currentStep: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
  steps: RolloutStep[];
  healthReport: RolloutHealthEvaluation;
}

export default function RolloutsPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0] || { id: 'default-project' };

  const [schedules, setSchedules] = useState<RolloutSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<RolloutSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New Schedule Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState('dark-mode-v2');
  const [newStrategy, setNewStrategy] = useState<RolloutStrategyType>('PERCENTAGE');

  const fetchSchedules = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/rollouts`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
        },
      );
      if (res.ok) {
        const json = await res.json();
        const data: RolloutSchedule[] = json.data || [];
        setSchedules(data);
        if (data.length > 0) {
          setSelectedSchedule(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rollout schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [activeOrganization?.id]);

  const handleCreateSchedule = async () => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/rollouts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({
            flagKey: newFlagKey,
            environmentKey: 'development',
            strategy: newStrategy,
          }),
        },
      );

      if (res.ok) {
        setIsModalOpen(false);
        setNotification(`Progressive rollout schedule created for '${newFlagKey}' (${newStrategy})! Initial step active.`);
        setTimeout(() => setNotification(null), 5000);
        await fetchSchedules();
      }
    } catch (err) {
      console.error('Failed to create schedule:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvanceStep = async (scheduleId: string) => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/rollouts/${scheduleId}/advance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
        },
      );

      if (res.ok) {
        const json = await res.json();
        setNotification(`Health checks passed! Advanced to next stage (${json.data?.steps?.[json.data?.currentStep]?.percentage || 100}%). Dispatched over SSE.`);
        setTimeout(() => setNotification(null), 5000);
        await fetchSchedules();
      }
    } catch (err) {
      console.error('Failed to advance step:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleControlAction = async (
    scheduleId: string,
    action: 'PAUSE' | 'RESUME' | 'ABORT' | 'FORCE_COMPLETE',
  ) => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/rollouts/${scheduleId}/control`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({ action }),
        },
      );

      if (res.ok) {
        setNotification(`Rollout action '${action}' applied successfully.`);
        setTimeout(() => setNotification(null), 4000);
        await fetchSchedules();
      }
    } catch (err) {
      console.error('Failed to control rollout:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const strategies = [
    {
      id: 'PERCENTAGE',
      name: 'Stepped Percentage',
      icon: Percent,
      description: 'Progressive uniform allocation (10% → 25% → 50% → 100%)',
      tiers: ['10% Initial', '25% Expansion', '50% Majority', '100% Full'],
    },
    {
      id: 'CANARY',
      name: 'Canary Deployment',
      icon: Flame,
      description: 'Micro-tier canary testing (1% → 10% → 50% → 100%)',
      tiers: ['1% Canary', '10% Beta', '50% Standard', '100% Prod'],
    },
    {
      id: 'RING',
      name: 'Ring Architecture',
      icon: Layers,
      description: 'Staged concentric cohorts (Ring 0 QA → Ring 1 Dogfood → Ring 2 Beta → Ring 3 GA)',
      tiers: ['Ring 0 (5%)', 'Ring 1 (20%)', 'Ring 2 (50%)', 'Ring 3 (100%)'],
    },
    {
      id: 'REGIONAL',
      name: 'Regional Rollout',
      icon: Globe,
      description: 'Geographic blast-radius isolation (US-East → US-West → EU → APAC)',
      tiers: ['US-East (25%)', 'US-West (50%)', 'Europe (75%)', 'Global (100%)'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <GitPullRequest className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Progressive Rollout Engine</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
              <Sparkles className="h-3 w-3" /> Automated Health Gating
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Safely deploy feature flags across stepped percentages, canary probes, concentric rings, and geographic regions with autonomous health evaluation and circuit-breaking.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/30"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Staged Rollout</span>
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

      {/* Deployment Strategy Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {strategies.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.id}
              className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold text-white">{s.name}</h3>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">{s.description}</p>
              </div>

              <div className="space-y-1 border-t border-slate-800/60 pt-2.5">
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Stages:</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-300">
                  {s.tiers.map((t, idx) => (
                    <span key={idx} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 truncate">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Rollout Spotlight */}
      {selectedSchedule ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-5">
          {/* Spotlight Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white">
                  Active Rollout: <span className="text-blue-400 font-mono">{selectedSchedule.flagKey}</span>
                </span>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                    selectedSchedule.status === 'RUNNING'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : selectedSchedule.status === 'PAUSED'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : selectedSchedule.status === 'COMPLETED'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {selectedSchedule.status}
                </span>

                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Strategy: {selectedSchedule.strategy}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Environment: <span className="font-mono text-slate-300">{selectedSchedule.environmentKey}</span> • Stage {selectedSchedule.currentStep + 1} of {selectedSchedule.steps.length}
              </p>
            </div>

            {/* Health Badge */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Health Index</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {Math.round(selectedSchedule.healthScore * 100)}%
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Interactive Stage Stepper */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Stage Progression Timeline</span>
              <span className="font-mono text-blue-400 text-[11px]">
                Current Allocation: {selectedSchedule.steps[selectedSchedule.currentStep]?.percentage || 100}%
              </span>
            </div>

            {/* Step Track */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {selectedSchedule.steps.map((step, idx) => {
                const isPast = idx < selectedSchedule.currentStep || step.passed;
                const isCurrent = idx === selectedSchedule.currentStep && selectedSchedule.status !== 'COMPLETED';
                const isDone = selectedSchedule.status === 'COMPLETED';

                return (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-3.5 transition ${
                      isDone || isPast
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : isCurrent
                        ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-950/30'
                        : 'border-slate-800 bg-slate-950/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">STAGE {step.stepNumber + 1}</span>
                      {isDone || isPast ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-700"></span>
                      )}
                    </div>

                    <div className="text-xl font-bold font-mono text-white">
                      {step.percentage}%
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {step.durationMinutes > 0 ? `Duration: ${step.durationMinutes}m` : 'Final Tier'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Health Evaluation Guardrails */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 rounded-xl p-4 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Error Rate Baseline</span>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {(selectedSchedule.healthReport?.errorRate * 100).toFixed(2)}%
                <span className="text-[10px] text-slate-400 ml-1 font-normal">(threshold: &lt;1.0%)</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">P95 Latency Delta</span>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {selectedSchedule.healthReport?.p95LatencyMs.toFixed(1)}ms
                <span className="text-[10px] text-slate-400 ml-1 font-normal">(baseline: 40ms)</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Telemetry Assessment</span>
              <div className="text-xs text-slate-300 mt-0.5 truncate">
                {selectedSchedule.healthReport?.message}
              </div>
            </div>
          </div>

          {/* Manual Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-4">
            <div className="flex items-center gap-2">
              {selectedSchedule.status === 'RUNNING' ? (
                <button
                  onClick={() => handleControlAction(selectedSchedule.id, 'PAUSE')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause Rollout</span>
                </button>
              ) : selectedSchedule.status === 'PAUSED' ? (
                <button
                  onClick={() => handleControlAction(selectedSchedule.id, 'RESUME')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Resume Rollout</span>
                </button>
              ) : null}

              {selectedSchedule.status !== 'ROLLED_BACK' && selectedSchedule.status !== 'COMPLETED' && (
                <button
                  onClick={() => handleControlAction(selectedSchedule.id, 'ABORT')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Emergency Abort (0%)</span>
                </button>
              )}
            </div>

            {selectedSchedule.status !== 'COMPLETED' && selectedSchedule.status !== 'ROLLED_BACK' && (
              <button
                onClick={() => handleAdvanceStep(selectedSchedule.id)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/30"
              >
                <span>Advance to Next Stage</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/20">
          <GitPullRequest className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <div className="text-xs text-slate-300 font-semibold">No Progressive Rollouts Active</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Create a staged deployment schedule to autonomously ramp feature flag traffic with automated health gating.
          </p>
        </div>
      )}

      {/* Modal: Create Staged Rollout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div>
              <h2 className="text-base font-bold text-white">Create Progressive Rollout Schedule</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure a staged deployment strategy with autonomous health verification.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Feature Flag</label>
                <input
                  type="text"
                  value={newFlagKey}
                  onChange={(e) => setNewFlagKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder="e.g. dark-mode-v2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Deployment Strategy</label>
                <select
                  value={newStrategy}
                  onChange={(e) => setNewStrategy(e.target.value as RolloutStrategyType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PERCENTAGE">Stepped Percentage (10% → 25% → 50% → 100%)</option>
                  <option value="CANARY">Canary Probe (1% → 10% → 50% → 100%)</option>
                  <option value="RING">Concentric Ring (Ring 0 QA → Ring 1 Dogfood → Ring 2 Beta → GA)</option>
                  <option value="REGIONAL">Regional Ramp (US-East → US-West → Europe → Global)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateSchedule}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-600/30"
              >
                {actionLoading ? 'Initializing...' : 'Launch Staged Rollout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
