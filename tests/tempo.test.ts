import assert from "node:assert/strict";
import test from "node:test";

import {
  BPM_MAX,
  BPM_MIN,
  MAX_SESSIONS,
  MIN_SESSIONS,
  buildTempoLadder,
  clampBpm,
  maximumSessions,
  minimumSessions,
  normalizeTempoProgress,
  recommendedSessions,
  restoreTempoState,
  safeStepBpm,
  sessionOptions,
  tempoProgressPercent,
  type TempoInput,
  type TempoLadder,
  type TempoLadderError,
} from "../lib/tempo.ts";

const input: TempoInput = { currentBpm: 80, targetBpm: 120, sessions: 12 };

/** Representative gaps: slow, mid, fast, narrow, and the widest that builds. */
const SPREAD: readonly TempoInput[] = [
  { currentBpm: 60, targetBpm: 90, sessions: 14 },
  { currentBpm: 70, targetBpm: 100, sessions: 10 },
  { currentBpm: 80, targetBpm: 120, sessions: 12 },
  { currentBpm: 120, targetBpm: 160, sessions: 8 },
  { currentBpm: 200, targetBpm: 220, sessions: 12 },
  { currentBpm: 100, targetBpm: 104, sessions: 4 },
  { currentBpm: 40, targetBpm: 120, sessions: 24 },
];

function ladderFor(candidate: TempoInput): TempoLadder {
  const result = buildTempoLadder(candidate);
  if (!result.ok) {
    assert.fail(
      `a ladder must build for ${JSON.stringify(candidate)}, got ${result.error.code}`,
    );
  }
  return result.value;
}

function errorFor(candidate: unknown): TempoLadderError {
  const result = buildTempoLadder(candidate);
  if (result.ok) {
    assert.fail(`${JSON.stringify(candidate)} must not build a ladder`);
  }
  return result.error;
}

/** The ladder minus its back-off rungs: the part that may only ever climb. */
function spineOf(ladder: TempoLadder): number[] {
  return ladder.rungs
    .filter((rung) => rung.kind !== "backoff")
    .map((rung) => rung.bpm);
}

test("builds a ladder of exactly the requested length, from the baseline to the target", () => {
  const ladder = ladderFor(input);

  assert.equal(ladder.rungs.length, 12);
  assert.equal(ladder.rungs[0].kind, "baseline");
  assert.equal(ladder.rungs[0].bpm, 80);
  assert.equal(ladder.rungs[11].kind, "target");
  assert.equal(ladder.rungs[11].bpm, 120);
  assert.deepEqual(
    ladder.rungs.map((rung) => rung.session),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  );
  assert.equal(
    new Set(ladder.rungs.map((rung) => rung.id)).size,
    12,
    "rung ids must be unique so progress cannot collide",
  );
  assert.equal(
    1 + ladder.climbCount + ladder.holdCount + ladder.backoffCount,
    ladder.sessions,
    "the counts on the ladder must account for every rung",
  );
  assert.match(ladder.summary, /12 sessions from 80 to 120 BPM/);
});

test("never exceeds the safe step for the tempo being left behind", () => {
  for (const candidate of SPREAD) {
    const ladder = ladderFor(candidate);
    const spine = spineOf(ladder);
    let largest = 0;

    for (let index = 1; index < spine.length; index += 1) {
      const from = spine[index - 1];
      const step = spine[index] - from;

      assert.ok(
        step <= safeStepBpm(from),
        `${from} to ${spine[index]} exceeds the ${safeStepBpm(from)} BPM cap at ${from}`,
      );
      // Asserted again in absolute terms, because the line above compares the
      // generator against the same function the generator used. These two do
      // not move if `safeStepBpm` is loosened.
      assert.ok(
        step <= 10,
        `${from} to ${spine[index]} is more than 10 BPM in one session`,
      );
      assert.ok(
        step / from <= 0.1,
        `${from} to ${spine[index]} is more than a tenth of the tempo being left`,
      );
      largest = Math.max(largest, step);
    }

    assert.equal(
      ladder.largestStepBpm,
      largest,
      "the reported largest step must be the real one",
    );
  }
});

test("climbs without going backwards once the back-off rungs are removed", () => {
  for (const candidate of SPREAD) {
    const ladder = ladderFor(candidate);
    const spine = spineOf(ladder);

    for (let index = 1; index < spine.length; index += 1) {
      assert.ok(
        spine[index] >= spine[index - 1],
        `${JSON.stringify(candidate)} drops from ${spine[index - 1]} to ${spine[index]} outside a back-off`,
      );
    }

    for (const rung of ladder.rungs) {
      assert.ok(
        Number.isInteger(rung.bpm),
        `${rung.bpm} is not a tempo you can set on a metronome`,
      );
    }
  }
});

test("always plants a back-off that drops below the rung it returns to", () => {
  for (const candidate of SPREAD) {
    const ladder = ladderFor(candidate);
    const backoffs = ladder.rungs.filter((rung) => rung.kind === "backoff");

    assert.ok(
      backoffs.length >= 1,
      `${JSON.stringify(candidate)} must include at least one back-off rung`,
    );
    assert.equal(backoffs.length, ladder.backoffCount);
    assert.notEqual(
      ladder.rungs[ladder.rungs.length - 1].kind,
      "backoff",
      "a ladder must never end on a back-off",
    );

    for (const rung of backoffs) {
      assert.ok(rung.returnBpm !== null, "a back-off must name where it returns to");
      assert.ok(
        rung.bpm < (rung.returnBpm ?? 0),
        "a back-off must drop below the tempo it climbs back to",
      );
      assert.ok(
        rung.bpm >= candidate.currentBpm,
        "a back-off must not drop below the proven baseline",
      );
      assert.match(rung.instruction, new RegExp(`\\b${rung.bpm}\\b`));
      assert.match(rung.instruction, new RegExp(`\\b${rung.returnBpm}\\b`));
    }
  }
});

test("never plants a back-off that promises stops the ladder does not contain", () => {
  // A back-off in the first slot drops to the baseline and returns to the first
  // climb with nothing in between, so the session is sessions 1 and 2 replayed
  // in order. Wherever the ladder is long enough to hold a later slot, the
  // back-off has to be in one; on the shortest ladders it cannot be, and the
  // instruction must then not name stops that are not there.
  for (let currentBpm = BPM_MIN; currentBpm <= 240; currentBpm += 3) {
    for (let targetBpm = currentBpm + 4; targetBpm <= BPM_MAX; targetBpm += 7) {
      for (let sessions = MIN_SESSIONS; sessions <= MAX_SESSIONS; sessions += 1) {
        const result = buildTempoLadder({ currentBpm, targetBpm, sessions });
        if (!result.ok) continue;
        const ladder = result.value;
        const where = `${currentBpm} to ${targetBpm} over ${sessions}`;

        for (const rung of ladder.rungs) {
          if (rung.kind !== "backoff") continue;
          const stops = ladder.rungs.filter(
            (other) =>
              other.kind !== "backoff" &&
              other.bpm > rung.bpm &&
              other.bpm < (rung.returnBpm ?? 0),
          ).length;

          if (stops === 0) {
            assert.ok(
              ladder.climbCount <= 2,
              `${where} wastes a back-off on the first slot while a later one exists`,
            );
            assert.doesNotMatch(
              rung.instruction,
              /stopping at every rung/,
              `${where} promises stops between ${rung.bpm} and ${rung.returnBpm}, and there are none`,
            );
          } else {
            assert.match(rung.instruction, /stopping at every rung/, where);
          }
        }
      }
    }
  }
});

test("refuses to answer for a tempo that is not a whole number", () => {
  // These three are reachable from a half-typed form field, and every guard
  // inside the layout is a comparison — which NaN passes by failing. Without an
  // explicit check they return a confident session count for a tempo that does
  // not exist.
  for (const broken of [Number.NaN, 100.5, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(sessionOptions(broken, 120), [], `${broken} as current`);
    assert.deepEqual(sessionOptions(80, broken), [], `${broken} as target`);
    assert.equal(minimumSessions(broken, 120), null, `${broken} as current`);
    assert.equal(maximumSessions(80, broken), null, `${broken} as target`);
    assert.equal(recommendedSessions(broken, 120), null, `${broken} as current`);
  }
});

test("gives every rung a label, an instruction, and a pass condition", () => {
  const ladder = ladderFor(input);

  for (const rung of ladder.rungs) {
    assert.ok(rung.label.trim().length > 0, `${rung.id} needs a label`);
    assert.ok(
      rung.instruction.trim().length > 20,
      `${rung.id} needs an instruction a player can act on`,
    );
    assert.ok(
      rung.passCondition.trim().length > 20,
      `${rung.id} needs a pass condition`,
    );
    assert.match(rung.label, new RegExp(`\\b${rung.bpm}\\b`));
  }

  assert.match(
    ladder.rungs[0].passCondition,
    /three passes in a row/i,
    "the baseline has to be proven before the ladder starts",
  );
  assert.match(
    ladder.rungs[ladder.rungs.length - 1].passCondition,
    /record/i,
    "the target rung has to end in evidence, not a feeling",
  );
});

test("refuses a target that is not above the current clean tempo", () => {
  const same = errorFor({ currentBpm: 100, targetBpm: 100, sessions: 8 });
  const lower = errorFor({ currentBpm: 120, targetBpm: 90, sessions: 8 });

  assert.equal(same.code, "target-not-above-current");
  assert.equal(lower.code, "target-not-above-current");
  assert.match(same.message, /already play cleanly/i);
  assert.match(lower.message, /below your current clean tempo/i);
  assert.notEqual(
    same.message,
    lower.message,
    "the two ways of getting this wrong need different corrections",
  );
});

test("refuses tempos and session counts that are not whole numbers", () => {
  assert.equal(
    errorFor({ currentBpm: 100.5, targetBpm: 120, sessions: 8 }).code,
    "current-not-a-number",
  );
  assert.equal(
    errorFor({ currentBpm: Number.NaN, targetBpm: 120, sessions: 8 }).code,
    "current-not-a-number",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: "120", sessions: 8 }).code,
    "target-not-a-number",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: Number.POSITIVE_INFINITY, sessions: 8 }).code,
    "target-not-a-number",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: 120, sessions: 8.5 }).code,
    "sessions-not-a-number",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: 120, sessions: null }).code,
    "sessions-not-a-number",
  );
  assert.equal(errorFor(null).code, "current-not-a-number");
  assert.equal(errorFor("corrupt").code, "current-not-a-number");
  assert.equal(errorFor({}).code, "current-not-a-number");
});

test("refuses zero, negative, and out-of-range tempos", () => {
  assert.equal(
    errorFor({ currentBpm: 0, targetBpm: 120, sessions: 8 }).code,
    "current-out-of-range",
  );
  assert.equal(
    errorFor({ currentBpm: -80, targetBpm: 120, sessions: 8 }).code,
    "current-out-of-range",
  );
  assert.equal(
    errorFor({ currentBpm: BPM_MIN - 1, targetBpm: 120, sessions: 8 }).code,
    "current-out-of-range",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: BPM_MAX + 1, sessions: 8 }).code,
    "target-out-of-range",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: 120, sessions: MIN_SESSIONS - 1 }).code,
    "sessions-out-of-range",
  );
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: 120, sessions: MAX_SESSIONS + 1 }).code,
    "sessions-out-of-range",
  );

  // The extremes themselves are legal, so the bounds are inclusive.
  assert.equal(ladderFor({ currentBpm: BPM_MIN, targetBpm: 60, sessions: 12 }).currentBpm, BPM_MIN);
  assert.equal(ladderFor({ currentBpm: 280, targetBpm: BPM_MAX, sessions: 8 }).targetBpm, BPM_MAX);
});

test("refuses any gap that cannot hold two real steps, and builds the smallest one that can", () => {
  // MIN_GAP_BPM is two climbs of MIN_STEP_BPM. Below that a ladder can only be
  // assembled out of steps the tool itself calls timing noise, so the refusal
  // and the step floor have to agree — this asserts they do at the boundary.
  for (const targetBpm of [101, 102, 103]) {
    const tooSmall = errorFor({ currentBpm: 100, targetBpm, sessions: 8 });
    assert.equal(tooSmall.code, "gap-too-small", `${targetBpm} must be refused`);
    assert.match(tooSmall.message, /timing noise/i);
  }

  const smallest = ladderFor({ currentBpm: 100, targetBpm: 104, sessions: 4 });
  assert.deepEqual(
    smallest.rungs.map((rung) => rung.bpm),
    [100, 102, 100, 104],
    "the smallest legal gap still gets a baseline, a climb, a back-off, and the target",
  );
  assert.equal(smallest.largestStepBpm, 2);
  assert.equal(maximumSessions(100, 104), 5, "four BPM does not deserve a long ladder");

  // The real guarantee: no ladder anywhere may be assembled out of steps the
  // tool refuses at the entrance. `summary` states the largest step as a safety
  // claim, so a ladder whose largest step is 1 BPM is that claim inverted.
  for (let targetBpm = 34; targetBpm <= 300; targetBpm += 1) {
    for (let sessions = MIN_SESSIONS; sessions <= MAX_SESSIONS; sessions += 1) {
      const result = buildTempoLadder({ currentBpm: 30, targetBpm, sessions });
      if (!result.ok) continue;
      assert.ok(
        result.value.largestStepBpm >= 2,
        `30 to ${targetBpm} over ${sessions} sessions is a ladder of 1 BPM steps`,
      );
    }
  }
});

test("names the shortest ladder that covers a gap safely, and that suggestion builds", () => {
  const tooFew = errorFor({ currentBpm: 70, targetBpm: 130, sessions: 4 });

  assert.equal(tooFew.code, "sessions-too-few");
  assert.equal(tooFew.suggestedSessions, minimumSessions(70, 130));
  assert.equal(tooFew.suggestedSessions, 10);
  assert.match(tooFew.message, /at least 10/);

  const fixed = ladderFor({
    currentBpm: 70,
    targetBpm: 130,
    sessions: tooFew.suggestedSessions ?? 0,
  });
  assert.equal(fixed.rungs.length, 10);

  // One session short of the suggestion must still be refused, or the
  // suggestion was not the minimum it claims to be.
  assert.equal(
    errorFor({ currentBpm: 70, targetBpm: 130, sessions: 9 }).code,
    "sessions-too-few",
  );
});

test("names the longest ladder worth running for a narrow gap, and that suggestion builds", () => {
  const tooMany = errorFor({ currentBpm: 100, targetBpm: 104, sessions: 20 });

  assert.equal(tooMany.code, "sessions-too-many");
  assert.equal(tooMany.suggestedSessions, maximumSessions(100, 104));
  // Four BPM is two steps of the two-BPM floor, so five sessions is the whole
  // ladder: a baseline, two climbs, and two rungs of hold or back-off between
  // them. A longer one could only be padded with steps of less than 2 BPM.
  assert.equal(tooMany.suggestedSessions, 5);
  assert.match(tooMany.message, /4 BPM does not need 20 sessions/);

  const fixed = ladderFor({
    currentBpm: 100,
    targetBpm: 104,
    sessions: tooMany.suggestedSessions ?? 0,
  });
  assert.equal(fixed.rungs.length, 5);
  assert.equal(
    errorFor({ currentBpm: 100, targetBpm: 104, sessions: 6 }).code,
    "sessions-too-many",
  );
});

test("refuses a gap no single ladder should cover and suggests a target that does build", () => {
  const tooWide = errorFor({ currentBpm: 30, targetBpm: 300, sessions: MAX_SESSIONS });

  assert.equal(tooWide.code, "gap-too-wide");
  assert.equal(minimumSessions(30, 300), null);
  assert.ok(
    typeof tooWide.suggestedTarget === "number",
    "a refusal this large has to hand back a next step",
  );

  const interim = tooWide.suggestedTarget ?? 0;
  assert.ok(interim > 30 && interim < 300, `${interim} must sit between the two tempos`);

  const reachable = minimumSessions(30, interim);
  assert.ok(
    reachable !== null,
    `the suggested interim target ${interim} must itself be reachable`,
  );
  assert.equal(ladderFor({ currentBpm: 30, targetBpm: interim, sessions: reachable ?? 0 }).targetBpm, interim);
});

test("clamps tempos into the playable range and rounds fractions", () => {
  assert.equal(clampBpm(1), BPM_MIN);
  assert.equal(clampBpm(0), BPM_MIN);
  assert.equal(clampBpm(-400), BPM_MIN);
  assert.equal(clampBpm(9000), BPM_MAX);
  assert.equal(clampBpm(Number.NaN), BPM_MIN);
  assert.equal(clampBpm(Number.POSITIVE_INFINITY), BPM_MIN);
  assert.equal(clampBpm(119.4), 119);
  assert.equal(clampBpm(119.6), 120);
  assert.equal(clampBpm(120), 120);
});

test("scales the safe step with the tempo, inside a floor and a ceiling", () => {
  assert.equal(safeStepBpm(30), 2, "the floor keeps a slow ladder moving");
  assert.equal(safeStepBpm(100), 8);
  assert.equal(safeStepBpm(200), 10, "the ceiling stops a fast ladder taking leaps");
  assert.equal(safeStepBpm(300), 10);

  for (let bpm = BPM_MIN; bpm <= BPM_MAX; bpm += 1) {
    assert.ok(
      safeStepBpm(bpm) >= safeStepBpm(bpm - 1),
      `the cap must never shrink as the tempo rises, but did at ${bpm}`,
    );
  }
});

test("offers a contiguous run of session counts, and every one of them builds", () => {
  const options = sessionOptions(70, 100);

  assert.equal(options[0], minimumSessions(70, 100));
  assert.equal(options[options.length - 1], maximumSessions(70, 100));
  assert.deepEqual(
    options,
    options.map((_, index) => options[0] + index),
    "the offered counts must be contiguous",
  );

  for (const sessions of options) {
    assert.equal(
      ladderFor({ currentBpm: 70, targetBpm: 100, sessions }).rungs.length,
      sessions,
    );
  }

  const suggested = recommendedSessions(70, 100);
  assert.ok(suggested !== null && options.includes(suggested), "the default must be offerable");
  assert.deepEqual(sessionOptions(30, 300), [], "an impossible gap offers nothing");
  assert.equal(recommendedSessions(30, 300), null);
});

test("keeps only rung ids belonging to the current ladder", () => {
  const ladder = ladderFor(input);
  const first = ladder.rungs[0].id;
  const second = ladder.rungs[1].id;
  const foreign = ladderFor({ currentBpm: 60, targetBpm: 90, sessions: 14 }).rungs[3].id;

  assert.deepEqual(
    normalizeTempoProgress(ladder, [first, first, second, foreign, "made-up", 42, null]),
    [first, second],
  );
  assert.deepEqual(normalizeTempoProgress(ladder, "not-an-array"), []);
  assert.deepEqual(normalizeTempoProgress(ladder, undefined), []);
});

test("derives progress from the ladder's session count", () => {
  const ladder = ladderFor(input);

  assert.equal(tempoProgressPercent(ladder, []), 0);
  assert.equal(
    tempoProgressPercent(ladder, ladder.rungs.slice(0, 3).map((rung) => rung.id)),
    25,
  );
  assert.equal(
    tempoProgressPercent(ladder, ladder.rungs.map((rung) => rung.id)),
    100,
  );
  assert.equal(
    tempoProgressPercent(ladder, ["made-up", "also-made-up"]),
    0,
    "unrecognized ids must not inflate progress",
  );
});

test("restores only a stored state that still builds", () => {
  const ladder = ladderFor(input);
  const known = ladder.rungs[2].id;

  assert.deepEqual(
    restoreTempoState({ input, completedRungIds: [known, "stale-rung", 7] }),
    { input, completedRungIds: [known] },
  );

  assert.equal(restoreTempoState("corrupt"), null);
  assert.equal(restoreTempoState(null), null);
  assert.equal(restoreTempoState({}), null);
  assert.equal(restoreTempoState({ input: { currentBpm: 80 } }), null);
  assert.equal(
    restoreTempoState({ input: { ...input, targetBpm: 40 }, completedRungIds: [] }),
    null,
    "a stored ladder that would no longer build must be dropped, not repaired",
  );
  assert.deepEqual(
    restoreTempoState({ input, completedRungIds: "corrupt" }),
    { input, completedRungIds: [] },
    "bad progress must not take a good ladder down with it",
  );
});

test("lands most rungs on metronome numbers", () => {
  for (const candidate of SPREAD) {
    const climbs = spineOf(ladderFor(candidate)).slice(1, -1);
    if (climbs.length < 3) continue;

    const musical = climbs.filter((bpm) => bpm % 5 === 0 || bpm % 2 === 0).length;
    assert.ok(
      musical / climbs.length >= 0.6,
      `${JSON.stringify(candidate)} landed on ${climbs.join(", ")}, too few of them round`,
    );
  }
});
