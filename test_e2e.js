const http = require('http');

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 40000
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

function get(path) {
  return new Promise((resolve) => {
    const r = http.get('http://localhost:3001' + path, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); } });
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    r.setTimeout(8000, () => { r.destroy(); resolve({ status: 0, body: 'TIMEOUT' }); });
  });
}

async function main() {
  console.log('=== FULL XenoCRM E2E Test with Mistral AI ===\n');

  // 1. DB checks
  const custs = await get('/api/customers?pageSize=3');
  console.log('1. Customers: ' + (custs.status===200?'✅':'❌') + ' total=' + custs.body.total);
  const cities = await get('/api/customers/cities');
  console.log('2. Cities: ' + (cities.status===200?'✅':'❌') + ' count=' + cities.body.data?.length);

  // 3. AI Chat
  const chat = await post('/api/ai/chat', { messages: [{ role: 'user', content: 'Give me 3 quick insights about my customer base' }] });
  console.log('3. AI Chat: ' + (chat.status===200?'✅':'❌'));
  if (chat.status === 200) console.log('   ' + chat.body.data?.response?.slice(0, 100) + '...');

  // 4. Segment Preview
  const preview = await post('/api/segments/preview', { natural_language_query: 'VIP customers who spent over 10000' });
  console.log('4. Segment Preview: ' + (preview.status===200?'✅':'❌') + 
    (preview.status===200 ? ' count=' + preview.body.data?.estimatedCount + ' SQL: ' + preview.body.data?.sqlFilter : ' ' + JSON.stringify(preview.body).slice(0,100)));

  // 5. Create Segment
  const createSeg = await post('/api/segments', { name: 'VIP High Spenders', natural_language_query: 'VIP customers who spent over 10000' });
  console.log('5. Create Segment: ' + (createSeg.status===201?'✅':'❌') + 
    (createSeg.status===201 ? ' id=' + createSeg.body.data?.id + ' count=' + createSeg.body.data?.customer_count : ' ' + JSON.stringify(createSeg.body).slice(0,100)));

  if (createSeg.status === 201) {
    const segId = createSeg.body.data?.id;

    // 6. Draft Messages
    const draft = await post('/api/ai/draft-message', {
      segment_id: segId, channel: 'email',
      goal: 'Exclusive loyalty rewards for VIP customers',
      segment_name: 'VIP High Spenders',
      customer_count: createSeg.body.data?.customer_count ?? 10
    });
    console.log('6. AI Draft: ' + (draft.status===200?'✅':'❌') + ' variants=' + draft.body.data?.length);
    if (draft.status === 200) {
      console.log('   Subject: ' + draft.body.data?.[0]?.subject);
      console.log('   Body preview: ' + draft.body.data?.[0]?.body?.slice(0, 80));
    }

    // 7. Create Campaign
    const msgBody = draft.status === 200 ? draft.body.data?.[0]?.body : 'Dear {{customer_name}}, thank you for being a VIP! Exclusive ₹2000 reward awaits you.';
    const camp = await post('/api/campaigns', {
      name: 'VIP Loyalty Rewards Campaign',
      segment_id: segId,
      channel: 'email',
      message_content: msgBody
    });
    console.log('7. Create Campaign: ' + (camp.status===201?'✅':'❌') + (camp.status===201 ? ' id=' + camp.body.data?.id : ' ' + JSON.stringify(camp.body).slice(0,100)));

    if (camp.status === 201) {
      const campId = camp.body.data?.id;

      // 8. Launch Campaign
      const launch = await post('/api/campaigns/' + campId + '/launch', {});
      console.log('8. Launch Campaign: ' + (launch.status===200?'✅':'❌') + ' sent=' + launch.body.data?.sent);

      // Wait for channel service callbacks
      await new Promise(r => setTimeout(r, 6000));

      // 9. Stats
      const stats = await get('/api/campaigns/' + campId + '/stats');
      console.log('9. Campaign Stats: ' + (stats.status===200?'✅':'❌'));
      if (stats.status === 200) {
        const s = stats.body.data;
        console.log('   sent=' + s.total_sent + ' delivered=' + s.total_delivered + ' failed=' + s.total_failed + ' opened=' + s.total_opened + ' clicked=' + s.total_clicked);
        console.log('   delivery_rate=' + s.delivery_rate?.toFixed(1) + '%');
      }

      // 10. AI Campaign Insight
      const insight = await post('/api/ai/campaign-insight', { campaign_id: campId });
      console.log('10. AI Insight: ' + (insight.status===200?'✅':'❌'));
      if (insight.status === 200) {
        console.log('    Summary: ' + insight.body.data?.summary?.slice(0, 100));
        console.log('    Highlights: ' + insight.body.data?.highlights?.length);
      }
    }
  }

  // 11. List all
  const segs = await get('/api/segments');
  const camps = await get('/api/campaigns');
  console.log('\n11. Final counts: segments=' + segs.body.data?.length + ' campaigns=' + camps.body.data?.length);
  console.log('\n✅ Full E2E test complete!');
}

main().catch(console.error);
