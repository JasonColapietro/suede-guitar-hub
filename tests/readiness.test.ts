import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SONGS,
  READINESS_CRITERIA,
  READINESS_TOTAL_WEIGHT,
  addSong,
  bandForScore,
  createSong,
  nextReadinessAction,
  normalizeCheckedIds,
  removeSong,
  restoreReadinessState,
  scoreReadiness,
  songIdFromName,
  summarizeRepertoire,
  toggleCriterion,
  type ReadinessCriterionId,
} from "../lib/readiness.ts";

const ALL_IDS = READINESS_CRITERIA.map((criterion) => criterion.id);

/** Total weight of a set of ids, so the boundary tests state their own math. */
function weightOf(ids: readonly ReadinessCriterionId[]): number {
  return READINESS_CRITERIA.filter((criterion) => ids.includes(criterion.id)).reduce(
    (total, criterion) => total + criterion.weight,
    0,
  );
}

test("defines ten distinct checks with a fixed denominator", () => {
  assert.equal(READINESS_CRITERIA.length, 10);
  assert.equal(new Set(ALL_IDS).size, 10, "criterion ids must be unique");
  assert.equal(READINESS_TOTAL_WEIGHT, 19);

  // The two failures that end a performance outright must carry more than any
  // other single check. This is the claim the whole score rests on, and the
  // page prints every check's weight next to it, so a reader can add them up on
  // the same screen — the claim is asserted here, not just the two ids.
  const heavy = READINESS_CRITERIA.filter((criterion) => criterion.weight === 3);
  assert.deepEqual(
    heavy.map((criterion) => criterion.id),
    ["cold-start", "mistake-recovery"],
  );
  const heaviestOther = READINESS_CRITERIA.filter(
    (criterion) => criterion.weight !== 3,
  ).reduce((highest, criterion) => Math.max(highest, criterion.weight), 0);
  for (const criterion of heavy) {
    assert.ok(
      criterion.weight > heaviestOther,
      `${criterion.id} must outweigh every other single check`,
    );
  }

  for (const criterion of READINESS_CRITERIA) {
    assert.ok(criterion.weight >= 1, `${criterion.id} must carry weight`);
    assert.ok(
      criterion.instruction.length > 40,
      `${criterion.id} must ship a concrete instruction, not a label`,
    );
  }
});

test("scores an untouched song at zero and names the cold start as the next move", () => {
  const assessment = scoreReadiness([]);

  assert.equal(assessment.score, 0);
  assert.equal(assessment.earnedWeight, 0);
  assert.equal(assessment.totalWeight, 19);
  assert.equal(assessment.band.id, "practice-room");
  assert.deepEqual(assessment.checkedIds, []);
  assert.equal(assessment.nextAction?.id, "cold-start");
  assert.match(assessment.nextAction!.instruction, /no warm-up/i);
});

test("scores a fully checked song at one hundred and stops issuing next actions", () => {
  const assessment = scoreReadiness(ALL_IDS);

  assert.equal(assessment.score, 100);
  assert.equal(assessment.earnedWeight, READINESS_TOTAL_WEIGHT);
  assert.equal(assessment.band.id, "stage-ready");
  assert.equal(assessment.nextAction, null);
  assert.equal(nextReadinessAction(ALL_IDS), null);
});

test("weights the score so two heavy checks beat three light ones", () => {
  const heavy = scoreReadiness(["cold-start", "mistake-recovery"]);
  const light = scoreReadiness(["standing", "clean-ending", "any-section"]);

  assert.equal(weightOf(["cold-start", "mistake-recovery"]), 6);
  assert.equal(weightOf(["standing", "clean-ending", "any-section"]), 3);

  // Fewer boxes, higher score. If the score were a plain count this would be
  // reversed, which is the whole reason the weights exist.
  assert.equal(heavy.score, 32);
  assert.equal(light.score, 16);
  assert.ok(heavy.score > light.score);
});

test("maps every band boundary exactly, including out-of-range input", () => {
  assert.equal(bandForScore(0).id, "practice-room");
  assert.equal(bandForScore(39).id, "practice-room");
  assert.equal(bandForScore(40).id, "good-day");
  assert.equal(bandForScore(64).id, "good-day");
  assert.equal(bandForScore(65).id, "nearly-there");
  assert.equal(bandForScore(84).id, "nearly-there");
  assert.equal(bandForScore(85).id, "stage-ready");
  assert.equal(bandForScore(100).id, "stage-ready");

  // A band is always returned; nothing downstream has to null-check it.
  assert.equal(bandForScore(-40).id, "practice-room");
  assert.equal(bandForScore(500).id, "stage-ready");
  assert.equal(bandForScore(Number.NaN).id, "practice-room");
});

test("crosses a band on the weight of one check, not the count of them", () => {
  // Same number of boxes on both sides of each pair. Only the weight of the
  // last one differs, and that is what moves the band.
  const belowGoodDay: ReadinessCriterionId[] = [
    "cold-start",
    "mistake-recovery",
    "standing",
  ];
  const atGoodDay: ReadinessCriterionId[] = [
    "cold-start",
    "mistake-recovery",
    "full-tempo",
  ];
  assert.equal(weightOf(belowGoodDay), 7);
  assert.equal(weightOf(atGoodDay), 8);
  assert.equal(scoreReadiness(belowGoodDay).score, 37);
  assert.equal(scoreReadiness(atGoodDay).score, 42);
  assert.equal(scoreReadiness(belowGoodDay).band.id, "practice-room");
  assert.equal(scoreReadiness(atGoodDay).band.id, "good-day");

  const belowNearly = ALL_IDS.slice(0, 5);
  const atNearly = [...belowNearly, "standing"] as ReadinessCriterionId[];
  assert.equal(weightOf(belowNearly), 12);
  assert.equal(weightOf(atNearly), 13);
  assert.equal(scoreReadiness(belowNearly).score, 63);
  assert.equal(scoreReadiness(atNearly).score, 68);
  assert.equal(scoreReadiness(belowNearly).band.id, "good-day");
  assert.equal(scoreReadiness(atNearly).band.id, "nearly-there");

  const belowStage = ALL_IDS.slice(0, 7);
  const atStage = ALL_IDS.slice(0, 8);
  assert.equal(weightOf(belowStage), 16);
  assert.equal(weightOf(atStage), 17);
  assert.equal(scoreReadiness(belowStage).score, 84);
  assert.equal(scoreReadiness(atStage).score, 89);
  assert.equal(scoreReadiness(belowStage).band.id, "nearly-there");
  assert.equal(scoreReadiness(atStage).band.id, "stage-ready");
});

test("offers the heaviest unchecked action regardless of its list position", () => {
  // Everything checked except the last-listed heavy item and one light one.
  const missingHeavy = ALL_IDS.filter((id) => id !== "mistake-recovery" && id !== "standing");
  assert.equal(nextReadinessAction(missingHeavy)?.id, "mistake-recovery");

  // Two same-weight candidates: list order breaks the tie.
  const missingTwoMediums = ALL_IDS.filter(
    (id) => id !== "played-for-someone" && id !== "full-tempo",
  );
  assert.equal(nextReadinessAction(missingTwoMediums)?.id, "full-tempo");

  // Only light checks left, so a weight-1 item is genuinely the next move.
  assert.equal(nextReadinessAction(ALL_IDS.slice(0, 9))?.id, "any-section");
});

test("keeps only recognized check ids, deduped and in criteria order", () => {
  assert.deepEqual(
    normalizeCheckedIds([
      "clean-ending",
      "cold-start",
      "cold-start",
      "not-a-check",
      42,
      null,
      { id: "cold-start" },
    ]),
    ["cold-start", "clean-ending"],
  );

  assert.deepEqual(normalizeCheckedIds("cold-start"), []);
  assert.deepEqual(normalizeCheckedIds(undefined), []);
  assert.deepEqual(normalizeCheckedIds({ 0: "cold-start" }), []);

  // A junk id must not inflate the score by riding along in the array.
  assert.equal(scoreReadiness(["cold-start", "made-up", "made-up-2"]).score, 16);
});

test("creates a song with a slug id and a sanitized display name", () => {
  assert.deepEqual(createSong("  Pride <and> Joy  "), {
    id: "pride-and-joy",
    name: "Pride and Joy",
    checkedIds: [],
  });

  // Two spellings of the same title collapse to one id, which is what makes
  // the duplicate check work on names people actually type.
  assert.equal(songIdFromName("Purple   Haze!!"), "purple-haze");
  assert.equal(songIdFromName("purple haze"), "purple-haze");

  // Non-Latin titles keep a usable id instead of slugging away to nothing.
  assert.equal(songIdFromName("君が代"), "君が代");

  assert.equal(createSong("x".repeat(200)).name.length, 80);

  assert.throws(() => createSong("   "), /Name the song/);
  assert.throws(() => createSong("<>"), /Name the song/);
  assert.throws(() => createSong("!!! ???"), /at least one letter or number/);
});

test("rejects a duplicate song and enforces the repertoire cap", () => {
  const one = addSong([], "Comfortably Numb");
  assert.deepEqual(
    one.map((song) => song.id),
    ["comfortably-numb"],
  );

  assert.throws(() => addSong(one, "comfortably   numb"), /already in your list/);

  let full = [] as ReturnType<typeof addSong>;
  for (let index = 1; index <= MAX_SONGS; index += 1) {
    full = addSong(full, `Song number ${index}`);
  }
  assert.equal(full.length, MAX_SONGS);
  assert.throws(() => addSong(full, "One more song"), /holds 12 songs/);

  // The input array is never mutated; every helper returns a new list.
  assert.equal(one.length, 1);
});

test("toggles a check on and off without ever storing an unknown id", () => {
  const songs = addSong([], "Teen Spirit");

  const checked = toggleCriterion(songs, "teen-spirit", "cold-start");
  assert.deepEqual(checked[0].checkedIds, ["cold-start"]);
  assert.equal(scoreReadiness(checked[0].checkedIds).score, 16);

  const unchecked = toggleCriterion(checked, "teen-spirit", "cold-start");
  assert.deepEqual(unchecked[0].checkedIds, []);

  // Unknown criterion, and unknown song, are both no-ops rather than throws.
  assert.deepEqual(toggleCriterion(checked, "teen-spirit", "invented")[0].checkedIds, [
    "cold-start",
  ]);
  assert.deepEqual(toggleCriterion(checked, "no-such-song", "standing")[0].checkedIds, [
    "cold-start",
  ]);

  // Checked ids come back in criteria order, not click order.
  const outOfOrder = toggleCriterion(
    toggleCriterion(songs, "teen-spirit", "any-section"),
    "teen-spirit",
    "cold-start",
  );
  assert.deepEqual(outOfOrder[0].checkedIds, ["cold-start", "any-section"]);
});

test("restores a repertoire and drops only the entries it cannot use", () => {
  const restored = restoreReadinessState({
    songs: [
      { id: "alpha", name: " Alpha ", checkedIds: ["cold-start", "cold-start", "bogus", 9] },
      // Same song, arbitrary stored id. The id is derived from the name, so
      // this is caught as the duplicate it is. Trusting the stored id would let
      // it through as a second "Alpha" with its own checklist, and `addSong`
      // compares ids, so nothing downstream would catch it either.
      { id: "legacy-uuid-1234", name: "Alpha" },
      { name: "No id supplied", checkedIds: ["standing"] },
      { name: "   ", checkedIds: [] },
      "not an object",
      null,
    ],
  });

  assert.deepEqual(restored, [
    { id: "alpha", name: "Alpha", checkedIds: ["cold-start"] },
    { id: "no-id-supplied", name: "No id supplied", checkedIds: ["standing"] },
  ]);

  // A stored id is never carried through, so it cannot arrive as a React key,
  // a removeSong handle, or anything else this tool hands to the DOM.
  const hostile = restoreReadinessState({
    songs: [{ id: "  <script>x</script>  ", name: "Song A", checkedIds: [] }],
  });
  assert.deepEqual(hostile, [{ id: "song-a", name: "Song A", checkedIds: [] }]);

  // The failure a stored id used to cause, in full: restore a song under some
  // other id, then add it again by name. `addSong` compares ids, so a foreign
  // id meant it saw no duplicate and the list held the same song twice, each
  // copy scoring separately and both counted by summarizeRepertoire.
  const legacy = restoreReadinessState({
    songs: [{ id: "legacy-uuid-1234", name: "Blackbird", checkedIds: ["cold-start"] }],
  });
  assert.ok(legacy);
  assert.throws(
    () => addSong(legacy ?? [], "Blackbird"),
    /already in your list/,
    "a restored song has to be findable by the id its name derives",
  );

  // A stored value that is not this tool's shape at all returns null, which is
  // the component's cue to delete the key rather than keep half of it.
  assert.equal(restoreReadinessState("corrupt"), null);
  assert.equal(restoreReadinessState(null), null);
  assert.equal(restoreReadinessState(42), null);
  assert.equal(restoreReadinessState({}), null);
  assert.equal(restoreReadinessState({ songs: "one, two" }), null);

  // An empty but well-formed repertoire is valid, not corrupt.
  assert.deepEqual(restoreReadinessState({ songs: [] }), []);

  // A tampered store cannot grow past the cap.
  const oversized = restoreReadinessState({
    songs: Array.from({ length: MAX_SONGS + 8 }, (_unused, index) => ({
      id: `song-${index}`,
      name: `Song ${index}`,
      checkedIds: [],
    })),
  });
  assert.equal(oversized?.length, MAX_SONGS);
});

test("summarizes a repertoire, including the empty one", () => {
  assert.deepEqual(summarizeRepertoire([]), {
    songCount: 0,
    averageScore: 0,
    stageReady: 0,
  });

  const songs = [
    { id: "a", name: "A", checkedIds: [] as ReadinessCriterionId[] },
    { id: "b", name: "B", checkedIds: ALL_IDS },
    { id: "c", name: "C", checkedIds: ["cold-start", "mistake-recovery"] as ReadinessCriterionId[] },
  ];

  // Scores are 0, 100, and 32, so the mean is 44 after rounding.
  assert.deepEqual(summarizeRepertoire(songs), {
    songCount: 3,
    averageScore: 44,
    stageReady: 1,
  });
});

test("removes one song and leaves the rest untouched", () => {
  const songs = addSong(addSong([], "First Song"), "Second Song");

  assert.deepEqual(
    removeSong(songs, "first-song").map((song) => song.name),
    ["Second Song"],
  );
  assert.deepEqual(
    removeSong(songs, "no-such-song").map((song) => song.name),
    ["First Song", "Second Song"],
  );
  assert.deepEqual(removeSong(songs, "first-song").length, 1);
  assert.equal(songs.length, 2, "removeSong must not mutate its input");
});
