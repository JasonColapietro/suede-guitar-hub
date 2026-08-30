import assert from "node:assert/strict";
import test from "node:test";

import {
  DIAGNOSTIC_BLOCKERS,
  DIAGNOSTIC_QUESTIONS,
  diagnose,
  normalizeAnswers,
  restoreDiagnosticState,
  scoreAnswers,
  type BlockerId,
  type QuestionId,
} from "../lib/diagnose.ts";
import { GUIDES, STRUMLY } from "../lib/site.ts";

/** Every question answered the healthy way: the zero-weight option each time. */
const HEALTHY: Record<string, string> = {
  "session-end": "changed",
  recording: "this-week",
  "full-tempo": "holds",
  "broken-bar": "most",
  "new-material": "one-two",
  "last-finished": "recent",
  "first-ten": "the-fix",
  "who-checks": "compare",
  click: "locked",
};

/** A complete answer set that is healthy except for the overrides given. */
function answers(overrides: Record<string, string> = {}): Record<string, string> {
  return { ...HEALTHY, ...overrides };
}

function scoreOf(result: readonly { id: BlockerId; score: number }[], id: BlockerId): number {
  return result.find((blocker) => blocker.id === id)?.score ?? -1;
}

test("derives each blocker's ceiling from the question table, not a hand-typed number", () => {
  // For every blocker, build the answer set that maximises it by taking the
  // worst option of each question. Scoring that set must hit exactly maxScore
  // and 100%. If a weight is edited and maxScore is stale, this fails.
  for (const blocker of DIAGNOSTIC_BLOCKERS) {
    const worst: Record<string, string> = {};
    for (const question of DIAGNOSTIC_QUESTIONS) {
      const pick = [...question.options].sort(
        (a, b) => (b.weights[blocker.id] ?? 0) - (a.weights[blocker.id] ?? 0),
      )[0];
      worst[question.id] = pick.id;
    }

    const scored = scoreAnswers(worst).find((entry) => entry.id === blocker.id);
    assert.ok(scored, `${blocker.id} must appear in the scores`);
    assert.equal(
      scored.score,
      scored.maxScore,
      `${blocker.id} must be able to reach its own ceiling`,
    );
    assert.equal(scored.share, 100, `${blocker.id} at its ceiling must read 100%`);
    assert.ok(scored.maxScore > 0, `${blocker.id} must be reachable by some answer`);
  }
});

test("names the no-target blocker when sessions end on the clock", () => {
  const result = diagnose(
    answers({ "session-end": "clock", "last-finished": "never-finished", "first-ten": "whatever" }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "no-target");
  assert.equal(result.primary.score, 7);
  assert.equal(result.primary.share, 58);
  assert.equal(result.runnerUp?.id, "material-churn");
  assert.equal(result.confidence, "clear");
  assert.match(result.primary.prescription, /has to be true/i);
});

test("names the never-at-tempo blocker when the real tempo was never checked", () => {
  const result = diagnose(
    answers({ "full-tempo": "unknown-tempo", click: "falls-apart", "last-finished": "months" }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "never-at-tempo");
  assert.equal(result.primary.share, 100);
  assert.equal(result.runnerUp?.id, "material-churn");
  assert.equal(result.confidence, "clear");
});

test("names the no-feedback blocker when nothing outside the hands checks the work", () => {
  const result = diagnose(
    answers({ recording: "never", "who-checks": "nothing", "broken-bar": "dont-know" }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "no-feedback");
  assert.equal(result.primary.score, 10);
  assert.equal(result.primary.maxScore, 12);
  assert.equal(result.primary.share, 83);
  assert.equal(result.confidence, "clear");
});

test("names the comfortable-part blocker when the broken bar never gets isolated", () => {
  const result = diagnose(
    answers({ "broken-bar": "whole-only", "first-ten": "already-good", "full-tempo": "slow-only" }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "comfortable-part");
  assert.equal(result.primary.share, 100);
  assert.equal(result.runnerUp?.id, "never-at-tempo");
});

test("names the material-churn blocker when nothing ever reaches finished", () => {
  const result = diagnose(
    answers({
      "new-material": "five-plus",
      "last-finished": "never-finished",
      "session-end": "bored",
    }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "material-churn");
  assert.equal(result.primary.score, 9);
  assert.equal(result.primary.share, 100);
  assert.equal(result.runnerUp?.id, "no-target");
});

test("breaks a dead heat by the fixed blocker order, never by the order answers arrived", () => {
  // never-at-tempo and comfortable-part both land on 4 of a possible 8.
  const tied = answers({
    "full-tempo": "slow-only",
    click: "drifts",
    "first-ten": "already-good",
  });

  const result = diagnose(tied);
  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;

  assert.equal(result.primary.share, result.runnerUp?.share);
  assert.equal(result.primary.score, result.runnerUp?.score);
  // never-at-tempo is declared before comfortable-part, so it takes the tie.
  assert.equal(result.primary.id, "never-at-tempo");
  assert.equal(result.runnerUp?.id, "comfortable-part");
  assert.equal(result.confidence, "narrow");

  // Same pairs, different key insertion order, identical ranking.
  const shuffled: Record<string, string> = {};
  for (const key of Object.keys(tied).reverse()) shuffled[key] = tied[key];
  assert.deepEqual(scoreAnswers(shuffled), scoreAnswers(tied));
});

test("ranks by raw score before falling back to the fixed order", () => {
  // no-feedback 6/12 and never-at-tempo 4/8 both round to 50%, but no-feedback
  // carries the larger raw score and so wins despite being declared later.
  const result = diagnose(
    answers({
      recording: "long-ago",
      "who-checks": "feel",
      "full-tempo": "slow-only",
      click: "drifts",
    }),
  );

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.share, 50);
  assert.equal(result.runnerUp?.share, 50);
  assert.equal(result.primary.id, "no-feedback");
  assert.equal(result.primary.score, 6);
  assert.equal(result.runnerUp?.id, "never-at-tempo");
  assert.equal(result.runnerUp?.score, 4);
});

test("reports a clear sheet instead of inventing a blocker out of healthy answers", () => {
  const result = diagnose(answers());

  assert.equal(result.status, "clear");
  if (result.status !== "clear") return;
  assert.equal(result.answered, DIAGNOSTIC_QUESTIONS.length);
  assert.equal(result.scores.length, DIAGNOSTIC_BLOCKERS.length);
  for (const blocker of result.scores) {
    assert.equal(blocker.score, 0, `${blocker.id} must score nothing on a clean sheet`);
    assert.equal(blocker.share, 0);
  }
});

test("withholds a runner-up when only one blocker scored, and calls the weak lead faint", () => {
  const result = diagnose(answers({ "broken-bar": "some" }));

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") return;
  assert.equal(result.primary.id, "comfortable-part");
  assert.equal(result.primary.share, 25);
  assert.equal(result.runnerUp, null, "a blocker on zero is not a runner-up");
  assert.equal(result.confidence, "faint");
});

test("reads the same confidence for the same evidence, whatever the blocker's ceiling", () => {
  // MAX_SCORES is 8 for never-at-tempo and comfortable-part, 9 for
  // material-churn and 12 for no-feedback, so a share threshold splits these
  // five apart: the same single worst-case answer worth 4 reads 50%, 44% and
  // 33%. Confidence must not depend on which denominator the blocker happens
  // to carry, so all five are asserted together.
  const oneBadAnswer: readonly [string, string, BlockerId][] = [
    ["full-tempo", "unknown-tempo", "never-at-tempo"],
    ["broken-bar", "whole-only", "comfortable-part"],
    ["new-material", "five-plus", "material-churn"],
    ["recording", "never", "no-feedback"],
    ["who-checks", "nothing", "no-feedback"],
  ];

  for (const [question, option, blockerId] of oneBadAnswer) {
    const result = diagnose(answers({ [question]: option }));
    assert.equal(result.status, "blocked");
    if (result.status !== "blocked") continue;

    assert.equal(result.primary.id, blockerId, `${question}=${option}`);
    assert.equal(
      result.confidence,
      "faint",
      `one answer of nine cannot be a clear verdict, but ${blockerId} reads ${result.confidence} at ${result.primary.share}%`,
    );
  }

  // The mirror of the same rule: a lead built out of more than one answer is
  // not faint, even when its share is no higher than the rows above.
  const fromTwo = diagnose(
    answers({ recording: "never", "who-checks": "nothing" }),
  );
  assert.equal(fromTwo.status, "blocked");
  if (fromTwo.status !== "blocked") return;
  assert.equal(fromTwo.primary.id, "no-feedback");
  assert.notEqual(fromTwo.confidence, "faint");
});

test("never calls a verdict clear when one answer could account for the whole lead", () => {
  // Exhaustive: every complete answer set, checked against the number of
  // answers that actually pointed at the winner. "This one leads by a clear
  // margin. Start here." is on screen for every one of these, and the page
  // prescribes a full regimen underneath it.
  const questions = DIAGNOSTIC_QUESTIONS;
  const current: Record<string, string> = {};
  let checked = 0;

  const walk = (index: number) => {
    if (index === questions.length) {
      checked += 1;
      const result = diagnose(current);
      if (result.status !== "blocked" || result.confidence !== "clear") return;

      let contributors = 0;
      for (const question of questions) {
        const option = question.options.find((o) => o.id === current[question.id]);
        if ((option?.weights[result.primary.id] ?? 0) > 0) contributors += 1;
      }
      assert.ok(
        contributors > 1,
        `${JSON.stringify(current)} calls ${result.primary.id} clear on ${contributors} answer(s)`,
      );
      return;
    }
    for (const option of questions[index].options) {
      current[questions[index].id] = option.id;
      walk(index + 1);
    }
  };

  walk(0);
  assert.equal(checked, 196608, "the sweep must cover every complete answer set");
});

test("reports which questions are still missing instead of scoring a partial set", () => {
  const result = diagnose({ recording: "never", "who-checks": "nothing" });

  assert.equal(result.status, "incomplete");
  if (result.status !== "incomplete") return;
  assert.equal(result.answered, 2);
  assert.equal(result.total, DIAGNOSTIC_QUESTIONS.length);
  assert.equal(result.unanswered.length, DIAGNOSTIC_QUESTIONS.length - 2);
  assert.equal(result.unanswered.includes("recording" as QuestionId), false);
  assert.equal(result.unanswered[0], "session-end");

  // Nothing at all is still incomplete rather than an error or a clear sheet.
  for (const junk of [null, undefined, "corrupt", 42, [], {}]) {
    const empty = diagnose(junk);
    assert.equal(empty.status, "incomplete", `${JSON.stringify(junk) ?? "undefined"} must not score`);
    if (empty.status !== "incomplete") continue;
    assert.equal(empty.answered, 0);
  }
});

test("drops answers that are not real questions, real options, or strings", () => {
  assert.deepEqual(
    normalizeAnswers({
      recording: "never", //          kept
      "session-end": "never", //      "never" belongs to `recording`, not here
      "not-a-question": "clock", //   unknown question id
      click: 3, //                    not a string
      "first-ten": null, //           not a string
      "who-checks": ["nothing"], //   not a string
      "full-tempo": "HOLDS", //       option ids are case-sensitive
    }),
    { recording: "never" },
  );

  assert.deepEqual(normalizeAnswers(["recording", "never"]), {});
  assert.deepEqual(normalizeAnswers("recording=never"), {});
  assert.deepEqual(normalizeAnswers(null), {});

  // A junk-only set scores every blocker at zero rather than throwing.
  const scored = scoreAnswers({ "not-a-question": "clock" });
  assert.equal(scored.length, DIAGNOSTIC_BLOCKERS.length);
  assert.equal(scoreOf(scored, "no-target"), 0);
});

test("restores saved answers and refuses to restore a revealed result from a partial set", () => {
  const complete = answers({ recording: "never" });

  assert.deepEqual(restoreDiagnosticState({ answers: complete, revealed: true }), {
    answers: complete,
    revealed: true,
  });

  // Revealed cannot survive an incomplete set: there is no result to show.
  assert.deepEqual(
    restoreDiagnosticState({ answers: { recording: "never" }, revealed: true }),
    { answers: { recording: "never" }, revealed: false },
  );

  // Unusable payloads return null so the caller drops the stored key.
  assert.equal(restoreDiagnosticState({ answers: { "not-a-question": "x" } }), null);
  assert.equal(restoreDiagnosticState({ revealed: true }), null);
  assert.equal(restoreDiagnosticState("corrupt"), null);
  assert.equal(restoreDiagnosticState([{ answers: complete }]), null);
  assert.equal(restoreDiagnosticState(null), null);
});

test("prescribes only guitarhub routes and Strumly URLs that are on the verified list", () => {
  const routes = new Set(GUIDES.map((guide) => guide.href));
  const verified = new Set<string>([
    STRUMLY.guides,
    STRUMLY.practiceRoutine,
    STRUMLY.beginnerPath,
    STRUMLY.aiCoach,
    STRUMLY.chordTransitions,
    STRUMLY.aiVsTeacher,
    STRUMLY.signalChain,
    STRUMLY.path,
    STRUMLY.rig,
    STRUMLY.lessons.purpleHaze,
    STRUMLY.lessons.comfortablyNumb,
    STRUMLY.lessons.prideAndJoy,
    STRUMLY.lessons.teenSpirit,
    STRUMLY.social,
    STRUMLY.suedeLabs,
  ]);

  for (const blocker of DIAGNOSTIC_BLOCKERS) {
    assert.ok(
      routes.has(blocker.guide.href),
      `${blocker.id} links ${blocker.guide.href}, which is not a published guide route`,
    );
    assert.ok(
      verified.has(blocker.strumly.href),
      `${blocker.id} links ${blocker.strumly.href}, which is not on the verified Strumly list`,
    );
    assert.ok(blocker.prescription.length > 200, `${blocker.id} needs a real prescription`);
    assert.ok(blocker.firstMove.length > 20, `${blocker.id} needs a concrete first move`);
  }
});

test("gives the same result for the same answers every time it runs", () => {
  const input = answers({ recording: "long-ago", "broken-bar": "some", "new-material": "three-four" });

  const first = diagnose(input);
  const second = diagnose({ ...input });
  assert.deepEqual(first, second);

  // Scoring is a pure read: the caller's object is never mutated.
  const before = JSON.stringify(input);
  scoreAnswers(input);
  assert.equal(JSON.stringify(input), before);
});
