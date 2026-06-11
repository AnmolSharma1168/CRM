const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 15000,
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: 'TIMEOUT' });
    });
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('🚀 Starting end-to-end attribution integration test...');

  let testCustomer = null;
  let testCampaign = null;
  let testCommunication = null;
  let testOrder = null;

  try {
    // 1. Create a test customer
    console.log('1. Creating test customer...');
    const uniqueEmail = `att-test-${Date.now()}@example.com`;
    const { data: customer, error: customerErr } = await supabase
      .from('customers')
      .insert({
        name: 'Attribution Test Customer',
        email: uniqueEmail,
        phone: '9999999999',
        city: 'Chennai',
        total_spent: 0,
        order_count: 0,
      })
      .select()
      .single();

    if (customerErr || !customer) {
      throw new Error(`Failed to create test customer: ${customerErr?.message}`);
    }
    testCustomer = customer;
    console.log(`   Customer created: ${testCustomer.id} (${testCustomer.email})`);

    // 2. Create a test campaign with cost = 1000
    console.log('2. Creating test campaign...');
    const { data: campaign, error: campaignErr } = await supabase
      .from('campaigns')
      .insert({
        name: `Attribution Test Campaign ${Date.now()}`,
        channel: 'email',
        message_content: 'Test content for revenue attribution',
        status: 'running',
        cost: 1000.00,
      })
      .select()
      .single();

    if (campaignErr || !campaign) {
      throw new Error(`Failed to create test campaign: ${campaignErr?.message}`);
    }
    testCampaign = campaign;
    console.log(`   Campaign created: ${testCampaign.id} (Cost: ${testCampaign.cost})`);

    // 3. Create a communication clicked log
    console.log('3. Creating clicked communication log...');
    const { data: comm, error: commErr } = await supabase
      .from('communications')
      .insert({
        campaign_id: testCampaign.id,
        customer_id: testCustomer.id,
        channel: 'email',
        message: 'Test content for revenue attribution',
        status: 'clicked',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        opened_at: new Date().toISOString(),
        clicked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (commErr || !comm) {
      throw new Error(`Failed to create communication log: ${commErr?.message}`);
    }
    testCommunication = comm;
    console.log(`   Communication created in clicked status: ${testCommunication.id}`);

    // Initialize campaign stats manually since launchCampaign is not run
    const { error: statsInitErr } = await supabase.from('campaign_stats').upsert({
      campaign_id: testCampaign.id,
      total_sent: 1,
      total_delivered: 1,
      total_failed: 0,
      total_opened: 1,
      total_clicked: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id' });

    if (statsInitErr) {
      throw new Error(`Failed to initialize stats: ${statsInitErr.message}`);
    }

    // 4. Create an order via backend route: POST /api/customers/orders
    console.log('4. Creating order via POST /api/customers/orders...');
    const orderPayload = {
      customer_id: testCustomer.id,
      amount: 5000.00,
      product_name: 'Attribution Test Premium Product',
      category: 'Attribution Testing',
      order_date: new Date().toISOString().split('T')[0],
      channel: 'online',
    };

    const orderRes = await post('/api/customers/orders', orderPayload);
    if (orderRes.status !== 201 || !orderRes.body.success) {
      throw new Error(`API failed to create order (Status ${orderRes.status}): ${JSON.stringify(orderRes.body)}`);
    }
    testOrder = orderRes.body.data;
    console.log(`   Order created: ${testOrder.id} (Amount: ${testOrder.amount})`);

    // 5. Sleep to allow async attribution engine to process and database to refresh
    console.log('5. Sleeping 2 seconds for attribution processing...');
    await sleep(2000);

    // 6. Verify campaign_conversions record
    console.log('6. Querying campaign_conversions table...');
    const { data: conv, error: convErr } = await supabase
      .from('campaign_conversions')
      .select('*')
      .eq('order_id', testOrder.id)
      .maybeSingle();

    if (convErr) {
      throw new Error(`Error fetching campaign_conversions: ${convErr.message}`);
    }

    if (!conv) {
      throw new Error('❌ Campaign conversion NOT found! Last-touch attribution did not trigger.');
    }

    console.log('   ✅ Campaign conversion recorded successfully!');
    console.log(`      Conversion ID: ${conv.id}`);
    console.log(`      Attributed Campaign: ${conv.campaign_id}`);
    console.log(`      Attributed Amount: ${conv.order_amount}`);

    if (conv.campaign_id !== testCampaign.id) {
      throw new Error(`Attributed to wrong campaign: expected ${testCampaign.id}, got ${conv.campaign_id}`);
    }

    // 7. Verify campaign_stats table
    console.log('7. Querying campaign_stats table...');
    const { data: stats, error: statsErr } = await supabase
      .from('campaign_stats')
      .select('*')
      .eq('campaign_id', testCampaign.id)
      .single();

    if (statsErr || !stats) {
      throw new Error(`Failed to fetch campaign stats: ${statsErr?.message}`);
    }

    console.log('   ✅ Campaign Stats updated successfully!');
    console.log(`      Total Sent: ${stats.total_sent}`);
    console.log(`      Total Clicked: ${stats.total_clicked}`);
    console.log(`      Total Conversions: ${stats.total_conversions}`);
    console.log(`      Total Revenue: ₹${stats.total_revenue}`);
    console.log(`      ROI: ${stats.roi}x`);
    console.log(`      Average Order Value: ₹${stats.average_order_value}`);

    // Assert stats values
    if (Number(stats.total_conversions) !== 1) {
      throw new Error(`Stats conversions incorrect: expected 1, got ${stats.total_conversions}`);
    }
    if (Number(stats.total_revenue) !== 5000) {
      throw new Error(`Stats revenue incorrect: expected 5000, got ${stats.total_revenue}`);
    }
    if (Number(stats.roi) !== 4.00) {
      // (5000 - 1000) / 1000 = 4.0
      throw new Error(`Stats ROI incorrect: expected 4.00, got ${stats.roi}`);
    }
    if (Number(stats.average_order_value) !== 5000) {
      throw new Error(`Stats AOV incorrect: expected 5000, got ${stats.average_order_value}`);
    }

    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! Revenue Attribution & ROI Tracking are 100% verified.');

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  } finally {
    // Clean up test records
    console.log('Clean up: deleting test database records...');
    if (testOrder) {
      await supabase.from('orders').delete().eq('id', testOrder.id);
      console.log(`   Deleted test order: ${testOrder.id}`);
    }
    if (testCommunication) {
      await supabase.from('communications').delete().eq('id', testCommunication.id);
      console.log(`   Deleted test communication: ${testCommunication.id}`);
    }
    if (testCampaign) {
      await supabase.from('campaigns').delete().eq('id', testCampaign.id);
      console.log(`   Deleted test campaign: ${testCampaign.id}`);
    }
    if (testCustomer) {
      await supabase.from('customers').delete().eq('id', testCustomer.id);
      console.log(`   Deleted test customer: ${testCustomer.id}`);
    }
    console.log('Clean up finished.');
  }
}

run();
