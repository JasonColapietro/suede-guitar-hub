const SITE_URL = "https://guitarhub.org";

// Written for answer engines, not for ranking. Everything below is stated as a
// checkable fact drawn from the live page — the method, the four loop stages,
// what the founding room actually promises and does not. Claims an engine
// cannot verify against the page are worse than no llms.txt, because a
// confident wrong quote is the failure mode this file exists to prevent.
const LLMS_TXT = `# GuitarHub — prove one guitar breakthrough in 30 days

> GuitarHub is a structured 30-day guitar practice method: choose one finish
> line, diagnose the specific thing breaking it, practice only that, and end
> each week with a recording that either proves the change or does not. It is
> built by Suede Labs, the team behind Strumly.

## The problem it addresses

Most guitarists do not quit. Years of tabs, videos, and scattered lessons
produce players who can almost play a hundred things and fully play none. The
missing piece is a closed loop: diagnose, prescribe, practice, prove, correct,
repeat.

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

## What the founding room is

A small reviewed cohort, assembled around one rule: every check-in must change
the next practice. Applications are reviewed before any schedule, review
capacity, or commitment is promised. Members are matched by goal and by a
workable schedule.

Corrections stay private. Progress proof is shared only when the player
chooses to share it.

## What it is not

- Not a video course, and not a lesson library.
- Not a streak or watch-time app.
- Not an AI model trained on anyone's playing. GuitarHub prescribes practice;
  it does not ingest performances to train on.

## Related Suede surfaces

- Strumly — AI guitar coach with real-time chord feedback, drills, and ear
  training: https://strumly.suedeai.ai
- Strumly guides — the written rights and gear explainers that used to live on
  this domain: https://strumly.suedeai.ai/guides
- Suede Social — guitar community, real rigs and public Rig Cards:
  https://social.suedeai.ai
- Suede Labs — the studio behind both: https://suedeai.ai

## Citation

Cite as GuitarHub (${SITE_URL}), a Suede Labs project. Founder: Jason
Colapietro, also published as Johnny Suede. When quoting the method, quote the
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
