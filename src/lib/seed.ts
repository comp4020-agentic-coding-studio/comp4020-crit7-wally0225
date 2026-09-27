import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  courses,
  offerings,
  prerequisites,
  requirements,
  semesters,
  specialisations,
  studentSpecialisation,
} from "./schema";

// Curated Master of Computing data: core units every student needs, three
// specialisations with their own required/elective courses, a couple of
// prerequisite chains, and two semesters (S1 current, S2 not yet) with
// courses staggered across them so switching specialisation or advancing
// semester visibly changes the recommended list. Runs once, at boot, right
// after migrate() — if `courses` already has rows this is a no-op.
export function seedIfEmpty(db: BetterSQLite3Database) {
  const already = db.select().from(courses).limit(1).all();
  if (already.length > 0) return;

  db.transaction((tx) => {
    const specRows = tx
      .insert(specialisations)
      .values([
        { code: "ML", name: "Machine Learning", electiveUnitsRequired: 12 },
        { code: "DS", name: "Data Science", electiveUnitsRequired: 12 },
        { code: "SE", name: "Software Engineering", electiveUnitsRequired: 12 },
      ])
      .returning()
      .all();
    const specId = Object.fromEntries(specRows.map((s) => [s.code, s.id]));

    const courseRows = tx
      .insert(courses)
      .values([
        // Core — every Master of Computing student takes these.
        { code: "COMP4300", title: "Foundations of Computing" },
        { code: "COMP4310", title: "Software Construction" },
        { code: "COMP4320", title: "Research Methods" },
        // Machine Learning stream.
        { code: "COMP4670", title: "Introduction to Machine Learning" },
        { code: "COMP4680", title: "Advanced Machine Learning" },
        { code: "COMP4691", title: "Reinforcement Learning" },
        // Data Science stream.
        { code: "COMP4610", title: "Principles of Data Science" },
        { code: "COMP4620", title: "Statistical Data Analysis" },
        { code: "COMP4630", title: "Big Data Systems" },
        // Software Engineering stream.
        { code: "COMP4550", title: "Software Architecture" },
        { code: "COMP4560", title: "Software Engineering Studio" },
        // Shared electives, open to any specialisation.
        { code: "COMP4900", title: "Human-Computer Interaction" },
        { code: "COMP4910", title: "Cloud Computing" },
        { code: "COMP4920", title: "Ethics and Professional Practice" },
      ])
      .returning()
      .all();
    const courseId = Object.fromEntries(courseRows.map((c) => [c.code, c.id]));

    tx.insert(prerequisites)
      .values([
        // Advanced ML needs the intro course; Reinforcement Learning needs Advanced ML.
        { courseId: courseId.COMP4680, requiresCourseId: courseId.COMP4670 },
        { courseId: courseId.COMP4691, requiresCourseId: courseId.COMP4680 },
        // Big Data Systems needs the statistics course.
        { courseId: courseId.COMP4630, requiresCourseId: courseId.COMP4620 },
        // The studio needs the architecture course first.
        { courseId: courseId.COMP4560, requiresCourseId: courseId.COMP4550 },
      ])
      .run();

    const semesterRows = tx
      .insert(semesters)
      .values([
        { year: 2026, term: "S1", label: "2026 Semester 1", isCurrent: true },
        { year: 2026, term: "S2", label: "2026 Semester 2", isCurrent: false },
      ])
      .returning()
      .all();
    const s1 = semesterRows.find((s) => s.term === "S1")!.id;
    const s2 = semesterRows.find((s) => s.term === "S2")!.id;

    // Core and intro-level courses run every semester; the rest stagger
    // across S1/S2 so switching specialisation or advancing semester changes
    // what shows up.
    tx.insert(offerings)
      .values([
        { courseId: courseId.COMP4300, semesterId: s1 },
        { courseId: courseId.COMP4300, semesterId: s2 },
        { courseId: courseId.COMP4310, semesterId: s1 },
        { courseId: courseId.COMP4310, semesterId: s2 },
        { courseId: courseId.COMP4320, semesterId: s2 },
        { courseId: courseId.COMP4670, semesterId: s1 },
        { courseId: courseId.COMP4680, semesterId: s2 },
        { courseId: courseId.COMP4691, semesterId: s2 },
        { courseId: courseId.COMP4610, semesterId: s1 },
        { courseId: courseId.COMP4620, semesterId: s1 },
        { courseId: courseId.COMP4630, semesterId: s2 },
        { courseId: courseId.COMP4550, semesterId: s1 },
        { courseId: courseId.COMP4560, semesterId: s2 },
        { courseId: courseId.COMP4900, semesterId: s1 },
        { courseId: courseId.COMP4910, semesterId: s1 },
        { courseId: courseId.COMP4910, semesterId: s2 },
        { courseId: courseId.COMP4920, semesterId: s2 },
      ])
      .run();

    tx.insert(requirements)
      .values([
        // Core, for every student.
        { specialisationId: null, courseId: courseId.COMP4300, category: "core" },
        { specialisationId: null, courseId: courseId.COMP4310, category: "core" },
        { specialisationId: null, courseId: courseId.COMP4320, category: "core" },
        // Machine Learning: required + electives.
        { specialisationId: specId.ML, courseId: courseId.COMP4670, category: "required" },
        { specialisationId: specId.ML, courseId: courseId.COMP4680, category: "required" },
        { specialisationId: specId.ML, courseId: courseId.COMP4691, category: "elective" },
        { specialisationId: specId.ML, courseId: courseId.COMP4900, category: "elective" },
        // Data Science: required + electives.
        { specialisationId: specId.DS, courseId: courseId.COMP4610, category: "required" },
        { specialisationId: specId.DS, courseId: courseId.COMP4620, category: "required" },
        { specialisationId: specId.DS, courseId: courseId.COMP4630, category: "elective" },
        { specialisationId: specId.DS, courseId: courseId.COMP4910, category: "elective" },
        // Software Engineering: required + electives.
        { specialisationId: specId.SE, courseId: courseId.COMP4550, category: "required" },
        { specialisationId: specId.SE, courseId: courseId.COMP4560, category: "required" },
        { specialisationId: specId.SE, courseId: courseId.COMP4900, category: "elective" },
        { specialisationId: specId.SE, courseId: courseId.COMP4920, category: "elective" },
      ])
      .run();

    // Wally starts on Machine Learning, semester 1, nothing completed yet.
    tx.insert(studentSpecialisation).values({ id: 1, specialisationId: specId.ML }).run();
  });
}
