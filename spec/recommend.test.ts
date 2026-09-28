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
  { id: 7, code: "ML3", title: "ML capstone", units: 6 },
];

const requirements = [
  { specialisationId: null, courseId: 1, category: "core" as const, choiceGroup: null },
  { specialisationId: 10, courseId: 2, category: "required" as const, choiceGroup: null },
  { specialisationId: 10, courseId: 3, category: "required" as const, choiceGroup: null },
  { specialisationId: 20, courseId: 4, category: "required" as const, choiceGroup: null },
  { specialisationId: null, courseId: 5, category: "choice" as const, choiceGroup: "foundational" },
  { specialisationId: null, courseId: 6, category: "choice" as const, choiceGroup: "foundational" },
  { specialisationId: 10, courseId: 7, category: "required" as const, choiceGroup: null },
];

const prerequisites = [
  { courseId: 3, requiresCourseId: 2, requisiteGroup: null },
  { courseId: 7, requiresCourseId: 5, requisiteGroup: "ML3-any" },
  { courseId: 7, requiresCourseId: 6, requisiteGroup: "ML3-any" },
];

const incompatibilities = [{ courseId: 3, incompatibleCourseId: 4, incompatibleCourseCode: "DS1" }];

const basePlanFor = (overrides: Partial<Parameters<typeof planFor>[0]>) =>
  planFor({
    specialisationId: 10,
    specialisationElectiveUnitsRequired: 0,
    takenCourseIds: [],
    takenBeforeThisSemesterCourseIds: overrides.takenCourseIds ?? [],
    offeredCourseIds: [1, 2, 3, 4, 5, 6, 7],
    requirements,
    prerequisites,
    incompatibilities,
    courses,
    ...overrides,
  });

describe("planFor", () => {
  it("puts a course whose prerequisite isn't met into notYetAvailable, with a reason", () => {
    const plan = basePlanFor({});

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML1");
    expect(plan.notYetAvailable.map(({ course }) => course.code)).toContain("ML2");
    expect(plan.takeThisSemester.map((c) => c.code)).not.toContain("ML2");
    const ml2 = plan.notYetAvailable.find(({ course }) => course.code === "ML2");
    expect(ml2?.reasons).toContain("Requires ML1");
  });

  it("moves the blocked course to takeThisSemester once its prerequisite is taken", () => {
    const plan = basePlanFor({ takenCourseIds: [2] });

    expect(plan.takeThisSemester.map((c) => c.code)).toContain("ML2");
  });

  it("changes which mandatory courses appear when the specialisation changes, taken courses held constant", () => {
    const takenCourseIds = [1];
    const mlPlan = basePlanFor({ takenCourseIds });
    const dsPlan = basePlanFor({ specialisationId: 20, takenCourseIds });

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

  it("an OR-group prerequisite is satisfied by any one alternative, with a combined reason otherwise", () => {
    const neitherOption = basePlanFor({});
    const blocked = neitherOption.notYetAvailable.find(({ course }) => course.code === "ML3");
    expect(blocked?.reasons).toContain("Requires one of: OPT_A, OPT_B");

    const tookOptionB = basePlanFor({ takenCourseIds: [6] });
    expect(tookOptionB.takeThisSemester.map((c) => c.code)).toContain("ML3");
  });

  it("blocks a course on a triggered incompatibility, even once its prerequisite is met", () => {
    const plan = basePlanFor({ takenCourseIds: [2, 4] });

    const blocked = plan.notYetAvailable.find(({ course }) => course.code === "ML2");
    expect(blocked?.reasons).toContain("Not compatible with DS1 (already completed)");
  });

  it("caps recommendations at four courses per semester, deferring the rest with a reason", () => {
    const plan = basePlanFor({
      requirements: [
        ...requirements,
        { specialisationId: 10, courseId: 4, category: "required" as const, choiceGroup: null },
      ],
    });

    expect(plan.takeThisSemester.length).toBe(4);
    expect(plan.takeThisSemester.map((c) => c.code)).toEqual(["CORE1", "ML1", "DS1", "OPT_A"]);
    const deferred = plan.notYetAvailable.find(({ course }) => course.code === "OPT_B");
    expect(deferred?.reasons).toContain("Semester course limit reached (max 4 per semester)");
  });

  it("caps recommendations at 24 units, deferring even under four courses once a 12-unit course is included", () => {
    const capstone: Course = { id: 8, code: "CAP1", title: "Capstone", units: 12 };
    const plan = basePlanFor({
      requirements: [
        ...requirements,
        { specialisationId: 10, courseId: 4, category: "required" as const, choiceGroup: null },
        { specialisationId: 10, courseId: 8, category: "required" as const, choiceGroup: null },
      ],
      offeredCourseIds: [1, 2, 3, 4, 5, 6, 7, 8],
      courses: [...courses, capstone],
    });

    // CORE1(6) + ML1(6) + DS1(6) = 18 units, 3 courses; the 12-unit capstone
    // would push the total to 30 units, over the 24-unit cap, even though
    // only 3 courses (not yet 4) have been committed.
    expect(plan.takeThisSemester.map((c) => c.code)).toEqual(
      expect.arrayContaining(["CORE1", "ML1", "DS1"]),
    );
    expect(plan.takeThisSemester.map((c) => c.code)).not.toContain("CAP1");
    const deferred = plan.notYetAvailable.find(({ course }) => course.code === "CAP1");
    expect(deferred?.reasons).toContain("Semester unit limit reached (max 24 units per semester)");
  });

  it("doesn't let a prerequisite completed this same semester unlock the course that needs it yet", () => {
    const plan = basePlanFor({ takenCourseIds: [2], takenBeforeThisSemesterCourseIds: [] });

    expect(plan.takeThisSemester.map((c) => c.code)).not.toContain("ML2");
    const blocked = plan.notYetAvailable.find(({ course }) => course.code === "ML2");
    expect(blocked?.reasons).toContain("Requires ML1 to be completed in an earlier semester");
  });
});
