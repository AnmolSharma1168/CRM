const https = require('https');

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc2Nxc3phaXJqaG5ndWdqanRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTExMzIxOSwiZXhwIjoyMDk2Njg5MjE5fQ.fc0lE9qW1SatXms-AYmKapGvyjK6TxtEOL9keLyB2GA';
const PROJECT_REF = 'aoscqszairjhngugjjtn';

async function main() {
  console.log('Sending schema reload query to Supabase...');

  const sql = "NOTIFY pgrst, 'reload schema';";

  const manageOptions = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${PROJECT_REF}/database/query`,
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
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${result.body}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main().catch(console.error);
