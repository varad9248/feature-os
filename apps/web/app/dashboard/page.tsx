export default function DashboardOverviewPage() {
  const cards = [
    {
      title: 'Active Flags',
      value: '12',
      change: '+2 this week',
      desc: 'Flags evaluated across environments',
    },
    {
      title: 'Realtime Clients',
      value: '1,420',
      change: 'SSE Connected',
      desc: 'Active client streams receiving delta updates',
    },
    {
      title: 'Evaluations / sec',
      value: '8,950',
      change: 'p95: 1.8ms',
      desc: 'Sub-10ms deterministic evaluations',
    },
    {
      title: 'Autonomous AI Insights',
      value: '3 Pending',
      change: 'Needs Review',
      desc: 'Discovered cohorts & rollout suggestions',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Health & Overview</h1>
        <p className="text-sm text-slate-400 mt-1">
          Realtime feature delivery state, telemetry flow, and AI autonomous supervision.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm backdrop-blur"
          >
            <div className="text-xs font-medium text-slate-400">{c.title}</div>
            <div className="mt-2 text-2xl font-bold text-white">{c.value}</div>
            <div className="mt-1 text-xs font-semibold text-blue-400">{c.change}</div>
            <div className="mt-2 text-[11px] text-slate-500">{c.desc}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold text-white">Phase 01 — Platform Foundation Active</h3>
        <p className="text-xs text-slate-400 mt-1">
          Local infrastructure running: PostgreSQL + pgvector, Redis, Kafka, ClickHouse, Prometheus, and Grafana.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Next.js App Router (3000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Express Core API (4000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            FastAPI AI Service (8000)
          </span>
          <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300">
            Prisma 6 + pgvector (5432)
          </span>
        </div>
      </div>
    </div>
  );
}
