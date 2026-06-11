'use client';

import { useEffect, useState } from 'react';
import { Filter, Plus, Loader2, Sparkles, Users, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, Button, Textarea, Input, Badge, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Segment, SegmentPreview, Customer } from '@/lib/types';
import { toast } from '@/components/ui/Toaster';
import { cn } from '@/lib/utils';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [segmentName, setSegmentName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);

  const loadSegments = async () => {
    setLoading(true);
    try {
      const res = await api.segments.list();
      setSegments(res.data as Segment[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSegments(); }, []);

  const handlePreview = async () => {
    if (!nlQuery.trim()) return;
    setParsing(true);
    setPreview(null);
    try {
      const res = await api.segments.preview(nlQuery);
      setPreview(res.data as SegmentPreview);
      toast('Segment parsed successfully!', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!segmentName.trim() || !preview) return;
    setSaving(true);
    try {
      await api.segments.create({ name: segmentName, natural_language_query: nlQuery });
      toast('Segment created!', 'success');
      setShowCreate(false);
      setNlQuery('');
      setSegmentName('');
      setPreview(null);
      loadSegments();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const EXAMPLE_QUERIES = [
    'Customers who spent over ₹5000 in the last 90 days',
    'VIP customers from Mumbai who haven\'t ordered in 30 days',
    'New customers who placed only 1 order',
    'Customers with more than 3 orders and tagged as loyal',
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Filter className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold">Segments</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            AI-powered customer segmentation using natural language
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          New Segment
        </Button>
      </div>

      {/* Create Segment Panel */}
      {showCreate && (
        <Card className="mb-8 border-primary/20 bg-primary/5 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold">Create AI Segment</h2>
          </div>

          <div className="mb-4">
            <Textarea
              label="Describe your audience in natural language"
              placeholder="e.g. Customers who spent over ₹5000 in the last 3 months but haven't bought in 30 days"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              rows={3}
            />
            {/* Example queries */}
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setNlQuery(q)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Button
              variant="secondary"
              onClick={handlePreview}
              loading={parsing}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              disabled={!nlQuery.trim()}
            >
              Parse with AI
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setPreview(null); }}>
              Cancel
            </Button>
          </div>

          {/* Preview Result */}
          {preview && (
            <div className="animate-fade-in space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">AI Parsed Successfully</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{preview.explanation}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary text-lg">{preview.estimatedCount.toLocaleString()}</span>
                    <span className="text-muted-foreground">matching customers</span>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-secondary/50 rounded-lg">
                  <code className="text-xs text-cyan-400 font-mono">{preview.sqlFilter}</code>
                </div>
              </div>

              {/* Preview customers */}
              {preview.previewCustomers.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Sample matches:</p>
                  <div className="flex flex-wrap gap-2">
                    {(preview.previewCustomers as Customer[]).map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/30 to-violet-500/30 flex items-center justify-center text-[10px] font-bold text-purple-400">
                          {c.name.charAt(0)}
                        </div>
                        <span>{c.name}</span>
                        <span className="text-muted-foreground">• {c.city}</span>
                      </div>
                    ))}
                    {preview.estimatedCount > preview.previewCustomers.length && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/30 text-xs text-muted-foreground">
                        +{preview.estimatedCount - preview.previewCustomers.length} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Name + Save */}
              <div className="pt-4 border-t border-border/30 flex gap-3">
                <Input
                  placeholder="Give this segment a name..."
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSave} loading={saving} disabled={!segmentName.trim()}>
                  Save Segment
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Segments List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)
        ) : segments.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No segments yet</p>
            <p className="text-sm mt-1">Create your first AI-powered segment above</p>
          </div>
        ) : (
          segments.map((segment) => (
            <Link
              key={segment.id}
              href={`/segments/${segment.id}`}
              className="block group"
            >
              <Card className="h-full hover:border-primary/30 transition-all duration-200 hover:scale-[1.02] hover:glow-purple cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Filter className="w-4 h-4 text-primary" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {segment.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {segment.natural_language_query}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {segment.customer_count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">customers</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(segment.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
