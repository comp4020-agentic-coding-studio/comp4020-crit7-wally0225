import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  courses,
  incompatibilities,
  offerings,
  prerequisites,
  requirements,
  semesters,
  specialisations,
  studentSpecialisation,
} from "./schema";

// Master of Computing (ANU program 7706XMCOMP) data, taken from the live
// program page and each specialisation's own requirement page
// (programsandcourses.anu.edu.au/2025/program/7706XMCOMP and
// .../2025/specialisation/<CODE>) in September 2026:
//
//  - core (24u): COMP6710, COMP6250, COMP6442, COMP8260 — every student
//  - foundational choice (6u): MATH6005 or COMP6260
//  - capstone choice (12u): COMP8715 or COMP8830
//  - one specialisation's own required + elective courses (24u)
//  - computing electives (18u): further 6000-8000 level COMP/ENGN courses
//  - university electives (12u): any ANU course
//
// Two simplifications, for a week-7 prototype rather than a degree audit:
// some specialisations' real rules split their elective list into sub-caps
// (e.g. "min 12 units at 8000-level, max 12 units from list B") — here it's
// one flat pool per specialisation, capped only by its total unit
// requirement. And "university elective" is genuinely open-ended in the real
// program (any ANU course), so it's modelled as two generic placeholder
// slots rather than fabricated specific course codes.
//
// Prerequisites and incompatibilities are real, taken from each course's own
// "Requisite and Incompatibility" section (programsandcourses.anu.edu.au/2025/
// course/<code>) in September 2026. Most real incompatibilities, and several
// real prerequisites, name an undergraduate-equivalent course (COMP1xxx–4xxx)
// that isn't and never will be part of this 54-course Master of Computing
// seed — a rule keyed on a course nobody here can ever mark "taken" would
// permanently and wrongly block the seeded course, so those branches are
// dropped from the live prerequisites/incompatibilities below. Where a real
// OR-alternative has exactly one seeded branch, that branch becomes the
// (sole) requirement. Incompatibilities whose other course isn't seeded are
// still recorded (incompatibleCourseId left null) purely for display on the
// course catalogue — they never block anything, since they can never
// trigger against courses this planner can track.
export function seedIfEmpty(db: BetterSQLite3Database) {
  const already = db.select().from(courses).limit(1).all();
  if (already.length > 0) return;

  db.transaction((tx) => {
    // Order matches the program page's own "Specialisations" list, so ids
    // are stable and predictable in tests.
    const specRows = tx
      .insert(specialisations)
      .values([
        { code: "ARTIF-SPEC", name: "Artificial Intelligence", electiveUnitsRequired: 0 },
        { code: "COMP-SPEC", name: "Computational Foundations", electiveUnitsRequired: 24 },
        { code: "CMSY-SPEC", name: "Computer Systems", electiveUnitsRequired: 24 },
        { code: "DTSC-SPEC", name: "Data Science", electiveUnitsRequired: 6 },
        { code: "HCCM-SPEC", name: "Human-Centred and Creative Computing", electiveUnitsRequired: 18 },
        { code: "MCHL-SPEC", name: "Machine Learning", electiveUnitsRequired: 24 },
        { code: "PCOM-SPEC", name: "Professional Computing", electiveUnitsRequired: 12 },
      ])
      .returning()
      .all();
    const specId = Object.fromEntries(specRows.map((s) => [s.code, s.id]));

    const courseRows = tx
      .insert(courses)
      .values([
        // Core, degree-wide (24 units).
        { code: "COMP6710", title: "Structured Programming" },
        { code: "COMP6250", title: "Professional Practice: Holistic Thinking and Communication" },
        { code: "COMP6442", title: "Software Construction" },
        { code: "COMP8260", title: "Professional Practice: Responsible Innovation and Leadership" },
        // Foundational choice (6 units): MATH6005 or COMP6260.
        { code: "MATH6005", title: "Discrete Mathematical Models" },
        { code: "COMP6260", title: "Foundations of Computing" },
        // Capstone choice (12 units): COMP8715 or COMP8830.
        { code: "COMP8715", title: "Advanced Computing Team Project", units: 12 },
        { code: "COMP8830", title: "Computing Internship", units: 12 },
        // Artificial Intelligence — all four required, no elective pool.
        { code: "COMP6262", title: "Logic" },
        { code: "COMP6320", title: "Artificial Intelligence" },
        { code: "COMP8620", title: "Advanced Topics in Artificial Intelligence" },
        { code: "COMP8691", title: "Optimisation" },
        // Computational Foundations — elective pool only.
        { code: "COMP6361", title: "Principles of Programming Languages" },
        { code: "COMP6363", title: "Theory of Computation" },
        { code: "COMP8011", title: "Advanced Topics in Formal Methods and Programming Languages" },
        { code: "COMP8460", title: "Advanced Algorithms" },
        { code: "MATH6114", title: "Number Theory and Cryptography" },
        { code: "MATH8343", title: "Foundations of Mathematics" },
        { code: "COMP6261", title: "Information Theory" },
        { code: "COMP6466", title: "Algorithms" },
        { code: "COMP8712", title: "Compiler Construction" },
        // Computer Systems — elective pool only.
        { code: "COMP8300", title: "Parallel Systems" },
        { code: "COMP8045", title: "Advanced Topics in Computer Systems" },
        { code: "COMP6310", title: "Systems Networks and Concurrency" },
        { code: "COMP6330", title: "Operating Systems" },
        { code: "COMP6331", title: "Computer Networks" },
        { code: "COMP6464", title: "High Performance Scientific Computing" },
        { code: "ENGN6213", title: "Digital Systems and Microprocessors" },
        // Data Science — three required, plus its own elective pool.
        { code: "COMP6240", title: "Relational Databases" },
        { code: "COMP8410", title: "Data Mining" },
        { code: "COMP8430", title: "Data Wrangling" },
        { code: "COMP6490", title: "Document Analysis" },
        { code: "COMP6670", title: "Introduction to Machine Learning" },
        { code: "COMP8600", title: "Statistical Machine Learning" },
        { code: "COMP8650", title: "Advanced Topics in Machine Learning" },
        { code: "COMP8880", title: "Computational Methods for Network Science" },
        { code: "STAT6039", title: "Principles of Mathematical Statistics" },
        // Human-Centred and Creative Computing — one required, plus its own
        // elective pool.
        { code: "COMP6390", title: "Human-Computer Interaction" },
        { code: "COMP8350", title: "Sound and Music Computing" },
        { code: "COMP8539", title: "Advanced Topics in Computer Vision" },
        { code: "COMP8610", title: "Computer Graphics" },
        { code: "COMP6528", title: "Computer Vision" },
        { code: "COMP6540", title: "Game Development" },
        { code: "COMP6720", title: "Art and Interaction Computing" },
        { code: "COMP6780", title: "Web Programming and Design" },
        // Machine Learning reuses Data Science's Statistical Machine
        // Learning courses above (COMP6261/6490/6528/6670/8600/8650/8880) —
        // the real specialisation shares that exact course list.
        // Professional Computing — two required, plus its own elective pool
        // (which reuses COMP6240/6331/6390 above).
        { code: "COMP6120", title: "Software Engineering" },
        { code: "ENGN8100", title: "Introduction to Systems Engineering" },
        { code: "INFS8004", title: "Enterprise Systems and Strategy" },
        { code: "INFS8205", title: "Digital Strategy, Executive and Operations" },
        { code: "LAWS8445", title: "Information Technology Law" },
        { code: "MGMT7020", title: "Technology and Project Management" },
        { code: "REGN8014", title: "Contemporary Issues in Technology Governance" },
        // University electives: genuinely "any ANU course" in the real
        // program, so these are generic placeholder slots, not fabricated
        // specific courses.
        { code: "ELEC6001", title: "University Elective" },
        { code: "ELEC6002", title: "University Elective" },
      ])
      .returning()
      .all();
    const courseId = Object.fromEntries(courseRows.map((c) => [c.code, c.id]));

    tx.insert(prerequisites)
      .values([
        // Individually-mandatory (AND) prerequisites — the real rule's only
        // branch that's also a seeded course.
        { courseId: courseId.COMP6320, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP6320, requiresCourseId: courseId.COMP6262 },
        { courseId: courseId.COMP8620, requiresCourseId: courseId.COMP6320 },
        { courseId: courseId.COMP8691, requiresCourseId: courseId.COMP6320 },
        { courseId: courseId.COMP6361, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP6361, requiresCourseId: courseId.COMP6260 },
        { courseId: courseId.COMP8715, requiresCourseId: courseId.COMP6442 },
        { courseId: courseId.COMP8715, requiresCourseId: courseId.COMP8260 },
        { courseId: courseId.COMP8830, requiresCourseId: courseId.COMP8260 },
        { courseId: courseId.COMP8830, requiresCourseId: courseId.COMP6442 },
        { courseId: courseId.COMP8460, requiresCourseId: courseId.COMP6466 },
        { courseId: courseId.COMP6466, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP8712, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP8712, requiresCourseId: courseId.COMP6442 },
        { courseId: courseId.COMP8712, requiresCourseId: courseId.COMP6310 },
        { courseId: courseId.COMP6310, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP6464, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP8410, requiresCourseId: courseId.COMP6240 },
        { courseId: courseId.COMP8410, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP8430, requiresCourseId: courseId.COMP6240 },
        { courseId: courseId.COMP8430, requiresCourseId: courseId.COMP6710 },

        // OR-groups: any ONE course sharing a requisiteGroup satisfies it.
        // COMP6442 (core): COMP6710, AND one of MATH6005/COMP6260 — the same
        // pair as the foundational choice group above.
        { courseId: courseId.COMP6442, requiresCourseId: courseId.COMP6710 },
        {
          courseId: courseId.COMP6442,
          requiresCourseId: courseId.MATH6005,
          requisiteGroup: "COMP6442-foundational",
        },
        {
          courseId: courseId.COMP6442,
          requiresCourseId: courseId.COMP6260,
          requisiteGroup: "COMP6442-foundational",
        },
        // COMP6331: one of COMP6710 / COMP6310 / COMP6442.
        { courseId: courseId.COMP6331, requiresCourseId: courseId.COMP6710, requisiteGroup: "COMP6331-any" },
        { courseId: courseId.COMP6331, requiresCourseId: courseId.COMP6310, requisiteGroup: "COMP6331-any" },
        { courseId: courseId.COMP6331, requiresCourseId: courseId.COMP6442, requisiteGroup: "COMP6331-any" },
        // COMP6490: COMP6710, AND one of COMP6240 / COMP6260 / COMP6442.
        { courseId: courseId.COMP6490, requiresCourseId: courseId.COMP6710 },
        { courseId: courseId.COMP6490, requiresCourseId: courseId.COMP6240, requisiteGroup: "COMP6490-domain" },
        { courseId: courseId.COMP6490, requiresCourseId: courseId.COMP6260, requisiteGroup: "COMP6490-domain" },
        { courseId: courseId.COMP6490, requiresCourseId: courseId.COMP6442, requisiteGroup: "COMP6490-domain" },
        // COMP8300: one of COMP6310 / COMP6330 / COMP6331 / COMP6464 (the
        // real rule's fifth branch, ENGN6539, isn't seeded).
        { courseId: courseId.COMP8300, requiresCourseId: courseId.COMP6310, requisiteGroup: "COMP8300-any" },
        { courseId: courseId.COMP8300, requiresCourseId: courseId.COMP6330, requisiteGroup: "COMP8300-any" },
        { courseId: courseId.COMP8300, requiresCourseId: courseId.COMP6331, requisiteGroup: "COMP8300-any" },
        { courseId: courseId.COMP8300, requiresCourseId: courseId.COMP6464, requisiteGroup: "COMP8300-any" },
        // COMP8650: one of COMP6670 / COMP8600.
        { courseId: courseId.COMP8650, requiresCourseId: courseId.COMP6670, requisiteGroup: "COMP8650-any" },
        { courseId: courseId.COMP8650, requiresCourseId: courseId.COMP8600, requisiteGroup: "COMP8650-any" },

        // Not modelled: COMP6330's real prerequisite (COMP6300, COMP2300, or
        // ENGN2219) has no branch in this seed, so it's left gate-free rather
        // than blocked on an unmodelled course. COMP8045's real requirement
        // is a generic "12 units of 6000-level COMP courses", not a specific
        // code, so it has no prerequisite row at all.
      ])
      .run();

    // Incompatibilities: "not able to enrol if you've already completed X".
    // Only COMP8715/COMP8830 (the capstone alternatives) are both seeded —
    // already mutually exclusive via the choiceGroup below, this just makes
    // the rule explicit and displayable. Every other row here is real but
    // references an undergraduate-equivalent (or other-program) course this
    // planner doesn't model, so incompatibleCourseId is left null: shown on
    // the course catalogue, never used to block.
    tx.insert(incompatibilities)
      .values([
        { courseId: courseId.COMP8715, incompatibleCourseId: courseId.COMP8830, incompatibleCourseCode: "COMP8830" },
        { courseId: courseId.COMP8830, incompatibleCourseId: courseId.COMP8715, incompatibleCourseCode: "COMP8715" },

        { courseId: courseId.COMP6710, incompatibleCourseCode: "COMP1110" },
        { courseId: courseId.COMP6710, incompatibleCourseCode: "COMP1140" },
        { courseId: courseId.COMP6442, incompatibleCourseCode: "COMP2100" },
        { courseId: courseId.COMP6260, incompatibleCourseCode: "COMP1600" },
        { courseId: courseId.COMP6262, incompatibleCourseCode: "PHIL2080" },
        { courseId: courseId.COMP6262, incompatibleCourseCode: "COMP2620" },
        { courseId: courseId.COMP6320, incompatibleCourseCode: "COMP3620" },
        { courseId: courseId.COMP8620, incompatibleCourseCode: "COMP4620" },
        { courseId: courseId.COMP8691, incompatibleCourseCode: "COMP4690" },
        { courseId: courseId.COMP6363, incompatibleCourseCode: "COMP3630" },
        { courseId: courseId.COMP8460, incompatibleCourseCode: "COMP4600" },
        { courseId: courseId.COMP6261, incompatibleCourseCode: "COMP2610" },
        { courseId: courseId.COMP6261, incompatibleCourseCode: "ENGN8534" },
        { courseId: courseId.COMP6466, incompatibleCourseCode: "COMP3600" },
        { courseId: courseId.COMP8712, incompatibleCourseCode: "COMP3710" },
        { courseId: courseId.COMP8712, incompatibleCourseCode: "COMP6470" },
        { courseId: courseId.COMP8300, incompatibleCourseCode: "COMP4300" },
        { courseId: courseId.COMP6310, incompatibleCourseCode: "COMP2310" },
        { courseId: courseId.COMP6330, incompatibleCourseCode: "COMP3300" },
        { courseId: courseId.COMP6331, incompatibleCourseCode: "COMP3310" },
        { courseId: courseId.COMP6331, incompatibleCourseCode: "ENGN3539" },
        { courseId: courseId.COMP6331, incompatibleCourseCode: "ENGN6539" },
        { courseId: courseId.COMP6464, incompatibleCourseCode: "COMP3320" },
        { courseId: courseId.COMP6240, incompatibleCourseCode: "COMP2400" },
        { courseId: courseId.COMP6240, incompatibleCourseCode: "COMP7240" },
        { courseId: courseId.COMP8410, incompatibleCourseCode: "COMP3420" },
        { courseId: courseId.COMP8410, incompatibleCourseCode: "COMP3425" },
        { courseId: courseId.COMP8410, incompatibleCourseCode: "COMP8400" },
        { courseId: courseId.COMP8410, incompatibleCourseCode: "COMP8910" },
        { courseId: courseId.COMP8430, incompatibleCourseCode: "COMP3430" },
        { courseId: courseId.COMP6490, incompatibleCourseCode: "COMP4650" },
        { courseId: courseId.COMP6490, incompatibleCourseCode: "COMP6990" },
        { courseId: courseId.COMP6670, incompatibleCourseCode: "COMP3670" },
        { courseId: courseId.COMP8600, incompatibleCourseCode: "COMP4670" },
        { courseId: courseId.COMP8600, incompatibleCourseCode: "COMP8960" },
        { courseId: courseId.COMP8880, incompatibleCourseCode: "COMP4880" },
        { courseId: courseId.COMP8880, incompatibleCourseCode: "COMP8980" },
        { courseId: courseId.COMP6390, incompatibleCourseCode: "COMP3900" },
        { courseId: courseId.COMP8350, incompatibleCourseCode: "COMP4350" },
        { courseId: courseId.COMP8539, incompatibleCourseCode: "ENGN8501" },
        { courseId: courseId.COMP8610, incompatibleCourseCode: "COMP4610" },
        { courseId: courseId.COMP8610, incompatibleCourseCode: "COMP6461" },
        { courseId: courseId.COMP6528, incompatibleCourseCode: "ENGN6528" },
        { courseId: courseId.COMP6528, incompatibleCourseCode: "COMP4528" },
        { courseId: courseId.COMP6528, incompatibleCourseCode: "ENGN4528" },
        { courseId: courseId.COMP6720, incompatibleCourseCode: "COMP1720" },
        { courseId: courseId.COMP6780, incompatibleCourseCode: "COMP1710" },
        { courseId: courseId.COMP6120, incompatibleCourseCode: "COMP2120" },
      ])
      .run();

    // The Master of Computing is a 2-year, 4-semester program — seed both
    // years so a student can advance all the way through it, not just once.
    const semesterRows = tx
      .insert(semesters)
      .values([
        { year: 2026, term: "S1", label: "2026 Semester 1", isCurrent: true },
        { year: 2026, term: "S2", label: "2026 Semester 2", isCurrent: false },
        { year: 2027, term: "S1", label: "2027 Semester 1", isCurrent: false },
        { year: 2027, term: "S2", label: "2027 Semester 2", isCurrent: false },
      ])
      .returning()
      .all();
    const s1ByYear = new Map(
      semesterRows.filter((s) => s.term === "S1").map((s) => [s.year, s.id]),
    );
    const s2ByYear = new Map(
      semesterRows.filter((s) => s.term === "S2").map((s) => [s.year, s.id]),
    );

    const offeringPlan: [string, ("S1" | "S2")[]][] = [
      ["COMP6710", ["S1", "S2"]],
      ["COMP6250", ["S1", "S2"]],
      ["COMP6442", ["S1", "S2"]],
      ["COMP8260", ["S1", "S2"]],
      ["MATH6005", ["S1", "S2"]],
      ["COMP6260", ["S1", "S2"]],
      ["COMP8715", ["S1", "S2"]],
      ["COMP8830", ["S1", "S2"]],
      ["COMP6262", ["S1"]],
      ["COMP6320", ["S1"]],
      ["COMP8620", ["S2"]],
      ["COMP8691", ["S2"]],
      ["COMP6361", ["S1"]],
      ["COMP6363", ["S1"]],
      ["COMP8011", ["S2"]],
      ["COMP8460", ["S2"]],
      ["MATH6114", ["S1"]],
      ["MATH8343", ["S2"]],
      ["COMP6261", ["S1"]],
      ["COMP6466", ["S2"]],
      ["COMP8712", ["S2"]],
      ["COMP8300", ["S1"]],
      ["COMP8045", ["S2"]],
      ["COMP6310", ["S1"]],
      ["COMP6330", ["S1"]],
      ["COMP6331", ["S1"]],
      ["COMP6464", ["S2"]],
      ["ENGN6213", ["S1"]],
      ["COMP6240", ["S1"]],
      ["COMP8410", ["S2"]],
      ["COMP8430", ["S2"]],
      ["COMP6490", ["S1"]],
      ["COMP6670", ["S1"]],
      ["COMP8600", ["S1", "S2"]],
      ["COMP8650", ["S2"]],
      ["COMP8880", ["S2"]],
      ["STAT6039", ["S1"]],
      ["COMP6390", ["S1"]],
      ["COMP8350", ["S2"]],
      ["COMP8539", ["S2"]],
      ["COMP8610", ["S1"]],
      ["COMP6528", ["S1"]],
      ["COMP6540", ["S1"]],
      ["COMP6720", ["S2"]],
      ["COMP6780", ["S1"]],
      ["COMP6120", ["S1"]],
      ["ENGN8100", ["S1"]],
      ["INFS8004", ["S2"]],
      ["INFS8205", ["S2"]],
      ["LAWS8445", ["S2"]],
      ["MGMT7020", ["S1"]],
      ["REGN8014", ["S2"]],
      ["ELEC6001", ["S1", "S2"]],
      ["ELEC6002", ["S1", "S2"]],
    ];
    // A course's S1/S2 slot repeats every year, same as the real program —
    // so each offering row is duplicated across both 2026 and 2027.
    tx.insert(offerings)
      .values(
        offeringPlan.flatMap(([code, terms]) =>
          terms.flatMap((term) => {
            const byYear = term === "S1" ? s1ByYear : s2ByYear;
            return [...byYear.values()].map((semesterId) => ({ courseId: courseId[code], semesterId }));
          }),
        ),
      )
      .run();

    tx.insert(requirements)
      .values([
        // Core, every student.
        { specialisationId: null, courseId: courseId.COMP6710, category: "core" },
        { specialisationId: null, courseId: courseId.COMP6250, category: "core" },
        { specialisationId: null, courseId: courseId.COMP6442, category: "core" },
        { specialisationId: null, courseId: courseId.COMP8260, category: "core" },
        // Foundational choice, every student.
        { specialisationId: null, courseId: courseId.MATH6005, category: "choice", choiceGroup: "foundational" },
        { specialisationId: null, courseId: courseId.COMP6260, category: "choice", choiceGroup: "foundational" },
        // Capstone choice, every student.
        { specialisationId: null, courseId: courseId.COMP8715, category: "choice", choiceGroup: "capstone" },
        { specialisationId: null, courseId: courseId.COMP8830, category: "choice", choiceGroup: "capstone" },
        // Computing electives, degree-wide.
        { specialisationId: null, courseId: courseId.COMP6363, category: "computing_elective" },
        { specialisationId: null, courseId: courseId.COMP8460, category: "computing_elective" },
        { specialisationId: null, courseId: courseId.COMP6464, category: "computing_elective" },
        { specialisationId: null, courseId: courseId.COMP6310, category: "computing_elective" },
        { specialisationId: null, courseId: courseId.COMP8045, category: "computing_elective" },
        // University electives, degree-wide.
        { specialisationId: null, courseId: courseId.ELEC6001, category: "university_elective" },
        { specialisationId: null, courseId: courseId.ELEC6002, category: "university_elective" },

        // Artificial Intelligence: all four required, no elective pool.
        { specialisationId: specId["ARTIF-SPEC"], courseId: courseId.COMP6262, category: "required" },
        { specialisationId: specId["ARTIF-SPEC"], courseId: courseId.COMP6320, category: "required" },
        { specialisationId: specId["ARTIF-SPEC"], courseId: courseId.COMP8620, category: "required" },
        { specialisationId: specId["ARTIF-SPEC"], courseId: courseId.COMP8691, category: "required" },

        // Computational Foundations: elective pool only.
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP6361, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP6363, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP8011, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP8460, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.MATH6114, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.MATH8343, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP6261, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP6466, category: "elective" },
        { specialisationId: specId["COMP-SPEC"], courseId: courseId.COMP8712, category: "elective" },

        // Computer Systems: elective pool only.
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP8300, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP8045, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP6310, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP6330, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP6331, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP6361, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP6464, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.ENGN6213, category: "elective" },
        { specialisationId: specId["CMSY-SPEC"], courseId: courseId.COMP8712, category: "elective" },

        // Data Science: three required, plus its own elective pool.
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP6240, category: "required" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP8410, category: "required" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP8430, category: "required" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP6490, category: "elective" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP6670, category: "elective" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP8600, category: "elective" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP8650, category: "elective" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.COMP8880, category: "elective" },
        { specialisationId: specId["DTSC-SPEC"], courseId: courseId.STAT6039, category: "elective" },

        // Human-Centred and Creative Computing: one required, plus its own
        // elective pool.
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP6390, category: "required" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP8350, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP8539, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP8610, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP6528, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP6540, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP6720, category: "elective" },
        { specialisationId: specId["HCCM-SPEC"], courseId: courseId.COMP6780, category: "elective" },

        // Machine Learning: elective pool only (shares Data Science's ML
        // course list, per the real program).
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP6261, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP6490, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP6528, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP6670, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP8600, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP8650, category: "elective" },
        { specialisationId: specId["MCHL-SPEC"], courseId: courseId.COMP8880, category: "elective" },

        // Professional Computing: two required, plus its own elective pool.
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP6120, category: "required" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.ENGN8100, category: "required" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP6240, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP6331, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP6390, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.INFS8004, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.INFS8205, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.LAWS8445, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.MGMT7020, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.REGN8014, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP8600, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP8880, category: "elective" },
        { specialisationId: specId["PCOM-SPEC"], courseId: courseId.COMP8410, category: "elective" },
      ])
      .run();

    // Wally starts on Machine Learning, semester 1, nothing completed yet.
    tx.insert(studentSpecialisation)
      .values({ id: 1, specialisationId: specId["MCHL-SPEC"] })
      .run();
  });
}
