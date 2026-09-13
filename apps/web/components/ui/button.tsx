import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]';

    const variants = {
      default: 'bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-sm',
      primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/25 border border-blue-500/50',
      secondary: 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800',
      outline: 'border border-slate-700 bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white',
      destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 border border-rose-500/40',
      ghost: 'hover:bg-slate-800/60 hover:text-slate-100 text-slate-400',
      success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 border border-emerald-500/40',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-7 rounded-md px-2.5 text-[11px]',
      lg: 'h-11 rounded-xl px-6 text-sm',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
