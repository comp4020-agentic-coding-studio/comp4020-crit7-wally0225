import { describe, expect, inject, it } from "vitest";

// Drives the running app over HTTP against the seeded data in src/lib/seed.ts
// (COMP6710 is the first seeded course — a core unit offered every semester;
// specialisation 6 is Machine Learning, seeded as the student's starting
// choice; specialisation 4 is Data Science). Follows the same pattern as the
// starter's own spec/guestbook.test.ts: same-origin `origin` header on POSTs,
// manual redirects.
const baseUrl = inject("baseUrl");

const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

const getDashboard = async () => {
  const res = await fetch(baseUrl);
  return res.text();
};

describe("degree plan: persists across reload", () => {
  it("a course marked complete is still marked complete after a fresh page load", async () => {
    const res = await post("/api/taken", new URLSearchParams({ courseId: "1", back: "/" }));
    expect(res.status).toBe(303);

    const first = await getDashboard();
    expect(first).toContain("COMP6710");

    const second = await getDashboard();
    expect(second).toContain("COMP6710");
  });
});

describe("degree plan: switching specialisation is real, not cosmetic", () => {
  it("changes the recommended list and survives a reload", async () => {
    const before = await getDashboard();
    expect(before).toContain("Machine Learning");

    const res = await post("/api/specialisation", new URLSearchParams({ specialisationId: "4" }));
    expect(res.status).toBe(303);

    const after = await getDashboard();
    expect(after).toContain("Data Science");
    expect(after).toContain("Relational Databases");

    const reloaded = await getDashboard();
    expect(reloaded).toContain("Data Science");
    expect(reloaded).toContain("Relational Databases");
  });
});
