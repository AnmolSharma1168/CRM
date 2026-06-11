const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Running database schema migration for Revenue Attribution via count_segment_query...');

  const sqlStatements = `
-- 1. Add cost column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) NOT NULL DEFAULT 1000.00;

-- 2. Create campaign_conversions table
CREATE TABLE IF NOT EXISTS campaign_conversions (
  id              uuid primary key default uuid_generate_v4(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  communication_id uuid not null references communications(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  order_amount    numeric(10, 2) not null,
  attributed_at   timestamptz not null default now(),
  attribution_type text not null,
  created_at      timestamptz not null default now()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_conversions_campaign_id ON campaign_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_customer_id ON campaign_conversions(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_order_id ON campaign_conversions(order_id);

-- 4. Add columns to campaign_stats
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS total_conversions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS roi NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE campaign_stats ADD COLUMN IF NOT EXISTS average_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- 5. Recreate function
CREATE OR REPLACE FUNCTION refresh_campaign_stats(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_clicked integer;
  v_total_conversions integer;
  v_total_revenue numeric(12, 2);
  v_campaign_cost numeric(10, 2);
  v_conversion_rate numeric(5, 4);
  v_average_order_value numeric(12, 2);
  v_roi numeric(10, 2);
BEGIN
  -- Get clicks
  SELECT count(*) FILTER (WHERE status = 'clicked')
  INTO v_total_clicked
  FROM communications
  WHERE campaign_id = p_campaign_id;

  -- Get conversions from campaign_conversions
  SELECT count(*), coalesce(sum(order_amount), 0)
  INTO v_total_conversions, v_total_revenue
  FROM campaign_conversions
  WHERE campaign_id = p_campaign_id;

  -- Get campaign cost
  SELECT coalesce(cost, 1000.00)
  INTO v_campaign_cost
  FROM campaigns
  WHERE id = p_campaign_id;

  -- Calculate rates
  IF v_total_clicked > 0 THEN
    v_conversion_rate := v_total_conversions::numeric / v_total_clicked::numeric;
  ELSE
    v_conversion_rate := 0.0000;
  END IF;

  IF v_total_conversions > 0 THEN
    v_average_order_value := v_total_revenue / v_total_conversions;
  ELSE
    v_average_order_value := 0.00;
  END IF;

  IF v_campaign_cost > 0 THEN
    v_roi := (v_total_revenue - v_campaign_cost) / v_campaign_cost;
  ELSE
    v_roi := 0.00;
  END IF;

  INSERT INTO campaign_stats (
    campaign_id, 
    total_sent, 
    total_delivered, 
    total_failed, 
    total_opened, 
    total_clicked, 
    total_conversions, 
    total_revenue, 
    conversion_rate, 
    roi, 
    average_order_value, 
    updated_at
  )
  SELECT
    p_campaign_id,
    count(*) filter (where status != 'pending'),
    count(*) filter (where status in ('delivered', 'opened', 'read', 'clicked')),
    count(*) filter (where status = 'failed'),
    count(*) filter (where status in ('opened', 'read', 'clicked')),
    v_total_clicked,
    v_total_conversions,
    v_total_revenue,
    v_conversion_rate,
    v_roi,
    v_average_order_value,
    now()
  FROM communications
  WHERE campaign_id = p_campaign_id
  ON CONFLICT (campaign_id) DO UPDATE SET
    total_sent      = excluded.total_sent,
    total_delivered = excluded.total_delivered,
    total_failed    = excluded.total_failed,
    total_opened    = excluded.total_opened,
    total_clicked   = excluded.total_clicked,
    total_conversions = excluded.total_conversions,
    total_revenue   = excluded.total_revenue,
    conversion_rate = excluded.conversion_rate,
    roi             = excluded.roi,
    average_order_value = excluded.average_order_value,
    updated_at      = now();
END; $$;

SELECT pg_notify('pgrst', 'reload schema');

-- Return a valid integer for EXECUTE ... INTO total
SELECT 1;
  `.trim();

  const { data, error } = await supabase.rpc('count_segment_query', {
    query_text: sqlStatements
  });

  if (error) {
    console.error('❌ Error executing migration SQL:', error);
  } else {
    console.log('✅ SQL applied successfully! Table schema updated with Revenue Attribution tables & fields.');
    console.log('   Result:', data);
  }
}

run();
