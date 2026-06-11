const http = require('http');

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000
    };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.write(data); req.end();
  });
}

async function run() {
  console.log('=== AI Campaign Strategist E2E Test ===\n');

  // Test 1: Generate Strategy
  console.log('1. Testing generateStrategy API...');
  const genRes = await post('/api/ai/campaign-strategy', {
    goal: 'Increase repeat purchases from Chennai shoppers'
  });

  console.log(`   Status: ${genRes.status}`);
  if (genRes.status !== 200) {
    console.error('   ❌ Failed to generate strategy:', genRes.body);
    return;
  }

  const strategy = genRes.body.data;
  console.log('   ✅ Strategy generated successfully!');
  console.log(`   Strategy Name: ${strategy.strategyName}`);
  console.log(`   Segment Name: ${strategy.segmentName}`);
  console.log(`   SQL Filter: ${strategy.sqlFilter}`);
  console.log(`   Audience Count: ${strategy.estimatedCount}`);
  console.log(`   Recommended Channel: ${strategy.recommendedChannel}`);
  console.log(`   Expected Open Rate: ${strategy.predictions.openRate}%`);
  console.log(`   Expected CTR: ${strategy.predictions.ctr}%`);
  console.log(`   Variants: ${strategy.variants.length} tone options`);

  // Test 2: Save Campaign from Strategy
  console.log('\n2. Testing saveStrategy API...');
  const saveRes = await post('/api/ai/campaign-strategy/save', {
    segmentName: strategy.segmentName,
    naturalLanguageQuery: strategy.naturalLanguageQuery,
    sqlFilter: strategy.sqlFilter,
    channel: strategy.recommendedChannel,
    messageContent: strategy.variants[0].body,
    campaignName: strategy.strategyName
  });

  console.log(`   Status: ${saveRes.status}`);
  if (saveRes.status === 201) {
    console.log('   ✅ Campaign saved successfully!');
    console.log(`   Campaign ID: ${saveRes.body.data.id}`);
    console.log(`   Status: ${saveRes.body.data.status}`);
  } else {
    console.error('   ❌ Failed to save campaign:', saveRes.body);
  }
}

run().catch(console.error);
