'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Plus, ChevronRight, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, getChannelEmoji } from '@/lib/utils';
import type { Campaign, CampaignStatus } from '@/lib/types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.campaigns.list()
      .then((res) => {
        setCampaigns(res.data as Campaign[]);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const statusVariant: Record<CampaignStatus, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    draft: 'default',
    scheduled: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'error',
  };

  const grouped = {
    running: campaigns.filter((c) => c.status === 'running'),
    draft: campaigns.filter((c) => c.status === 'draft' || c.status === 'scheduled'),
    completed: campaigns.filter((c) => c.status === 'completed' || c.status === 'failed'),
  };

  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{count}</span>
    </div>
  );

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <Link href={`/campaigns/${campaign.id}`} className="block group">
      <Card className="hover:border-primary/30 transition-all duration-200 hover:scale-[1.01] cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="text-3xl">{getChannelEmoji(campaign.channel)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                {campaign.name}
              </h3>
              <Badge variant={statusVariant[campaign.status]}>
                {campaign.status}
              </Badge>
            </div>
            {campaign.segments && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{campaign.segments.name}</span>
                <span>•</span>
                <span>{campaign.segments.customer_count?.toLocaleString()} customers</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {campaign.message_content}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground capitalize">
                via {campaign.channel} • {formatDate(campaign.created_at)}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Megaphone className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold">Campaigns</h1>
          </div>
          <p className="text-muted-foreground text-sm">{campaigns.length} campaigns total</p>
        </div>
        <Link href="/campaigns/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Campaign</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <h3 className="font-semibold text-lg mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Create your first campaign to start reaching customers</p>
          <Link href="/campaigns/new">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Create Campaign</Button>
          </Link>
        </div>
      ) : (
        <>
          {grouped.running.length > 0 && (
            <>
              <SectionHeader title="Active" count={grouped.running.length} />
              <div className="space-y-3">
                {grouped.running.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </>
          )}
          {grouped.draft.length > 0 && (
            <>
              <SectionHeader title="Draft / Scheduled" count={grouped.draft.length} />
              <div className="space-y-3">
                {grouped.draft.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </>
          )}
          {grouped.completed.length > 0 && (
            <>
              <SectionHeader title="Completed" count={grouped.completed.length} />
              <div className="space-y-3">
                {grouped.completed.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
