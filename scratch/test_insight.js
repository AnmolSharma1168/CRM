const http = require('http');

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 15000
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
  // Let's first list campaigns to get a valid campaign ID
  const http2 = require('http');
  const get = (path) => new Promise((resolve) => {
    http2.get('http://localhost:3001' + path, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
  });

  const campaigns = await get('/api/campaigns');
  console.log('Campaigns:', campaigns);
  if (!campaigns.data || campaigns.data.length === 0) {
    console.error('No campaigns found');
    return;
  }

  const campId = campaigns.data[0].id;
  console.log('Testing insight for campaign ID:', campId);

  const res = await post('/api/ai/campaign-insight', { campaign_id: campId });
  console.log('Response status:', res.status);
  console.log('Response body:', res.body);
}

run().catch(console.error);
