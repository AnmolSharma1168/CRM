export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  total_spent: number;
  order_count: number;
  last_order_date: string | null;
  tags: string[];
  created_at: string;
};

export type Segment = {
  id: string;
  name: string;
  natural_language_query: string;
  sql_filter: string;
  customer_count: number;
  created_at: string;
};

export type MessageChannel = 'whatsapp' | 'sms' | 'email' | 'rcs';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';

export type Campaign = {
  id: string;
  name: string;
  segment_id: string;
  channel: MessageChannel;
  message_content: string;
  status: CampaignStatus;
  cost?: number;
  scheduled_at: string | null;
  launched_at: string | null;
  completed_at: string | null;
  created_at: string;
  segments?: {
    name: string;
    customer_count: number;
    natural_language_query?: string;
  };
  campaign_stats?: CampaignStats;
};

export type CommunicationStatus =
  | 'pending' | 'sent' | 'delivered' | 'opened' | 'read' | 'clicked' | 'failed';

export type Communication = {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: MessageChannel;
  message: string;
  status: CommunicationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  customers?: { name: string; email: string; phone: string };
};

export type CampaignStats = {
  id: string;
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
  roi: number;
  average_order_value: number;
  updated_at: string;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  failure_rate: number;
};

export type MessageVariant = {
  subject?: string;
  body: string;
  preview_text?: string;
};

export type SegmentPreview = {
  sqlFilter: string;
  explanation: string;
  estimatedCount: number;
  previewCustomers: Customer[];
};

export type CampaignInsight = {
  summary: string;
  highlights: string[];
  recommendations: string[];
  revenueImpact?: string;
  suggestedNextCampaign?: string;
};

// ---- Strategist ---------------------------------------------
export type StrategyPrediction = {
  deliveryRate: number;
  openRate: number;
  ctr: number;
  conversionRate: number;
};

export type StrategyMessageVariant = {
  tone: 'Formal' | 'Friendly' | 'Urgent';
  subject?: string;
  body: string;
};

export type CampaignStrategy = {
  strategyName: string;
  segmentName: string;
  naturalLanguageQuery: string;
  sqlFilter: string;
  recommendedChannel: MessageChannel;
  channelExplanation: string;
  predictions: StrategyPrediction;
  variants: StrategyMessageVariant[];
  estimatedCount: number;
};

// ---- Operations ---------------------------------------------
export type OperationsMetrics = {
  activeCampaigns: number;
  queueSize: number;
  waitingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgLatencyMs: number;
  failedJobsCount: number;
  retryCount: number;
  callbackFailures: number;
  channelHealth: 'healthy' | 'offline';
};


