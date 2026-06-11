import { Mistral } from '@mistralai/mistralai';
import { createError } from '../middleware/errorHandler';
import { supabase } from '../db/supabase';
import type { MessageVariant, CampaignStatsWithRates } from '@xeno-crm/shared';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

if (!MISTRAL_API_KEY) {
  console.warn('⚠️  MISTRAL_API_KEY not set — AI features will be disabled');
}

function getClient(): Mistral {
  if (!MISTRAL_API_KEY) throw createError('Mistral API key not configured', 503);
  return new Mistral({ apiKey: MISTRAL_API_KEY });
}

// ---- SQL injection guard ------------------------------------
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

// ---- DB Schema context -------------------------------------
const SCHEMA_CONTEXT = `
You are a SQL expert for a CRM database (PostgreSQL). The customers table has these columns:
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

// ---- Helper: call Mistral chat ------------------------------
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

// ---- 1. NL → SQL Segment Parser ----------------------------
export async function parseSegmentQuery(naturalLanguageQuery: string): Promise<{
  sqlFilter: string;
  explanation: string;
}> {
  const systemPrompt = SCHEMA_CONTEXT;

  const userPrompt = `
Convert this natural language customer segment description into a PostgreSQL WHERE clause:
"${naturalLanguageQuery}"

Rules:
1. Return ONLY a JSON object with exactly two fields: "sqlFilter" and "explanation"
2. "sqlFilter" must be a valid PostgreSQL WHERE clause (no SELECT, no FROM, no WHERE keyword itself)
3. "explanation" is a human-readable description of what the filter does
4. Never use subqueries that reference other tables
5. For rupee amounts, treat numbers as-is (₹5000 = 5000)
6. If the query is ambiguous, make a reasonable interpretation

Example response:
{"sqlFilter": "total_spent > 5000 AND last_order_date >= CURRENT_DATE - INTERVAL '90 days'", "explanation": "Customers who spent over ₹5,000 and ordered in the last 3 months"}

Now respond with JSON only, no markdown:
`.trim();

  const text = (await mistralChat(systemPrompt, userPrompt)).trim();

  let parsed: { sqlFilter: string; explanation: string };
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw createError(`Mistral returned invalid JSON: ${text.slice(0, 200)}`, 500);
  }

  if (!parsed.sqlFilter || typeof parsed.sqlFilter !== 'string') {
    throw createError('Mistral did not return a valid SQL filter', 500);
  }

  guardSql(parsed.sqlFilter);

  return {
    sqlFilter: parsed.sqlFilter,
    explanation: parsed.explanation ?? 'AI-generated segment filter',
  };
}

// ---- 2. Message Drafter ------------------------------------
export async function draftMessages(input: {
  segment_id: string;
  channel: string;
  goal: string;
  segment_name?: string;
  customer_count?: number;
}): Promise<MessageVariant[]> {
  // Fetch segment details if not provided
  let segmentDescription = input.segment_name ?? 'a customer segment';
  if (!input.segment_name && input.segment_id) {
    const { data } = await supabase
      .from('segments')
      .select('name, natural_language_query')
      .eq('id', input.segment_id)
      .single();
    if (data) {
      segmentDescription = `${data.name} (${data.natural_language_query})`;
    }
  }

  const channelGuide: Record<string, string> = {
    whatsapp: 'WhatsApp message (keep under 300 chars, conversational, can use emojis)',
    sms: 'SMS (keep under 160 chars, no emojis, include opt-out)',
    email: 'Email (include subject line, formal but friendly, can be longer)',
    rcs: 'RCS rich message (can use emojis and rich formatting, under 400 chars)',
  };

  const systemPrompt = 'You are a marketing copywriter for an Indian e-commerce brand. Always respond with valid JSON only, no markdown.';

  const userPrompt = `
Write 3 distinct message variants for a campaign.

Campaign details:
- Target segment: ${segmentDescription}
- Audience size: ${input.customer_count ?? 'unknown'} customers
- Channel: ${channelGuide[input.channel] ?? input.channel}
- Campaign goal: ${input.goal}

Rules:
1. Return ONLY a JSON array of exactly 3 objects
2. Each object must have: "body" (required), "subject" (for email only), "preview_text" (optional)
3. Make each variant distinct in tone: one formal, one friendly, one urgent
4. Use {{customer_name}} as a personalization placeholder
5. For Indian audience — use ₹ for prices, mention relatable offers
6. Never use markdown in the body text

Example for WhatsApp:
[
  {"body": "Hi {{customer_name}}! 🎉 We miss you! Shop now & get 20% off. Use code COMEBACK20. Valid till Sunday!"},
  {"body": "{{customer_name}}, your favourite products are waiting 😍 Exclusive offer just for you: 20% off everything. Tap to shop!"},
  {"body": "LAST CHANCE {{customer_name}}! 20% discount expires in 24hrs. Don't miss out → shop now!"}
]

Now respond with JSON only, no markdown:
`.trim();

  const text = (await mistralChat(systemPrompt, userPrompt)).trim();

  let variants: MessageVariant[];
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    variants = JSON.parse(cleaned);
  } catch {
    throw createError(`Mistral returned invalid JSON for messages: ${text.slice(0, 200)}`, 500);
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw createError('Mistral did not return valid message variants', 500);
  }

  return variants.slice(0, 3);
}

// ---- 3. Campaign Insight Generator -------------------------
export async function generateCampaignInsight(campaignId: string): Promise<{
  summary: string;
  highlights: string[];
  recommendations: string[];
  revenueImpact?: string;
  suggestedNextCampaign?: string;
}> {
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('*, segments(name, natural_language_query, customer_count)')
    .eq('id', campaignId)
    .single();

  if (campError || !campaign) throw createError('Campaign not found', 404);

  const { data: stats } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .single();

  const statsObj = stats as (CampaignStatsWithRates & {
    total_conversions: number;
    total_revenue: number;
    conversion_rate: number;
    roi: number;
    average_order_value: number;
  }) | null;

  const deliveryRate = statsObj && statsObj.total_sent > 0
    ? ((statsObj.total_delivered / statsObj.total_sent) * 100).toFixed(1)
    : '0';
  const openRate = statsObj && statsObj.total_delivered > 0
    ? ((statsObj.total_opened / statsObj.total_delivered) * 100).toFixed(1)
    : '0';
  const clickRate = statsObj && statsObj.total_opened > 0
    ? ((statsObj.total_clicked / statsObj.total_opened) * 100).toFixed(1)
    : '0';

  const systemPrompt = 'You are an analytics expert for a CRM platform. Always respond with valid JSON only, no markdown.';

  const userPrompt = `
Analyze this campaign performance and generate insights.

Campaign: "${campaign.name}"
Channel: ${campaign.channel}
Segment: ${(campaign as unknown as { segments?: { name: string; natural_language_query: string } }).segments?.name ?? 'Unknown'}
Segment description: ${(campaign as unknown as { segments?: { natural_language_query: string } }).segments?.natural_language_query ?? ''}

Performance:
- Total sent: ${statsObj?.total_sent ?? 0}
- Delivered: ${statsObj?.total_delivered ?? 0} (${deliveryRate}%)
- Failed: ${statsObj?.total_failed ?? 0}
- Opened: ${statsObj?.total_opened ?? 0} (${openRate}% of delivered)
- Clicked: ${statsObj?.total_clicked ?? 0} (${clickRate}% of opened)
- Conversions: ${statsObj?.total_conversions ?? 0}
- Revenue: ₹${statsObj?.total_revenue ?? 0}
- Conversion Rate (from clicks): ${(statsObj?.conversion_rate ? statsObj.conversion_rate * 100 : 0).toFixed(2)}%
- Average Order Value: ₹${statsObj?.average_order_value ?? 0}
- ROI: ${(statsObj?.roi ?? 0).toFixed(2)}x (Campaign Cost: ₹${(campaign as any).cost ?? 1000.00})

Industry benchmarks for India:
- WhatsApp: 85% delivery, 45% open rate, 25% CTR, 3% conversion rate
- SMS: 90% delivery, 25% open rate, 8% CTR, 1.5% conversion rate
- Email: 92% delivery, 18% open rate, 3% CTR, 2% conversion rate
- RCS: 80% delivery, 35% open rate, 15% CTR, 2.5% conversion rate

Return ONLY a JSON object with:
{
  "summary": "2-3 sentence plain English summary of performance vs benchmarks, focusing on conversions, revenue, and ROI",
  "highlights": ["3-4 key findings as bullet points, explaining why it succeeded or failed and the revenue impact"],
  "recommendations": ["2-3 actionable next steps for future campaigns"],
  "revenueImpact": "A brief analysis of the revenue impact and ROI",
  "suggestedNextCampaign": "Recommendation for the next campaign to launch"
}

Be specific, use actual numbers, compare to benchmarks. No markdown in strings.
`.trim();

  const text = (await mistralChat(systemPrompt, userPrompt)).trim();

  try {
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const insight = JSON.parse(cleaned);
    return {
      summary: insight.summary ?? '',
      highlights: insight.highlights ?? [],
      recommendations: insight.recommendations ?? [],
      revenueImpact: insight.revenueImpact ?? '',
      suggestedNextCampaign: insight.suggestedNextCampaign ?? '',
    };
  } catch {
    return {
      summary: text.slice(0, 500),
      highlights: [],
      recommendations: [],
      revenueImpact: '',
      suggestedNextCampaign: '',
    };
  }
}

// ---- 4. AI Chat ---------------------------------------------
export async function chatWithAI(
  messages: { role: 'user' | 'model'; content: string }[],
  systemContext?: string
): Promise<string> {
  const client = getClient();

  const systemPrompt = systemContext ?? `
You are XenoAI, an intelligent CRM assistant for an Indian e-commerce brand.
You help marketers understand their customer data, create segments, and launch campaigns.
You have access to customer data with fields: name, email, city, total_spent, order_count, last_order_date, tags.
When asked about segments, provide the natural language description that can be used to create one.
Be concise, data-driven, and suggest actionable next steps.
`.trim();

  // Convert Gemini-style role 'model' → Mistral 'assistant'
  const mistralMessages = messages.map((m) => ({
    role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.content,
  }));

  const response = await client.chat.complete({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      ...mistralMessages,
    ],
    temperature: 0.7,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw createError('Mistral returned empty response', 500);
  return typeof content === 'string' ? content : JSON.stringify(content);
}
