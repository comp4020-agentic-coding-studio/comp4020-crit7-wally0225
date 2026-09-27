import type { APIRoute } from "astro";
import { markTaken, markUntaken } from "../../lib/db";

// Marks (or unmarks) a course as completed. This is the core flow the spec
// asks to persist across reload: a course marked here is still marked after
// a fresh page load, because it's a row in taken_courses, not client state.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  const action = form.get("action");
  const requestedBack = String(form.get("back") ?? "/");
  const back = requestedBack === "/courses/" ? "/courses/" : "/";
  if (Number.isInteger(courseId) && courseId > 0) {
    if (action === "remove") markUntaken(courseId);
    else markTaken(courseId);
  }
  return redirect(back, 303);
};
