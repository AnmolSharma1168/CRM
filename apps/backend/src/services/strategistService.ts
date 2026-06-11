import { Mistral } from '@mistralai/mistralai';
import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

function getClient(): Mistral {
  if (!MISTRAL_API_KEY) throw createError('Mistral API key not configured', 503);
  return new Mistral({ apiKey: MISTRAL_API_KEY });
}

async function mistralChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getClient();
  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });
  const content = response.choices?.[0]?.message?.content;
  if (!content) throw createError('Mistral returned empty response', 500);
  return typeof content === 'string' ? content : JSON.stringify(content);
}

// SQL injection guard
const FORBIDDEN_SQL_PATTERNS = [
  /\bdrop\b/i, /\bdelete\b/i, /\btruncate\b/i, /\binsert\b/i,
  /\bupdate\b/i, /\balter\b/i, /\bcreate\b/i, /\bgrant\b/i,
  /\brevoke\b/i, /\bexec\b/i, /\bexecute\b/i, /--/, /;/,
  /\/\*/, /xp_/, /\bpg_/i,
];

function guardSql(sql: string): void {
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      throw createError(`Unsafe SQL pattern detected: ${pattern}`, 400);
    }
  }
}

// Database schema description for Mistral prompt
const SCHEMA_CONTEXT = `
You are a SQL and marketing strategist expert for a CRM database (PostgreSQL). The customers table has these columns:
- id (uuid)
- name (text)
- email (text)  
- phone (text)
- city (text) — Indian cities like 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', etc.
- total_spent (numeric) — total amount in Indian Rupees (₹)
- order_count (integer) — number of orders placed
- last_order_date (date) — date of most recent order (NULL if no orders)
- tags (text[]) — array of tags like 'vip', 'loyal', 'at-risk', 'new', 'high-value', 'dormant'
- created_at (timestamptz)

Today's date context: use CURRENT_DATE for relative date calculations.
For array contains: use 'tag_value' = ANY(tags)
For "last X days": use last_order_date >= CURRENT_DATE - INTERVAL 'X days'
For "hasn't bought in X days": use last_order_date < CURRENT_DATE - INTERVAL 'X days' OR last_order_date IS NULL
`.trim();

export async function generateCampaignStrategy(goal: string) {
  const systemPrompt = `${SCHEMA_CONTEXT}\n\nYou are XenoCRM's AI Campaign Strategist. Always respond with valid JSON only, no markdown.`;
  
  const userPrompt = `
Analyze this marketing/business goal:
"${goal}"

Design a complete campaign strategy. Follow these strict rules:
1. Return ONLY a valid JSON object, no wrapping markdown, no ticks.
2. Select the most appropriate customer segment to target.
3. Recommend the best channel ('whatsapp', 'email', 'sms', or 'rcs') and provide a solid explanation of why that channel is optimal for the goal.
4. Predict performance rates: expected delivery rate, open rate, CTR, and conversion rate. (Base these on standard benchmarks: WhatsApp/RCS have higher open rates, Emails are best for long VIP updates, etc.)
5. Generate 3 message templates for the recommended channel: one formal, one friendly, and one urgent. Use {{customer_name}} for personalization.
6. Provide a PostgreSQL WHERE clause (no SELECT, no FROM, no WHERE keyword itself) to filter matching customers.

Expected JSON output format:
{
  "strategyName": "Clean and professional title for the strategy",
  "segmentName": "Name for the segment (e.g. VIP Dormant Spenders)",
  "naturalLanguageQuery": "Plain English description of the targeted customer segment",
  "sqlFilter": "PostgreSQL WHERE clause filter (e.g. 'vip' = ANY(tags) AND total_spent > 5000)",
  "recommendedChannel": "whatsapp" | "email" | "sms" | "rcs",
  "channelExplanation": "Detailed explanation of why this channel is optimal for this goal and segment",
  "predictions": {
    "deliveryRate": 90.0,
    "openRate": 50.0,
    "ctr": 12.0,
    "conversionRate": 3.5
  },
  "variants": [
    {
      "tone": "Formal",
      "subject": "Email subject (only if channel is email, otherwise omit)",
      "body": "Message template body..."
    },
    {
      "tone": "Friendly",
      "subject": "Email subject (only if channel is email, otherwise omit)",
      "body": "Message template body..."
    },
    {
      "tone": "Urgent",
      "subject": "Email subject (only if channel is email, otherwise omit)",
      "body": "Message template body..."
    }
  ]
}
`.trim();

  const text = (await mistralChat(systemPrompt, userPrompt)).trim();
  
  let parsed: any;
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw createError(`Mistral returned invalid JSON for strategy: ${text.slice(0, 200)}`, 500);
  }

  // Guard SQL
  if (parsed.sqlFilter) {
    guardSql(parsed.sqlFilter);
  } else {
    parsed.sqlFilter = "1=1";
  }

  // Count matching customers using execute_segment_query RPC
  let customerCount = 0;
  try {
    const { data, error } = await supabase.rpc('execute_segment_query', {
      where_clause: parsed.sqlFilter
    });
    if (!error && Array.isArray(data)) {
      customerCount = data.length;
    }
  } catch (err) {
    console.error('Failed to run strategist SQL count:', err);
  }

  return {
    ...parsed,
    estimatedCount: customerCount
  };
}

export async function saveCampaignFromStrategy(input: {
  segmentName: string;
  naturalLanguageQuery: string;
  sqlFilter: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  messageContent: string;
  campaignName: string;
  cost?: number;
}) {
  // 1. Get customer count
  let customerCount = 0;
  const { data: customers, error: countError } = await supabase.rpc('execute_segment_query', {
    where_clause: input.sqlFilter
  });
  if (!countError && Array.isArray(customers)) {
    customerCount = customers.length;
  }

  // 2. Insert segment
  const { data: segment, error: segError } = await supabase
    .from('segments')
    .insert({
      name: input.segmentName,
      natural_language_query: input.naturalLanguageQuery,
      sql_filter: input.sqlFilter,
      customer_count: customerCount
    })
    .select()
    .single();

  if (segError || !segment) {
    throw createError(`Failed to save segment: ${segError?.message}`, 500);
  }

  // 3. Insert campaign
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .insert({
      name: input.campaignName,
      segment_id: segment.id,
      channel: input.channel,
      message_content: input.messageContent,
      status: 'draft',
      cost: input.cost ?? 1000.00
    })
    .select()
    .single();

  if (campError || !campaign) {
    throw createError(`Failed to save campaign: ${campError?.message}`, 500);
  }

  return campaign;
}
