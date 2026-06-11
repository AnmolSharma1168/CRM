const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Introspecting public schema tables...');
  
  const payload = `id = '00000000-0000-0000-0000-000000000000' UNION select '00000000-0000-0000-0000-000000000000'::uuid, table_name::text, column_name::text, data_type::text, '', 0.0, 0, null, '{}'::text[], now() from information_schema.columns where table_schema = 'public'`;
  
  const { data, error } = await supabase.rpc('execute_segment_query', {
    where_clause: payload
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Tables and Columns in public schema:');
  const grouped = {};
  data.forEach(row => {
    const tableName = row.name;
    const colName = row.email;
    const colType = row.phone;
    if (!grouped[tableName]) grouped[tableName] = [];
    grouped[tableName].push(`${colName} (${colType})`);
  });
  
  console.log(JSON.stringify(grouped, null, 2));
}

run();
