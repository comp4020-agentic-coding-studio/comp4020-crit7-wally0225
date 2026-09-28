# Process overview

## What I built

A Master of Computing degree planner, seeded with the real ANU program data —
prerequisites, incompatibilities, choice groups, elective pools — that tells a
student what they can take next and enforces the program's actual enrolment
rules: a 4-course/24-unit semester cap, prerequisites that must land in an
earlier semester, and the paperwork consequences (overload, RSL) of going
outside those caps.

## How I got here

The curriculum itself came first: real course data
[`415ff96`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/415ff96),
then real prerequisite/incompatibility rules rendered on screen
[`8e4bb3c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/8e4bb3c),
a 4-course-per-semester cap
[`1fa4c06`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/1fa4c06),
and a rule that a prerequisite only counts once it's completed in an earlier
semester, not the same one
[`6692bc5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/6692bc5).

Everything after that came from using the tool as a real student would.
Marking a 5th course or advancing under-loaded has a real ANU consequence, so:

> if user already mark 4 courses in one semester, and they choose the fifth
> one, then system should have a popup window... and direct user to this page

became a confirm-and-block `<dialog>`
[`04d02ba`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/04d02ba)
— fixed once more for a flicker bug where Astro's view-transition listener
raced the dialog closed before the student could click anything.

Three more prompts landed together in one pass, each closing a gap between the
model and the real program:

> Master of Computing is a 2 years program, let user can advanced to 2027 S2...
> add a restart button

> COMP8715 ... is a twelve units course, so ... Update the rules from 4 courses
> to 4 course AND needs to be 24 units each semester

> when user complete 96 units and complete their degree, then shows Congrates!
> popup window

— all in
[`96e8a8a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-wally0225/commit/96e8a8a),
each checked against `pnpm check` (44/44 tests, 0 type errors) and a manual
browser pass before it was committed.
