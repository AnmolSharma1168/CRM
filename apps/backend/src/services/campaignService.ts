import axios from 'axios';
import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';
import type { Campaign, CampaignStats, CampaignStatsWithRates, Communication } from '@xeno-crm/shared';

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL ?? 'http://localhost:3002';
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL ?? 'http://localhost:3001/api/receipts';

// ---- List campaigns -----------------------------------------
export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, segments(name, customer_count), campaign_stats(*)')
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);
  return (data ?? []) as unknown as Campaign[];
}

// ---- Create campaign ----------------------------------------
export async function createCampaign(input: {
  name: string;
  segment_id: string;
  channel: Campaign['channel'];
  message_content: string;
  cost?: number;
}): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...input, status: 'draft' })
    .select()
    .single();

  if (error) throw createError(error.message, 500);
  return data as Campaign;
}

// ---- Get campaign by id -------------------------------------
export async function getCampaignById(id: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, segments(name, customer_count, natural_language_query)')
    .eq('id', id)
    .single();

  if (error || !data) throw createError('Campaign not found', 404);
  return data as unknown as Campaign;
}

// ---- Launch campaign ----------------------------------------
export async function launchCampaign(id: string): Promise<{ sent: number }> {
  const campaign = await getCampaignById(id);

  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw createError(`Cannot launch campaign in status: ${campaign.status}`, 400);
  }

  if (!campaign.segment_id) {
    throw createError('Campaign has no segment', 400);
  }

  // Get segment and its customers
  const { data: segment, error: segError } = await supabase
    .from('segments')
    .select('*')
    .eq('id', campaign.segment_id)
    .single();

  if (segError || !segment) throw createError('Segment not found', 404);

  const { data: customers, error: custError } = await supabase.rpc('execute_segment_query', {
    where_clause: segment.sql_filter,
  });

  if (custError) throw createError(custError.message, 500);
  if (!customers || customers.length === 0) {
    throw createError('No customers match this segment', 400);
  }

  // Update campaign status to running
  await supabase
    .from('campaigns')
    .update({ status: 'running', launched_at: new Date().toISOString() })
    .eq('id', id);

  // Bulk-insert communication records
  type CustomerRow = { id: string; email: string; phone: string };
  const communications = (customers as CustomerRow[]).map((c) => ({
    campaign_id: id,
    customer_id: c.id,
    channel: campaign.channel,
    message: campaign.message_content,
    status: 'sent',
    sent_at: new Date().toISOString(),
  }));

  const CHUNK_SIZE = 100;
  const insertedComms: { id: string; customer_id: string }[] = [];

  for (let i = 0; i < communications.length; i += CHUNK_SIZE) {
    const chunk = communications.slice(i, i + CHUNK_SIZE);
    const { data: inserted, error: commError } = await supabase
      .from('communications')
      .insert(chunk)
      .select('id, customer_id');

    if (commError) throw createError(commError.message, 500);
    insertedComms.push(...(inserted ?? []));
  }

  // Initialize campaign_stats row
  await supabase.from('campaign_stats').upsert({
    campaign_id: id,
    total_sent: insertedComms.length,
    total_delivered: 0,
    total_failed: 0,
    total_opened: 0,
    total_clicked: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'campaign_id' });

  // Send each to channel service (fire and forget — channel service handles async)
  const customerMap = new Map((customers as CustomerRow[]).map((c) => [c.id, c]));

  // Send in background — don't await all, just fire
  setImmediate(async () => {
    for (const comm of insertedComms) {
      const customer = customerMap.get(comm.customer_id);
      if (!customer) continue;

      const recipient = campaign.channel === 'email' ? customer.email : customer.phone;

      try {
        await axios.post(`${CHANNEL_SERVICE_URL}/send`, {
          recipient,
          message: campaign.message_content,
          channel: campaign.channel,
          communicationId: comm.id,
          customerId: comm.customer_id,
          callbackUrl: CRM_CALLBACK_URL,
        }, { timeout: 5000 });
      } catch (err) {
        console.error(`Failed to send to channel service for comm ${comm.id}:`, err);
      }
    }
  });

  return { sent: insertedComms.length };
}

// ---- Get campaign stats ------------------------------------
export async function getCampaignStats(id: string): Promise<CampaignStatsWithRates> {
  const { data, error } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', id)
    .single();

  if (error || !data) {
    // Return zeroed stats if not yet initialized
    return {
      id: '',
      campaign_id: id,
      total_sent: 0,
      total_delivered: 0,
      total_failed: 0,
      total_opened: 0,
      total_clicked: 0,
      total_conversions: 0,
      total_revenue: 0,
      conversion_rate: 0,
      roi: 0,
      average_order_value: 0,
      updated_at: new Date().toISOString(),
      delivery_rate: 0,
      open_rate: 0,
      click_rate: 0,
      failure_rate: 0,
    };
  }

  const stats = data as CampaignStats;
  return {
    ...stats,
    delivery_rate: stats.total_sent > 0 ? (stats.total_delivered / stats.total_sent) * 100 : 0,
    open_rate: stats.total_delivered > 0 ? (stats.total_opened / stats.total_delivered) * 100 : 0,
    click_rate: stats.total_opened > 0 ? (stats.total_clicked / stats.total_opened) * 100 : 0,
    failure_rate: stats.total_sent > 0 ? (stats.total_failed / stats.total_sent) * 100 : 0,
  };
}

// ---- Get campaign communications ---------------------------
export async function getCampaignCommunications(
  campaignId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: Communication[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('communications')
    .select('*, customers(name, email, phone)', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .order('sent_at', { ascending: false })
    .range(from, to);

  if (error) throw createError(error.message, 500);

  return {
    data: (data ?? []) as unknown as Communication[],
    total: count ?? 0,
  };
}

// ---- Mark campaign completed if all comms resolved ---------
export async function checkAndCompleteCampaign(campaignId: string): Promise<void> {
  // Check if any communications are still pending or sent
  const { count, error } = await supabase
    .from('communications')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'sent']);

  if (error || (count ?? 0) > 0) return;

  // All resolved — mark completed
  await supabase
    .from('campaigns')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('status', 'running');
}
