import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning' | 'purple' | 'blue';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-slate-700 bg-slate-800/80 text-slate-200',
    secondary: 'border-slate-800 bg-slate-900/60 text-slate-400',
    outline: 'border-slate-700 bg-transparent text-slate-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    destructive: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-mono tracking-tight transition-colors select-none',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
