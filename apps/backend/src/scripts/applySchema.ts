/**
 * Direct schema apply via Supabase Postgres connection
 * Uses pg driver with session pooler
 */
import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Supabase provides direct Postgres access at:
// db.<project-ref>.supabase.co:5432
// Username: postgres
// Password: your database password (set in Supabase dashboard)
// However, we can also use the connection pooler (port 6543) or Transaction pooler

// We'll try the session mode pooler: postgresql://postgres:[DB_PASSWORD]@db.<ref>.supabase.co:5432/postgres

const SUPABASE_URL = process.env.SUPABASE_URL!;
const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/);
const projectRef = projectRefMatch?.[1];

if (!projectRef) {
  console.error('Cannot extract project ref from SUPABASE_URL');
  process.exit(1);
}

// Check if DATABASE_URL is set
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('\n🔴 DATABASE_URL not set in .env');
  console.log('\nTo apply the schema, you have two options:\n');
  console.log('OPTION 1 (Recommended): Apply via Supabase Dashboard');
  console.log('  1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('  2. Log in if needed');
  console.log('  3. Copy and paste the full SQL from:');
  console.log('     apps/backend/src/db/schema.sql');
  console.log('  4. Click "Run"\n');
  console.log('OPTION 2: Add DATABASE_URL to apps/backend/.env');
  console.log('  Format: postgresql://postgres:[DB_PASSWORD]@db.' + projectRef + '.supabase.co:5432/postgres');
  console.log('  Find your DB password at: https://supabase.com/dashboard/project/' + projectRef + '/settings/database\n');
  console.log('Then run: npm run schema -w apps/backend\n');
  process.exit(1);
}

async function applySchema() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🔧 Connecting to Supabase Postgres...\n');

  const client = await pool.connect();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Applying schema...\n');
    await client.query(sql);
    console.log('✅ Schema applied successfully!\n');
  } catch (err: any) {
    console.error('❌ Schema apply failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applySchema();
