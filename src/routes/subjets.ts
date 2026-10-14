import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema/app.js";
import { db } from "../db/index.js";

const router = express.Router();

// Get all subjects with optional search, filtering, and pagination
router.get("/", async(req, res) => {
  try{
   const {search, department, page = 1, limit=10} = req.query;
   const currentPage = Math.max(1, parseInt(String(page),10) || 11);
   const limitPerPage = Math.min(Math.max(1, parseInt(String(limit),10) || 10), 100);
   const offset = (currentPage - 1) * limitPerPage;

   const filterConditions = [];

   // If search query exists, filter by subjct name OR subject code
   if(search){
    filterConditions.push(
        or(
            ilike(subjects.name, `%${search}%`),
            ilike(subjects.code, `%${search}%`)
        )
    
    )
   }

   // If department filter exists, match department name
   if(department){
    const deptPattern = `%${String(department).replace(/[%_]/g,'\\$&')}%`;
    filterConditions.push(ilike(departments.name, deptPattern));
   }

   // combine all filters usin AND if any exist
    const whereCondition = filterConditions.length > 0 ? and(...filterConditions): undefined;

    const countResult = await db.select({count: sql<number>`count(*)`})
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereCondition)

    const totalCount = countResult[0]?.count ?? 0;

    const subjectsList = await db.select({
        ...getTableColumns(subjects), 
        department: {...getTableColumns(departments)}})
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(whereCondition)
    .orderBy(desc(subjects.createdAt))
    .limit(limitPerPage)
    .offset(offset);

    res.status(200).json({
        data: subjectsList,
        pagination: {
            total: totalCount,
            page: currentPage,
            limit: limitPerPage,
            toalPages: Math.ceil(totalCount / limitPerPage) 
        }
    })
  }
  catch (error) {
    console.error(`GET /subjcts error: ${error}`);
    res.status(500).json({ message: "Failed to get subjects" });
  }
});

export default router;