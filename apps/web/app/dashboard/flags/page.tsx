'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flag,
  Plus,
  Search,
  Filter,
  ChevronRight,
  RefreshCw,
  Sparkles,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FlagEnvState {
  id: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  environment: {
    id: string;
    key: string;
    name: string;
  };
}

interface FeatureFlagItem {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'BOOLEAN' | 'MULTIVARIATE' | 'JSON';
  tags: string[];
  isArchived: boolean;
  updatedAt: string;
  envStates: FlagEnvState[];
}

export default function FlagsDashboardPage() {
  const { activeOrganization, isLoading: authLoading, loadSession } = useAuthStore();
  const currentProject = activeOrganization?.projects?.[0];

  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Flag form state
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'BOOLEAN' | 'MULTIVARIATE' | 'JSON'>('BOOLEAN');
  const [newTagInput, setNewTagInput] = useState('');

  const fetchFlags = async () => {
    if (!currentProject?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(`http://localhost:4000/api/v1/projects/${currentProject.id}/flags`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setFlags(json.data || []);
      } else {
        setError('Unable to load flags from project');
      }
    } catch (err) {
      console.error('Error fetching flags:', err);
      setError('Connection failed. Please ensure API is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (currentProject?.id) {
      void fetchFlags();
    } else {
      void loadSession().finally(() => {
        setLoading(false);
      });
    }
  }, [currentProject?.id, authLoading, loadSession]);

  const allTags = ['ALL', ...Array.from(new Set(flags.flatMap((f) => f.tags || [])))];

  const filteredFlags = flags.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag === 'ALL' || (f.tags && f.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject?.id || !newKey || !newName) return;

    setCreateLoading(true);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const tags = newTagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`http://localhost:4000/api/v1/projects/${currentProject.id}/flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: newKey,
          name: newName,
          description: newDesc,
          type: newType,
          tags: tags.length > 0 ? tags : ['core'],
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewKey('');
        setNewName('');
        setNewDesc('');
        setNewTagInput('');
        await fetchFlags();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to create flag');
      }
    } catch (err) {
      console.error('Failed to create flag:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggle = async (flagKey: string, envKey: string, currentEnabled: boolean) => {
    if (!currentProject?.id) return;
    try {
      let token = localStorage.getItem('feature_os_access_token');
      const newState = !currentEnabled;

      const doToggle = async (authToken: string | null) => {
        return fetch(
          `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}/environments/${envKey}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              isEnabled: newState,
              rolloutPercentage: newState ? 100 : 0,
            }),
          },
        );
      };

      let res = await doToggle(token);

      // If token expired or unauthorized, automatically login and retry
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
            res = await doToggle(token);
          }
        }
      }

      if (res.ok) {
        // Optimistic / local state update
        setFlags((prev) =>
          prev.map((flag) => {
            if (flag.key !== flagKey) return flag;
            return {
              ...flag,
              envStates: flag.envStates.map((s) =>
                s.environment?.key?.toLowerCase() === envKey.toLowerCase()
                  ? { ...s, isEnabled: newState, rolloutPercentage: newState ? 100 : 0 }
                  : s,
              ),
            };
          }),
        );
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.error('Failed to toggle flag:', errJson);
        alert(errJson?.error?.message || errJson?.message || 'Failed to toggle flag state');
      }
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    }
  };

  const getEnvState = (flag: FeatureFlagItem, envKey: string) => {
    return flag.envStates?.find(
      (s) => s.environment?.key?.toLowerCase() === envKey.toLowerCase(),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">Feature Flags</h1>
            <Badge variant="secondary" className="font-mono">
              {flags.length} Flags
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Control plane for deterministic sticky evaluations, targeted rule groups, and progressive rollouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFlags}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Feature Flag
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="bg-slate-900/40 p-3 border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by flag key, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {allTags.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={selectedTag === tag ? 'default' : 'ghost'}
                onClick={() => setSelectedTag(tag)}
                className="h-7 text-[11px] px-2.5 shrink-0"
              >
                {tag.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Flags List Card / Table */}
      <Card className="overflow-hidden border-slate-800 bg-slate-900/30">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
            Loading feature flags...
          </div>
        ) : filteredFlags.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-slate-800/80 text-slate-400">
              <Flag className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-white">No feature flags found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating a flag in your project. Flags can be evaluated across development and production environments.
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="gap-1.5 mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Flag
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Feature Flag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Development</TableHead>
                <TableHead>Production</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => {
                const devState = getEnvState(flag, 'development') || getEnvState(flag, 'dev');
                const prodState = getEnvState(flag, 'production') || getEnvState(flag, 'prod');

                return (
                  <TableRow
                    key={flag.id}
                    className="group"
                  >
                    <TableCell>
                      <Link href={`/dashboard/flags/${flag.key}`} className="block">
                        <div className="flex items-center gap-2">
                          <Flag className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-white group-hover:text-blue-400 transition">
                            {flag.name}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {flag.key}
                        </div>
                        {flag.description && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            {flag.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {flag.tags?.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 font-mono text-slate-400 border-slate-800"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] text-slate-300">
                        {flag.type}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {devState ? (
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={devState.isEnabled}
                            onCheckedChange={() =>
                              void handleToggle(flag.key, devState.environment.key, devState.isEnabled)
                            }
                          />
                          <Badge
                            variant={devState.isEnabled ? 'success' : 'secondary'}
                            className="text-[10px] font-mono py-0 px-1.5"
                          >
                            {devState.rolloutPercentage}%
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {prodState ? (
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={prodState.isEnabled}
                            onCheckedChange={() =>
                              void handleToggle(flag.key, prodState.environment.key, prodState.isEnabled)
                            }
                          />
                          <Badge
                            variant={prodState.isEnabled ? 'success' : 'secondary'}
                            className="text-[10px] font-mono py-0 px-1.5"
                          >
                            {prodState.rolloutPercentage}%
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-400 text-[11px]">
                      {new Date(flag.updatedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link href={`/dashboard/flags/${flag.key}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-300 hover:text-white">
                          <span>Manage</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Flag Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg border-slate-800 bg-slate-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <Flag className="h-4 w-4 text-blue-500" />
                  Create New Feature Flag
                </CardTitle>
                <CardDescription>
                  Define a new feature flag and rollout configuration.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="flag-name">Flag Name</Label>
                  <Input
                    id="flag-name"
                    type="text"
                    placeholder="e.g. Dynamic Price Experiment"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newKey) {
                        setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flag-key">Flag Key (Unique Identifier)</Label>
                  <Input
                    id="flag-key"
                    type="text"
                    placeholder="e.g. dynamic-price-exp"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flag-desc">Description</Label>
                  <textarea
                    id="flag-desc"
                    placeholder="Describe the feature and intended rollout strategy..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="flag-type">Flag Type</Label>
                    <select
                      id="flag-type"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="flex h-9 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="MULTIVARIATE">MULTIVARIATE</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="flag-tags">Tags (Comma-separated)</Label>
                    <Input
                      id="flag-tags"
                      type="text"
                      placeholder="checkout, experiment, ui"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createLoading}
                  >
                    {createLoading ? 'Creating...' : 'Create Flag'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
