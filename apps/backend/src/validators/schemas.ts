import { z } from 'zod';

// ---- Customers ----------------------------------------------
export const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  city: z.string().min(1).max(100),
  tags: z.array(z.string()).optional().default([]),
});

export const CustomerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  city: z.string().optional(),
  tag: z.string().optional(),
  minSpent: z.coerce.number().optional(),
  maxSpent: z.coerce.number().optional(),
});

// ---- Orders -------------------------------------------------
export const CreateOrderSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  product_name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channel: z.enum(['online', 'in-store', 'app', 'phone']),
});

// ---- Segments -----------------------------------------------
export const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  natural_language_query: z.string().min(1).max(2000),
});

export const SegmentQuerySchema = z.object({
  natural_language_query: z.string().min(1).max(2000),
});

// ---- Campaigns ----------------------------------------------
export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  segment_id: z.string().uuid(),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  message_content: z.string().min(1).max(4000),
  cost: z.number().positive().optional().default(1000.00),
});

export const DraftMessageSchema = z.object({
  segment_id: z.string().uuid(),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  goal: z.string().min(1).max(500),
  segment_name: z.string().optional(),
  customer_count: z.number().optional(),
});

export const CampaignInsightSchema = z.object({
  campaign_id: z.string().uuid(),
});

// ---- Receipts -----------------------------------------------
export const ReceiptSchema = z.object({
  communicationId: z.string().uuid(),
  status: z.enum(['delivered', 'failed', 'opened', 'read', 'clicked']),
  timestamp: z.string().optional(),
});

// ---- Strategist ---------------------------------------------
export const CampaignStrategyInputSchema = z.object({
  goal: z.string().min(1).max(1000),
});

export const SaveStrategyInputSchema = z.object({
  segmentName: z.string().min(1).max(200),
  naturalLanguageQuery: z.string().min(1).max(2000),
  sqlFilter: z.string().min(1).max(4000),
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  messageContent: z.string().min(1).max(4000),
  campaignName: z.string().min(1).max(200),
  cost: z.number().positive().optional().default(1000.00),
});

