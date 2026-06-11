'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Server,
  RefreshCw,
  Clock,
  AlertTriangle,
  Play,
  RotateCw,
  AlertOctagon,
  LineChart,
  HelpCircle
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { OperationsMetrics } from '@/lib/types';
import { toast } from '@/components/ui/Toaster';

export default function OperationsPage() {
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMetrics = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await api.operations.metrics();
      setMetrics(res.data as OperationsMetrics);
    } catch (err) {
      console.error('Failed to load operations metrics:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Poll metrics every 3 seconds
  useEffect(() => {
    loadMetrics();
    const interval = setInterval(() => {
      loadMetrics(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getHealthBadge = (health: string) => {
    if (health === 'healthy') {
      return <Badge variant="success" className="animate-pulse">Active & Healthy</Badge>;
    }
    return <Badge variant="error">Offline / Timeout</Badge>;
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 4000) return 'text-emerald-400';
    if (latency < 7000) return 'text-amber-400';
    return 'text-red-400';
  };

  const formatLatency = (ms: number) => {
    if (!ms) return '0.0s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Real-time queue diagnostics and message delivery health.
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-emerald-400 uppercase font-mono">Auto-polling active (3s)</span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadMetrics(false)}
          loading={isRefreshing}
          leftIcon={<RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />}
        >
          Refresh Now
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-secondary/30">
              <div />
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Health status card */}
            <Card className="flex flex-col justify-between p-5 hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channel Service</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-4">
                <div className="text-lg font-bold text-foreground mb-1">Mock Service</div>
                {getHealthBadge(metrics.channelHealth)}
              </div>
            </Card>

            {/* Active campaigns card */}
            <Card className="flex flex-col justify-between p-5 hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Campaigns</span>
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-foreground">{metrics.activeCampaigns}</div>
                <p className="text-xs text-muted-foreground mt-1">Currently running in background</p>
              </div>
            </Card>

            {/* Queue size card */}
            <Card className="flex flex-col justify-between p-5 hover:border-cyan-500/30 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Messages</span>
                <LineChart className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-foreground">{metrics.queueSize}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.waitingJobs} waiting • {metrics.activeJobs} active
                </p>
              </div>
            </Card>

            {/* Latency card */}
            <Card className="flex flex-col justify-between p-5 hover:border-amber-500/30 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Latency</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-4">
                <div className={cn("text-3xl font-extrabold", getLatencyColor(metrics.avgLatencyMs))}>
                  {formatLatency(metrics.avgLatencyMs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Simulated delivery network delay</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* BullMQ stats card */}
            <Card className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Server className="w-4.5 h-4.5 text-primary" />
                  BullMQ Queue Performance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Mock Redis queue job tallies and delivery outcome events.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <div className="text-xs text-muted-foreground">Waiting</div>
                  <div className="text-xl font-bold text-foreground mt-1">{metrics.waitingJobs}</div>
                </div>
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <div className="text-xs text-muted-foreground">Active</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">{metrics.activeJobs}</div>
                </div>
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.completedJobs}</div>
                </div>
                <div className="p-4 bg-secondary/20 rounded-xl border border-border/40">
                  <div className="text-xs text-muted-foreground">Failed Jobs</div>
                  <div className="text-xl font-bold text-red-400 mt-1">{metrics.failedJobs}</div>
                </div>
              </div>

              {/* Queue Congestion bar */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Queue Capacity Rate</span>
                  <span className="text-foreground">{metrics.queueSize > 0 ? `${Math.min(100, Math.round(metrics.queueSize * 2))}%` : '0%'}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      metrics.queueSize > 30 ? "bg-red-500" : metrics.queueSize > 10 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, metrics.queueSize * 2)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Congestion index evaluates active load against worker concurrency pool limit of 20.</p>
              </div>
            </Card>

            {/* Callbacks & Errors Card */}
            <Card className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  Fault Tolerance & Callback Logs
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Errors and retries encountered during transmission.</p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-cyan-400" />
                    Retry Events
                  </span>
                  <span className="font-semibold text-cyan-400 text-base">{metrics.retryCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-amber-400" />
                    Callback Failures
                  </span>
                  <span className="font-semibold text-amber-400 text-base">{metrics.callbackFailures}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Permanent Dropouts
                  </span>
                  <span className="font-semibold text-red-400 text-base">{metrics.failedJobsCount}</span>
                </div>
              </div>

              <div className="text-xs bg-secondary/30 p-2.5 rounded-lg border border-border/40 text-muted-foreground leading-relaxed">
                <strong>Fault Handling:</strong> If the webhook callback to XenoCRM times out or returns an error, the BullMQ worker schedules a retry event up to 3 times before listing the job as permanently failed.
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="text-center py-12 text-muted-foreground text-sm">
          Failed to fetch operations metrics.
        </Card>
      )}
    </div>
  );
}

// Inline helper for CSS class merging (since we don't import cn from separate file for typescript safety if it's cleaner)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
