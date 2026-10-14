import express from "express";
import { positiveInteger, validDepartmentId } from "./validation.js";
import { db, pool } from "./db/index.js";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { subjects, departments } from "./db/schema/index.js";

const app = express();
const port = Number(process.env.PORT || 8000);
app.use(express.json({ limit: "32kb" }));
app.get("/api/health", async (_req, res) => {
  await db.select({ id: subjects.id }).from(subjects).limit(1);
  res.json({ status: "ok", database: "connected" });
});
app.get("/api/departments", async (_req, res) => {
  const data = await db.select().from(departments).orderBy(departments.name);
  res.json({ data, total: data.length });
});
app.get("/api/subjects", async (req, res) => {
  const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 10 : positiveInteger(req.query.pageSize, 100);
  if (page === undefined || pageSize === undefined) { res.status(400).json({ message: "page must be a positive integer; pageSize must be between 1 and 100" }); return; }
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const departmentId = req.query.departmentId === undefined ? undefined : positiveInteger(req.query.departmentId);
  if (req.query.departmentId !== undefined && departmentId === undefined) { res.status(400).json({ message: "Invalid departmentId" }); return; }
  const where = and(search ? ilike(subjects.name, `%${search}%`) : undefined, departmentId !== undefined ? eq(subjects.departmentId, departmentId) : undefined);
  const data = await db.select().from(subjects).where(where).orderBy(desc(subjects.id)).limit(pageSize).offset((page - 1) * pageSize);
  const [result] = await db.select({ total: count() }).from(subjects).where(where);
  res.json({ data, total: result!.total });
});
app.get("/api/subjects/:id", async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (id === undefined) { res.status(400).json({ message: "Invalid subject id" }); return; }
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  if (!subject) { res.status(404).json({ message: "Subject not found" }); return; }
  res.json({ data: subject });
});
app.post("/api/subjects", async (req, res) => {
  const { code, name, departmentId, description = null, level = null, type = null } = req.body ?? {};
  if (typeof code !== "string" || !code.trim() || code.length > 50 || typeof name !== "string" || !name.trim() || name.length > 255 || !validDepartmentId(departmentId) || [description, level, type].some((v, i) => v !== null && (typeof v !== "string" || v.length > (i === 0 ? 255 : 50)))) {
    res.status(400).json({ message: "Valid code, name and a positive integer departmentId are required; description (255), level (50) and type (50) are optional" }); return;
  }
  const [subject] = await db.insert(subjects).values({ code: code.trim(), name: name.trim(), departmentId, description, level, type }).returning();
  res.status(201).json({ data: subject });
});
app.use((error: Error & { code?: string; status?: number; cause?: { code?: string } }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if ((error.code ?? error.cause?.code) === "23505") { res.status(409).json({ message: "Subject code already exists" }); return; }
  if ((error.code ?? error.cause?.code) === "23503") { res.status(400).json({ message: "departmentId does not refer to an existing department" }); return; }
  if (error.status === 413) { res.status(413).json({ message: "Request body is too large" }); return; }
  if (error.status === 400) { res.status(400).json({ message: "Invalid JSON" }); return; }
  console.error("Request failed:", error.message);
  res.status(503).json({ message: "Database request failed" });
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`Server is running at http://localhost:${port}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => { void pool.end(); }));
