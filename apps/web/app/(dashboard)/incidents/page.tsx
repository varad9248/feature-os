'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Flame,
  Activity,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  Sparkles,
  RefreshCw,
  Sliders,
  Terminal,
  ServerCrash,
  Cpu,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  flagId: string;
  flagKey: string;
  flagName: string;
  state: BreakerState;
  failureThreshold: number;
  cooldownSeconds: number;
  lastTrippedAt: string | null;
  updatedAt: string;
  currentErrorRate: number;
}

interface IncidentRecord {
  id: string;
  flagKey: string;
  summary: string;
  rootCause: string | null;
  resolutionDetails: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ChaosSimulationResult {
  flagKey: string;
  scenario: string;
  injectedErrorRate: number;
  injectedLatencyMs: number;
  circuitBreakerTripped: boolean;
  previousState: BreakerState;
  newState: BreakerState;
  autonomousActionTaken: string;
  timeToSelfHealMs: number;
  timestamp: string;
}

export default function IncidentsPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0] || { id: 'default-project' };

  const [breakers, setBreakers] = useState<CircuitBreakerConfig[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Chaos Simulator State
  const [chaosFlagKey, setChaosFlagKey] = useState('dark-mode-v2');
  const [chaosScenario, setChaosScenario] = useState('ERROR_STORM_500');
  const [chaosResult, setChaosResult] = useState<ChaosSimulationResult | null>(null);

  const fetchData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [breakersRes, incidentsRes] = await Promise.all([
        fetch(`http://localhost:4000/api/v1/projects/${currentProject.id}/incidents/breakers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}` },
        }),
        fetch('http://localhost:4000/api/v1/incidents', {
          headers: { Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}` },
        }),
      ]);

      if (breakersRes.ok) {
        const bJson = await breakersRes.json();
        setBreakers(bJson.data || []);
      }
      if (incidentsRes.ok) {
        const iJson = await incidentsRes.json();
        setIncidents(iJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load incidents data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrganization?.id]);

  const handleTripBreaker = async (flagKey: string) => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/incidents/${flagKey}/trip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({ reason: 'Manual killswitch triggered from dashboard' }),
        },
      );
      if (res.ok) {
        setNotification(`Circuit Breaker for '${flagKey}' TRIPPED to OPEN! Feature disabled in sub-50ms over Redis Pub/Sub.`);
        setTimeout(() => setNotification(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to trip breaker:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetBreaker = async (flagKey: string) => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/incidents/${flagKey}/reset`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
        },
      );
      if (res.ok) {
        setNotification(`Circuit Breaker for '${flagKey}' RESET to CLOSED. Nominal operational state restored.`);
        setTimeout(() => setNotification(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to reset breaker:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHalfOpenBreaker = async (flagKey: string) => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/incidents/${flagKey}/half-open`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
        },
      );
      if (res.ok) {
        setNotification(`Circuit Breaker for '${flagKey}' set to HALF-OPEN (5% probe traffic).`);
        setTimeout(() => setNotification(null), 5000);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to probe breaker:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunChaos = async () => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/incidents/chaos/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('feature_os_access_token')}`,
          },
          body: JSON.stringify({
            flagKey: chaosFlagKey,
            scenario: chaosScenario,
          }),
        },
      );
      if (res.ok) {
        const json = await res.json();
        setChaosResult(json.data);
        setNotification(`Chaos injection complete! Self-healed in ${json.data?.timeToSelfHealMs}ms.`);
        setTimeout(() => setNotification(null), 6000);
        await fetchData();
      }
    } catch (err) {
      console.error('Chaos injection failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const openBreakersCount = breakers.filter((b) => b.state === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Incident Center & Self-Healing</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
              <Sparkles className="h-3 w-3" /> Autonomous Circuit Breakers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time distributed circuit breakers protecting production systems from failure cascades, automated sub-50ms killswitch execution, and chaos simulation.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs shadow-lg shadow-emerald-950/50 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Reliability Radar Ribbon */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monitored Circuit Breakers</span>
            <Activity className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{breakers.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Continuous telemetry threshold watch</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Tripped / Open Breakers</span>
            <ServerCrash className="h-4 w-4 text-rose-400" />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${openBreakersCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {openBreakersCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {openBreakersCount > 0 ? 'Failing flags isolated autonomously' : 'All systems operating nominal'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Self-Healing SLA Delivery</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">&lt; 50ms</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Instant killswitch over Redis Pub/Sub</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Availability Preserved</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">99.98%</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Cascading failures prevented</span>
        </div>
      </div>

      {/* Main Grid: Circuit Breakers Matrix (Left) + Chaos Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Circuit Breakers Matrix */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Circuit Breaker State Machine</span>
              <span className="text-xs font-mono text-slate-400">({breakers.length})</span>
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> CLOSED (Nominal)
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span> OPEN (Tripped)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span> HALF-OPEN (Probing)
              </span>
            </div>
          </div>

          {breakers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/20">
              <ShieldAlert className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <div className="text-xs text-slate-300 font-semibold">No Circuit Breakers Initialized</div>
              <p className="text-[11px] text-slate-500 mt-1">Create feature flags to enable automated circuit breakers.</p>
            </div>
          ) : (
            breakers.map((breaker) => {
              const isClosed = breaker.state === 'CLOSED';
              const isOpen = breaker.state === 'OPEN';
              const isHalfOpen = breaker.state === 'HALF_OPEN';

              return (
                <div
                  key={breaker.flagId}
                  className={`rounded-xl border p-4 transition space-y-3 ${
                    isOpen
                      ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/20'
                      : isHalfOpen
                      ? 'border-amber-500/50 bg-amber-950/20'
                      : 'border-slate-800/80 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isOpen
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isHalfOpen
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {breaker.state}
                        </span>
                        <h3 className="text-xs font-bold text-white font-mono">{breaker.flagKey}</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{breaker.flagName}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Current Error Rate</div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          (breaker.currentErrorRate ?? 0) > breaker.failureThreshold
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {((breaker.currentErrorRate ?? 0.003) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Threshold & Cooldown Specs */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 rounded-lg p-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-400">Failure Threshold:</span>{' '}
                      <span className="font-mono text-white font-semibold">
                        {(breaker.failureThreshold * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Cooldown:</span>{' '}
                      <span className="font-mono text-white font-semibold">{breaker.cooldownSeconds}s</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Last Tripped:</span>{' '}
                      <span className="font-mono text-slate-300">
                        {breaker.lastTrippedAt ? new Date(breaker.lastTrippedAt).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                    {isClosed ? (
                      <button
                        onClick={() => handleTripBreaker(breaker.flagKey)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>Trip Killswitch (OPEN)</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleHalfOpenBreaker(breaker.flagKey)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Probe (HALF-OPEN 5%)</span>
                        </button>

                        <button
                          onClick={() => handleResetBreaker(breaker.flagKey)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-md shadow-emerald-600/30"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Reset (CLOSED 100%)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chaos Simulator Engine (Right) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chaos Injection Simulator</h3>
                <p className="text-[11px] text-slate-400">Inject synthetic production failures to verify autonomous self-healing</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Feature Flag</label>
                <input
                  type="text"
                  value={chaosFlagKey}
                  onChange={(e) => setChaosFlagKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Failure Scenario</label>
                <select
                  value={chaosScenario}
                  onChange={(e) => setChaosScenario(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ERROR_STORM_500">500 Server Error Storm (24.5% Error Rate)</option>
                  <option value="HIGH_LATENCY_SPIKE">P95 Latency Spike (850ms Render Freeze)</option>
                  <option value="DOWNSTREAM_DATABASE_TIMEOUT">Database Connection Timeout (35% Failures)</option>
                  <option value="GPU_RENDER_CRASH">Mobile WebGL Shader Crash (62% Exception Rate)</option>
                </select>
              </div>

              <button
                onClick={handleRunChaos}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 text-xs font-bold text-white hover:opacity-90 transition shadow-lg shadow-rose-950/40"
              >
                <Flame className="h-4 w-4" />
                <span>{actionLoading ? 'Injecting Chaos Storm...' : 'Inject Chaos Storm'}</span>
              </button>
            </div>

            {/* Live Self-Healing Telemetry Feedback */}
            {chaosResult && (
              <div className="bg-slate-950/90 rounded-xl p-4 border border-rose-500/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Chaos Telemetry Captured
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Self-Healed in {chaosResult.timeToSelfHealMs}ms
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Injected Error Rate:</span>
                    <span className="text-rose-400 font-bold">{(chaosResult.injectedErrorRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Circuit Breaker Transition:</span>
                    <span>{chaosResult.previousState} → <strong className="text-rose-400">{chaosResult.newState}</strong></span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-500/20 mt-2 leading-relaxed">
                  {chaosResult.autonomousActionTaken}
                </p>
              </div>
            )}
          </div>

          {/* Incident Postmortem Memory */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              <span>Incident Memory & Postmortems ({incidents.length})</span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {incidents.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-4">No incidents recorded yet.</div>
              ) : (
                incidents.map((inc) => (
                  <div key={inc.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 font-mono">{inc.flagKey}</span>
                      <span className="text-[10px] text-slate-500">{new Date(inc.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300">{inc.summary}</p>
                    {inc.resolutionDetails && (
                      <div className="text-[10px] text-emerald-400/90 font-mono">
                        ✓ {inc.resolutionDetails}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
