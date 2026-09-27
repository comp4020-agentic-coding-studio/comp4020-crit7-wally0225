import type { Course } from "./schema";
import type { PrerequisiteRow, RequirementRow } from "./db";

export interface PlanInputs {
  specialisationId: number;
  takenCourseIds: number[];
  offeredCourseIds: number[];
  requirements: RequirementRow[];
  prerequisites: PrerequisiteRow[];
  courses: Course[];
}

export interface Plan {
  takeThisSemester: Course[];
  electivesAvailable: Course[];
  notYetAvailable: Course[];
  unitsDone: number;
  unitsRequired: number;
}

// Pure and DB-free: given a specialisation, what's been completed, and what's
// offered this semester, work out what to take now. No I/O, so it's cheap to
// unit test directly.
export function planFor(inputs: PlanInputs): Plan {
  const { specialisationId, takenCourseIds, offeredCourseIds, requirements, prerequisites, courses } = inputs;

  const takenSet = new Set(takenCourseIds);
  const offeredSet = new Set(offeredCourseIds);
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const applicable = requirements.filter(
    (r) => r.specialisationId === null || r.specialisationId === specialisationId,
  );

  const prereqsByCourse = new Map<number, number[]>();
  for (const { courseId, requiresCourseId } of prerequisites) {
    const list = prereqsByCourse.get(courseId) ?? [];
    list.push(requiresCourseId);
    prereqsByCourse.set(courseId, list);
  }
  const prereqsMet = (courseId: number) => (prereqsByCourse.get(courseId) ?? []).every((id) => takenSet.has(id));

  const takeThisSemester: Course[] = [];
  const electivesAvailable: Course[] = [];
  const notYetAvailable: Course[] = [];

  let unitsDone = 0;
  let unitsRequired = 0;

  for (const req of applicable) {
    const course = courseById.get(req.courseId);
    if (!course) continue;

    if (req.category !== "elective") unitsRequired += course.units;
    if (takenSet.has(req.courseId)) {
      if (req.category !== "elective") unitsDone += course.units;
      continue;
    }

    const ready = offeredSet.has(req.courseId) && prereqsMet(req.courseId);
    if (req.category === "elective") {
      if (ready) electivesAvailable.push(course);
    } else if (ready) {
      takeThisSemester.push(course);
    } else {
      notYetAvailable.push(course);
    }
  }

  return { takeThisSemester, electivesAvailable, notYetAvailable, unitsDone, unitsRequired };
}
