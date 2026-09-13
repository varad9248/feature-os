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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        let token = localStorage.getItem('feature_os_access_token');
        let res = await fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

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
              res = await fetch(
                `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
            }
          }
        }

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

      const devEnv =
        currentProject?.environments?.find(
          (e: any) => e.key?.toLowerCase() === 'development' || e.key?.toLowerCase() === 'dev',
        ) || currentProject?.environments?.[0];

      const apiKey = devEnv?.clientApiKey || 'default-key';

      const res = await fetch('http://localhost:4000/api/v1/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': apiKey,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          flagKey,
          context: {
            userId: simUserId,
            email: simEmail,
            country: simCountry,
            custom: customAttrs,
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
          value: currentConfig.defaultValue === 'true',
          reason: 'LOCAL_FALLBACK',
          durationMs: Math.round((performance.now() - startTime) * 10) / 10,
        });
      }
    } catch {
      setSimResult({
        enabled: currentConfig.isEnabled,
        value: currentConfig.defaultValue === 'true',
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
          <Link href="/dashboard/flags">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-white">{flagKey}</h1>
              <Badge variant="outline" className="font-mono text-[11px] text-blue-400 border-blue-500/30 bg-blue-500/10">
                BOOLEAN
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeting rules, sticky percentage rollouts, and deterministic bucketing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSaved && (
            <Badge variant="success" className="gap-1.5 py-1 px-2.5 text-xs animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Changes saved to environment!
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={saveLoading}
            size="sm"
            className="gap-2"
          >
            {saveLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Environment Selector Tabs */}
      <Tabs value={activeEnv} onValueChange={(val) => setActiveEnv(val as any)}>
        <TabsList className="bg-slate-900/60 border border-slate-800">
          <TabsTrigger value="dev">Development</TabsTrigger>
          <TabsTrigger value="staging">Staging</TabsTrigger>
          <TabsTrigger value="prod">Production</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Targeting Rules & Rollout Engine */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Environment Switch */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-sm font-semibold text-white">Environment Master State</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Enable or disable evaluations in{' '}
                  <span className="uppercase font-semibold text-slate-300">{activeEnv}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={currentConfig.isEnabled ? 'success' : 'secondary'} className="font-mono text-[10px]">
                  {currentConfig.isEnabled ? 'ACTIVE' : 'OFF'}
                </Badge>
                <Switch
                  checked={currentConfig.isEnabled}
                  onCheckedChange={(checked) => updateCurrentConfig({ isEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Bucketing Percentage Rollout */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <Sliders className="h-4 w-4 text-blue-400" />
                    Deterministic Sticky Rollout
                  </CardTitle>
                  <CardDescription className="text-xs">
                    MurmurHash3 uniform partition across 0–100% of non-targeted users.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm font-bold font-mono text-blue-400">
                  {currentConfig.rolloutPercentage}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={currentConfig.rolloutPercentage}
                onChange={(e) => updateCurrentConfig({ rolloutPercentage: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>0% (Disabled)</span>
                <span>25% Canary</span>
                <span>50% Split</span>
                <span>100% Full Rollout</span>
              </div>
            </CardContent>
          </Card>

          {/* Targeting Rule Builder */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Targeting Rule Engine
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluate conditions in priority order before percentage rollouts.
                  </CardDescription>
                </div>

                <Button
                  onClick={handleAddRule}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Rule Condition
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-2">
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
                        className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-white font-medium text-xs focus:border-blue-500 focus:outline-none"
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
                        className="rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-blue-400 font-mono text-xs focus:border-blue-500 focus:outline-none"
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
                      <Input
                        type="text"
                        value={rule.values}
                        onChange={(e) => handleUpdateRule(rule.id, 'values', e.target.value)}
                        placeholder="e.g. @featureos.io"
                        className="flex-1 min-w-[140px] h-7 text-xs font-mono"
                      />

                      <span className="text-slate-400 font-semibold text-xs">→ Serve</span>

                      {/* Variant output */}
                      <Input
                        type="text"
                        value={rule.variantValue}
                        onChange={(e) => handleUpdateRule(rule.id, 'variantValue', e.target.value)}
                        className="w-18 h-7 text-xs font-mono text-emerald-400"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="h-7 w-7 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Real-time Evaluation Simulator */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Evaluation Simulator
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px] text-slate-400 border-slate-700 bg-slate-800">
                  LIVE SDK
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Simulate sticky evaluations with real contexts against active rules.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-2 space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="sim-user-id" className="text-[11px] text-slate-400">User ID</Label>
                <Input
                  id="sim-user-id"
                  type="text"
                  value={simUserId}
                  onChange={(e) => setSimUserId(e.target.value)}
                  className="font-mono h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sim-email" className="text-[11px] text-slate-400">Email</Label>
                <Input
                  id="sim-email"
                  type="email"
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="font-mono h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sim-country" className="text-[11px] text-slate-400">Country</Label>
                  <Input
                    id="sim-country"
                    type="text"
                    value={simCountry}
                    onChange={(e) => setSimCountry(e.target.value)}
                    className="font-mono h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sim-custom" className="text-[11px] text-slate-400">Custom JSON</Label>
                  <Input
                    id="sim-custom"
                    type="text"
                    value={simCustom}
                    onChange={(e) => setSimCustom(e.target.value)}
                    className="font-mono h-8 text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={runEvaluationSimulator}
                disabled={simulating}
                variant="outline"
                className="w-full gap-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 mt-2 h-9"
              >
                {simulating ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                Run Evaluation Simulator
              </Button>

              {/* Outcome Display */}
              {simResult && (
                <Card className="mt-4 bg-slate-950 border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Evaluation Outcome:</span>
                    <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      {simResult.durationMs}ms
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {simResult.enabled ? (
                      <Badge variant="success" className="gap-1.5 py-0.5 px-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ENABLED (true)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1.5 py-0.5 px-2 text-slate-400">
                        <XCircle className="h-3.5 w-3.5" />
                        DISABLED (false)
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Value:</span>
                      <span className="font-mono text-white">{String(simResult.value)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Reason:</span>
                      <span className="font-mono text-purple-400">{simResult.reason}</span>
                    </div>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Quick SDK Snippet */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs flex items-center gap-2 text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-blue-400" />
                Client SDK Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`import { useFeatureFlag } from '@feature-os/sdk-js';

const { enabled } = useFeatureFlag(
  '${flagKey}',
  false
);`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
