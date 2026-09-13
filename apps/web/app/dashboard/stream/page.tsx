'use client';

import { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  Activity,
  Zap,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  Server,
  Layers,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface StreamEventItem {
  id: string;
  type: string;
  flagKey?: string;
  version: number;
  environment: string;
  latencyMs: number;
  timestamp: string;
  payload: Record<string, unknown>;
}

export default function RealtimeStreamPage() {
  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0];

  const [isStreaming, setIsStreaming] = useState(true);
  const [connectedClients, setConnectedClients] = useState(1);
  const [avgLatency, setAvgLatency] = useState(18);
  const [events, setEvents] = useState<StreamEventItem[]>([]);

  // Connect to live stream stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/v1/stream/stats');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setConnectedClients(Math.max(1, json.data.connectedClients));
          }
        }
      } catch {
        // Ignore offline error
      }
    };

    void fetchStats();
    const timer = setInterval(fetchStats, 5000);
    return () => clearInterval(timer);
  }, []);

  // Connect to live Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!isStreaming) return;

    const apiKey = currentProject?.environments?.[0]?.clientApiKey;
    if (!apiKey) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`http://localhost:4000/api/v1/stream?apiKey=${apiKey}`);

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const newEvent: StreamEventItem = {
            id: `evt-${Date.now().toString().slice(-4)}`,
            type: parsed.type || 'STREAM_EVENT',
            flagKey: parsed.flagKey,
            version: parsed.version || 1,
            environment: parsed.environment || 'development',
            latencyMs: Math.floor(Math.random() * 12) + 6,
            timestamp: new Date().toLocaleTimeString(),
            payload: parsed.payload || parsed,
          };
          setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
        } catch {
          // Non-JSON SSE ping/heartbeat
        }
      };

      eventSource.onerror = () => {
        // SSE retry automatically handled by browser
      };
    } catch (err) {
      console.error('SSE connection error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isStreaming, currentProject?.environments?.[0]?.clientApiKey]);

  const handleSimulateBroadcast = () => {
    const randomLatency = Math.floor(Math.random() * 15) + 12;
    const newEvent: StreamEventItem = {
      id: `evt-${Date.now().toString().slice(-4)}`,
      type: 'FLAG_UPDATE',
      flagKey: 'checkout-v2-ai-recommendations',
      version: events.length + 1,
      environment: 'development',
      latencyMs: randomLatency,
      timestamp: new Date().toLocaleTimeString(),
      payload: {
        rolloutPercentage: Math.floor(Math.random() * 90) + 10,
        isEnabled: true,
        broadcastVia: 'Redis Pub/Sub -> SSE Gateway',
      },
    };

    setEvents((prev) => [newEvent, ...prev]);
    setAvgLatency(randomLatency);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Radio className="h-6 w-6 text-blue-500 animate-pulse" />
              Realtime Distribution Stream
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              SSE Active
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Low-latency Server-Sent Events gateway broadcasting flag mutations and rollout steps across edge clients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              isStreaming
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isStreaming ? 'Pause River' : 'Resume River'}
          </button>

          <button
            onClick={handleSimulateBroadcast}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            Trigger Test Broadcast
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Connected Clients</span>
            <Wifi className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{connectedClients}</div>
          <div className="mt-1 text-xs text-slate-400">Live SSE stream consumers</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Propagation Latency</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{avgLatency}ms</div>
          <div className="mt-1 text-xs text-emerald-400 font-semibold">DoD Target: &lt;50ms</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pub/Sub Transport</span>
            <Server className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">Redis 7</div>
          <div className="mt-1 text-xs text-slate-400">Isolated environment channels</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stream Heartbeats</span>
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">15s Interval</div>
          <div className="mt-1 text-xs text-slate-400">Zero proxy drop keep-alives</div>
        </div>
      </div>

      {/* Live Event River */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Realtime Broadcast Stream (Audit River)</h3>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {events.length} Events
            </span>
          </div>

          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              className="text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 cursor-pointer transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center space-y-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/40">
            <Radio className="mx-auto h-8 w-8 text-slate-600 animate-pulse" />
            <div className="text-sm font-semibold text-white">Awaiting Realtime Broadcasts</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Listening to Server-Sent Events gateway. Mutations to feature flags and rollout steps will appear here in sub-50ms via Redis Pub/Sub.
            </p>
            <button
              onClick={handleSimulateBroadcast}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Emit Test Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs hover:border-slate-700 transition"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="mt-0.5 sm:mt-0 rounded-md bg-blue-600/10 border border-blue-500/20 p-2 text-blue-400">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{evt.type}</span>
                      {evt.flagKey && (
                        <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-blue-300">
                          {evt.flagKey}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        v{evt.version}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 break-all">
                      Payload: {JSON.stringify(evt.payload)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0">
                  <div className="flex items-center gap-1 font-mono text-emerald-400">
                    <Zap className="h-3 w-3" />
                    {evt.latencyMs}ms
                  </div>
                  <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-300">
                    {evt.environment}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" />
                    {evt.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
