import { sql } from "drizzle-orm";
import { int, sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

export const specialisations = sqliteTable("specialisations", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  name: text().notNull(),
  electiveUnitsRequired: int("elective_units_required").notNull().default(0),
});

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  title: text().notNull(),
  units: int().notNull().default(6),
});

// A course requires another course, self-referential on courses.id.
export const prerequisites = sqliteTable(
  "prerequisites",
  {
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    requiresCourseId: int("requires_course_id")
      .notNull()
      .references(() => courses.id),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.requiresCourseId] })],
);

export const semesters = sqliteTable("semesters", {
  id: int().primaryKey({ autoIncrement: true }),
  year: int().notNull(),
  term: text({ enum: ["S1", "S2"] }).notNull(),
  label: text().notNull(),
  isCurrent: int("is_current", { mode: "boolean" }).notNull().default(false),
});

// Which courses run in which semester.
export const offerings = sqliteTable(
  "offerings",
  {
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    semesterId: int("semester_id")
      .notNull()
      .references(() => semesters.id),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.semesterId] })],
);

// specialisationId null means "core, every Master of Computing student".
export const requirements = sqliteTable("requirements", {
  id: int().primaryKey({ autoIncrement: true }),
  specialisationId: int("specialisation_id").references(() => specialisations.id),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  category: text({ enum: ["core", "required", "elective"] }).notNull(),
});

// The student's actual completed courses. Accumulates across semesters and
// is never cleared by a specialisation switch.
export const takenCourses = sqliteTable("taken_courses", {
  courseId: int("course_id")
    .primaryKey()
    .references(() => courses.id),
  completedAt: text("completed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Singleton row (id fixed to 1): the student's real, current specialisation.
// Switching writes here directly — there's no separate preview state.
export const studentSpecialisation = sqliteTable("student_specialisation", {
  id: int().primaryKey(),
  specialisationId: int("specialisation_id")
    .notNull()
    .references(() => specialisations.id),
});

export type Specialisation = typeof specialisations.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Semester = typeof semesters.$inferSelect;
export type Requirement = typeof requirements.$inferSelect;
