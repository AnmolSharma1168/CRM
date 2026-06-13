'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  MessageSquareText,
  Sparkles,
  Activity,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/segments', label: 'Segments', icon: Filter },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/strategist', label: 'AI Strategist', icon: Sparkles, highlight: true },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquareText, highlight: true },
  { href: '/operations', label: 'Ops Dashboard', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 h-[calc(100vh-2rem)] flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-200/50 p-8 shrink-0 m-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-11 h-11 vibrant-teal rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/10">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold font-display tracking-tight text-slate-800">
          VELO<span className="text-teal-500">CRM</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon, highlight }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-4 px-5 py-3.5 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-2xl transition-all font-medium text-sm',
                isActive
                  ? 'bg-teal-50 text-teal-700 font-bold border border-teal-100 shadow-sm'
                  : ''
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-teal-600' : 'text-slate-400'
              )} />
              <span>{label}</span>
              {highlight && (
                <span className={cn(
                  'ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-teal-200/50 text-teal-800' : 'bg-teal-100 text-teal-700'
                )}>AI</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account card */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account</p>
          <p className="text-xs text-slate-600 mb-4">Manage your CRM workspace settings.</p>
          <Link href="/operations">
            <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-800 text-[10px] font-bold rounded-xl hover:bg-slate-100 transition-all uppercase tracking-wider">
              Control Panel
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
