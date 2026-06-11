'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  MessageSquareText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/segments', label: 'Segments', icon: Filter },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquareText, highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-base gradient-text">XenoCRM</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AI-Native</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, highlight }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                highlight && !isActive && 'text-purple-400 hover:text-purple-300'
              )}
            >
              <Icon className={cn(
                'w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110',
                isActive && 'text-primary'
              )} size={18} />
              <span>{label}</span>
              {highlight && (
                <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">AI</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground text-center">
          Powered by <span className="text-primary">Gemini 2.0 Flash</span>
        </div>
      </div>
    </aside>
  );
}
