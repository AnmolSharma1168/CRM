'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Users,
  Rocket,
  Megaphone,
  CheckCircle,
  HelpCircle,
  Send,
  TrendingUp,
  Percent,
  Eye,
  MessageSquare,
  FileCode,
  BadgeAlert
} from 'lucide-react';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import type { CampaignStrategy, StrategyMessageVariant } from '@/lib/types';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Re-engage dormant VIP customers',
  'Increase repeat purchases from customers in Bangalore',
  'Clear inventory of winter jackets and hoodies',
  'Improve retention of new customers with 1 order'
];

export default function StrategistPage() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [customCampaignName, setCustomCampaignName] = useState('');
  const [campaignCost, setCampaignCost] = useState<number>(1000);
  const [activeVariantTab, setActiveVariantTab] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<StrategyMessageVariant | null>(null);

  const handleGenerateStrategy = async (promptGoal: string) => {
    const activeGoal = promptGoal || goal;
    if (!activeGoal.trim()) return;
    
    setLoading(true);
    setStrategy(null);
    setSelectedVariant(null);
    try {
      const res = await api.ai.generateStrategy(activeGoal);
      const data = res.data as CampaignStrategy;
      setStrategy(data);
      setCustomCampaignName(data.strategyName || 'My Strategized Campaign');
      
      // Default to first variant (Formal)
      if (data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0]);
        setActiveVariantTab(0);
      }
      toast('AI Strategy generated successfully!', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!strategy || !selectedVariant || !customCampaignName.trim()) return;
    
    setSaving(true);
    try {
      const saveRes = await api.ai.saveStrategy({
        segmentName: strategy.segmentName,
        naturalLanguageQuery: strategy.naturalLanguageQuery,
        sqlFilter: strategy.sqlFilter,
        channel: strategy.recommendedChannel,
        messageContent: selectedVariant.body,
        campaignName: customCampaignName,
        cost: Number(campaignCost),
      });
      
      const campaign = saveRes.data as { id: string };
      toast('Campaign and Segment created successfully!', 'success');
      
      // Redirect to campaign page
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Campaign Strategist</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Enter a business objective and the AI will analyze metrics, build a segment, suggest a channel, and draft the messages.
        </p>
      </div>

      {/* Goal Input Card */}
      <Card className="border-primary/20 bg-primary/5">
        <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
          <Megaphone className="w-4 h-4" />
          What is your business goal?
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Textarea
              placeholder="e.g. Re-engage high value shoppers from Delhi who haven't purchased in the last 2 months"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="pr-10 w-full resize-none"
              rows={2}
            />
          </div>
          <Button
            onClick={() => handleGenerateStrategy('')}
            loading={loading}
            disabled={!goal.trim() || loading}
            leftIcon={<Send className="w-4 h-4" />}
            className="md:self-end h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            Formulate Strategy
          </Button>
        </div>

        {/* Suggestion tags */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setGoal(s);
                  handleGenerateStrategy(s);
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">AI Strategist is analyzing customer data...</p>
            <p className="text-xs text-muted-foreground">Running SQL metrics, comparing benchmarks, and drafting copy</p>
          </div>
        </Card>
      )}

      {/* Strategy Result Container */}
      {strategy && !loading && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Strategy / Overview Card */}
            <Card className="md:col-span-2 space-y-4">
              <div>
                <Badge variant="info" className="mb-2">AI Campaign Proposal</Badge>
                <h3 className="text-xl font-bold text-foreground">{strategy.strategyName}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Automatically tailored campaign targets and configuration to achieve your business objective. Review the segment and forecasted rates below.
                </p>
              </div>

              {/* Segment / Audience Information */}
              <div className="pt-4 border-t border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Target Segment
                  </span>
                  <Badge variant="success" className="text-xs py-0.5 px-2">
                    {strategy.estimatedCount.toLocaleString()} Customers
                  </Badge>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                  <div className="text-sm font-semibold text-foreground">{strategy.segmentName}</div>
                  <div className="text-xs text-muted-foreground mt-1">{strategy.naturalLanguageQuery}</div>
                </div>
                
                {/* SQL Code view */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <FileCode className="w-3 h-3" />
                    PostgreSQL Filter
                  </span>
                  <div className="p-2.5 bg-secondary/80 rounded-md border border-border/50 font-mono text-xs text-cyan-400 overflow-x-auto">
                    {strategy.sqlFilter}
                  </div>
                </div>
              </div>
            </Card>

            {/* Channel Recommendation Card */}
            <Card className="flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  Recommended Channel
                </span>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <span className="text-2xl">
                      {strategy.recommendedChannel === 'email' ? '📧' : 
                       strategy.recommendedChannel === 'whatsapp' ? '💬' : 
                       strategy.recommendedChannel === 'sms' ? '📱' : '✨'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-foreground capitalize">{strategy.recommendedChannel}</div>
                    <Badge variant="default" className="text-[10px] mt-0.5 uppercase tracking-wide">Optimal Channel</Badge>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {strategy.channelExplanation}
                </p>
              </div>

              <div className="pt-4 border-t border-border/40 mt-4">
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Channel optimized for Indian consumer engagement.</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Performance Predictions */}
            <Card className="space-y-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Predicted Performance
              </span>

              <div className="space-y-4">
                {/* Delivery */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Expected Delivery Rate</span>
                    <span className="font-bold text-foreground">{strategy.predictions.deliveryRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${strategy.predictions.deliveryRate}%` }} />
                  </div>
                </div>

                {/* Open */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Expected Open Rate</span>
                    <span className="font-bold text-foreground">{strategy.predictions.openRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${strategy.predictions.openRate}%` }} />
                  </div>
                </div>

                {/* CTR */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Click-Through Rate (CTR)</span>
                    <span className="font-bold text-foreground">{strategy.predictions.ctr}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${strategy.predictions.ctr}%` }} />
                  </div>
                </div>

                {/* Conversion */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-bold text-primary">{strategy.predictions.conversionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${strategy.predictions.conversionRate}%` }} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Message Variants Card */}
            <Card className="md:col-span-2 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message Variations
                </span>

                {/* Tabs */}
                <div className="flex border-b border-border/40 gap-1.5">
                  {strategy.variants.map((v, i) => (
                    <button
                      key={v.tone}
                      onClick={() => {
                        setActiveVariantTab(i);
                        setSelectedVariant(v);
                      }}
                      className={cn(
                        'px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors',
                        activeVariantTab === i
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {v.tone}
                    </button>
                  ))}
                </div>

                {/* Variant Content */}
                {selectedVariant && (
                  <div className="p-3.5 bg-secondary/20 rounded-lg border border-border/30 space-y-2">
                    {selectedVariant.subject && (
                      <div className="text-xs font-bold text-foreground/80">
                        <span className="text-muted-foreground font-normal">Subject:</span> {selectedVariant.subject}
                      </div>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedVariant.body}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-primary" />
                Selected template will be used for campaign delivery.
              </div>
            </Card>
          </div>

          {/* Action Campaign Save Card */}
          <Card className="border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 p-6">
            <div className="flex-1 w-full space-y-1">
              <h4 className="font-bold text-foreground text-base">Ready to deploy the campaign?</h4>
              <p className="text-xs text-muted-foreground">
                One-click will create the {strategy.segmentName} segment and launch this draft campaign.
              </p>
              <div className="pt-2 w-full max-w-md flex gap-4">
                <div className="flex-1">
                  <Input
                    label="Campaign Name"
                    placeholder="Diwali VIP Winback"
                    value={customCampaignName}
                    onChange={(e) => setCustomCampaignName(e.target.value)}
                  />
                </div>
                <div className="w-36">
                  <Input
                    label="Campaign Cost (₹)"
                    type="number"
                    min="1"
                    placeholder="1000"
                    value={campaignCost}
                    onChange={(e) => setCampaignCost(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveCampaign}
              loading={saving}
              disabled={!customCampaignName.trim() || saving}
              leftIcon={<Rocket className="w-4.5 h-4.5" />}
              size="lg"
              className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-purple-500/20"
            >
              Create Campaign & Segment
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
