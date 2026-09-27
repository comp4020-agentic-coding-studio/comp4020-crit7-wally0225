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
  { id: 5, code: "OPT_A", title: "Foundational option A", units: 6 },
  { id: 6, code: "OPT_B", title: "Foundational option B", units: 6 },
];

const requirements = [
  { specialisationId: null, courseId: 1, category: "core" as const, choiceGroup: null },
  { specialisationId: 10, courseId: 2, category: "required" as const, choiceGroup: null },
  { specialisationId: 10, courseId: 3, category: "required" as const, choiceGroup: null },
  { specialisationId: 20, courseId: 4, category: "required" as const, choiceGroup: null },
  { specialisationId: null, courseId: 5, category: "choice" as const, choiceGroup: "foundational" },
  { specialisationId: null, courseId: 6, category: "choice" as const, choiceGroup: "foundational" },
];

const prerequisites = [{ courseId: 3, requiresCourseId: 2 }];

const basePlanFor = (overrides: Partial<Parameters<typeof planFor>[0]>) =>
  planFor({
    specialisationId: 10,
    specialisationElectiveUnitsRequired: 0,
    takenCourseIds: [],
    offeredCourseIds: [1, 2, 3, 4, 5, 6],
    requirements,
    prerequisites,
    courses,
    ...overrides,
  });

describe("planFor", () => {
  it("puts a course whose prerequisite isn't met into notYetAvailable", () => {
    const plan = basePlanFor({});

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML1");
    expect(plan.notYetAvailable.map((c) => c.code)).toContain("ML2");
    expect(plan.takeThisSemester.map((c) => c.code)).not.toContain("ML2");
  });

  it("moves the blocked course to takeThisSemester once its prerequisite is taken", () => {
    const plan = basePlanFor({ takenCourseIds: [2] });

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML2");
  });

  it("changes which mandatory courses appear when the specialisation changes, taken courses held constant", () => {
    const takenCourseIds = [1];
    const mlPlan = basePlanFor({ takenCourseIds, offeredCourseIds: [1, 2, 3, 4, 5, 6] });
    const dsPlan = basePlanFor({ specialisationId: 20, takenCourseIds, offeredCourseIds: [1, 2, 3, 4, 5, 6] });

    expect(mlPlan.takeThisSemester.map((c) => c.code)).toContain("ML1");
    expect(dsPlan.takeThisSemester.map((c) => c.code)).not.toContain("ML1");
    expect(dsPlan.takeThisSemester.map((c) => c.code)).toContain("DS1");
  });

  it("a choice group is satisfied by taking either alternative, not both", () => {
    const neither = basePlanFor({});
    expect(neither.takeThisSemester.map((c) => c.code)).toEqual(
      expect.arrayContaining(["OPT_A", "OPT_B"]),
    );

    const tookA = basePlanFor({ takenCourseIds: [5] });
    expect(tookA.takeThisSemester.map((c) => c.code)).not.toContain("OPT_B");
    expect(tookA.unitsDone).toBeGreaterThanOrEqual(6);
  });
});
