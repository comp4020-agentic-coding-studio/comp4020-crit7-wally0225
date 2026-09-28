import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { eq, isNull, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seedIfEmpty } from "./seed";
import {
  type Course,
  type Semester,
  type Specialisation,
  courses,
  incompatibilities,
  offerings,
  prerequisites,
  requirements,
  semesters,
  specialisations,
  studentSpecialisation,
  takenCourses,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });
seedIfEmpty(db);

export type { Course, Semester, Specialisation };

export function listSpecialisations(): Specialisation[] {
  return db.select().from(specialisations).all();
}

export function getCurrentSemester(): Semester {
  const [semester] = db.select().from(semesters).where(eq(semesters.isCurrent, true)).all();
  if (!semester) throw new Error("no current semester seeded");
  return semester;
}

export function listSemesters(): Semester[] {
  return db.select().from(semesters).orderBy(semesters.year, semesters.term).all();
}

export function getStudentSpecialisationId(): number {
  const [row] = db.select().from(studentSpecialisation).where(eq(studentSpecialisation.id, 1)).all();
  if (!row) throw new Error("no student specialisation seeded");
  return row.specialisationId;
}

export function setStudentSpecialisation(specialisationId: number) {
  db.update(studentSpecialisation)
    .set({ specialisationId })
    .where(eq(studentSpecialisation.id, 1))
    .run();
}

export function listTakenCourseIds(): number[] {
  return db
    .select({ courseId: takenCourses.courseId })
    .from(takenCourses)
    .all()
    .map((row) => row.courseId);
}

export function markTaken(courseId: number) {
  const semester = getCurrentSemester();
  db.insert(takenCourses).values({ courseId, semesterId: semester.id }).onConflictDoNothing().run();
}

// A prerequisite only counts once it was completed in an earlier semester
// than the one being planned for — completing it this semester doesn't
// guarantee a pass, so it can't unlock a course that requires it yet. Null
// semesterId is legacy data (completed before this column existed) and
// counts as satisfying any prerequisite check.
export function listTakenBeforeCourseIds(currentSemesterId: number): number[] {
  return db
    .select({ courseId: takenCourses.courseId })
    .from(takenCourses)
    .where(or(isNull(takenCourses.semesterId), lt(takenCourses.semesterId, currentSemesterId)))
    .all()
    .map((row) => row.courseId);
}

export function markUntaken(courseId: number) {
  db.delete(takenCourses).where(eq(takenCourses.courseId, courseId)).run();
}

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(courses.code).all();
}

export function advanceToNextSemester() {
  const all = listSemesters();
  const currentIndex = all.findIndex((s) => s.isCurrent);
  const next = all[currentIndex + 1];
  if (!next) return;
  db.transaction((tx) => {
    tx.update(semesters).set({ isCurrent: false }).where(eq(semesters.isCurrent, true)).run();
    tx.update(semesters).set({ isCurrent: true }).where(eq(semesters.id, next.id)).run();
  });
}

export interface RequirementRow {
  specialisationId: number | null;
  courseId: number;
  category: "core" | "required" | "choice" | "elective" | "computing_elective" | "university_elective";
  choiceGroup: string | null;
}

export function listRequirements(specialisationId: number): RequirementRow[] {
  return db
    .select({
      specialisationId: requirements.specialisationId,
      courseId: requirements.courseId,
      category: requirements.category,
      choiceGroup: requirements.choiceGroup,
    })
    .from(requirements)
    .where(or(isNull(requirements.specialisationId), eq(requirements.specialisationId, specialisationId)))
    .all();
}

export function listOfferedCourseIds(semesterId: number): number[] {
  return db
    .select({ courseId: offerings.courseId })
    .from(offerings)
    .where(eq(offerings.semesterId, semesterId))
    .all()
    .map((row) => row.courseId);
}

export interface PrerequisiteRow {
  courseId: number;
  requiresCourseId: number;
  requisiteGroup: string | null;
}

export function listPrerequisites(): PrerequisiteRow[] {
  return db.select().from(prerequisites).all();
}

export interface IncompatibilityRow {
  courseId: number;
  incompatibleCourseId: number | null;
  incompatibleCourseCode: string;
}

export function listIncompatibilities(): IncompatibilityRow[] {
  return db
    .select({
      courseId: incompatibilities.courseId,
      incompatibleCourseId: incompatibilities.incompatibleCourseId,
      incompatibleCourseCode: incompatibilities.incompatibleCourseCode,
    })
    .from(incompatibilities)
    .all();
}
