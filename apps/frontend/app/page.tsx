'use client';

import { useEffect, useState } from 'react';
import { Users, Megaphone, Filter, TrendingUp, Activity, ArrowRight, Zap, Trophy, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, StatCard, Skeleton, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeDate, getStatusColor, getChannelEmoji } from '@/lib/utils';
import type { Campaign, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalCustomers: number;
    totalSpent: number;
    activeCampaigns: number;
    totalSegments: number;
  } | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [dbError, setDbError] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'revenue' | 'conversions' | 'roi' | 'ctr';
    direction: 'asc' | 'desc';
  }>({ key: 'revenue', direction: 'desc' });

  useEffect(() => {
    async function loadData() {
      try {
        const [customersRes, campaignsRes, segmentsRes] = await Promise.all([
          api.customers.list({ pageSize: 5, page: 1 }),
          api.campaigns.list(),
          api.segments.list(),
        ]);

        const campaigns = campaignsRes.data as Campaign[];
        const customers = customersRes.data as Customer[];

        const totalSpent = customers.reduce((sum: number, c: Customer) => sum + (c.total_spent ?? 0), 0);
        const activeCampaigns = campaigns.filter((c: Campaign) => c.status === 'running').length;

        setStats({
          totalCustomers: customersRes.total,
          totalSpent,
          activeCampaigns,
          totalSegments: (segmentsRes.data as unknown[]).length,
        });
        setRecentCampaigns(campaigns.slice(0, 5));
        setRecentCustomers(customers.slice(0, 5));
        setAllCampaigns(campaigns);
      } catch (err) {
        const msg = (err as Error).message ?? '';
        if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('table') || msg.includes('PGRST')) {
          setDbError('Database tables not found. Apply the schema in Supabase then run the seed script.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const requestSort = (key: 'name' | 'revenue' | 'conversions' | 'roi' | 'ctr') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: 'name' | 'revenue' | 'conversions' | 'roi' | 'ctr') => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/40 ml-1.5 inline" />;
    }
    return sortConfig.direction === 'asc' ? (
      <span className="text-primary font-bold ml-1.5">▲</span>
    ) : (
      <span className="text-primary font-bold ml-1.5">▼</span>
    );
  };

  const sortedCampaigns = [...allCampaigns].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aVal: any = 0;
    let bVal: any = 0;

    if (key === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (key === 'revenue') {
      aVal = Number(a.campaign_stats?.total_revenue ?? 0);
      bVal = Number(b.campaign_stats?.total_revenue ?? 0);
    } else if (key === 'conversions') {
      aVal = Number(a.campaign_stats?.total_conversions ?? 0);
      bVal = Number(b.campaign_stats?.total_conversions ?? 0);
    } else if (key === 'roi') {
      aVal = Number(a.campaign_stats?.roi ?? 0);
      bVal = Number(b.campaign_stats?.roi ?? 0);
    } else if (key === 'ctr') {
      const aSent = a.campaign_stats?.total_sent ?? 0;
      const bSent = b.campaign_stats?.total_sent ?? 0;
      aVal = aSent > 0 ? ((a.campaign_stats?.total_clicked ?? 0) / aSent) * 100 : 0;
      bVal = bSent > 0 ? ((b.campaign_stats?.total_clicked ?? 0) / bSent) * 100 : 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const statusVariantMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    running: 'warning',
    completed: 'success',
    failed: 'error',
    scheduled: 'info',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Welcome back. Here's what's happening with your campaigns.</p>
      </div>

      {/* DB Setup Banner */}
      {dbError && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-300 text-sm">Database Setup Required</p>
              <p className="text-amber-200/70 text-xs mt-0.5">
                The database tables haven't been created yet. Follow these steps to initialize:
              </p>
              <ol className="mt-2 space-y-1 text-xs text-amber-200/80 list-decimal list-inside">
                <li>
                  Open{' '}
                  <a
                    href="https://supabase.com/dashboard/project/aoscqszairjhngugjjtn/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-amber-300 hover:text-amber-100"
                  >
                    Supabase SQL Editor ↗
                  </a>
                </li>
                <li>Paste the contents of <code className="bg-amber-900/40 px-1 rounded">apps/backend/src/db/schema.sql</code> and click Run</li>
                <li>Then run <code className="bg-amber-900/40 px-1 rounded">npm run seed -w apps/backend</code> in terminal to add 200 sample customers</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard
              title="Total Customers"
              value={stats?.totalCustomers.toLocaleString('en-IN') ?? '—'}
              subtitle="in your database"
              icon={<Users className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Revenue Tracked"
              value={formatCurrency(stats?.totalSpent ?? 0)}
              subtitle="lifetime orders"
              icon={<TrendingUp className="w-5 h-5" />}
              color="cyan"
            />
            <StatCard
              title="Active Campaigns"
              value={stats?.activeCampaigns ?? 0}
              subtitle="currently running"
              icon={<Megaphone className="w-5 h-5" />}
              color="amber"
            />
            <StatCard
              title="Saved Segments"
              value={stats?.totalSegments ?? 0}
              subtitle="customer groups"
              icon={<Filter className="w-5 h-5" />}
              color="emerald"
            />
          </>
        )}
      </div>

      {/* Top Performing Campaigns Leaderboard */}
      <Card className="mb-8 animate-fade-in p-0 overflow-hidden border-amber-500/10">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-semibold text-sm">Top Performing Campaigns</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Leaderboard of campaigns ranked by revenue, ROI, and click-through rates
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/15">
                <th 
                  className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Campaign Name
                    {getSortIndicator('name')}
                  </div>
                </th>
                <th 
                  className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => requestSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Revenue
                    {getSortIndicator('revenue')}
                  </div>
                </th>
                <th 
                  className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => requestSort('conversions')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Conversions
                    {getSortIndicator('conversions')}
                  </div>
                </th>
                <th 
                  className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => requestSort('roi')}
                >
                  <div className="flex items-center justify-end gap-1">
                    ROI
                    {getSortIndicator('roi')}
                  </div>
                </th>
                <th 
                  className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => requestSort('ctr')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CTR
                    {getSortIndicator('ctr')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No campaigns launched yet.{' '}
                    <Link href="/campaigns/new" className="text-primary hover:underline font-medium">
                      Create a campaign →
                    </Link>
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map((campaign) => {
                  const stats = campaign.campaign_stats;
                  const revenue = stats?.total_revenue ?? 0;
                  const conversions = stats?.total_conversions ?? 0;
                  const roi = stats?.roi ?? 0;
                  const sent = stats?.total_sent ?? 0;
                  const clicked = stats?.total_clicked ?? 0;
                  const ctr = sent > 0 ? (clicked / sent) * 100 : 0;

                  return (
                    <tr 
                      key={campaign.id} 
                      className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl" title={campaign.channel}>
                            {getChannelEmoji(campaign.channel)}
                          </span>
                          <div>
                            <div className="text-sm font-semibold group-hover:text-primary transition-colors">
                              {campaign.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <Badge variant={statusVariantMap[campaign.status] ?? 'default'} className="text-[10px] px-1 py-0 scale-95 origin-left">
                                {campaign.status}
                              </Badge>
                              <span>• {formatRelativeDate(campaign.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-400">
                        {formatCurrency(revenue)}
                      </td>
                      <td className="px-6 py-4 text-right text-cyan-400 font-mono">
                        {conversions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-purple-400 font-semibold font-mono">
                        {Number(roi).toFixed(2)}x
                      </td>
                      <td className="px-6 py-4 text-right text-violet-400 font-mono">
                        {ctr.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Recent Campaigns</h2>
            </div>
            <Link href="/campaigns" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : recentCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No campaigns yet.{' '}
                <Link href="/campaigns/new" className="text-primary hover:underline">Create one →</Link>
              </div>
            ) : (
              recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getChannelEmoji(campaign.channel)}</span>
                    <div>
                      <div className="text-sm font-medium group-hover:text-primary transition-colors">
                        {campaign.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeDate(campaign.created_at)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusVariantMap[campaign.status] ?? 'default'}>
                    {campaign.status}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Customers */}
        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="font-semibold text-sm">Recent Customers</h2>
            </div>
            <Link href="/customers" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : recentCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No customers yet.</div>
            ) : (
              recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-400">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.city}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-emerald-400">
                      {formatCurrency(customer.total_spent)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customer.order_count} orders
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
        {[
          {
            href: '/segments',
            icon: '🔖',
            title: 'Create Segment',
            desc: 'Use AI to describe your audience',
            color: 'border-purple-500/20 hover:border-purple-500/40',
          },
          {
            href: '/campaigns/new',
            icon: '🚀',
            title: 'Launch Campaign',
            desc: 'AI drafts messages for you',
            color: 'border-cyan-500/20 hover:border-cyan-500/40',
          },
          {
            href: '/ai-chat',
            icon: '💬',
            title: 'Chat with XenoAI',
            desc: 'Ask anything about your data',
            color: 'border-emerald-500/20 hover:border-emerald-500/40',
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'p-4 rounded-xl border bg-card/50 transition-all duration-200 hover:scale-[1.02] group',
              action.color
            )}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{action.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{action.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
