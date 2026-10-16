import { pgTable, integer, varchar, timestamp, pgEnum, text, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { user } from "./auth.js";

// Include the referenced user table in the existing app-only schema barrel.
export { user };

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(()=> new Date()).notNull(),
};
// Application schema; historical rows are preserved by the department_relationship migration.
export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  ...timestamps
});

export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  departmentId: integer("department_id").notNull().references(() => departments.id, {onDelete: 'restrict'}),
  description: varchar("description", { length: 255 }),
  code: varchar("code", { length: 50 }).notNull().unique(),
  level: varchar("level", { length: 50 }),
  type: varchar("type", { length: 50 }),
  ...timestamps
});

export const classStatusEnum = pgEnum("class_status", ["active", "inactive", "archived"]);

export type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

export const classes = pgTable("classes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subjectId: integer("subject_id").notNull().references(() => subjects.id, {onDelete: 'cascade'}),
  teacherId: text("teacher_id").notNull().references(() => user.id, {onDelete: 'restrict'}),
  inviteCode: varchar("invite_code", { length: 50 }).notNull().unique("classes_invite_code_unique"),
  name: varchar("name", { length: 255 }).notNull(),
  bannerCldPubId: text("banner_cld_pub_id"),
  bannerUrl: text("banner_url"),
  description: text("description"),
  capacity: integer("capacity").default(50).notNull(),
  status: classStatusEnum("status").default("active").notNull(),
  schedules: jsonb("schedules").$type<Schedule[]>().default([]).notNull(),
  ...timestamps
}, (table) => [
  index("classes_subject_id_idx").on(table.subjectId),
  index("classes_teacher_id_idx").on(table.teacherId),
]);

export const enrollments = pgTable("enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  studentId: text("student_id").notNull().references(() => user.id, {onDelete: 'cascade'}),
  classId: integer("class_id").notNull().references(() => classes.id, {onDelete: 'cascade'}),
  ...timestamps
}, (table) => [
  unique("enrollments_student_id_class_id_unique").on(table.studentId, table.classId),
  index("enrollments_student_id_idx").on(table.studentId),
  index("enrollments_class_id_idx").on(table.classId),
]);

export const departmentRelations = relations(departments, ({many})=> ({subjects: many(subjects)}));

export const subjectRelations = relations(subjects, ({one, many})=> ({
    department: one(departments,{fields: [subjects.departmentId], references: [departments.id]}),
    classes: many(classes)
}));

export const classRelations = relations(classes, ({one, many})=> ({
    subject: one(subjects,{fields: [classes.subjectId], references: [subjects.id]}),
    teacher: one(user,{fields: [classes.teacherId], references: [user.id], relationName: "classTeacher"}),
    enrollments: many(enrollments)
}));

export const enrollmentRelations = relations(enrollments, ({one})=> ({
    student: one(user,{fields: [enrollments.studentId], references: [user.id], relationName: "enrollmentStudent"}),
    class: one(classes,{fields: [enrollments.classId], references: [classes.id]})
}));

// App-specific inverse relations; Better Auth relations remain in auth.ts.
export const userClassRelations = relations(user, ({many})=> ({
    classes: many(classes,{relationName: "classTeacher"}),
    enrollments: many(enrollments,{relationName: "enrollmentStudent"})
}));

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
