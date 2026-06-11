import { supabase } from '../db/supabase';
import { createError } from '../middleware/errorHandler';
import { checkAndCompleteCampaign } from './campaignService';
import type { CommunicationStatus } from '@xeno-crm/shared';

// Status order for transition validation
// Higher number = more advanced state
const STATUS_RANK: Record<CommunicationStatus, number> = {
  pending: 0,
  sent: 1,
  failed: 2,    // terminal branch
  delivered: 2,
  opened: 3,
  read: 4,
  clicked: 5,
};

// Terminal statuses (no further progression allowed)
const TERMINAL_STATUSES = new Set<CommunicationStatus>(['failed', 'clicked']);

// Allowed next statuses for each current status
const VALID_TRANSITIONS: Record<CommunicationStatus, CommunicationStatus[]> = {
  pending: ['sent', 'failed'],
  sent: ['delivered', 'failed'],
  delivered: ['opened', 'failed'],
  opened: ['read', 'clicked', 'failed'],
  read: ['clicked'],
  clicked: [],
  failed: [],
};

function isValidTransition(from: CommunicationStatus, to: CommunicationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function processReceipt(payload: {
  communicationId: string;
  status: 'delivered' | 'failed' | 'opened' | 'read' | 'clicked';
  timestamp?: string;
}): Promise<{ updated: boolean; message: string }> {
  const { communicationId, status, timestamp } = payload;
  const now = timestamp ?? new Date().toISOString();

  // Fetch current communication
  const { data: comm, error: fetchError } = await supabase
    .from('communications')
    .select('id, campaign_id, status, delivered_at')
    .eq('id', communicationId)
    .single();

  if (fetchError || !comm) {
    throw createError(`Communication not found: ${communicationId}`, 404);
  }

  const typedComm = comm as { id: string; campaign_id: string; status: string; delivered_at: string | null };

  const currentStatus = typedComm.status as CommunicationStatus;
  const newStatus = status as CommunicationStatus;

  // Idempotency: same status received again — safe no-op
  if (currentStatus === newStatus) {
    return { updated: false, message: `Already in status: ${newStatus}` };
  }

  // Terminal state: ignore further callbacks
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return { updated: false, message: `Communication is in terminal state: ${currentStatus}` };
  }

  // Validate transition
  if (!isValidTransition(currentStatus, newStatus)) {
    // Out-of-order callback: log but don't reject (could be delivery race)
    // Only allow advancement, never regression
    if (STATUS_RANK[newStatus] <= STATUS_RANK[currentStatus]) {
      return {
        updated: false,
        message: `Invalid regression from ${currentStatus} to ${newStatus}`,
      };
    }
    // If advancement but not a direct valid transition (e.g., sent → opened),
    // accept it gracefully (channel may skip intermediate statuses)
  }

  // Build update object
  const updateData: Record<string, string> = { status: newStatus };
  
  switch (newStatus) {
    case 'delivered':
      updateData.delivered_at = now;
      break;
    case 'failed':
      // delivered_at stays null
      break;
    case 'opened':
      if (!typedComm.delivered_at) updateData.delivered_at = now; // fill in if skipped
      updateData.opened_at = now;
      break;
    case 'read':
      updateData.read_at = now;
      break;
    case 'clicked':
      updateData.clicked_at = now;
      break;
  }

  const { error: updateError } = await supabase
    .from('communications')
    .update(updateData)
    .eq('id', communicationId);

  if (updateError) throw createError(updateError.message, 500);

  // Refresh campaign_stats via Supabase RPC
  await supabase.rpc('refresh_campaign_stats', { p_campaign_id: typedComm.campaign_id });

  // Check if campaign is now complete
  await checkAndCompleteCampaign(typedComm.campaign_id);

  return { updated: true, message: `Updated to: ${newStatus}` };
}
