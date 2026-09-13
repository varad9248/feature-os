'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flag,
  Radio,
  BarChart3,
  Users,
  Bot,
  GitPullRequest,
  ShieldAlert,
  ShieldCheck,
  Beaker,
  Activity,
  Settings,
  Loader2,
} from 'lucide-react';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { useAuthStore } from '@/lib/auth-store';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: Activity },
  { name: 'Feature Flags', href: '/dashboard/flags', icon: Flag },
  { name: 'Live Stream', href: '/dashboard/stream', icon: Radio },
  { name: 'Telemetry & Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'AI Cohort Discovery', href: '/dashboard/cohorts', icon: Users },
  { name: 'Multi-Agent AI Inbox', href: '/dashboard/ai-inbox', icon: Bot },
  { name: 'Progressive Rollouts', href: '/dashboard/rollouts', icon: GitPullRequest },
  { name: 'Incident Center & Self-Healing', href: '/dashboard/incidents', icon: ShieldAlert },
  { name: 'A/B Experiments', href: '/dashboard/experiments', icon: Beaker },
  { name: 'Observability & Audit Logs', href: '/dashboard/observability', icon: ShieldCheck },
  { name: 'Settings & Members', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, activeOrganization, isLoading, isAuthenticated, loadSession } = useAuthStore();

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const currentProject = activeOrganization?.projects?.[0];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-3 py-2 mb-6">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/30">
              F
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm text-white">FeatureOS</div>
              <div className="text-[10px] text-slate-400 font-mono">v0.1.0-alpha</div>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/20 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Project:</span>
            <span className="text-xs font-semibold text-white bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              {currentProject ? currentProject.name : 'Loading project...'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              API Gateway (4000)
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              FastAPI AI (8000)
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
