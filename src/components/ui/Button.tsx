import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
}

export function Button({ variant = 'primary', icon, className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  const variants: Record<typeof variant, string> = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400 focus-visible:outline-sky-300',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500',
    ghost: 'bg-transparent text-slate-100 hover:bg-slate-800 focus-visible:outline-slate-400'
  } as const;
  return (
    <button className={clsx(base, variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
