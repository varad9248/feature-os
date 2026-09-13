'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { UserPlus, Shield, Trash2, Mail, CheckCircle2 } from 'lucide-react';

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

export default function MembersSettingsPage() {
  const { activeOrganization } = useAuthStore();
  const [members, setMembers] = useState<MemberItem[]>([
    {
      id: 'mem-1',
      name: 'System Admin',
      email: 'admin@featureos.io',
      role: 'OWNER',
      joinedAt: '2026-03-01',
    },
    {
      id: 'mem-2',
      name: 'Sarah Connor',
      email: 'sarah.sre@featureos.io',
      role: 'SRE',
      joinedAt: '2026-03-05',
    },
    {
      id: 'mem-3',
      name: 'Alex Rivera',
      email: 'alex.dev@featureos.io',
      role: 'DEVELOPER',
      joinedAt: '2026-03-08',
    },
    {
      id: 'mem-4',
      name: 'Elena Rostova',
      email: 'elena.pm@featureos.io',
      role: 'PRODUCT_MANAGER',
      joinedAt: '2026-03-10',
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setMembers([
      ...members,
      {
        id: `mem-${Date.now()}`,
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        joinedAt: 'Just now',
      },
    ]);
    setInviteEmail('');
    setInviteSuccess(true);
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    setMembers(
      members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    );
  };

  const handleRemove = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Team Members & RBAC Permissions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage workspace members, roles, and fine-grained permissions for <span className="text-white font-medium">{activeOrganization?.name}</span>.
        </p>
      </div>

      {/* Invite Member Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-blue-400" />
          Invite New Member
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Invitations grant access scoped strictly to this organization and its projects.
        </p>

        <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[240px]">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ADMIN">Admin</option>
              <option value="DEVELOPER">Developer</option>
              <option value="PRODUCT_MANAGER">Product Manager</option>
              <option value="SRE">SRE</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow"
          >
            Send Invitation
          </button>
        </form>

        {inviteSuccess && (
          <div className="mt-3 text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Invitation sent successfully!
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-semibold text-white uppercase tracking-wider">
            Active Members ({members.length})
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            6 RBAC Roles Enforced
          </div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-850/40 transition">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{member.name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-slate-500" />
                    {member.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <select
                  disabled={member.role === 'OWNER'}
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed focus:border-blue-500 focus:outline-none"
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="PRODUCT_MANAGER">Product Manager</option>
                  <option value="SRE">SRE</option>
                  <option value="VIEWER">Viewer</option>
                </select>

                {member.role !== 'OWNER' && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                    title="Remove Member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
