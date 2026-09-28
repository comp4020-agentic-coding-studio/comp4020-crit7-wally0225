import type { APIRoute } from "astro";
import { resetPlan } from "../../lib/db";

export const POST: APIRoute = async ({ redirect }) => {
  resetPlan();
  return redirect("/", 303);
};
