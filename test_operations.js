const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, body: d });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== Operations Dashboard E2E Verification ===\n');

  // Test 1: Query Channel Service Directly
  console.log('1. Querying Channel Service stats directly (port 3002)...');
  try {
    const res = await get('http://localhost:3002/queue/stats');
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log('   ✅ Channel stats retrieved successfully:');
      console.log('   Stats:', JSON.stringify(res.body.data, null, 2));
    } else {
      console.error('   ❌ Fails direct stats query:', res.body);
    }
  } catch (err) {
    console.error('   ❌ Connection to Channel Service failed:', err.message);
  }

  // Test 2: Query Backend Proxy Route
  console.log('\n2. Querying Backend operations metrics proxy (port 3001)...');
  try {
    const res = await get('http://localhost:3001/api/operations/metrics');
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log('   ✅ Backend operations metrics retrieved successfully:');
      console.log('   Metrics:', JSON.stringify(res.body.data, null, 2));
    } else {
      console.error('   ❌ Fails backend metrics query:', res.body);
    }
  } catch (err) {
    console.error('   ❌ Connection to Backend failed:', err.message);
  }
}

run().catch(console.error);
