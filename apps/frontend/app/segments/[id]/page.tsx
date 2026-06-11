'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Filter, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Badge, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Segment, Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SegmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ segment: Segment; customers: Customer[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.segments.get(id).then((res) => {
      setData(res.data as { segment: Segment; customers: Customer[] });
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;
  const { segment, customers } = data;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => router.back()} className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Filter className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold">{segment.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{segment.natural_language_query}</p>
        </div>
        <Link href={`/campaigns/new`}>
          <Button leftIcon={<Megaphone className="w-4 h-4" />}>
            Campaign with Segment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <div className="text-3xl font-bold text-primary">{segment.customer_count.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">Matching Customers</div>
        </Card>
        <Card className="col-span-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">SQL Filter</div>
          <code className="text-xs text-cyan-400 font-mono break-all">{segment.sql_filter}</code>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Matched Customers ({customers.length})
          </h2>
        </div>
        <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
          {customers.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-secondary/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.city} • {c.email}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald-400">{formatCurrency(c.total_spent)}</div>
                <div className="text-xs text-muted-foreground">{formatRelativeDate(c.last_order_date)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
