import type { APIRoute } from "astro";
import { advanceToNextSemester } from "../../lib/db";

// Moves the "current" semester forward one row. A real student waits six
// months for this to happen on its own; the demo needs to show two semesters
// in one sitting, so this button does it instead.
export const POST: APIRoute = async ({ redirect }) => {
  advanceToNextSemester();
  return redirect("/", 303);
};
