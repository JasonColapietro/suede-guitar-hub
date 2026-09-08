import test from "node:test";
import assert from "node:assert/strict";
import { accountUUID, assertAccountScope, assertSyncScope, parseLearningAttempt, lifetimeTracks, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const account = "a1111111-1111-4111-8111-111111111111";
const other = "b2222222-2222-4222-8222-222222222222";
const lessons = new Map([["g-l1-m1-02", "guitar" as const], ["v-l1-m1-01", "voice" as const]]);
const attempt = {
  version: 1, id: account, track: "guitar", lessonId: "g-l1-m1-02", kind: "microphone",
  createdAt: "2026-09-07T01:00:00Z", practiceSeconds: 20, exerciseRevision: 2, source: "measured",
  disposition: "scored", assessment: "ready", score: 87, bpm: 80, details: { matchedTargets: 14, targetCount: 16 },
};
test("account IDs are canonical UUIDs and switching accounts quarantines a queued upload", () => {
  assert.equal(accountUUID(account.toUpperCase()), account);
  assert.doesNotThrow(() => assertAccountScope(account, account));
  for (const value of ["apple:123", "someone@example.org", "", null, "00000000-0000-0000-0000-000000000000"]) assert.throws(() => accountUUID(value));
  for (const pair of [[account, other], [null, account], [account, null]]) assert.throws(() => assertAccountScope(pair[0], pair[1]), /account_changed/);
});
test("valid measured evidence preserves stable identity, revision and unknown duration", () => {
  const parsed = parseLearningAttempt({ ...attempt, practiceSeconds: null }, lessons);
  assert.equal(parsed.id, account);
  assert.equal(parsed.exerciseRevision, 2);
  assert.equal(parsed.practiceSeconds, null);
  assert.equal(parsed.createdAt, "2026-09-07T01:00:00.000Z");
  assert.equal(parsed.score, 87);
  assert.deepEqual(parsed.details, attempt.details);
  assert.notEqual(parsed.details, attempt.details);
});
test("a history reset invalidates queued work even when the same account stays signed in", () => {
  assert.doesNotThrow(() => assertSyncScope({ accountId: account, syncEpoch: account }, { accountId: account, syncEpoch: account }));
  assert.throws(() => assertSyncScope({ accountId: account, syncEpoch: account }, { accountId: account, syncEpoch: other }), /sync_epoch_changed/);
});
test("self reports, weak signal and legacy summaries cannot invent measured scores", () => {
  for (const value of [
    { ...attempt, source: "selfReported", disposition: "manualOverride" },
    { ...attempt, source: "measured", disposition: "insufficientSignal" },
    { ...attempt, kind: "legacy", source: "legacy", disposition: "imported" },
  ]) assert.equal(parseLearningAttempt(value, lessons).score, null);
  assert.equal(parseLearningAttempt({ ...attempt, kind: "legacy", source: "legacy", disposition: "imported" }, lessons).assessment, "repeat");
});
test("reading, study and manual count remain distinct evidence rather than microphone passes", () => {
  for (const kind of ["reading", "study", "manualCount"]) {
    const result = parseLearningAttempt({ ...attempt, kind, source: "selfReported", disposition: "reflection" }, lessons);
    assert.equal(result.kind, kind);
    assert.equal(result.score, null);
  }
});
test("invalid or mismatched lessons, bounds and evidence fail closed", () => {
  for (const changes of [
    { lessonId: "does-not-exist" }, { track: "voice" }, { version: 2 }, { practiceSeconds: -1 },
    { practiceSeconds: 86_401 }, { exerciseRevision: 0 }, { bpm: Infinity }, { score: 101 },
    { createdAt: "yesterday" }, { source: "measured", kind: "study" }, { source: "legacy" },
    { disposition: "scored", score: null }, { source: "selfReported", disposition: "scored" },
  ]) assert.throws(() => parseLearningAttempt({ ...attempt, ...changes }, lessons));
});
test("details are bounded JSON and cannot carry prototype mutations or raw media", () => {
  for (const details of [[], { text: "x".repeat(2001) }, { samples: Array(129).fill(0) }, { v: NaN }, { a: { b: { c: { d: { e: { f: 1 } } } } } }, JSON.parse('{"__proto__":{"admin":true}}')]) assert.throws(() => parseLearningAttempt({ ...attempt, details }, lessons));
});
test("sandbox and revoked purchases never become production access", () => {
  const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "123", bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken: account, purchasedAt: "2026-09-07T00:00:00Z", signedAt: "2026-09-07T01:00:00Z", revokedAt: null };
  assert.deepEqual(lifetimeTracks(purchase, "Production"), ["guitar", "voice"]);
  assert.deepEqual(lifetimeTracks(purchase, "Sandbox"), []);
  assert.deepEqual(lifetimeTracks({ ...purchase, environment: "Sandbox" }, "Production"), []);
  assert.deepEqual(lifetimeTracks({ ...purchase, revokedAt: purchase.signedAt }, "Production"), []);
  assert.deepEqual(lifetimeTracks(null, "Production"), []);
});
