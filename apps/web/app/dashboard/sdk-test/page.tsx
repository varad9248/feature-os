'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Code2,
  Zap,
  Radio,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Shield,
  ShoppingBag,
  Sliders,
  RefreshCw,
  Layers,
  Activity,
  Send,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  FeatureOSClient,
  FeatureOSProvider,
  useFeatureFlag,
  FeatureGate,
  useFeatureOS,
} from '@feature-os/sdk-js';

// Inner component consumed within FeatureOSProvider
function LiveStorefrontDemo({
  flagKey,
  onToggleBackend,
  toggleLoading,
}: {
  flagKey: string;
  onToggleBackend: () => Promise<void>;
  toggleLoading: boolean;
}) {
  const { client, isReady } = useFeatureOS();
  const evaluation = useFeatureFlag(flagKey, false);

  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [trackCount, setTrackCount] = useState(0);

  const handleTrackConversion = () => {
    if (client) {
      client.track('purchase_completed', {
        amount: 89.99,
        flagKey,
        variant: evaluation.value,
        timestamp: Date.now(),
      });
      setTrackCount((c) => c + 1);
      setConversionSuccess(true);
      setTimeout(() => setConversionSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live SDK Status Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            />
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>SDK Status: {isReady ? 'Ready & Streaming' : 'Initializing...'}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-slate-700">
                  @feature-os/sdk-js v0.1.0
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Evaluation Cache: <span className="text-emerald-400 font-mono">In-Memory Sub-1ms</span>{' '}
                | Transport:{' '}
                <span className="text-blue-400 font-mono">SSE Realtime Delta</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBackend}
              disabled={toggleLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${toggleLoading ? 'animate-spin' : ''}`} />
              Toggle Flag on API & Watch Live Delta
            </button>
          </div>
        </div>
      </div>

      {/* Flag Evaluation Inspection Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 font-medium">Flag Evaluated</div>
          <div className="mt-1 text-sm font-bold font-mono text-blue-400 truncate">{flagKey}</div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">useFeatureFlag hook</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 font-medium">Evaluation State</div>
          <div className="mt-1 flex items-center gap-2">
            {evaluation.enabled ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> ENABLED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-400">
                <XCircle className="h-4 w-4" /> DISABLED
              </span>
            )}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            Value: {String(evaluation.value)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 font-medium">Evaluation Reason</div>
          <div className="mt-1 text-xs font-mono font-bold text-purple-400">
            {evaluation.reason}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            Delta Version: v{evaluation.version}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs text-slate-400 font-medium">Telemetry Tracked</div>
          <div className="mt-1 text-sm font-bold text-amber-400 font-mono">
            {trackCount} Events Sent
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">ClickHouse OLAP Pipeline</div>
        </div>
      </div>

      {/* Storefront Feature Gate Showcase */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Acme Store Checkout (Live Client Application)
              </h3>
              <p className="text-xs text-slate-400">
                Demonstrating conditional rendering driven in real time by @feature-os/sdk-js.
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold border ${
              evaluation.enabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {evaluation.enabled ? 'AI Recommendation Active' : 'Standard Checkout'}
          </span>
        </div>

        {/* Conditional UI based on feature flag */}
        <FeatureGate
          flag={flagKey}
          fallback={
            <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-slate-950/60 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-300">
                Standard Legacy Checkout Layout
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The feature flag <span className="font-mono text-slate-400">{flagKey}</span> is
                currently disabled for this context. Standard product checkout is displayed.
              </p>
              <div className="pt-2">
                <button
                  onClick={onToggleBackend}
                  disabled={toggleLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                >
                  Enable Flag on Backend to Test Real-time Update
                </button>
              </div>
            </div>
          }
        >
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Autonomous AI Dynamic Recommendation (Gate Open)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                Treatment Variant Active
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Personalized AI recommendation engine active for this user cohort. High conversion
              bundle suggested with dynamic discount applied.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/80">
                <div className="text-xs font-semibold text-white">Recommended Add-On</div>
                <div className="text-[11px] text-slate-400 mt-1">Priority Express Support Plan</div>
                <div className="mt-2 text-xs font-bold text-emerald-400">$19.99 / mo</div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/80">
                <div className="text-xs font-semibold text-white">Estimated Lift</div>
                <div className="text-[11px] text-slate-400 mt-1">Bayesian Multi-Armed Bandit</div>
                <div className="mt-2 text-xs font-bold text-blue-400">+18.4% Revenue / User</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                Clicking button emits telemetry event back to Kafka & ClickHouse:
              </div>
              <button
                onClick={handleTrackConversion}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer shadow-md shadow-emerald-600/25"
              >
                <Send className="h-3.5 w-3.5" />
                {conversionSuccess ? 'Recorded in ClickHouse!' : 'Track Conversion Event'}
              </button>
            </div>
          </div>
        </FeatureGate>
      </div>
    </div>
  );
}

export default function SdkTestPage() {
  const { activeOrganization, loadSession } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0];
  const devEnv = currentProject?.environments?.find(
    (e) => e.key.toLowerCase() === 'development' || e.key.toLowerCase() === 'dev',
  ) || currentProject?.environments?.[0];

  const clientApiKey = devEnv?.clientApiKey || 'default-dev-key';

  const [flagKey, setFlagKey] = useState('checkout-v2-ai-recommendations');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [currentFlagState, setCurrentFlagState] = useState<boolean>(true);

  // User context state for live simulation
  const [userId, setUserId] = useState('usr_alice_buyer');
  const [userEmail, setUserEmail] = useState('alice@acmecorp.com');
  const [userCountry, setUserCountry] = useState('US');

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleToggleBackend = async () => {
    if (!currentProject?.id || !devEnv) return;
    setToggleLoading(true);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const newState = !currentFlagState;
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}/environments/${devEnv.key}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isEnabled: newState,
            rolloutPercentage: newState ? 100 : 0,
          }),
        },
      );

      if (res.ok) {
        setCurrentFlagState(newState);
      }
    } catch (err) {
      console.error('Failed to toggle flag on API:', err);
    } finally {
      setToggleLoading(false);
    }
  };

  const client = useMemo(() => {
    return new FeatureOSClient({
      apiKey: clientApiKey,
      baseUrl: 'http://localhost:4000',
      context: {
        userId,
        custom: {
          email: userEmail,
          country: userCountry,
        },
      },
      enableRealtime: true,
      enableExposureTracking: true,
    });
  }, [clientApiKey]);

  useEffect(() => {
    void client.setContext({
      userId,
      custom: {
        email: userEmail,
        country: userCountry,
      },
    });
  }, [client, userId, userEmail, userCountry]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Code2 className="h-6 w-6 text-blue-500" />
              SDK Test Application & Live Playground
            </h1>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
              Client & React SDK
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Live interactive client app testing <span className="text-white font-mono">@feature-os/sdk-js</span> with
            real-time SSE reactivity, MurmurHash3 evaluations, and ClickHouse telemetry.
          </p>
        </div>

        <Link
          href="/dashboard/flags"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition self-start sm:self-auto"
        >
          <span>Flag Catalog</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* User Context & Environment Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="h-3.5 w-3.5 text-blue-400" />
          Simulated Client Context & Target Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Simulated User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">User Email</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Country</label>
            <select
              value={userCountry}
              onChange={(e) => setUserCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="US">US - United States</option>
              <option value="UK">UK - United Kingdom</option>
              <option value="DE">DE - Germany</option>
              <option value="JP">JP - Japan</option>
              <option value="IN">IN - India</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Target Flag Key</label>
            <input
              type="text"
              value={flagKey}
              onChange={(e) => setFlagKey(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mount Real FeatureOSProvider and Inner Component */}
      <FeatureOSProvider
        key={`${userId}-${userEmail}-${userCountry}`}
        client={client}
      >
        <LiveStorefrontDemo
          flagKey={flagKey}
          onToggleBackend={handleToggleBackend}
          toggleLoading={toggleLoading}
        />
      </FeatureOSProvider>
    </div>
  );
}
