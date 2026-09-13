'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { UserPlus, Shield, Trash2, Mail, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

interface MemberRecord {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export default function MembersSettingsPage() {
  const { activeOrganization } = useAuthStore();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!activeOrganization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(`http://localhost:4000/api/v1/orgs/${activeOrganization.id}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        setMembers(json.data || []);
      } else {
        setError('Failed to load organization members');
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Connection to API failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeOrganization?.id) {
      void fetchMembers();
    }
  }, [activeOrganization?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization?.id || !inviteEmail) return;

    setInviteLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(
        `http://localhost:4000/api/v1/orgs/${activeOrganization.id}/members/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
          }),
        },
      );

      if (res.ok) {
        setInviteEmail('');
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
        await fetchMembers();
      } else {
        const json = await res.json();
        setError(json.message || 'Failed to invite member');
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError('Network error during invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!activeOrganization?.id) return;
    try {
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(
        `http://localhost:4000/api/v1/orgs/${activeOrganization.id}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!activeOrganization?.id) return;
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;

    try {
      const token = localStorage.getItem('feature_os_access_token');
      const res = await fetch(
        `http://localhost:4000/api/v1/orgs/${activeOrganization.id}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team Members & RBAC Permissions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage workspace members, roles, and fine-grained permissions for{' '}
            <span className="text-white font-medium">{activeOrganization?.name || 'Workspace'}</span>.
          </p>
        </div>

        <button
          onClick={fetchMembers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
              required
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
            disabled={inviteLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow disabled:opacity-50"
          >
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
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

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading organization members...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No members found.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {members.map((member) => (
              <div
                key={member.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-850/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {(member.user.name || member.user.email).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{member.user.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3 w-3 text-slate-500" />
                      {member.user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <select
                    disabled={member.role === 'OWNER'}
                    value={member.role}
                    onChange={(e) => void handleRoleChange(member.id, e.target.value)}
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
                      onClick={() => void handleRemove(member.id)}
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
        )}
      </div>
    </div>
  );
}
