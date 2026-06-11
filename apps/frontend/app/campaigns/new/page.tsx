'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Filter, MessageSquare, Rocket,
  CheckCircle, Sparkles, Loader2, Users, Edit3
} from 'lucide-react';
import { Card, Button, Input, Textarea, Select, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { Segment, MessageVariant, MessageChannel } from '@/lib/types';
import { toast } from '@/components/ui/Toaster';
import { getChannelEmoji, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const CHANNELS: { value: MessageChannel; label: string }[] = [
  { value: 'whatsapp', label: '💬 WhatsApp' },
  { value: 'sms', label: '📱 SMS' },
  { value: 'email', label: '📧 Email' },
  { value: 'rcs', label: '✨ RCS' },
];

const STEPS = ['Choose Segment', 'Draft Message', 'Review & Launch'];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [channel, setChannel] = useState<MessageChannel>('whatsapp');
  const [campaignName, setCampaignName] = useState('');
  const [cost, setCost] = useState<number>(1000);
  const [goal, setGoal] = useState('');
  const [variants, setVariants] = useState<MessageVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<MessageVariant | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [editingVariant, setEditingVariant] = useState(false);

  useEffect(() => {
    api.segments.list()
      .then((res) => setSegments(res.data as Segment[]))
      .catch(() => {/* DB not ready yet */});
  }, []);

  const handleDraftMessages = async () => {
    if (!selectedSegment || !goal.trim()) return;
    setDrafting(true);
    setVariants([]);
    setSelectedVariant(null);
    try {
      const res = await api.ai.draftMessage({
        segment_id: selectedSegment.id,
        channel,
        goal,
        segment_name: selectedSegment.name,
        customer_count: selectedSegment.customer_count,
      });
      setVariants(res.data as MessageVariant[]);
      toast('3 message variants drafted by AI!', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setDrafting(false);
    }
  };

  const handleLaunch = async () => {
    if (!selectedSegment || !selectedVariant || !campaignName.trim()) return;
    setLaunching(true);
    try {
      const messageBody = editingVariant ? customMessage : selectedVariant.body;
      // Create campaign
      const campRes = await api.campaigns.create({
        name: campaignName,
        segment_id: selectedSegment.id,
        channel,
        message_content: messageBody,
        cost: Number(cost),
      });
      const campaign = campRes.data as { id: string };
      // Launch it
      await api.campaigns.launch(campaign.id);
      toast(`Campaign launched! Sending to ${selectedSegment.customer_count.toLocaleString()} customers.`, 'success');
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
      setLaunching(false);
    }
  };

  const canAdvanceStep0 = !!selectedSegment && !!campaignName.trim();
  const canAdvanceStep1 = !!selectedVariant || (editingVariant && !!customMessage.trim());

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">New Campaign</h1>
          <p className="text-sm text-muted-foreground">AI-assisted campaign creation</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all',
              i < step && 'bg-emerald-500 text-white',
              i === step && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
              i > step && 'bg-secondary text-muted-foreground'
            )}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              'text-sm font-medium',
              i === step ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px w-8 mx-1', i < step ? 'bg-emerald-500' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Choose Segment */}
      {step === 0 && (
        <div className="animate-fade-in space-y-6">
          <Card>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              Campaign Details
            </h2>
            <div className="space-y-4">
              <Input
                label="Campaign Name"
                placeholder="e.g. Diwali Re-engagement Campaign"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Channel"
                  options={CHANNELS.map(c => ({ value: c.value, label: c.label }))}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as MessageChannel)}
                />
                <Input
                  label="Campaign Cost (₹)"
                  type="number"
                  min="1"
                  placeholder="1000"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Choose Segment
            </h2>
            {segments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No segments yet. <a href="/segments" className="text-primary hover:underline">Create one first →</a>
              </div>
            ) : (
              <div className="space-y-2">
                {segments.map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedSegment(selectedSegment?.id === seg.id ? null : seg)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all duration-200',
                      selectedSegment?.id === seg.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/50 hover:border-border hover:bg-secondary/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{seg.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{seg.natural_language_query}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary font-semibold text-sm shrink-0 ml-3">
                        <Users className="w-3.5 h-3.5" />
                        {seg.customer_count.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Button
            className="w-full"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            disabled={!canAdvanceStep0}
            onClick={() => setStep(1)}
          >
            Continue to Message Drafting
          </Button>
        </div>
      )}

      {/* Step 1: Draft Message */}
      {step === 1 && (
        <div className="animate-fade-in space-y-6">
          <Card>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Message Drafting
            </h2>
            <div className="space-y-4">
              <Textarea
                label="Describe your campaign goal"
                placeholder="e.g. Re-engage dormant customers with a 20% discount offer to win them back before the festive season"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleDraftMessages}
                  loading={drafting}
                  disabled={!goal.trim()}
                  className="flex-1"
                >
                  {drafting ? 'Drafting 3 variants...' : 'Generate 3 Variants with AI'}
                </Button>
              </div>
            </div>
          </Card>

          {variants.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-medium text-muted-foreground">Select a variant:</p>
              {variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedVariant(v); setEditingVariant(false); setCustomMessage(v.body); }}
                  className={cn(
                    'w-full p-4 rounded-xl border text-left transition-all duration-200',
                    selectedVariant === v && !editingVariant
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border/50 hover:border-border hover:bg-secondary/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-primary mb-1.5">
                        Variant {i + 1} {i === 0 ? '(Formal)' : i === 1 ? '(Friendly)' : '(Urgent)'}
                      </div>
                      {v.subject && (
                        <div className="text-xs font-semibold text-foreground/80 mb-1">Subject: {v.subject}</div>
                      )}
                      <p className="text-sm text-foreground">{v.body}</p>
                    </div>
                    {selectedVariant === v && !editingVariant && (
                      <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              ))}

              <button
                onClick={() => { setEditingVariant(true); setSelectedVariant(variants[0]); }}
                className={cn(
                  'w-full p-3 rounded-xl border text-left text-sm transition-all duration-200 flex items-center gap-2',
                  editingVariant
                    ? 'border-primary bg-primary/10'
                    : 'border-dashed border-border/50 hover:border-border text-muted-foreground'
                )}
              >
                <Edit3 className="w-4 h-4" />
                Write custom message
              </button>

              {editingVariant && (
                <Textarea
                  placeholder="Write your custom message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                />
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              disabled={!canAdvanceStep1}
              onClick={() => setStep(2)}
            >
              Review & Launch
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Launch */}
      {step === 2 && (
        <div className="animate-fade-in space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <h2 className="font-semibold mb-5 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              Campaign Summary
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Campaign Name</span>
                <span className="font-semibold">{campaignName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Channel</span>
                <span>{getChannelEmoji(channel)} {channel}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Segment</span>
                <span className="font-semibold">{selectedSegment?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-bold text-primary text-base">
                  {selectedSegment?.customer_count.toLocaleString()}
                </span>
              </div>
              <div className="py-2">
                <div className="text-muted-foreground mb-2">Message</div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border/30 text-sm">
                  {editingVariant ? customMessage : selectedVariant?.body}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              className="flex-1"
              size="lg"
              leftIcon={<Rocket className="w-4 h-4" />}
              onClick={handleLaunch}
              loading={launching}
            >
              {launching ? 'Launching...' : `Launch Campaign to ${selectedSegment?.customer_count.toLocaleString()} Customers`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
