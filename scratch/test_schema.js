const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Inserting segment...');
  const { data, error } = await supabase.from('segments').insert({
    name: 'Test Segment',
    natural_language_query: 'test query',
    sql_filter: '1=1',
    customer_count: 0
  }).select();
  console.log('Insert result data:', data);
  console.log('Insert result error:', error);
}

run();
