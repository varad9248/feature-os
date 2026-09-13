'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';

export function WorkspaceSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeOrganization, organizations, switchOrganization } = useAuthStore();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:bg-slate-800/60 transition text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-md bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Workspace</div>
            <div className="font-semibold text-xs text-white truncate">
              {activeOrganization?.name || 'Select Organization'}
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
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
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
                  alert('Create Organization modal (Phase 02)');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Organization</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
