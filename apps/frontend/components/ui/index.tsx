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
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-primary/25',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
        variant === 'outline' && 'border border-border hover:bg-secondary/50 text-foreground',
        variant === 'destructive' && 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
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
      'rounded-xl border border-border/50 bg-card p-5',
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
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variant === 'default' && 'bg-secondary text-muted-foreground',
      variant === 'success' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      variant === 'warning' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      variant === 'error' && 'bg-red-500/10 text-red-400 border border-red-500/20',
      variant === 'info' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
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
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            'w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all',
            leftIcon && 'pl-9',
            error && 'border-destructive focus:ring-destructive/50',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <textarea
        className={cn(
          'w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
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
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <select
        className={cn(
          'w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all',
          error && 'border-destructive',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-card">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
  const colorMap = {
    purple: 'from-purple-500/10 to-violet-500/5 border-purple-500/20',
    cyan: 'from-cyan-500/10 to-blue-500/5 border-cyan-500/20',
    emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-orange-500/5 border-amber-500/20',
  };

  const iconColorMap = {
    purple: 'bg-purple-500/15 text-purple-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };

  return (
    <div className={cn(
      'rounded-xl border p-5 bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      colorMap[color]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-lg', iconColorMap[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton loading
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-lg', className)} />;
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
    <div className={cn('relative h-2 bg-secondary rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', color)}
        style={{ width: `${pct}%` }}
      />
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
