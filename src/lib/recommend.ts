import type { Course } from "./schema";
import type { PrerequisiteRow, RequirementRow } from "./db";

// Degree-wide elective pools that aren't tied to any specialisation, and so
// don't vary with `specialisations.electiveUnitsRequired`. Values are the
// real ANU Master of Computing unit requirements: 18 units from further
// 6000/7000/8000-level COMP or ENGN courses, 12 units of general university
// electives.
const POOL_UNITS_REQUIRED: Record<string, number> = {
  computing_elective: 18,
  university_elective: 12,
};

const POOL_LABEL: Record<string, string> = {
  elective: "Specialisation electives",
  computing_elective: "Computing electives (any further 6000–8000 level COMP or ENGN course)",
  university_elective: "University electives (any ANU course)",
};

export interface PlanInputs {
  specialisationId: number;
  specialisationElectiveUnitsRequired: number;
  takenCourseIds: number[];
  offeredCourseIds: number[];
  requirements: RequirementRow[];
  prerequisites: PrerequisiteRow[];
  courses: Course[];
}

export interface ElectivePool {
  key: string;
  label: string;
  unitsDone: number;
  unitsRequired: number;
  available: Course[];
  notYetAvailable: Course[];
}

export interface Plan {
  takeThisSemester: Course[];
  notYetAvailable: Course[];
  electivePools: ElectivePool[];
  unitsDone: number;
  unitsRequired: number;
}

// Pure and DB-free: given a specialisation, what's been completed, and what's
// offered this semester, work out what to take now. No I/O, so it's cheap to
// unit test directly.
export function planFor(inputs: PlanInputs): Plan {
  const {
    specialisationId,
    specialisationElectiveUnitsRequired,
    takenCourseIds,
    offeredCourseIds,
    requirements,
    prerequisites,
    courses,
  } = inputs;

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
  const isReady = (courseId: number) =>
    offeredSet.has(courseId) && (prereqsByCourse.get(courseId) ?? []).every((id) => takenSet.has(id));

  const takeThisSemester: Course[] = [];
  const notYetAvailable: Course[] = [];
  let unitsDone = 0;
  let unitsRequired = 0;

  // Individually-mandatory courses: degree-wide core, plus this
  // specialisation's own required courses. Every one of these must be taken.
  for (const req of applicable) {
    if (req.category !== "core" && req.category !== "required") continue;
    const course = courseById.get(req.courseId);
    if (!course) continue;

    unitsRequired += course.units;
    if (takenSet.has(req.courseId)) {
      unitsDone += course.units;
      continue;
    }
    (isReady(req.courseId) ? takeThisSemester : notYetAvailable).push(course);
  }

  // Choice groups: mandatory, but satisfied by any ONE course sharing a
  // choiceGroup (e.g. MATH6005 or COMP6260 for the foundational requirement).
  const groups = new Map<string, RequirementRow[]>();
  for (const req of applicable) {
    if (req.category !== "choice" || !req.choiceGroup) continue;
    const key = `${req.specialisationId ?? "core"}:${req.choiceGroup}`;
    const list = groups.get(key) ?? [];
    list.push(req);
    groups.set(key, list);
  }
  for (const groupReqs of groups.values()) {
    const groupCourses = groupReqs
      .map((r) => courseById.get(r.courseId))
      .filter((c): c is Course => c !== undefined);
    if (groupCourses.length === 0) continue;

    unitsRequired += groupCourses[0].units;
    const satisfiedBy = groupCourses.find((c) => takenSet.has(c.id));
    if (satisfiedBy) {
      unitsDone += satisfiedBy.units;
      continue;
    }

    const notTaken = groupCourses.filter((c) => !takenSet.has(c.id));
    const ready = notTaken.filter((c) => isReady(c.id));
    (ready.length > 0 ? takeThisSemester : notYetAvailable).push(...(ready.length > 0 ? ready : notTaken));
  }

  // Elective-like pools: pick freely from a list up to a unit threshold. One
  // for this specialisation's own electives, plus the two degree-wide pools.
  const poolThresholds: Record<string, number> = {
    elective: specialisationElectiveUnitsRequired,
    computing_elective: POOL_UNITS_REQUIRED.computing_elective,
    university_elective: POOL_UNITS_REQUIRED.university_elective,
  };
  const electivePools: ElectivePool[] = [];
  for (const category of ["elective", "computing_elective", "university_elective"] as const) {
    const reqs = applicable.filter((r) => r.category === category);
    if (reqs.length === 0) continue;

    const threshold = poolThresholds[category] ?? 0;
    let poolDone = 0;
    const available: Course[] = [];
    const blocked: Course[] = [];
    for (const req of reqs) {
      const course = courseById.get(req.courseId);
      if (!course) continue;
      if (takenSet.has(req.courseId)) {
        poolDone += course.units;
        continue;
      }
      (isReady(req.courseId) ? available : blocked).push(course);
    }

    unitsRequired += threshold;
    unitsDone += Math.min(poolDone, threshold);
    electivePools.push({
      key: category,
      label: POOL_LABEL[category],
      unitsDone: poolDone,
      unitsRequired: threshold,
      available,
      notYetAvailable: blocked,
    });
  }

  return { takeThisSemester, notYetAvailable, electivePools, unitsDone, unitsRequired };
}
