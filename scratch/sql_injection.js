const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Running database schema fix via count_segment_query...');

  const sqlStatements = `
-- Drop existing tables/types if they conflict
DROP TABLE IF EXISTS campaign_stats CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS segments CASCADE;

-- Recreate tables with correct schemas matching code structure
CREATE TABLE segments (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  natural_language_query  text not null,
  sql_filter              text not null,
  customer_count          integer not null default 0,
  created_at              timestamptz not null default now()
);

CREATE TABLE campaigns (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  segment_id      uuid references segments(id) on delete set null,
  channel         text not null check (channel in ('whatsapp', 'sms', 'email', 'rcs')),
  message_content text not null,
  status          text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'completed', 'failed')),
  scheduled_at    timestamptz,
  launched_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

CREATE TABLE communications (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  channel         text not null check (channel in ('whatsapp', 'sms', 'email', 'rcs')),
  message         text not null,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'opened', 'read', 'clicked', 'failed')),
  sent_at         timestamptz,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  read_at         timestamptz,
  clicked_at      timestamptz,
  created_at      timestamptz not null default now()
);

CREATE TABLE campaign_stats (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid unique not null references campaigns(id) on delete cascade,
  total_sent      integer not null default 0,
  total_delivered integer not null default 0,
  total_failed    integer not null default 0,
  total_opened    integer not null default 0,
  total_clicked   integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- Recreate index on campaign/communications tables
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_segment_id ON campaigns(segment_id);
CREATE INDEX idx_communications_campaign_id ON communications(campaign_id);
CREATE INDEX idx_communications_customer_id ON communications(customer_id);
CREATE INDEX idx_communications_status ON communications(status);

-- Recreate refresh_campaign_stats function
CREATE OR REPLACE FUNCTION refresh_campaign_stats(p_campaign_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO campaign_stats (campaign_id, total_sent, total_delivered, total_failed, total_opened, total_clicked, updated_at)
  SELECT
    p_campaign_id,
    count(*) filter (where status != 'pending'),
    count(*) filter (where status in ('delivered', 'opened', 'read', 'clicked')),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status in ('opened', 'read', 'clicked')),
    count(*) filter (where status = 'clicked')
  FROM communications
  WHERE campaign_id = p_campaign_id
  ON CONFLICT (campaign_id) DO UPDATE SET
    total_sent      = excluded.total_sent,
    total_delivered = excluded.total_delivered,
    total_failed    = excluded.total_failed,
    total_opened    = excluded.total_opened,
    total_clicked   = excluded.total_clicked,
    updated_at      = now();
END; $$;

-- Force PostgREST schema cache reload
SELECT pg_notify('pgrst', 'reload schema');

-- End wrapper with a valid select count statement
SELECT 0::integer
  `.trim();

  try {
    console.log('Sending schema DDL to count_segment_query...');
    let res = await supabase.rpc('count_segment_query', {
      query_text: sqlStatements
    });
    
    console.log('Result data:', res.data);
    console.log('Result error:', res.error);
  } catch (err) {
    console.error('Caught error:', err);
  }
}

run();
