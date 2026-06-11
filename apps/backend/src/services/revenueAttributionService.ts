import { supabase } from '../db/supabase';

/**
 * Finds the latest eligible clicked communication for a customer within 7 days prior to an order.
 * Last Touch Attribution rule.
 */
export async function findEligibleCampaign(
  customerId: string,
  orderDate: string // YYYY-MM-DD
): Promise<{ campaignId: string; communicationId: string } | null> {
  const { data: comms, error } = await supabase
    .from('communications')
    .select('id, campaign_id, clicked_at')
    .eq('customer_id', customerId)
    .eq('status', 'clicked')
    .order('clicked_at', { ascending: false });

  if (error || !comms || comms.length === 0) return null;

  const orderTime = new Date(orderDate).getTime();

  for (const comm of comms) {
    if (!comm.clicked_at) continue;

    // Normalize to date strings to compare UTC midnights
    const clickDateStr = comm.clicked_at.split('T')[0];
    const clickTime = new Date(clickDateStr).getTime();

    const diffDays = (orderTime - clickTime) / (1000 * 60 * 60 * 24);

    // Click must be before or on order date, up to 7 days prior
    if (diffDays >= 0 && diffDays <= 7) {
      return {
        campaignId: comm.campaign_id,
        communicationId: comm.id,
      };
    }
  }

  return null;
}

/**
 * Creates a campaign conversion attribution record in the database.
 */
export async function createAttributionRecord(params: {
  campaignId: string;
  communicationId: string;
  customerId: string;
  orderId: string;
  orderAmount: number;
  attributedAt: string;
}): Promise<any> {
  const { data, error } = await supabase
    .from('campaign_conversions')
    .insert({
      campaign_id: params.campaignId,
      communication_id: params.communicationId,
      customer_id: params.customerId,
      order_id: params.orderId,
      order_amount: params.orderAmount,
      attributed_at: params.attributedAt,
      attribution_type: 'last_touch',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert conversion: ${error.message}`);
  }

  return data;
}

/**
 * Re-runs the DB function to aggregate conversion & revenue details for a campaign.
 */
export async function updateCampaignRevenue(campaignId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_campaign_stats', {
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error(`Failed to refresh campaign stats for ${campaignId}:`, error.message);
  }
}

/**
 * Main entry point: Process attribution of an order.
 * Ensures order is only processed once (idempotent).
 */
export async function processOrderAttribution(orderId: string): Promise<any> {
  // 1. Idempotency check: see if order has already been attributed
  const { data: existing } = await supabase
    .from('campaign_conversions')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    console.log(`[Attribution] Order ${orderId} has already been attributed.`);
    return null;
  }

  // 2. Fetch order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('customer_id, amount, order_date')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error(`[Attribution] Order ${orderId} not found or query error:`, orderError?.message);
    return null;
  }

  // 3. Find eligible campaign
  const eligible = await findEligibleCampaign(order.customer_id, order.order_date);
  if (!eligible) {
    console.log(`[Attribution] No eligible campaign click found for customer ${order.customer_id} on order ${orderId}.`);
    return null;
  }

  console.log(`[Attribution] Attributing order ${orderId} to campaign ${eligible.campaignId}`);

  // 4. Create conversion record
  const record = await createAttributionRecord({
    campaignId: eligible.campaignId,
    communicationId: eligible.communicationId,
    customerId: order.customer_id,
    orderId,
    orderAmount: Number(order.amount),
    attributedAt: new Date(order.order_date).toISOString(),
  });

  // 5. Update campaign stats
  await updateCampaignRevenue(eligible.campaignId);

  return record;
}
