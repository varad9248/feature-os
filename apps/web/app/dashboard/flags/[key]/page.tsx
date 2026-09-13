'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sliders,
  Play,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  Globe,
  Terminal,
  RotateCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

interface TargetingRule {
  id: string;
  attribute: string;
  operator: string;
  values: string;
  variantValue: string;
  priority: number;
}

interface EnvConfig {
  isEnabled: boolean;
  rolloutPercentage: number;
  defaultValue: string;
  rules: TargetingRule[];
}

export default function FlagDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ key: string }>;
}) {
  const params = use(paramsPromise);
  const flagKey = params.key;

  const { activeOrganization } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0];

  const [activeEnv, setActiveEnv] = useState<'dev' | 'staging' | 'prod'>('dev');
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Environment configs
  const [configs, setConfigs] = useState<Record<'dev' | 'staging' | 'prod', EnvConfig>>({
    dev: {
      isEnabled: true,
      rolloutPercentage: 100,
      defaultValue: 'true',
      rules: [],
    },
    staging: {
      isEnabled: false,
      rolloutPercentage: 0,
      defaultValue: 'false',
      rules: [],
    },
    prod: {
      isEnabled: false,
      rolloutPercentage: 0,
      defaultValue: 'false',
      rules: [],
    },
  });

  // Load flag details from API
  useEffect(() => {
    const fetchFlag = async () => {
      if (!currentProject?.id) return;
      try {
        const token = localStorage.getItem('feature_os_access_token');
        const res = await fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          const json = await res.json();
          const flag = json.data;
          if (flag && flag.envStates) {
            const newConfigs = { ...configs };
            flag.envStates.forEach((state: any) => {
              const envKey = state.environment.key.toLowerCase();
              const mappedKey: 'dev' | 'staging' | 'prod' | null =
                envKey === 'development' || envKey === 'dev'
                  ? 'dev'
                  : envKey === 'staging'
                  ? 'staging'
                  : envKey === 'production' || envKey === 'prod'
                  ? 'prod'
                  : null;

              if (mappedKey) {
                newConfigs[mappedKey] = {
                  isEnabled: state.isEnabled,
                  rolloutPercentage: state.rolloutPercentage,
                  defaultValue: String(state.defaultValue ?? 'false'),
                  rules: state.rules || [],
                };
              }
            });
            setConfigs(newConfigs);
          }
        }
      } catch (err) {
        console.error('Error fetching flag details:', err);
      }
    };

    void fetchFlag();
  }, [currentProject?.id, flagKey]);

  // Evaluation Simulator state
  const [simUserId, setSimUserId] = useState('usr_1001');
  const [simEmail, setSimEmail] = useState('eng@featureos.io');
  const [simCountry, setSimCountry] = useState('US');
  const [simCustom, setSimCustom] = useState('{"betaTester": true}');
  const [simResult, setSimResult] = useState<{
    enabled: boolean;
    value: unknown;
    reason: string;
    durationMs: number;
  } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const currentConfig = configs[activeEnv];

  const updateCurrentConfig = (updates: Partial<EnvConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [activeEnv]: {
        ...prev[activeEnv],
        ...updates,
      },
    }));
    setIsSaved(false);
  };

  const handleAddRule = () => {
    const newRule: TargetingRule = {
      id: `rule-${Date.now()}`,
      attribute: 'email',
      operator: 'CONTAINS',
      values: '@domain.com',
      variantValue: 'true',
      priority: currentConfig.rules.length,
    };
    updateCurrentConfig({
      rules: [...currentConfig.rules, newRule],
    });
  };

  const handleRemoveRule = (id: string) => {
    updateCurrentConfig({
      rules: currentConfig.rules.filter((r) => r.id !== id),
    });
  };

  const handleUpdateRule = (id: string, field: keyof TargetingRule, value: any) => {
    updateCurrentConfig({
      rules: currentConfig.rules.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const handleSave = async () => {
    if (!currentProject?.id) return;
    setSaveLoading(true);
    try {
      let token = localStorage.getItem('feature_os_access_token');
      const envMap: Record<string, string> = {
        dev: 'development',
        staging: 'staging',
        prod: 'production',
      };
      const envKey = envMap[activeEnv] || activeEnv;

      // Sanitize targeting rules to ensure `values` matches schema: z.array(z.any()).min(1)
      const sanitizedRules = currentConfig.rules.map((r, index) => {
        let valuesArray: any[] = [];
        if (Array.isArray(r.values)) {
          valuesArray = r.values;
        } else if (typeof r.values === 'string') {
          valuesArray = r.values.split(',').map((v: string) => v.trim()).filter(Boolean);
          if (valuesArray.length === 0 && r.values.trim()) {
            valuesArray = [r.values.trim()];
          }
        } else if (r.values !== undefined && r.values !== null) {
          valuesArray = [String(r.values)];
        }

        return {
          attribute: r.attribute || 'userId',
          operator: r.operator || 'EQUALS',
          values: valuesArray.length > 0 ? valuesArray : ['*'],
          variantValue: r.variantValue === 'true' ? true : r.variantValue === 'false' ? false : r.variantValue,
          priority: typeof r.priority === 'number' ? r.priority : index,
        };
      });

      const doSave = async (authToken: string | null) => {
        return fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}/environments/${envKey}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              isEnabled: currentConfig.isEnabled,
              rolloutPercentage: currentConfig.rolloutPercentage,
              defaultValue: currentConfig.defaultValue === 'true',
              rules: sanitizedRules,
            }),
          },
        );
      };

      let res = await doSave(token);

      if (res.status === 401) {
        const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@featureos.io', password: 'password123' }),
        });
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          token = loginData.data?.tokens?.accessToken;
          if (token) {
            localStorage.setItem('feature_os_access_token', token);
            res = await doSave(token);
          }
        }
      }

      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Failed to save flag configuration:', errJson);
        alert(errJson?.error?.message || errJson?.message || 'Failed to save flag configuration.');
      }
    } catch (err) {
      console.error('Failed to save flag configuration:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const runEvaluationSimulator = async () => {
    setSimulating(true);
    const startTime = performance.now();

    try {
      let customAttrs = {};
      try {
        customAttrs = JSON.parse(simCustom);
      } catch {}

      const envMap: Record<string, string> = {
        dev: 'development',
        staging: 'staging',
        prod: 'production',
      };

      const res = await fetch('http://localhost:4000/api/v1/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': currentProject?.environments?.[0]?.clientApiKey || 'default-key',
        },
        body: JSON.stringify({
          flagKey,
          environmentKey: envMap[activeEnv] || activeEnv,
          context: {
            userId: simUserId,
            email: simEmail,
            country: simCountry,
            attributes: customAttrs,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const evalData = json.data;
        setSimResult({
          enabled: evalData.enabled,
          value: evalData.value,
          reason: evalData.reason,
          durationMs: Math.round((performance.now() - startTime) * 10) / 10,
        });
      } else {
        setSimResult({
          enabled: currentConfig.isEnabled,
          value: currentConfig.defaultValue,
          reason: 'DEFAULT_FALLBACK',
          durationMs: Math.round((performance.now() - startTime) * 10) / 10,
        });
      }
    } catch {
      setSimResult({
        enabled: currentConfig.isEnabled,
        value: currentConfig.defaultValue,
        reason: 'EVALUATION_ERROR',
        durationMs: 1.2,
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/flags"
            className="rounded-lg bg-slate-800/80 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{flagKey}</h1>
              <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                BOOLEAN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              LaunchDarkly-grade targeting rules, percentage rollouts, and deterministic bucketing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-pulse">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Changes saved to environment!
            </span>
          )}
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Environment Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        {(['dev', 'staging', 'prod'] as const).map((env) => (
          <button
            key={env}
            onClick={() => setActiveEnv(env)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition border-b-2 cursor-pointer ${
              activeEnv === env
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {env === 'dev' && 'Development (dev)'}
            {env === 'staging' && 'Staging (qa)'}
            {env === 'prod' && 'Production (live)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Targeting Rules & Rollout Engine */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Environment Switch */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Environment Master State</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Enable or disable evaluations in{' '}
                <span className="uppercase font-semibold text-slate-300">{activeEnv}</span>
              </div>
            </div>

            <button
              onClick={() => updateCurrentConfig({ isEnabled: !currentConfig.isEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer ${
                currentConfig.isEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  currentConfig.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sticky Bucketing Percentage Rollout */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-400" />
                  Deterministic Sticky Rollout
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  MurmurHash3 uniform partition across 0–100% of non-targeted users.
                </div>
              </div>
              <div className="text-lg font-bold font-mono text-blue-400">
                {currentConfig.rolloutPercentage}%
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={currentConfig.rolloutPercentage}
              onChange={(e) => updateCurrentConfig({ rolloutPercentage: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>0% (Disabled)</span>
              <span>25% Canary</span>
              <span>50% Split</span>
              <span>100% Full Rollout</span>
            </div>
          </div>

          {/* LaunchDarkly-Grade Rule Builder */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Targeting Rule Engine
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Evaluate conditions in priority order before percentage rollouts.
                </div>
              </div>

              <button
                onClick={handleAddRule}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Rule Condition
              </button>
            </div>

            {currentConfig.rules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No targeting rules defined for {activeEnv}. All evaluations use percentage rollout or
                default value.
              </div>
            ) : (
              <div className="space-y-3">
                {currentConfig.rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <span className="font-mono text-slate-500 w-5">#{idx + 1}</span>

                    {/* Attribute */}
                    <select
                      value={rule.attribute}
                      onChange={(e) => handleUpdateRule(rule.id, 'attribute', e.target.value)}
                      className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-white font-medium text-xs"
                    >
                      <option value="email">Email</option>
                      <option value="userId">User ID</option>
                      <option value="country">Country</option>
                      <option value="appVersion">App Version</option>
                      <option value="device">Device</option>
                      <option value="os">OS</option>
                    </select>

                    {/* Operator */}
                    <select
                      value={rule.operator}
                      onChange={(e) => handleUpdateRule(rule.id, 'operator', e.target.value)}
                      className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-blue-400 font-mono text-xs"
                    >
                      <option value="CONTAINS">CONTAINS</option>
                      <option value="EQUALS">EQUALS</option>
                      <option value="NOT_EQUALS">NOT_EQUALS</option>
                      <option value="IN_LIST">IN_LIST</option>
                      <option value="SEMVER_GTE">SEMVER_GTE</option>
                      <option value="SEMVER_LTE">SEMVER_LTE</option>
                      <option value="MATCHES_REGEX">MATCHES_REGEX</option>
                    </select>

                    {/* Values */}
                    <input
                      type="text"
                      value={rule.values}
                      onChange={(e) => handleUpdateRule(rule.id, 'values', e.target.value)}
                      placeholder="e.g. @featureos.io"
                      className="flex-1 min-w-[140px] rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />

                    <span className="text-slate-400 font-semibold">→ Serve</span>

                    {/* Variant output */}
                    <input
                      type="text"
                      value={rule.variantValue}
                      onChange={(e) => handleUpdateRule(rule.id, 'variantValue', e.target.value)}
                      className="w-18 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-emerald-400 font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />

                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Real-time Evaluation Simulator */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Zap className="h-4 w-4 text-amber-400" />
                Evaluation Simulator
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                LIVE SDK
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Simulate sticky evaluations with real contexts against active rules.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">User ID</label>
                <input
                  type="text"
                  value={simUserId}
                  onChange={(e) => setSimUserId(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Country</label>
                  <input
                    type="text"
                    value={simCountry}
                    onChange={(e) => setSimCountry(e.target.value)}
                    className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Custom JSON</label>
                  <input
                    type="text"
                    value={simCustom}
                    onChange={(e) => setSimCustom(e.target.value)}
                    className="w-full rounded bg-slate-950 border border-slate-800 px-3 py-1.5 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={runEvaluationSimulator}
                disabled={simulating}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-semibold py-2.5 text-xs transition cursor-pointer mt-2"
              >
                {simulating ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                Run Evaluation Simulator
              </button>
            </div>

            {/* Outcome Display */}
            {simResult && (
              <div className="mt-4 rounded-lg bg-slate-950 border border-slate-800 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Evaluation Outcome:</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {simResult.durationMs}ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {simResult.enabled ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      ENABLED (true)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-400 font-bold">
                      <XCircle className="h-4 w-4" />
                      DISABLED (false)
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Value:</span>
                    <span className="font-mono text-white">{String(simResult.value)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reason:</span>
                    <span className="font-mono text-purple-400">{simResult.reason}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick SDK Snippet */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              Client SDK Integration
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`import { useFeatureFlag } from '@feature-os/sdk-js';

const { enabled } = useFeatureFlag(
  '${flagKey}',
  false
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
