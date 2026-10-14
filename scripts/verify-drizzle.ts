import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db/index.js";
import { subjects, departments } from "../src/db/schema/index.js";

const rollback = new Error("Verification rollback");
try {
  const original = await pool.query("SELECT * FROM subjects ORDER BY id");
  const before = { count: original.rowCount, hash: createHash("sha256").update(JSON.stringify(original.rows)).digest("hex") };
  try {
    await db.transaction(async tx => {
      const code = `test-${randomUUID().slice(0, 20)}`;
      const [department] = await tx.insert(departments).values({ code, name: "Drizzle transaction test" }).returning();
      const [created] = await tx.insert(subjects).values({ code, name: "Drizzle transaction test", departmentId: department!.id }).returning();
      assert.ok(created);
      assert.equal(created.description, null);
      assert.equal(created.departmentId, department!.id);
      const [loaded] = await tx.select().from(subjects).where(eq(subjects.id, created.id));
      assert.equal(loaded?.code, code);
      console.log("PASS Drizzle insert and select (transaction rolled back)");
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  const result = await pool.query("SELECT * FROM subjects ORDER BY id");
  const hash = createHash("sha256").update(JSON.stringify(result.rows)).digest("hex");
  assert.equal(result.rowCount, before.count);
  assert.equal(hash, before.hash);
  console.log(`PASS existing data preserved: ${result.rowCount} rows, SHA-256 unchanged`);
} finally { await pool.end(); }
