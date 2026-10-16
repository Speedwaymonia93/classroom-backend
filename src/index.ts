import express from "express";  
import subjectsRouter from "./routes/subjets.js";
import cors from "cors";
import { db, pool } from "./db/index.js";
import { departments } from "./db/schema/index.js";

const app = express();
const PORT = 8000;


app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map(url => url.trim()) : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}))
app.use(express.json());

app.use("/api/subjects", subjectsRouter);
app.get("/api/departments", async (_req, res) => {
  try {
    const data = await db.select().from(departments).orderBy(departments.name);
    res.json({ data, pagination: { total: data.length } });
  } catch (error) {
    console.error("Department query failed:", error);
    res.status(503).json({ message: "Unable to load departments" });
  }
});
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => { void pool.end(); }));
