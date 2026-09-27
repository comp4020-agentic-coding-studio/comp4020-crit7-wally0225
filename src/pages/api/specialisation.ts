import type { APIRoute } from "astro";
import { setStudentSpecialisation } from "../../lib/db";

// The "switch specialisation" action: a real, immediate write to
// student_specialisation. There's no preview mode — choosing a different
// specialisation here is the same act a real student would make, and the
// dashboard's recommendation recomputes from whatever this row says.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = Number(form.get("specialisationId"));
  if (Number.isInteger(id) && id > 0) {
    setStudentSpecialisation(id);
  }
  return redirect("/", 303);
};
