import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  SESSION_FOCUSES,
  buildSessionPlan,
  clampSessionMinutes,
  isSessionFocus,
  normalizeSessionProgress,
  restoreSessionState,
  sessionFocusLabel,
  sessionMinutesDone,
  sessionProgressPercent,
  type SessionBlockKind,
  type SessionFocus,
  type SessionInput,
  type SessionPlan,
  type SessionPlanError,
} from "../lib/session.ts";

const input: SessionInput = { minutes: 45, focus: "tempo-ceiling" };

const FOCUSES: readonly SessionFocus[] = SESSION_FOCUSES.map(
  (option) => option.value,
);

/** The three focuses that name a specific thing to repair. */
const SPECIFIC: readonly SessionFocus[] = [
  "tempo-ceiling",
  "memorise",
  "transition",
];

/** Session order, and the only order blocks may ever come back in. */
const ORDER: readonly SessionBlockKind[] = [
  "warmup",
  "repair",
  "tempo",
  "repertoire",
  "coldstart",
];

/**
 * The minimum viable size of each block, restated here rather than imported.
 * The module keeps these private, so pinning them independently means a
 * loosened floor fails this file instead of being silently agreed with.
 */
const MINIMUM: Record<SessionBlockKind, number> = {
  warmup: 3,
  repair: 6,
  tempo: 5,
  repertoire: 5,
  coldstart: 4,
};

function planFor(candidate: SessionInput): SessionPlan {
  const result = buildSessionPlan(candidate);
  if (!result.ok) {
    assert.fail(
      `a plan must build for ${JSON.stringify(candidate)}, got ${result.error.code}`,
    );
  }
  return result.value;
}

function errorFor(candidate: unknown): SessionPlanError {
  const result = buildSessionPlan(candidate);
  if (result.ok) {
    assert.fail(`${JSON.stringify(candidate)} must not build a plan`);
  }
  return result.error;
}

function split(plan: SessionPlan): [SessionBlockKind, number][] {
  return plan.blocks.map((block) => [block.kind, block.minutes]);
}

function minutesOf(plan: SessionPlan, kind: SessionBlockKind): number | null {
  return plan.blocks.find((block) => block.kind === kind)?.minutes ?? null;
}

test("splits a session into ordered blocks that account for every minute", () => {
  const plan = planFor(input);

  assert.deepEqual(split(plan), [
    ["warmup", 5],
    ["repair", 15],
    ["tempo", 13],
    ["repertoire", 7],
    ["coldstart", 5],
  ]);
  assert.equal(
    plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
    45,
  );
  assert.deepEqual(
    plan.blocks.map((block) => block.position),
    [1, 2, 3, 4, 5],
  );
  assert.equal(plan.leadKind, "repair");
  assert.equal(plan.focusLabel, "Raise a tempo ceiling");
  assert.deepEqual(plan.dropped, []);
  assert.equal(
    new Set(plan.blocks.map((block) => block.id)).size,
    5,
    "block ids must be unique so progress cannot collide",
  );
  assert.match(plan.summary, /45 minutes, 5 blocks/);
  assert.match(plan.summary, /add up to exactly 45 minutes/);
});

test("adds up to exactly the requested total at every legal length, for every focus", () => {
  // The invariant the whole module exists for, swept rather than sampled:
  // whole minutes, no minute invented, no minute lost, at 704 combinations.
  for (const focus of FOCUSES) {
    for (
      let minutes = MIN_SESSION_MINUTES;
      minutes <= MAX_SESSION_MINUTES;
      minutes += 1
    ) {
      const plan = planFor({ minutes, focus });
      const where = `${focus} at ${minutes} minutes`;
      const total = plan.blocks.reduce((sum, block) => sum + block.minutes, 0);

      assert.equal(total, minutes, `${where} allocated ${total}`);
      assert.ok(plan.blocks.length >= 1, `${where} produced no blocks at all`);

      for (const block of plan.blocks) {
        assert.ok(
          Number.isInteger(block.minutes),
          `${where} gave ${block.kind} ${block.minutes} minutes`,
        );
        assert.ok(
          block.minutes > 0,
          `${where} kept ${block.kind} at zero minutes instead of dropping it`,
        );
      }

      assert.deepEqual(
        plan.blocks.map((block) => block.position),
        plan.blocks.map((_, index) => index + 1),
        `${where} broke the block numbering`,
      );
      assert.deepEqual(
        plan.blocks.map((block) => block.kind),
        ORDER.filter((kind) =>
          plan.blocks.some((block) => block.kind === kind),
        ),
        `${where} returned the blocks out of session order`,
      );
      assert.equal(
        new Set(plan.blocks.map((block) => block.id)).size,
        plan.blocks.length,
        `${where} produced a duplicate block id`,
      );
      assert.equal(
        plan.blocks.length + plan.dropped.length,
        ORDER.length,
        `${where} lost track of a block entirely`,
      );
    }
  }
});

test("distributes the rounding remainder instead of losing or inventing minutes", () => {
  // Both of these are cases where rounding each block's share on its own — the
  // obvious implementation — misses the total. At 33 minutes the five rounded
  // shares come to 32, so a minute of the session disappears; at 55 they come
  // to 56, so a minute nobody has is handed out. Largest-remainder gets both
  // right, and the exact splits are pinned so a change to the method has to be
  // deliberate.
  const short = planFor({ minutes: 33, focus: "tempo-ceiling" });
  assert.deepEqual(split(short), [
    ["warmup", 4],
    ["repair", 11],
    ["tempo", 9],
    ["repertoire", 5],
    ["coldstart", 4],
  ]);
  assert.equal(
    short.blocks.reduce((sum, block) => sum + block.minutes, 0),
    33,
    "rounding each share alone gives 32 here",
  );

  const long = planFor({ minutes: 55, focus: "transition" });
  assert.deepEqual(split(long), [
    ["warmup", 7],
    ["repair", 21],
    ["tempo", 10],
    ["repertoire", 11],
    ["coldstart", 6],
  ]);
  assert.equal(
    long.blocks.reduce((sum, block) => sum + block.minutes, 0),
    55,
    "rounding each share alone gives 56 here",
  );

  // A remainder is never parked on one block: the largest single overshoot
  // against a block's exact proportional share is under a minute.
  const wide = planFor({ minutes: 180, focus: "tempo-ceiling" });
  assert.deepEqual(split(wide), [
    ["warmup", 22],
    ["repair", 61],
    ["tempo", 50],
    ["repertoire", 29],
    ["coldstart", 18],
  ]);
});

test("gives the repair block the largest share whenever a specific focus is chosen", () => {
  for (const focus of SPECIFIC) {
    for (
      let minutes = MIN_SESSION_MINUTES;
      minutes <= MAX_SESSION_MINUTES;
      minutes += 1
    ) {
      const plan = planFor({ minutes, focus });
      const where = `${focus} at ${minutes} minutes`;
      const repair = plan.blocks.find((block) => block.kind === "repair");

      assert.equal(plan.leadKind, "repair", where);
      assert.ok(repair, `${where} dropped the block the focus was chosen for`);

      for (const block of plan.blocks) {
        if (block.kind === "repair") continue;
        assert.ok(
          repair.minutes > block.minutes,
          `${where} gave ${block.kind} ${block.minutes} against repair's ${repair.minutes}`,
        );
      }
    }
  }

  // The share is not merely the largest, it is decisive: at a full-length
  // session the repair block outweighs the next block by a real margin.
  const plan = planFor({ minutes: 60, focus: "transition" });
  assert.equal(minutesOf(plan, "repair"), 23);
  assert.equal(minutesOf(plan, "repertoire"), 12);
  assert.match(plan.blocks[1].name, /transition that stalls/i);
});

test("does not hand a general upkeep session to the repair block", () => {
  for (
    let minutes = MIN_SESSION_MINUTES;
    minutes <= MAX_SESSION_MINUTES;
    minutes += 1
  ) {
    const plan = planFor({ minutes, focus: "upkeep" });
    const where = `upkeep at ${minutes} minutes`;
    const repair = minutesOf(plan, "repair");
    const repertoire = minutesOf(plan, "repertoire");

    assert.equal(plan.leadKind, "repertoire", where);
    assert.ok(repertoire !== null, `${where} dropped repertoire`);
    if (repair !== null) {
      assert.ok(
        repertoire > repair,
        `${where} gave repair ${repair} against repertoire's ${repertoire}`,
      );
    }
  }

  // At half an hour or less, upkeep spends nothing on repair at all: with
  // nothing named as broken, the block has no target and the time goes to
  // playing.
  const short = planFor({ minutes: 25, focus: "upkeep" });
  assert.equal(minutesOf(short, "repair"), null);
  assert.deepEqual(
    short.dropped.map((block) => block.kind),
    ["repair"],
  );

  // The boundary itself, from both sides. /session states it in prose, and an
  // assertion only at 25 let that prose say "below half an hour" while the
  // code meant "at half an hour or less".
  assert.equal(
    minutesOf(planFor({ minutes: 30, focus: "upkeep" }), "repair"),
    null,
    "30 minutes of upkeep still has no repair target worth a block",
  );
  assert.ok(
    (minutesOf(planFor({ minutes: 31, focus: "upkeep" }), "repair") ?? 0) > 0,
    "31 minutes is where the upkeep repair block starts",
  );
});

test("drops a block below its minimum and gives the minutes to the survivors", () => {
  const plan = planFor({ minutes: 30, focus: "memorise" });

  assert.deepEqual(split(plan), [
    ["warmup", 3],
    ["repair", 12],
    ["repertoire", 10],
    ["coldstart", 5],
  ]);
  assert.equal(
    plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
    30,
    "the dropped block's minutes have to end up somewhere",
  );
  assert.deepEqual(
    plan.dropped.map((block) => block.kind),
    ["tempo"],
  );
  assert.equal(plan.dropped[0].name, "Tempo work");
  assert.match(plan.dropped[0].reason, /at least 5 minutes/);
  assert.match(plan.dropped[0].reason, /30-minute session/);
  assert.doesNotMatch(
    plan.dropped[0].reason,
    /Tempo work/,
    "the reason sits next to the name, so repeating it reads as a stutter",
  );

  // The proof that the minutes were redistributed rather than merely not lost.
  // A memorise session spends 36% on repair, 28% on repertoire and 14% on the
  // cold start, so an undropped 30-minute session would give them 10.8, 8.4 and
  // 4.2. Each one comes back above the share it would have had, because tempo's
  // 12% was shared out among them.
  assert.ok((minutesOf(plan, "repair") ?? 0) > 11, "repair kept its own share");
  assert.ok(
    (minutesOf(plan, "repertoire") ?? 0) > 9,
    "repertoire kept its own share",
  );
  assert.ok(
    (minutesOf(plan, "coldstart") ?? 0) > 4,
    "the cold start kept its own share",
  );

  // Nothing that survives is ever below the size that made it worth starting,
  // which is the whole reason a block gets dropped rather than shrunk.
  for (const focus of FOCUSES) {
    for (
      let minutes = MIN_SESSION_MINUTES;
      minutes <= MAX_SESSION_MINUTES;
      minutes += 1
    ) {
      const swept = planFor({ minutes, focus });
      if (swept.blocks.length < 2) continue;
      for (const block of swept.blocks) {
        assert.ok(
          block.minutes >= MINIMUM[block.kind],
          `${focus} at ${minutes} left ${block.kind} on ${block.minutes}, under its ${MINIMUM[block.kind]} minute floor`,
        );
      }
    }
  }
});

test("always leaves one block standing, however little time there is", () => {
  for (const focus of FOCUSES) {
    for (let minutes = MIN_SESSION_MINUTES; minutes <= 12; minutes += 1) {
      const plan = planFor({ minutes, focus });
      const where = `${focus} at ${minutes} minutes`;

      assert.ok(plan.blocks.length >= 1, `${where} produced nothing to do`);
      assert.equal(
        plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
        minutes,
        where,
      );
    }

    // At the shortest legal session there is exactly one thing to do, it is
    // the block the focus was chosen for, and it takes the whole session —
    // including when that is below the block's own stated minimum, because a
    // plan with no blocks in it is not a shorter plan.
    const shortest = planFor({ minutes: MIN_SESSION_MINUTES, focus });
    assert.equal(shortest.blocks.length, 1, focus);
    assert.equal(shortest.blocks[0].kind, shortest.leadKind, focus);
    assert.equal(shortest.blocks[0].minutes, MIN_SESSION_MINUTES, focus);
    assert.equal(shortest.dropped.length, 4, focus);
    assert.match(shortest.summary, /The whole 5 minutes goes to it/);
  }

  assert.deepEqual(split(planFor({ minutes: 5, focus: "tempo-ceiling" })), [
    ["repair", 5],
  ]);
  assert.deepEqual(split(planFor({ minutes: 5, focus: "upkeep" })), [
    ["repertoire", 5],
  ]);
});

test("gives every block a name, a purpose, and something to actually do", () => {
  const plan = planFor({ minutes: 60, focus: "transition" });

  for (const block of plan.blocks) {
    assert.ok(block.name.trim().length > 0, `${block.kind} needs a name`);
    assert.ok(
      block.shortName.trim().length > 0,
      `${block.kind} needs a short name for the summary`,
    );
    assert.ok(
      block.purpose.trim().length > 20,
      `${block.kind} needs a purpose a player can weigh`,
    );
    assert.ok(
      block.doThis.trim().length > 40,
      `${block.kind} needs an instruction a player can act on`,
    );
    assert.notEqual(
      block.purpose,
      block.doThis,
      `${block.kind} must say why and what, not the same sentence twice`,
    );
  }

  assert.equal(
    new Set(plan.blocks.map((block) => block.doThis)).size,
    plan.blocks.length,
    "two blocks must never hand back the same instruction",
  );
  assert.match(
    plan.blocks[plan.blocks.length - 1].doThis,
    /put the guitar down/i,
    "the cold-start test has to actually start cold",
  );

  // The focus changes the work, not only the headings: at the same length,
  // every block comes back with different instructions.
  for (const focus of FOCUSES) {
    if (focus === "transition") continue;
    const other = planFor({ minutes: 60, focus });
    for (const block of plan.blocks) {
      const twin = other.blocks.find((entry) => entry.kind === block.kind);
      assert.ok(twin, `${focus} at 60 minutes is missing ${block.kind}`);
      assert.notEqual(
        twin.doThis,
        block.doThis,
        `${focus} repeats the transition instruction for ${block.kind}`,
      );
    }
    assert.notEqual(other.focusLabel, plan.focusLabel);
  }
});

test("refuses a length that is not a whole number of minutes", () => {
  for (const broken of [
    Number.NaN,
    30.5,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "45",
    null,
    undefined,
  ]) {
    assert.equal(
      errorFor({ minutes: broken, focus: "upkeep" }).code,
      "minutes-not-a-number",
      `${String(broken)} is not a length`,
    );
  }

  assert.equal(errorFor(null).code, "minutes-not-a-number");
  assert.equal(errorFor("corrupt").code, "minutes-not-a-number");
  assert.equal(errorFor({}).code, "minutes-not-a-number");
  assert.match(
    errorFor({ minutes: 30.5, focus: "upkeep" }).message,
    /whole number/i,
  );
});

test("refuses zero, negative, and out-of-range lengths, and names one that works", () => {
  for (const tooShort of [0, -1, -45, MIN_SESSION_MINUTES - 1]) {
    const error = errorFor({ minutes: tooShort, focus: "memorise" });
    assert.equal(error.code, "minutes-too-few", `${tooShort} must be refused`);
    assert.equal(error.suggestedMinutes, MIN_SESSION_MINUTES);
  }

  for (const tooLong of [MAX_SESSION_MINUTES + 1, 240, 100000]) {
    const error = errorFor({ minutes: tooLong, focus: "memorise" });
    assert.equal(error.code, "minutes-too-many", `${tooLong} must be refused`);
    assert.equal(error.suggestedMinutes, MAX_SESSION_MINUTES);
  }

  // Every suggested correction has to build, or it is not a correction.
  for (const focus of FOCUSES) {
    const short = errorFor({ minutes: 0, focus });
    const long = errorFor({ minutes: 400, focus });
    assert.equal(
      planFor({ minutes: short.suggestedMinutes ?? 0, focus }).minutes,
      MIN_SESSION_MINUTES,
    );
    assert.equal(
      planFor({ minutes: long.suggestedMinutes ?? 0, focus }).minutes,
      MAX_SESSION_MINUTES,
    );
  }

  // The bounds themselves are legal, so the range is inclusive at both ends.
  assert.equal(
    planFor({ minutes: MIN_SESSION_MINUTES, focus: "upkeep" }).minutes,
    MIN_SESSION_MINUTES,
  );
  assert.equal(
    planFor({ minutes: MAX_SESSION_MINUTES, focus: "upkeep" }).minutes,
    MAX_SESSION_MINUTES,
  );
});

test("refuses a focus it does not recognise", () => {
  for (const broken of [undefined, null, "", "shredding", 7, {}, "Upkeep"]) {
    assert.equal(
      errorFor({ minutes: 45, focus: broken }).code,
      "focus-unknown",
      `${String(broken)} is not a focus`,
    );
  }

  assert.equal(isSessionFocus("upkeep"), true);
  assert.equal(isSessionFocus("tempo-ceiling"), true);
  assert.equal(isSessionFocus("shredding"), false);
  assert.equal(isSessionFocus(undefined), false);
  assert.equal(SESSION_FOCUSES.length, 4);
  assert.equal(sessionFocusLabel("memorise"), "Memorise a song");

  for (const option of SESSION_FOCUSES) {
    assert.ok(option.label.trim().length > 0, `${option.value} needs a label`);
    assert.ok(
      option.blurb.trim().length > 20,
      `${option.value} needs a blurb that says when to pick it`,
    );
    assert.equal(planFor({ minutes: 45, focus: option.value }).minutes, 45);
  }
});

test("clamps a length into the workable range and rounds fractions", () => {
  assert.equal(clampSessionMinutes(0), MIN_SESSION_MINUTES);
  assert.equal(clampSessionMinutes(-90), MIN_SESSION_MINUTES);
  assert.equal(clampSessionMinutes(Number.NaN), MIN_SESSION_MINUTES);
  assert.equal(clampSessionMinutes(Number.POSITIVE_INFINITY), MIN_SESSION_MINUTES);
  assert.equal(clampSessionMinutes(100000), MAX_SESSION_MINUTES);
  assert.equal(clampSessionMinutes(44.4), 44);
  assert.equal(clampSessionMinutes(44.6), 45);
  assert.equal(clampSessionMinutes(45), 45);

  // Whatever the clamp returns must itself build, for every focus.
  for (const focus of FOCUSES) {
    for (const raw of [-10, 0, 4.2, 45.5, 999]) {
      assert.equal(
        planFor({ minutes: clampSessionMinutes(raw), focus }).minutes,
        clampSessionMinutes(raw),
      );
    }
  }
});

test("keeps only block ids belonging to the current plan", () => {
  const plan = planFor(input);
  const first = plan.blocks[0].id;
  const second = plan.blocks[1].id;
  const foreign = planFor({ minutes: 60, focus: "upkeep" }).blocks[0].id;

  assert.deepEqual(
    normalizeSessionProgress(plan, [
      first,
      first,
      second,
      foreign,
      "made-up",
      42,
      null,
    ]),
    [first, second],
  );
  assert.deepEqual(normalizeSessionProgress(plan, "not-an-array"), []);
  assert.deepEqual(normalizeSessionProgress(plan, undefined), []);
  assert.deepEqual(normalizeSessionProgress(plan, []), []);
});

test("measures progress in minutes rather than in blocks", () => {
  const plan = planFor({ minutes: 60, focus: "tempo-ceiling" });
  const repair = plan.blocks.find((block) => block.kind === "repair");
  const coldstart = plan.blocks.find((block) => block.kind === "coldstart");
  assert.ok(repair && coldstart);

  assert.equal(repair.minutes, 20);
  assert.equal(coldstart.minutes, 6);

  assert.equal(sessionMinutesDone(plan, []), 0);
  assert.equal(sessionProgressPercent(plan, []), 0);

  assert.equal(sessionMinutesDone(plan, [repair.id]), 20);
  assert.equal(sessionProgressPercent(plan, [repair.id]), 33);
  assert.equal(sessionMinutesDone(plan, [coldstart.id]), 6);
  assert.equal(sessionProgressPercent(plan, [coldstart.id]), 10);
  assert.ok(
    sessionProgressPercent(plan, [repair.id]) >
      sessionProgressPercent(plan, [coldstart.id]),
    "one block done is not one fifth of the session when the blocks differ in size",
  );

  assert.equal(
    sessionMinutesDone(
      plan,
      plan.blocks.map((block) => block.id),
    ),
    60,
  );
  assert.equal(
    sessionProgressPercent(
      plan,
      plan.blocks.map((block) => block.id),
    ),
    100,
  );
  assert.equal(
    sessionProgressPercent(plan, ["made-up", "also-made-up"]),
    0,
    "unrecognized ids must not inflate progress",
  );
});

test("restores only a stored state that still builds", () => {
  const plan = planFor(input);
  const known = plan.blocks[2].id;

  assert.deepEqual(
    restoreSessionState({
      input,
      completedBlockIds: [known, "stale-block", 7],
    }),
    { input, completedBlockIds: [known] },
  );

  assert.equal(restoreSessionState("corrupt"), null);
  assert.equal(restoreSessionState(null), null);
  assert.equal(restoreSessionState(undefined), null);
  assert.equal(restoreSessionState({}), null);
  assert.equal(restoreSessionState({ input: { minutes: 45 } }), null);
  assert.equal(
    restoreSessionState({
      input: { minutes: 45, focus: "shredding" },
      completedBlockIds: [],
    }),
    null,
    "a stored focus this build no longer knows must be dropped, not guessed at",
  );
  assert.equal(
    restoreSessionState({
      input: { minutes: 4000, focus: "upkeep" },
      completedBlockIds: [],
    }),
    null,
    "a stored length that would no longer build must be dropped, not repaired",
  );
  assert.deepEqual(
    restoreSessionState({ input, completedBlockIds: "corrupt" }),
    { input, completedBlockIds: [] },
    "bad progress must not take a good plan down with it",
  );
});

test("returns the same plan for the same input", () => {
  // Nothing in here may read a clock, a random number, or anything else the
  // caller cannot see: a practice plan that changes under a page refresh is
  // not a plan, and the stored progress ids are derived from the split.
  for (const focus of FOCUSES) {
    for (const minutes of [5, 17, 30, 45, 90, 180]) {
      assert.deepEqual(
        planFor({ minutes, focus }),
        planFor({ minutes, focus }),
        `${focus} at ${minutes} minutes is not deterministic`,
      );
    }
  }
});
