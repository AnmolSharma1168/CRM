import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | null): string {
  if (!date) return '—';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return `${Math.floor(diff / 365)}y ago`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function getChannelEmoji(channel: string): string {
  const map: Record<string, string> = {
    whatsapp: '💬',
    sms: '📱',
    email: '📧',
    rcs: '✨',
  };
  return map[channel] ?? '📨';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'text-slate-400',
    scheduled: 'text-cyan-400',
    running: 'text-amber-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
    pending: 'text-slate-400',
    sent: 'text-blue-400',
    delivered: 'text-indigo-400',
    opened: 'text-purple-400',
    read: 'text-violet-400',
    clicked: 'text-emerald-400',
  };
  return map[status] ?? 'text-slate-400';
}
