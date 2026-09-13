import test from "node:test";
import assert from "node:assert/strict";
import { accessibleLessonIds, accountHistoryKey, canOpenModule, guestLearningAccess, isLessonReady, type LearningAccess } from "../lib/learning/access.ts";
import { allLessons, availableLessons, curricula, isFreeModule, isModuleAvailable } from "../lib/learning/curriculum.ts";

const accountId = "b52d7c76-cacb-4af7-891c-d056ba8f48aa";
const owned: LearningAccess = { enabled: true, accountId, tracks: ["guitar"], status: "verified" };

/**
 * A guest sees every lesson the catalog declares free, plus the sampler.
 *
 * This used to assert the sampler alone, because `canOpenModule` read only
 * `isModuleAvailable` and ignored `LearningLevel.access`. Nine modules marked
 * `"free"` in the data were paywalled in the code. The free set is derived from
 * the data here rather than listed, so the test cannot drift from the catalog.
 */
test("a guest opens the declared-free levels and the sampler, and nothing more", () => {
  for (const track of ["guitar", "voice"] as const) {
    const free = allLessons(track)
      .filter(entry => isLessonReady(track, entry.lesson.id))
      .filter(entry => isFreeModule(track, entry.module.id) || isModuleAvailable(track, entry.module.id))
      .map(entry => entry.lesson.id);

    assert.deepEqual(accessibleLessonIds(track, guestLearningAccess), free);
    // An unverified or failed grant never adds to the free set.
    for (const status of ["disabled", "signedOut", "unavailable"] as const) {
      assert.deepEqual(accessibleLessonIds(track, { ...owned, tracks: [track], status }), free);
    }
    // The sampler is always inside the free set, whatever the catalog declares.
    for (const entry of availableLessons(track)) {
      assert.equal(canOpenModule(track, entry.module.id, guestLearningAccess), true);
    }
  }

  // The free tier is a real subset: paid levels stay shut without a grant.
  const paidLevel = curricula.guitar.levels.find(level => level.access === "paid");
  assert.ok(paidLevel, "guitar curriculum has no paid level to test against");
  const paidModule = paidLevel.modules[0].id;
  assert.equal(canOpenModule("guitar", paidModule, guestLearningAccess), false);
  assert.equal(canOpenModule("guitar", paidModule, { ...owned, enabled: false }), false);
  assert.equal(canOpenModule("guitar", paidModule, { ...owned, accountId: null }), false);
  assert.equal(canOpenModule("guitar", paidModule, owned), true);

  // A verified grant opens the whole owned track.
  assert.deepEqual(accessibleLessonIds("guitar", owned), allLessons("guitar").filter(entry => isLessonReady("guitar", entry.lesson.id)).map(entry => entry.lesson.id));
  assert.equal(accessibleLessonIds("guitar", owned).length, 117);
  assert.equal(canOpenModule("guitar", "invented-module", owned), false);
});

/**
 * Every module the catalog marks free has to be openable by a guest. This is
 * the assertion whose absence let the data and the gate disagree.
 */
test("no module in a free level is paywalled", () => {
  for (const track of ["guitar", "voice"] as const) {
    for (const level of curricula[track].levels) {
      if (level.access !== "free") continue;
      for (const learningModule of level.modules) {
        assert.equal(
          canOpenModule(track, learningModule.id, guestLearningAccess),
          true,
          `${learningModule.id} is in free level ${level.id} but a guest cannot open it`,
        );
      }
    }
  }
});

test("an entitlement never turns a curriculum outline into a completable lesson", () => {
  assert.equal(isLessonReady("guitar", "g-l1-m1-02"), true);
  assert.equal(isLessonReady("voice", "v-l1-m1-01"), false);
  assert.equal(isLessonReady("guitar", "missing"), false);
  assert.deepEqual(accessibleLessonIds("voice", { ...owned, tracks: ["voice"] }), []);
});

test("history remains isolated on sign-in, sign-out and account switch without rewriting guest keys", () => {
  const originalKey = "guitarhub.learning.v1.guitar";
  const otherAccount = "93eb561e-0f5c-4e3b-a93f-d89c6d05e3b1";
  const stored = new Map([[originalKey, "guest progress"]]);
  stored.set(accountHistoryKey(originalKey, accountId), "first account progress");
  assert.equal(stored.get(accountHistoryKey(originalKey, null)), "guest progress");
  assert.equal(stored.get(accountHistoryKey(originalKey, otherAccount)), undefined);
  assert.equal(stored.get(accountHistoryKey(originalKey, accountId.toUpperCase())), "first account progress");
  assert.throws(() => accountHistoryKey(originalKey, "../other-user"), /invalid_uuid/);
});
