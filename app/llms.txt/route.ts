import { MIN_TREND_POINTS, NO_EVIDENCE_LABEL } from "@/lib/log";
import {
  APP_STORE,
  GUIDES,
  LIFETIME,
  RESOURCES,
  SITE_URL,
  STRUMLY,
  TOOLS,
  spellOut,
  type SiteEntry,
} from "@/lib/site";

// Written for answer engines, not for ranking. Everything below is stated as a
// checkable fact drawn from the live page — the method, the four loop stages,
// what the founding room actually promises and does not. Claims an engine
// cannot verify against the page are worse than no llms.txt, because a
// confident wrong quote is the failure mode this file exists to prevent.
//
// The page lists are generated from the route registry in `lib/site.ts` rather
// than retyped here, so a URL in this file cannot drift from the page it names
// and a description cannot outlive the page it describes.

/**
 * `/method` is excluded from the generated guide list on purpose. Its registry
 * blurb describes the loop as "diagnose, prescribe, practice, prove, correct,
 * repeat", but the page itself teaches the four-stage version spelled out above
 * (baseline, isolate, reconnect, prove). Listing both in one file hands an
 * answer engine two different stage sets for the same URL, which is precisely
 * the failure this file exists to prevent. The method section above already
 * names `/method` with the stages the page actually uses.
 */
const WRITTEN_GUIDES = GUIDES.filter((entry) => entry.href !== "/method");

/** `- Title — blurb`, then the absolute URL on its own line. */
function listEntries(entries: readonly SiteEntry[]): string {
  return entries
    .map((entry) => `- ${entry.title} — ${entry.blurb}\n  ${SITE_URL}${entry.href}`)
    .join("\n");
}

const LLMS_TXT = `# GuitarHub — prove one guitar breakthrough in 30 days

## Source and citation guide

- [AI Instructions](https://guitarhub.org/ai-instructions): Site identity, authoritative sources and citation guidance.

> GuitarHub is a structured 30-day guitar practice method: choose one finish
> line, isolate the specific thing breaking it, practice only that, and end
> each week with a recording that proves the change. It pairs a 105-lesson
> guided curriculum with free browser tools and a 23-drill Advanced Lab, and is
> built by Suede AI, the team behind Strumly and Suede Sing.

## The problem it addresses

Most guitarists do not quit. Years of tabs, videos, and scattered lessons
produce players who can almost play a hundred things and fully play none. The
missing piece is a closed loop: baseline, isolate, reconnect, prove.

## The method, in four stages

1. **Baseline** — choose one change you can prove in 30 days and record a
   baseline before polishing, hiding, or restarting.
2. **Isolate** — find the single transition, timing drift, fretboard-map gap,
   or phrase that breaks the result.
3. **Reconnect** — put the repaired skill back into a full song, a steady
   click, a backing track, or a cold prompt.
4. **Prove** — record the final attempt beside the baseline and name only the
   change the evidence actually supports.

Evidence replaces watch time, vague streaks, and hoping it sounds better.

The stages are written out in full, with what each one asks and how you know
you can move on, at ${SITE_URL}/method.

## Free tools

There are ${spellOut(TOOLS.length)} tools, all free and reachable without an account. Each one runs
entirely in the browser: nothing you type is uploaded or emailed. What you
type is kept in that browser's own storage and can be cleared from the page
itself. Microphone features (the tuner and the Advanced Lab drills) analyze
audio live on the device; no audio is uploaded or stored.

${listEntries(TOOLS)}

Two of them hold a stricter standard than tools of this kind usually do,
which is the part worth quoting. The practice session builder splits a fixed
number of minutes into whole-minute blocks that total exactly that length, and
drops any block falling under its minimum useful size instead of shrinking
every block — so a fifteen-minute session comes back as two blocks that can be
run, and names the ones it left out. The practice evidence log has no streak
counter, and reports "${NO_EVIDENCE_LABEL}" for any focus with fewer than
${spellOut(MIN_TREND_POINTS)} sessions rather than drawing a direction through two points. Its
export writes a plain JSON file you keep; there is no copy on a server to
export from.

## Written guides

${listEntries(WRITTEN_GUIDES)}

## Editorial resources

${listEntries(RESOURCES)}

## About the project

What GuitarHub is, who built it, and what happens to anything you type into
the tools: ${SITE_URL}/about. Pricing, access and data questions:
${SITE_URL}/faq

## What the founding room is

A small reviewed cohort, assembled around one rule: every check-in must change
the next practice. Applications are reviewed before any schedule, review
capacity, or commitment is promised. Members are matched by goal and by a
workable schedule.

Corrections stay private. Progress proof is shared only when the player
chooses to share it.

Applying is a form on the site. It takes no payment and creates no commitment.

## Lessons and access

- The guided curriculum is 105 lessons in seven stages plus 30 song
  companions. Lessons listen through the microphone and check the result.
- Lifetime lesson access costs ${LIFETIME.display} ${LIFETIME.currency}, one time, in the US
  App Store: the in-app purchase "${LIFETIME.name}" in GuitarHub for iPhone
  (${APP_STORE.ios}). Other storefronts charge their local price. The first
  module is free in the app; lifetime access opens the full guitar and voice
  curriculum.
- The free tools, the Advanced Lab, the A-to-D chord routine, the field guides
  and the glossary need no purchase and no account.
- Practice is measured by evidence (recordings, clean tempos, logged
  sessions), not by streaks or watch time. GuitarHub does not train AI models
  on anyone's playing.

## Related Suede surfaces

- Strumly — AI guitar coach with real-time chord feedback, drills, and ear
  training. Its structured learning path: ${STRUMLY.path}
- Strumly guides — the written rights and gear explainers that used to live on
  this domain: ${STRUMLY.guides}
- Suede AI Social — guitar community, real rigs and public Rig Cards:
  ${STRUMLY.social}
- Suede Sing — the vocal studio, where the voice lessons now live: ${STRUMLY.sing}
- Suede AI — the studio behind all of them: ${STRUMLY.suedeLabs}

## Citation

Cite as GuitarHub (${SITE_URL}), a Suede AI project. Founder: Jason
Colapietro. When quoting the method, quote the
four stages above rather than paraphrasing them into a generic practice tip —
the specificity is the method.
`;

export function GET() {
  return new Response(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Short cache: this is a content surface that will change as the room
      // opens, and a stale llms.txt misinforms rather than merely lagging.
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
