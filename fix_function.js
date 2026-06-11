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

// Use Supabase's query endpoint to run raw SQL via the management API
// Actually, we'll use supabase-js rpc to call a function that runs pg_notify
async function main() {
  console.log('Fixing count_segment_query function signature...\n');

  // The hint says the function exists with parameter "query_text" instead of "where_clause"
  // We need to drop and recreate it. 
  // We can do this via the Supabase Management API v1 /projects/{ref}/database/query endpoint
  
  const sql = `
DROP FUNCTION IF EXISTS count_segment_query(text);
DROP FUNCTION IF EXISTS count_segment_query;
CREATE OR REPLACE FUNCTION count_segment_query(where_clause text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result bigint;
BEGIN
  EXECUTE 'SELECT count(*) FROM customers WHERE ' || where_clause INTO result;
  RETURN result;
END; $$;
NOTIFY pgrst, 'reload schema';
  `.trim();

  // Try the Supabase Management API
  const manageOptions = {
    hostname: 'api.supabase.com',
    port: 443,
    path: '/v1/projects/aoscqszairjhngugjjtn/database/query',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  };

  const bodyStr = JSON.stringify({ query: sql });
  manageOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);

  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request(manageOptions, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
    console.log(`Management API Status: ${result.status}`);
    console.log(`Response: ${result.body}`);
  } catch (e) {
    console.log(`Management API error: ${e.message}`);
  }

  // Now test with the correct parameter name (query_text) as a workaround
  console.log('\nTesting count_segment_query with "query_text" parameter (current workaround)...');
  try {
    const r = await request('/rest/v1/rpc/count_segment_query', 'POST', { query_text: '1=1' });
    console.log(`Status: ${r.status}, Body: ${r.body}`);
  } catch (e) { console.log(`Error: ${e.message}`); }
}

main().catch(console.error);
