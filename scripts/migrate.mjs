import { config } from 'dotenv';
import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
config({ path: ['.env.local', '.env'], quiet: true });
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required for migrations');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(63822401)');
  await client.query('CREATE TABLE IF NOT EXISTS classroom_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    const applied = await client.query('SELECT 1 FROM classroom_migrations WHERE name = $1', [file]);
    if (!applied.rowCount) {
      await client.query(await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8'));
      await client.query('INSERT INTO classroom_migrations (name) VALUES ($1)', [file]);
      console.log(`Applied ${file}`);
    }
  }
  await client.query('COMMIT');
  console.log('Migrations complete');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally { await client.end(); }
