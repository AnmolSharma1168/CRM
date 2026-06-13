import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs',
        size === 'sm' && 'px-4 py-2 text-[10px]',
        size === 'md' && 'px-5 py-3 text-xs',
        size === 'lg' && 'px-7 py-4 text-sm',
        variant === 'primary' && 'bg-vibrant-teal text-white hover:bg-teal-500/90 shadow-md shadow-teal-500/10 active:scale-95',
        variant === 'secondary' && 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95',
        variant === 'ghost' && 'hover:bg-slate-50 text-slate-500 hover:text-slate-800',
        variant === 'outline' && 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 active:scale-95',
        variant === 'destructive' && 'bg-soft-coral text-vibrant-coral border border-vibrant-coral/20 hover:bg-soft-coral/80 active:scale-95',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

// Card component
interface CardProps {
  className?: string;
  children: React.ReactNode;
  glass?: boolean;
}

export function Card({ className, children, glass }: CardProps) {
  return (
    <div className={cn(
      'rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm',
      glass && 'glass-card',
      className
    )}>
      {children}
    </div>
  );
}

// Badge component
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
      variant === 'default' && 'bg-slate-100 text-slate-600 border-slate-200',
      variant === 'success' && 'bg-soft-lime text-lime-700 border-lime-200/50',
      variant === 'warning' && 'bg-soft-teal text-teal-700 border-teal-200/50',
      variant === 'error' && 'bg-soft-coral text-vibrant-coral border-vibrant-coral/20',
      variant === 'info' && 'bg-soft-teal text-teal-700 border-teal-200/50',
      className
    )}>
      {children}
    </span>
  );
}

// Input component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, leftIcon, className, ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            'w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-vibrant-teal focus:border-vibrant-teal transition-all outline-none',
            leftIcon && 'pl-11',
            error && 'border-vibrant-coral focus:ring-vibrant-coral/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-vibrant-coral font-bold">{error}</p>}
    </div>
  );
}

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <textarea
        className={cn(
          'w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-vibrant-teal focus:border-vibrant-teal transition-all resize-none outline-none',
          error && 'border-vibrant-coral',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-vibrant-coral font-bold">{error}</p>}
    </div>
  );
}

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, error, className, ...props }: SelectProps) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
      <select
        className={cn(
          'w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-vibrant-teal focus:border-vibrant-teal transition-all outline-none',
          error && 'border-vibrant-coral',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-vibrant-coral font-bold">{error}</p>}
    </div>
  );
}

// Stat card
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'purple' | 'cyan' | 'emerald' | 'amber';
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'purple' }: StatCardProps) {
  const iconColorMap = {
    purple: 'bg-soft-teal text-vibrant-teal',
    cyan: 'bg-soft-lime text-vibrant-lime',
    emerald: 'bg-soft-coral text-vibrant-coral',
    amber: 'bg-soft-teal text-vibrant-teal',
  };

  const trendColorMap = {
    purple: 'text-vibrant-teal bg-teal-50',
    cyan: 'text-lime-600 bg-lime-50',
    emerald: 'text-vibrant-coral bg-rose-50',
    amber: 'text-vibrant-teal bg-teal-50',
  };

  return (
    <div className="rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm transition-all duration-300 hover:scale-[1.02] flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <h2 className="text-3xl font-bold font-display text-slate-800 tracking-tight">{value}</h2>
        {subtitle && <p className="text-[10px] text-slate-400 uppercase font-medium">{subtitle}</p>}
        {trend && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded', trendColorMap[color])}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-[10px] text-slate-400 uppercase">{trend.label}</span>
          </div>
        )}
      </div>
      {icon && (
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', iconColorMap[color])}>
          {icon}
        </div>
      )}
    </div>
  );
}

// Skeleton loading
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-2xl', className)} />;
}

// Progress bar
interface ProgressProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

export function Progress({ value, max = 100, color = 'bg-primary', className, showLabel }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('relative h-2.5 bg-slate-100 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
      />
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs text-slate-500 font-bold">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
