// ============================================================
// XenoCRM — Shared TypeScript Types
// ============================================================

// ---- Customer -----------------------------------------------
export interface Customer {
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
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone: string;
  city: string;
  tags?: string[];
}

// ---- Order --------------------------------------------------
export interface Order {
  id: string;
  customer_id: string;
  amount: number;
  product_name: string;
  category: string;
  order_date: string;
  channel: OrderChannel;
  created_at: string;
}

export type OrderChannel = 'online' | 'in-store' | 'app' | 'phone';

export interface CreateOrderInput {
  customer_id: string;
  amount: number;
  product_name: string;
  category: string;
  order_date: string;
  channel: OrderChannel;
}

// ---- Segment ------------------------------------------------
export interface Segment {
  id: string;
  name: string;
  natural_language_query: string;
  sql_filter: string;
  customer_count: number;
  created_at: string;
}

export interface CreateSegmentInput {
  name: string;
  natural_language_query: string;
}

export interface SegmentParseResult {
  sqlFilter: string;
  explanation: string;
  estimatedCount: number;
}

// ---- Campaign -----------------------------------------------
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
export type MessageChannel = 'whatsapp' | 'sms' | 'email' | 'rcs';

export interface Campaign {
  id: string;
  name: string;
  segment_id: string;
  channel: MessageChannel;
  message_content: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  launched_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateCampaignInput {
  name: string;
  segment_id: string;
  channel: MessageChannel;
  message_content: string;
}

export interface MessageVariant {
  subject?: string;
  body: string;
  preview_text?: string;
}

// ---- Communication ------------------------------------------
export type CommunicationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'read'
  | 'clicked'
  | 'failed';

export interface Communication {
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
}

// ---- Campaign Stats -----------------------------------------
export interface CampaignStats {
  id: string;
  campaign_id: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  updated_at: string;
}

export interface CampaignStatsWithRates extends CampaignStats {
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  failure_rate: number;
}

// ---- Channel Service ----------------------------------------
export interface ChannelSendPayload {
  recipient: string;
  message: string;
  channel: MessageChannel;
  communicationId: string;
  callbackUrl: string;
}

export interface ReceiptPayload {
  communicationId: string;
  status: 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';
  timestamp?: string;
}

// ---- AI -----------------------------------------------------
export interface AICampaignInsight {
  summary: string;
  highlights: string[];
  recommendations: string[];
}

// ---- API Response wrapper -----------------------------------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Status transition map (for validation) -----------------
export const STATUS_ORDER: Record<CommunicationStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  read: 4,
  clicked: 5,
  failed: 1, // failed is a terminal state after sent
};
