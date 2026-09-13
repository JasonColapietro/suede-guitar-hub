/**
 * What `prerequisiteLessonIds` is for, and what keeps it true.
 *
 * It is authored on all 117 guitar instruction records and, before this, was
 * referenced by no code whatsoever — not a component, not a route, not a test.
 * The spec's question was the right one: enforce it, or mark it documentation.
 *
 * **It is documentation, and it is not an access gate.** Three reasons, each
 * independently sufficient:
 *
 * 1. It would close the content the free tier just opened. A visitor arriving
 *    with no progress — a guest on a deep link, a crawler, anyone who cleared
 *    site data — satisfies the prerequisites of exactly one lesson in 117. Under
 *    a gate, `g-l1-m1-01` would render and the other 116 would not, which makes
 *    twenty-two deliberately open and indexable lessons open and indexable in
 *    name only. This is the decisive reason and it is asserted in the test,
 *    because the first version of this note claimed something weaker and wrong:
 *    that a free lesson already depends on a closed one. None does today. The
 *    cross-level edges that would cause that — `g-l5-m1-01` requires
 *    `g-l4-m5-07` — are all inside paid content, so the risk is latent, not
 *    present, and saying otherwise would have overstated the case.
 * 2. It cannot be trusted as a gate. Completion lives in `localStorage` (see
 *    `components/learning/useLearningProgress.ts`), so a gate would be bypassed
 *    by anyone who wanted to and would lock out an honest learner on a new
 *    device or after clearing site data. A gate that inconveniences only honest
 *    users is worse than no gate.
 * 3. Nothing about the curriculum asks for it. A prerequisite here means "this
 *    makes more sense after that", which is advice. The thing that genuinely
 *    must not be opened early is paid content, and `canOpenModule` already
 *    decides that on entitlement, where the decision belongs.
 *
 * **But documentation that nothing checks is just a comment in a data file.** So
 * the graph is now enforced as a consistency oracle over the catalog rather than
 * as a gate on the learner. `nextLessonId` advances through lessons in catalog
 * array order and ignores this graph entirely, which means the two are two
 * independent statements of the same pedagogical order — and the authored one can
 * check the implicit one. If someone reorders the catalog and puts a lesson
 * before its prerequisite, `prerequisiteOrderViolations` returns it and the test
 * fails. That is the graph doing real work: not stopping a learner, but stopping
 * a reordering that would send one somewhere they are not ready for.
 *
 * Every function here returns what is wrong rather than throwing, so the test
 * reports the whole list instead of the first item.
 */
import { lessonPrerequisites } from "./instructions.ts";
import { allLessons } from "./curriculum.ts";

/** Recorded in code so a future reader finds the decision, not just the data. */
export const PREREQUISITE_POLICY = {
  role: "orderingDocumentation",
  isAccessGate: false,
  /** The gate that does decide what opens, so the distinction is one hop away. */
  accessGate: "lib/learning/access.ts canOpenModule",
} as const;

export const PREREQUISITE_RECORD_COUNT = lessonPrerequisites.length;

const graph = new Map(lessonPrerequisites.map(entry => [entry.id, entry.prerequisiteLessonIds]));

export function prerequisitesFor(lessonId: string): readonly string[] {
  return graph.get(lessonId) ?? [];
}

/** The lessons that name this one as a prerequisite. */
export function dependentsOf(lessonId: string): string[] {
  return lessonPrerequisites.filter(entry => entry.prerequisiteLessonIds.includes(lessonId)).map(entry => entry.id);
}

/** Catalog position per lesson id, across both guitar curricula in the order the
 * app itself walks them. This is the order `nextLessonId` advances through. */
function catalogOrder(): Map<string, number> {
  return new Map(allLessons("guitar").map((entry, index) => [entry.lesson.id, index]));
}

/** A prerequisite naming a lesson that is not in the catalog at all. */
export function danglingPrerequisites(): { id: string; missing: string }[] {
  const order = catalogOrder();
  return lessonPrerequisites.flatMap(entry =>
    entry.prerequisiteLessonIds.filter(required => !order.has(required)).map(missing => ({ id: entry.id, missing })),
  );
}

/** An instruction record for a lesson the catalog does not contain. */
export function orphanedRecords(): string[] {
  const order = catalogOrder();
  return lessonPrerequisites.filter(entry => !order.has(entry.id)).map(entry => entry.id);
}

/** A prerequisite the catalog places at or after the lesson that requires it —
 * the failure this oracle exists to catch. */
export function prerequisiteOrderViolations(): { id: string; required: string }[] {
  const order = catalogOrder();
  const violations: { id: string; required: string }[] = [];
  for (const entry of lessonPrerequisites) {
    const here = order.get(entry.id);
    if (here === undefined) continue;
    for (const required of entry.prerequisiteLessonIds) {
      const there = order.get(required);
      if (there !== undefined && there >= here) violations.push({ id: entry.id, required });
    }
  }
  return violations;
}

/** Every cycle, as the path that closes it. A cycle is unreachable advice: no
 * order satisfies it, so a learner could never be "ready" for either lesson. */
export function prerequisiteCycles(): string[][] {
  const state = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];
  const visit = (id: string, path: string[]) => {
    state.set(id, 1);
    for (const required of prerequisitesFor(id)) {
      if (state.get(required) === 1) cycles.push([...path, id, required]);
      else if (!state.get(required) && graph.has(required)) visit(required, [...path, id]);
    }
    state.set(id, 2);
  };
  for (const entry of lessonPrerequisites) if (!state.get(entry.id)) visit(entry.id, []);
  return cycles;
}

/** Lessons with no prerequisite: the places a learner may legitimately start. */
export function entryPoints(): string[] {
  return lessonPrerequisites.filter(entry => entry.prerequisiteLessonIds.length === 0).map(entry => entry.id);
}
