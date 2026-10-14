import { config } from 'dotenv';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
config({path:['.env.local','.env'],quiet:true});
const c=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED});
try {
  await c.connect();
  await c.query('BEGIN');
  await c.query('CREATE SCHEMA classroom_migration_check');
  await c.query('SET LOCAL search_path TO classroom_migration_check, public');
  await c.query('CREATE TABLE classroom_migration_check.subjects (LIKE public.subjects INCLUDING ALL)');
  await c.query('INSERT INTO classroom_migration_check.subjects OVERRIDING SYSTEM VALUE SELECT * FROM public.subjects');
  const before=(await c.query('SELECT * FROM classroom_migration_check.subjects ORDER BY id')).rows;
  let sql=await readFile(new URL('../drizzle/0001_department_relationship.sql',import.meta.url),'utf8');
  sql=sql.replaceAll('"public"."departments"','"classroom_migration_check"."departments"');
  await c.query(sql);
  const after=(await c.query('SELECT s.id,s.code,s.name,d.code AS department,s.description,s.created_at AT TIME ZONE \'UTC\' AS created_at,s.updated_at AT TIME ZONE \'UTC\' AS updated_at FROM classroom_migration_check.subjects s JOIN classroom_migration_check.departments d ON d.id=s.department_id ORDER BY s.id')).rows;
  assert.deepEqual(after,before);
  console.log(`PASS migration rehearsal: all ${before.length} subjects and their original values preserved`);
} finally {await c.query('ROLLBACK').catch(()=>{});await c.end();}
