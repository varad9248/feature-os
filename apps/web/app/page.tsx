import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 mb-6">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Enterprise Production Platform Active
      </div>
      <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
        FeatureOS
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-400">
        AI-Native Feature Management & Autonomous Rollout Platform. Telemetry-driven ML cohort discovery, LangGraph multi-agent reasoning, and self-healing progressive delivery.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/25"
        >
          Open Dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
