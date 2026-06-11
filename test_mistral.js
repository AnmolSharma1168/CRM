const https = require('https');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc2Nxc3phaXJqaG5ndWdqanRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTExMzIxOSwiZXhwIjoyMDk2Njg5MjE5fQ.fc0lE9qW1SatXms-AYmKapGvyjK6TxtEOL9keLyB2GA';
const http = require('http');

function supabasePost(path, body) {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(body);
    const opts = {
      hostname: 'aoscqszairjhngugjjtn.supabase.co', port: 443, path, method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
      timeout: 10000
    };
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(bodyStr); req.end();
  });
}

function backendPost(path, body) {
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
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(data); req.end();
  });
}

async function main() {
  console.log('=== Testing count_segment_query function directly ===\n');
  
  const tests = [
    { label: 'Simple 1=1', query_text: '1=1' },
    { label: 'City = Mumbai', query_text: "city = 'Mumbai'" },
    { label: 'City AND spent', query_text: "city = 'Mumbai' AND total_spent > 3000" },
  ];
  
  for (const t of tests) {
    const r = await supabasePost('/rest/v1/rpc/count_segment_query', { query_text: t.query_text });
    console.log(t.label + ': HTTP ' + r.status + ' -> ' + r.body.slice(0, 100));
  }

  console.log('\n=== Testing segment preview via backend ===\n');
  const seg = await backendPost('/api/segments/preview', { natural_language_query: 'customers in Mumbai who spent over 3000' });
  console.log('Status:', seg.status);
  console.log('Body:', JSON.stringify(seg.body, null, 2).slice(0, 500));

  console.log('\n=== Testing AI Chat ===\n');
  const chat = await backendPost('/api/ai/chat', { messages: [{ role: 'user', content: 'List the top 3 cities by customer count' }] });
  console.log('Status:', chat.status);
  if (chat.status === 200) {
    console.log('Response:', chat.body.data?.response?.slice(0, 200));
  } else {
    console.log('Error:', JSON.stringify(chat.body).slice(0, 200));
  }

  console.log('\n=== Testing AI Draft Message ===\n');
  const draft = await backendPost('/api/ai/draft-message', {
    segment_id: '00000000-0000-0000-0000-000000000000',
    channel: 'whatsapp',
    goal: 'Re-engage dormant customers with 20% discount',
    segment_name: 'Dormant Customers',
    customer_count: 45
  });
  console.log('Status:', draft.status);
  if (draft.status === 200) {
    console.log('Variants:', draft.body.data?.length);
    console.log('Variant 1:', draft.body.data?.[0]?.body?.slice(0, 100));
  } else {
    console.log('Error:', JSON.stringify(draft.body).slice(0, 200));
  }
}

main().catch(console.error);
