import { describe, expect, it } from "vitest";
import type { Course } from "../src/lib/schema";
import { planFor } from "../src/lib/recommend";

// planFor is pure and DB-free, so this is a fast, isolated unit test with its
// own small fixture — no server, no seeded database.
const courses: Course[] = [
  { id: 1, code: "CORE1", title: "Core course", units: 6 },
  { id: 2, code: "ML1", title: "ML intro", units: 6 },
  { id: 3, code: "ML2", title: "ML advanced", units: 6 },
  { id: 4, code: "DS1", title: "DS intro", units: 6 },
];

const requirements = [
  { specialisationId: null, courseId: 1, category: "core" as const },
  { specialisationId: 10, courseId: 2, category: "required" as const },
  { specialisationId: 10, courseId: 3, category: "required" as const },
  { specialisationId: 20, courseId: 4, category: "required" as const },
];

const prerequisites = [{ courseId: 3, requiresCourseId: 2 }];

describe("planFor", () => {
  it("puts a course whose prerequisite isn't met into notYetAvailable", () => {
    const plan = planFor({
      specialisationId: 10,
      takenCourseIds: [],
      offeredCourseIds: [1, 2, 3],
      requirements,
      prerequisites,
      courses,
    });

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML1");
    expect(plan.notYetAvailable.map((c) => c.code)).toContain("ML2");
    expect(plan.takeThisSemester.map((c) => c.code)).not.toContain("ML2");
  });

  it("moves the blocked course to takeThisSemester once its prerequisite is taken", () => {
    const plan = planFor({
      specialisationId: 10,
      takenCourseIds: [2],
      offeredCourseIds: [1, 2, 3],
      requirements,
      prerequisites,
      courses,
    });

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML2");
  });

  it("changes which mandatory courses appear when the specialisation changes, taken courses held constant", () => {
    const takenCourseIds = [1];
    const mlPlan = planFor({
      specialisationId: 10,
      takenCourseIds,
      offeredCourseIds: [1, 2, 3, 4],
      requirements,
      prerequisites,
      courses,
    });
    const dsPlan = planFor({
      specialisationId: 20,
      takenCourseIds,
      offeredCourseIds: [1, 2, 3, 4],
      requirements,
      prerequisites,
      courses,
    });

    expect(mlPlan.takeThisSemester.map((c) => c.code)).toContain("ML1");
    expect(dsPlan.takeThisSemester.map((c) => c.code)).not.toContain("ML1");
    expect(dsPlan.takeThisSemester.map((c) => c.code)).toContain("DS1");
  });
});
