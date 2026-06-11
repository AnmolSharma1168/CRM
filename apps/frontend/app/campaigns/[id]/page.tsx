'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Loader2, TrendingUp, CheckCircle,
  Clock, AlertCircle, MousePointerClick, Mail, Eye, Send
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Card, Button, Badge, Skeleton, Progress } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatRelativeDate, getChannelEmoji, getStatusColor } from '@/lib/utils';
import type { Campaign, CampaignStats, Communication, CampaignInsight } from '@/lib/types';
import { toast } from '@/components/ui/Toaster';
import { cn } from '@/lib/utils';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [comms, setComms] = useState<Communication[]>([]);
  const [insight, setInsight] = useState<CampaignInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [campRes, statsRes, commsRes] = await Promise.all([
        api.campaigns.get(id),
        api.campaigns.stats(id),
        api.campaigns.communications(id),
      ]);
      setCampaign(campRes.data as Campaign);
      setStats(statsRes.data as CampaignStats);
      setComms(commsRes.data as Communication[]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll stats every 5s if running
  useEffect(() => {
    if (campaign?.status !== 'running') return;
    const interval = setInterval(() => {
      api.campaigns.stats(id).then((res) => setStats(res.data as CampaignStats));
      api.campaigns.communications(id).then((res) => setComms(res.data as Communication[]));
      api.campaigns.get(id).then((res) => setCampaign(res.data as Campaign));
    }, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, id]);

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await api.ai.campaignInsight(id);
      setInsight(res.data as CampaignInsight);
      toast('AI insight generated!', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleLaunch = async () => {
    try {
      await api.campaigns.launch(id);
      toast('Campaign launched!', 'success');
      loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const statusVariant: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    draft: 'default', scheduled: 'info', running: 'warning', completed: 'success', failed: 'error',
  };

  // Funnel data for chart
  const funnelData = stats ? [
    { name: 'Sent', value: stats.total_sent, color: '#6366f1' },
    { name: 'Delivered', value: stats.total_delivered, color: '#8b5cf6' },
    { name: 'Opened', value: stats.total_opened, color: '#a78bfa' },
    { name: 'Clicked', value: stats.total_clicked, color: '#34d399' },
  ] : [];

  const StatusIcon = ({ status }: { status: string }) => {
    const props = { className: 'w-3.5 h-3.5' };
    switch (status) {
      case 'clicked': return <MousePointerClick {...props} />;
      case 'opened': return <Eye {...props} />;
      case 'delivered': return <CheckCircle {...props} />;
      case 'sent': return <Send {...props} />;
      case 'failed': return <AlertCircle {...props} />;
      default: return <Clock {...props} />;
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{getChannelEmoji(campaign.channel)}</span>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <Badge variant={statusVariant[campaign.status]}>{campaign.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {campaign.segments?.name} • {campaign.segments?.customer_count?.toLocaleString()} customers •{' '}
              {formatDate(campaign.created_at)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button leftIcon={<Send className="w-4 h-4" />} onClick={handleLaunch}>
              Launch Campaign
            </Button>
          )}
          {(campaign.status === 'completed' || campaign.status === 'running') && (
            <Button
              variant="secondary"
              leftIcon={loadingInsight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              onClick={handleGenerateInsight}
              disabled={loadingInsight}
            >
              {loadingInsight ? 'Generating...' : 'Generate AI Insight'}
            </Button>
          )}
        </div>
      </div>

      {/* Live indicator */}
      {campaign.status === 'running' && (
        <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Live — auto-refreshing every 5 seconds
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Sent', value: stats.total_sent, color: 'text-indigo-400', icon: Send },
            { label: 'Delivered', value: stats.total_delivered, sub: `${stats.delivery_rate?.toFixed(1)}%`, color: 'text-purple-400', icon: CheckCircle },
            { label: 'Failed', value: stats.total_failed, sub: `${stats.failure_rate?.toFixed(1)}%`, color: 'text-red-400', icon: AlertCircle },
            { label: 'Opened', value: stats.total_opened, sub: `${stats.open_rate?.toFixed(1)}%`, color: 'text-violet-400', icon: Eye },
            { label: 'Clicked', value: stats.total_clicked, sub: `${stats.click_rate?.toFixed(1)}%`, color: 'text-emerald-400', icon: MousePointerClick },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <Card key={label} className="text-center py-4">
              <Icon className={cn('w-5 h-5 mx-auto mb-2', color)} />
              <div className={cn('text-2xl font-bold', color)}>{value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              {sub && <div className={cn('text-xs font-medium mt-1', color)}>{sub}</div>}
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel Chart */}
        {stats && funnelData.length > 0 && (
          <Card>
            <h2 className="font-semibold text-sm mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Delivery Funnel
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: -10 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f9fafb' }}
                  itemStyle={{ color: '#d1d5db' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Progress bars */}
            <div className="mt-4 space-y-3">
              {stats.total_sent > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Delivery rate</span>
                    <span className="text-purple-400 font-medium">{stats.delivery_rate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.delivery_rate} color="bg-purple-500" />
                </div>
              )}
              {stats.total_delivered > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Open rate</span>
                    <span className="text-violet-400 font-medium">{stats.open_rate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.open_rate} color="bg-violet-500" />
                </div>
              )}
              {stats.total_opened > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Click rate</span>
                    <span className="text-emerald-400 font-medium">{stats.click_rate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.click_rate} color="bg-emerald-500" />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* AI Insight */}
        {insight ? (
          <Card className="border-primary/20 bg-primary/5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Campaign Insight
            </h2>
            <p className="text-sm text-foreground/90 mb-4 leading-relaxed">{insight.summary}</p>
            {insight.highlights.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Findings</div>
                <ul className="space-y-1.5">
                  {insight.highlights.map((h, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-foreground/80">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insight.recommendations.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recommendations</div>
                <ul className="space-y-1.5">
                  {insight.recommendations.map((r, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">→</span>
                      <span className="text-foreground/80">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center text-center py-12">
            <Sparkles className="w-10 h-10 text-primary/30 mb-3" />
            <p className="font-medium text-sm mb-1">AI Insight Available</p>
            <p className="text-xs text-muted-foreground mb-4">
              Get a plain-English performance summary with recommendations
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleGenerateInsight}
              loading={loadingInsight}
            >
              Generate Insight
            </Button>
          </Card>
        )}
      </div>

      {/* Message */}
      <Card className="mb-6">
        <h2 className="font-semibold text-sm mb-3">Message Content</h2>
        <div className="p-3 bg-secondary/50 rounded-lg border border-border/30 text-sm">
          {campaign.message_content}
        </div>
      </Card>

      {/* Communications Log */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-semibold text-sm">Communications Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{comms.length} messages</p>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivered</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {comms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No communications yet. Launch the campaign to start sending.
                  </td>
                </tr>
              ) : (
                comms.slice(0, 100).map((comm) => (
                  <tr key={comm.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium">
                        {(comm as Communication & { customers?: { name: string } }).customers?.name ?? '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className={cn('flex items-center gap-1.5 text-xs font-medium', getStatusColor(comm.status))}>
                        <StatusIcon status={comm.status} />
                        {comm.status}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {comm.sent_at ? formatRelativeDate(comm.sent_at) : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {comm.delivered_at ? formatRelativeDate(comm.delivered_at) : '—'}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {comm.opened_at ? formatRelativeDate(comm.opened_at) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
