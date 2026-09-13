'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

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
  const { activeOrganization } = useAuthStore();
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
    if (!currentProject?.id) return;
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
    if (currentProject?.id) {
      void fetchFlags();
    }
  }, [currentProject?.id]);

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
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const res = await fetch(`http://localhost:4000/api/v1/projects/${currentProject.id}/flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: newKey.toLowerCase().replace(/\s+/g, '-'),
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
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(
        `http://localhost:4000/api/v1/projects/${currentProject.id}/flags/${flagKey}/environments/${envKey}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isEnabled: !currentEnabled,
          }),
        },
      );

      if (res.ok) {
        // Optimistic / local update
        setFlags((prev) =>
          prev.map((flag) => {
            if (flag.key !== flagKey) return flag;
            return {
              ...flag,
              envStates: flag.envStates.map((s) =>
                s.environment.key === envKey ? { ...s, isEnabled: !currentEnabled } : s,
              ),
            };
          }),
        );
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Feature Flags</h1>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
              {flags.length} Flags
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Control plane for deterministic sticky evaluations, targeted rule groups, and progressive rollouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFlags}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Feature Flag
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by flag key, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tag.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Flags List Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading feature flags...</div>
        ) : filteredFlags.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Flag className="mx-auto h-8 w-8 text-slate-600" />
            <div className="text-sm font-semibold text-white">No feature flags found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Get started by creating a flag in your project. Flags can be evaluated across development and production environments.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Flag
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Feature Flag</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Development</th>
                  <th className="py-3.5 px-4">Production</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFlags.map((flag) => {
                  const devState = getEnvState(flag, 'development') || getEnvState(flag, 'dev');
                  const prodState = getEnvState(flag, 'production') || getEnvState(flag, 'prod');

                  return (
                    <tr
                      key={flag.id}
                      className="hover:bg-slate-800/30 transition group cursor-pointer"
                    >
                      <td className="py-4 px-4">
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
                          <div className="flex gap-1 mt-2">
                            {flag.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 border border-slate-700 font-mono"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </Link>
                      </td>

                      <td className="py-4 px-4">
                        <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-300">
                          {flag.type}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {devState ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggle(flag.key, devState.environment.key, devState.isEnabled);
                              }}
                              className={`h-5 w-9 rounded-full transition-colors relative cursor-pointer ${
                                devState.isEnabled ? 'bg-blue-600' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform transform mt-0.5 ${
                                  devState.isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {devState.rolloutPercentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {prodState ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggle(flag.key, prodState.environment.key, prodState.isEnabled);
                              }}
                              className={`h-5 w-9 rounded-full transition-colors relative cursor-pointer ${
                                prodState.isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform transform mt-0.5 ${
                                  prodState.isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {prodState.rolloutPercentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        {new Date(flag.updatedAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/dashboard/flags/${flag.key}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Flag Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Flag className="h-4 w-4 text-blue-500" />
                Create New Feature Flag
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFlag} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Flag Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dynamic Price Experiment"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newKey) {
                      setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Flag Key (Unique Identifier)
                </label>
                <input
                  type="text"
                  placeholder="e.g. dynamic-price-exp"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  placeholder="Describe the feature and intended rollout strategy..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Flag Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="BOOLEAN">BOOLEAN</option>
                    <option value="MULTIVARIATE">MULTIVARIATE</option>
                    <option value="JSON">JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="checkout, experiment, ui"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500 transition shadow cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
