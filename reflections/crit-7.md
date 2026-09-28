# Crit 7 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was treating myself as the first real user of the thing I
built, not just its spec-writer. This was the first full-stack week — a real
database, real ANU curriculum data, real prerequisite and incompatibility
rules — so it was easy to think the job was done once the model matched the
program handbook. It wasn't. Once I started actually planning my own degree
in it, gaps showed up that reading the spec never would have surfaced: no
way to restart once you'd enrolled, a confirm dialog that flickered shut
before I could click anything, and — the one that mattered most — a 24-unit
load cap that only makes sense once you notice COMP8715 and COMP8830 are
worth double a normal course. None of those were planned for; they were
found by using the app the way a real student would, then handed to the
agent as the next instruction.

## What did this work change about who I want to be as a product manager?

This sharpened the same lesson from earlier crits in a higher-stakes
setting: with a real backend and persistent state, a bug found late is
harder to undo than a rough edge in a static prototype, so dogfooding
earlier matters more, not less. I didn't ask the agent to imagine edge cases
in the abstract — I fed it what actually broke when I used the product, one
rule at a time, and let it fix the specific thing I'd just hit. That's the
role I want: not someone who writes the complete spec upfront and hands it
off, but someone who stays inside the product as it's built, notices where
reality diverges from the plan, and turns that friction into the next
precise instruction.
