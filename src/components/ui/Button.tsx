import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', icon, size = 'md', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };
  const variants: Record<typeof variant, string> = {
    primary: 'bg-sky-500 text-white hover:bg-sky-400 focus-visible:outline-sky-300',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500',
    ghost: 'bg-transparent text-slate-100 hover:bg-slate-800 focus-visible:outline-slate-400'
  } as const;
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}
