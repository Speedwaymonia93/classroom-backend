import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import pg from 'pg';
config({path:['.env.local','.env'],quiet:true});
const base = process.env.APP_URL || 'http://127.0.0.1:8000/api';
const health = await fetch(`${base}/health`);
assert.equal(health.status, 200);
console.log('PASS health: live Neon connection');
const departmentResponse=await fetch(`${base}/departments`);
assert.equal(departmentResponse.status,200);
const {data: departments}=await departmentResponse.json();
assert.ok(departments.length);
const departmentId=departments[0].id;
const response=await fetch(`${base}/subjects?departmentId=${departmentId}&pageSize=1`);
assert.equal(response.status,200);
const subjects=await response.json();
assert.ok(subjects.total>=1);
assert.equal(subjects.data.length,1);
assert.equal(subjects.data[0].departmentId,departmentId);
const detail=await fetch(`${base}/subjects/${subjects.data[0].id}`).then(r=>r.json());
assert.equal(detail.data.id,subjects.data[0].id);
console.log('PASS departments, departmentId filtering, pagination and detail');
assert.equal((await fetch(`${base}/subjects?departmentId=invalid`)).status,400);
async function create(values) {return fetch(`${base}/subjects`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});}
assert.equal((await create({code:'INVALID',name:'Invalid',department:'math'})).status,400);
assert.equal((await create({code:'INVALID',name:'Invalid',departmentId:2147483647})).status,400);
console.log('PASS missing, invalid and nonexistent departmentId rejected');
const code=`check-${randomUUID().slice(0,20)}`;
const c=new pg.Client({connectionString:process.env.DATABASE_URL});
try {
  const created=await create({code,name:'API department verification',departmentId,description:null,level:'introductory',type:'lecture'});
  assert.equal(created.status,201);
  const {data}=await created.json();
  assert.equal(data.departmentId,departmentId);
  assert.equal(data.description,null);
  assert.equal(data.level,'introductory');
  assert.equal(data.type,'lecture');
  assert.equal((await create({code,name:'Duplicate',departmentId})).status,409);
  const saved=await fetch(`${base}/subjects/${data.id}`).then(r=>r.json());
  assert.equal(saved.data.code,code);
  console.log('PASS create/read with departmentId, nullable description, level/type and duplicate handling');
} finally {
  await c.connect();
  await c.query('DELETE FROM subjects WHERE code=$1',[code]);
  await c.end();
}
