'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flag,
  Radio,
  BarChart3,
  Users,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface ObservabilityOverview {
  systemStatus: string;
  prometheusScraping: boolean;
  activeStreams: number;
  totalBroadcasts: number;
  totalAuditLogs: number;
  auditChainIntegrity: boolean;
  headHash: string;
  monitoredFlags: number;
  activeBreakers: number;
  uptimeSeconds: number;
  memoryUsageMb: number;
}

export default function DashboardOverviewPage() {
  const { activeOrganization } = useAuthStore();
  const [overview, setOverview] = useState<ObservabilityOverview | null>(null);
  const [pendingAiCount, setPendingAiCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchLiveStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [overviewRes, inboxRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/observability/overview', { headers }),
        fetch('http://localhost:4000/api/v1/agents/inbox', { headers }),
      ]);

      if (overviewRes.ok) {
        const json = await overviewRes.json();
        if (json.data) setOverview(json.data);
      }

      if (inboxRes.ok) {
        const json = await inboxRes.json();
        if (Array.isArray(json.data)) {
          const pending = json.data.filter((s: any) => s.status === 'PENDING').length;
          setPendingAiCount(pending);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Health & Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Realtime feature delivery state, telemetry flow, and AI autonomous supervision for{' '}
            <span className="text-white font-medium">{activeOrganization?.name || 'Workspace'}</span>.
          </p>
        </div>

        <button
          onClick={fetchLiveStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/flags"
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm backdrop-blur hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Active Flags</span>
            <Flag className="h-4 w-4 text-blue-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {overview ? overview.monitoredFlags : '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-400">
            {overview ? `${overview.monitoredFlags} in active catalog` : 'Loading...'}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Flags evaluated across environments</div>
        </Link>

        <Link
          href="/dashboard/stream"
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm backdrop-blur hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Realtime Clients</span>
            <Radio className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {overview ? overview.activeStreams : '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-400">
            {overview ? `${overview.totalBroadcasts} SSE broadcasts` : 'SSE Connected'}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Active client streams receiving delta updates</div>
        </Link>

        <Link
          href="/dashboard/observability"
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm backdrop-blur hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Cryptographic Audit Chain</span>
            <ShieldCheck className="h-4 w-4 text-purple-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {overview ? overview.totalAuditLogs : '—'}
          </div>
          <div className="mt-1 text-xs font-semibold text-purple-400">
            {overview?.auditChainIntegrity ? 'Chain Integrity Verified' : 'Checking Chain...'}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">SHA-256 tamper-evident merkle-linked logs</div>
        </Link>

        <Link
          href="/dashboard/ai-inbox"
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm backdrop-blur hover:border-slate-700 transition group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Autonomous AI Insights</span>
            <Bot className="h-4 w-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {pendingAiCount > 0 ? `${pendingAiCount} Pending` : 'All Clear'}
          </div>
          <div className="mt-1 text-xs font-semibold text-amber-400">
            {pendingAiCount > 0 ? 'Review Required' : 'Multi-Agent Swarm Idle'}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">LangGraph 5-agent swarm recommendations</div>
        </Link>
      </div>

      {/* System Status Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-sm font-semibold text-white">
                Platform Runtime Status: {overview?.systemStatus || 'HEALTHY'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic MurmurHash3 evaluations, Redis Pub/Sub, Kafka telemetry, and ClickHouse OLAP warehouse.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div>
              Uptime:{' '}
              <span className="text-white font-semibold">
                {overview ? formatUptime(overview.uptimeSeconds) : '—'}
              </span>
            </div>
            <div>
              Heap:{' '}
              <span className="text-white font-semibold">
                {overview ? `${overview.memoryUsageMb} MB` : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Next.js App Router (Port 3000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Express Core API (Port 4000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            FastAPI AI Swarm (Port 8000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            PostgreSQL 16 + pgvector (Port 5432)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Prometheus Metrics (/metrics)
          </span>
        </div>
      </div>
    </div>
  );
}
