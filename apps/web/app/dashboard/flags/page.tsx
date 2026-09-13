'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flag,
  Plus,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'BOOLEAN' | 'MULTIVARIATE' | 'JSON';
  tags: string[];
  isArchived: boolean;
  updatedAt: string;
  environments: {
    dev: { enabled: boolean; rollout: number };
    staging: { enabled: boolean; rollout: number };
    prod: { enabled: boolean; rollout: number };
  };
}

const initialFlags: FeatureFlag[] = [
  {
    id: '1',
    key: 'dark-mode-v2',
    name: 'Dark Mode Experience 2.0',
    description: 'Next-gen OLED dark mode with adaptive ambient color system and glow tokens',
    type: 'BOOLEAN',
    tags: ['ui', 'theme', 'client'],
    isArchived: false,
    updatedAt: 'Just now',
    environments: {
      dev: { enabled: true, rollout: 100 },
      staging: { enabled: true, rollout: 50 },
      prod: { enabled: true, rollout: 25 },
    },
  },
  {
    id: '2',
    key: 'autonomous-remediation',
    name: 'Autonomous Self-Healing Trigger',
    description: 'AI-agent automated rollback on P99 latency anomalies or error rate spikes',
    type: 'BOOLEAN',
    tags: ['sre', 'ai', 'resilience'],
    isArchived: false,
    updatedAt: '12m ago',
    environments: {
      dev: { enabled: true, rollout: 100 },
      staging: { enabled: true, rollout: 100 },
      prod: { enabled: false, rollout: 0 },
    },
  },
  {
    id: '3',
    key: 'checkout-v3-multi-currency',
    name: 'Universal Multi-Currency Checkout',
    description: 'Stripe + Adyen zero-conversion dynamic currency checkout widget',
    type: 'MULTIVARIATE',
    tags: ['payments', 'revenue'],
    isArchived: false,
    updatedAt: '2h ago',
    environments: {
      dev: { enabled: true, rollout: 100 },
      staging: { enabled: false, rollout: 0 },
      prod: { enabled: false, rollout: 0 },
    },
  },
];

export default function FlagsDashboardPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Flag form state
  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'BOOLEAN' | 'MULTIVARIATE' | 'JSON'>('BOOLEAN');
  const [newTagInput, setNewTagInput] = useState('');

  const allTags = ['ALL', ...Array.from(new Set(flags.flatMap((f) => f.tags)))];

  const filteredFlags = flags.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'ALL' || f.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const handleCreateFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newName) return;

    const tags = newTagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const createdFlag: FeatureFlag = {
      id: String(Date.now()),
      key: newKey.toLowerCase().replace(/\s+/g, '-'),
      name: newName,
      description: newDesc,
      type: newType,
      tags: tags.length > 0 ? tags : ['core'],
      isArchived: false,
      updatedAt: 'Just now',
      environments: {
        dev: { enabled: true, rollout: 100 },
        staging: { enabled: false, rollout: 0 },
        prod: { enabled: false, rollout: 0 },
      },
    };

    setFlags([createdFlag, ...flags]);
    setIsModalOpen(false);
    setNewKey('');
    setNewName('');
    setNewDesc('');
    setNewTagInput('');
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

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Feature Flag
        </button>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Feature Flag</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Development</th>
                <th className="py-3.5 px-4">Staging</th>
                <th className="py-3.5 px-4">Production</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFlags.map((flag) => (
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
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">{flag.key}</div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {flag.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 border border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-300">
                      <Layers className="h-3 w-3 text-slate-400" />
                      {flag.type}
                    </span>
                  </td>

                  {/* Dev Env */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {flag.environments.dev.enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {flag.environments.dev.rollout}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Off
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Staging Env */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {flag.environments.staging.enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {flag.environments.staging.rollout}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Off
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Prod Env */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {flag.environments.prod.enabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {flag.environments.prod.rollout}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Off
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {flag.updatedAt}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <Link
                      href={`/dashboard/flags/${flag.key}`}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 px-2.5 py-1.5 rounded-lg text-xs transition"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Configure
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Flag Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-blue-600/20 p-2 text-blue-400 border border-blue-500/30">
                  <Flag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Feature Flag</h3>
                  <p className="text-xs text-slate-400">Provision flag across all workspace environments</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Flag Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Copilot Summarizer"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newKey) {
                      setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Flag Key (Kebab Case) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9-_.]+$"
                  placeholder="ai-copilot-summarizer"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Unique identifier used in SDK calls</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the rollout intent, business justification, or Jira ticket..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Flag Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="BOOLEAN">Boolean (true / false)</option>
                    <option value="MULTIVARIATE">Multivariate (A/B/n)</option>
                    <option value="JSON">JSON Configuration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tags</label>
                  <input
                    type="text"
                    placeholder="ui, beta, experimental"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition cursor-pointer"
                >
                  Create & Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
