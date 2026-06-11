const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const payload = `id = '00000000-0000-0000-0000-000000000000' UNION select '00000000-0000-0000-0000-000000000000'::uuid, proname::text, prosrc::text, pg_get_function_arguments(p.oid)::text, '', 0.0, 0, null, '{}'::text[], now() from pg_proc p where proname in ('count_segment_query', 'execute_segment_query')`;
  const { data, error } = await supabase.rpc('execute_segment_query', {
    where_clause: payload
  });
  if (error) {
    console.error('Error:', error);
    return;
  }
  data.forEach(row => {
    console.log(`Function: ${row.name}`);
    console.log(`Args: ${row.phone}`);
    console.log(`Source:\n${row.email}\n`);
  });
}
run();
