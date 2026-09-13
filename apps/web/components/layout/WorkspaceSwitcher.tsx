'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Building2, ChevronDown, Check, Plus, X } from 'lucide-react';

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeOrganization, organizations, switchOrganization, loadSession } = useAuthStore();

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch('http://localhost:4000/api/v1/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newOrgName,
          slug,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewOrgName('');
        await loadSession();
      } else {
        const json = await res.json();
        setError(json.message || 'Failed to create organization');
      }
    } catch {
      setError('Connection to API failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:bg-slate-800/60 transition text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Workspace</div>
            <div className="font-semibold text-xs text-white truncate">
              {activeOrganization?.name || 'Acme Corporation'}
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-lg">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Your Organizations
            </div>

            <div className="space-y-1 mt-1">
              {organizations.map((org) => {
                const isSelected = org.id === activeOrganization?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{org.name}</span>
                      <span className="text-[10px] text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {org.role}
                      </span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800 my-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Organization</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* New Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                Create New Organization
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Global Logistics"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-500 transition shadow cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
