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
// requisiteGroup mirrors requirements.choiceGroup: rows sharing the same
// non-null group mean "any ONE satisfies"; a null group means individually
// mandatory (AND'd with every other row for that course).
export const prerequisites = sqliteTable(
  "prerequisites",
  {
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    requiresCourseId: int("requires_course_id")
      .notNull()
      .references(() => courses.id),
    requisiteGroup: text("requisite_group"),
  },
  (table) => [primaryKey({ columns: [table.courseId, table.requiresCourseId] })],
);

// A course can't be taken if the student has already completed another. Real
// ANU incompatibilities are mostly with undergraduate-equivalent courses this
// planner doesn't model at all: incompatibleCourseId is set only when that
// other course is also seeded (so it can actually block); incompatibleCourseCode
// is always the real ANU code, so it can still be shown even when null.
export const incompatibilities = sqliteTable("incompatibilities", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  incompatibleCourseId: int("incompatible_course_id").references(() => courses.id),
  incompatibleCourseCode: text("incompatible_course_code").notNull(),
});

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

// specialisationId null means "degree-wide, every Master of Computing
// student" rather than tied to one specialisation.
//
// category:
//  - core: individually mandatory, degree-wide (e.g. COMP6710)
//  - required: individually mandatory, specific to one specialisation
//  - choice: mandatory, but satisfied by ANY ONE course sharing the same
//    choiceGroup (e.g. the MATH6005-or-COMP6260 foundational requirement)
//  - elective: pick courses from this specialisation's own list up to its
//    `specialisations.electiveUnitsRequired`
//  - computing_elective / university_elective: degree-wide pools (any
//    specialisation), up to the fixed thresholds in src/lib/recommend.ts
export const requirements = sqliteTable("requirements", {
  id: int().primaryKey({ autoIncrement: true }),
  specialisationId: int("specialisation_id").references(() => specialisations.id),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  category: text({
    enum: ["core", "required", "choice", "elective", "computing_elective", "university_elective"],
  }).notNull(),
  choiceGroup: text("choice_group"),
});

// The student's actual completed courses. Accumulates across semesters and
// is never cleared by a specialisation switch.
export const takenCourses = sqliteTable("taken_courses", {
  courseId: int("course_id")
    .primaryKey()
    .references(() => courses.id),
  // Which semester this was completed in, so a prerequisite check can
  // require "before this semester" rather than just "ever". Null means
  // completed before this column existed — treated as satisfying any
  // prerequisite check, so existing plans aren't retroactively re-blocked.
  semesterId: int("semester_id").references(() => semesters.id),
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
