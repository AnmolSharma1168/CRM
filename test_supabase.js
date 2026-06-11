const https = require('https');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc2Nxc3phaXJqaG5ndWdqanRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTExMzIxOSwiZXhwIjoyMDk2Njg5MjE5fQ.fc0lE9qW1SatXms-AYmKapGvyjK6TxtEOL9keLyB2GA';

function request(path, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'aoscqszairjhngugjjtn.supabase.co',
      port: 443,
      path,
      method,
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...extraHeaders,
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('=== Supabase Schema Diagnostic ===\n');

  // Test 1: customers
  console.log('1. Testing customers table...');
  try {
    const r = await request('/rest/v1/customers?select=id,name&limit=3');
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      const rows = JSON.parse(r.body);
      console.log(`   ✅ Found ${rows.length} rows. First: ${rows[0]?.name}`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 2: segments
  console.log('\n2. Testing segments table...');
  try {
    const r = await request('/rest/v1/segments?select=id,name&limit=3');
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      const rows = JSON.parse(r.body);
      console.log(`   ✅ Found ${rows.length} rows.`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 3: campaigns
  console.log('\n3. Testing campaigns table...');
  try {
    const r = await request('/rest/v1/campaigns?select=id&limit=3');
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      console.log(`   ✅ Accessible`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 4: campaign_stats
  console.log('\n4. Testing campaign_stats table...');
  try {
    const r = await request('/rest/v1/campaign_stats?select=id&limit=3');
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      console.log(`   ✅ Accessible`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 5: communications
  console.log('\n5. Testing communications table...');
  try {
    const r = await request('/rest/v1/communications?select=id&limit=3');
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      console.log(`   ✅ Accessible`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 6: count_segment_query RPC
  console.log('\n6. Testing count_segment_query RPC...');
  try {
    const r = await request('/rest/v1/rpc/count_segment_query', 'POST', { where_clause: '1=1' });
    console.log(`   Status: ${r.status}`);
    console.log(`   Body: ${r.body}`);
    if (r.status === 200) {
      console.log(`   ✅ Customer count: ${r.body}`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  // Test 7: execute_segment_query RPC
  console.log('\n7. Testing execute_segment_query RPC...');
  try {
    const r = await request('/rest/v1/rpc/execute_segment_query', 'POST', { where_clause: '1=1 LIMIT 2' });
    console.log(`   Status: ${r.status}`);
    if (r.status === 200) {
      const rows = JSON.parse(r.body);
      console.log(`   ✅ Got ${rows.length} rows`);
    } else {
      console.log(`   ❌ Error: ${r.body}`);
    }
  } catch (e) { console.log(`   ❌ ${e.message}`); }

  console.log('\n=== Done ===');
}

main().catch(console.error);
