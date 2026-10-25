import test from "node:test";
import assert from "node:assert/strict";
import { appleIntakeSnapshot } from "../lib/intake/apple-identity.ts";
import { GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const purchase: VerifiedLifetimePurchase = {
  environment: "Production", bundleId: GUITARHUB_BUNDLE_ID,
  productId: GUITARHUB_LIFETIME_PRODUCT_ID, originalTransactionId: "123",
  transactionId: "456", appAccountToken: "a1111111-1111-4111-8111-111111111111",
  purchasedAt: "2026-09-01T00:00:00Z", signedAt: "2026-09-02T00:00:00Z", revokedAt: null,
};

test("purchase, restore and notification observations correlate to one original purchase", () => {
  const first = appleIntakeSnapshot(purchase);
  const restored = appleIntakeSnapshot({ ...purchase, transactionId: "789", signedAt: "2026-09-03T00:00:00Z" });
  const notification = appleIntakeSnapshot({ ...purchase, notificationUUID: "arbitrary-notification-id" } as VerifiedLifetimePurchase);
  assert.match(first.purchaseKey, /^guitarhub:apple:[a-f0-9]{64}$/);
  assert.equal(first.purchaseKey, restored.purchaseKey);
  assert.equal(first.purchaseKey, notification.purchaseKey);
  assert.notEqual(first.purchaseKey, appleIntakeSnapshot({ ...purchase, originalTransactionId: "124" }).purchaseKey);
});

test("test and production purchases never share a correlation key", () => {
  assert.notEqual(appleIntakeSnapshot(purchase).purchaseKey,
    appleIntakeSnapshot({ ...purchase, environment: "Sandbox" }).purchaseKey);
});

test("refund state changes the observation while retaining the original purchase correlation", () => {
  const active = appleIntakeSnapshot(purchase);
  const refund = appleIntakeSnapshot({ ...purchase, signedAt: "2026-09-04T00:00:00Z", revokedAt: "2026-09-03T00:00:00Z" });
  assert.equal(active.purchaseKey, refund.purchaseKey);
  assert.equal(active.state, "active");
  assert.equal(refund.state, "revoked");
  assert.equal(refund.revokedAt, "2026-09-03T00:00:00.000Z");
  assert.equal(refund.observedAt, "2026-09-04T00:00:00.000Z");
});

test("snapshot is an explicit allowlist with no identity, JWS, token or arbitrary submitted fields", () => {
  const snapshot = appleIntakeSnapshot({ ...purchase, email: "private@example.test", password: "private", signedPayload: "private", secret: "private" } as VerifiedLifetimePurchase);
  assert.deepEqual(Object.keys(snapshot).sort(), ["environment", "observedAt", "productId", "purchaseKey", "purchasedAt", "revokedAt", "state"]);
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /"123"|"456"|a1111111|private|password|signedPayload|secret|appAccountToken/);
  assert.equal(snapshot.purchasedAt, "2026-09-01T00:00:00.000Z");
  assert.equal(snapshot.productId, GUITARHUB_LIFETIME_PRODUCT_ID);
});

test("invalid business identity and timestamps cannot be projected", () => {
  for (const invalid of [
    { environment: "Xcode" }, { bundleId: "other.app" }, { productId: "other.product" },
    { originalTransactionId: "not-a-transaction" }, { originalTransactionId: "" },
    { originalTransactionId: "1".repeat(41) }, { purchasedAt: "not-a-date" },
    { signedAt: "2026-08-01T00:00:00Z" }, { revokedAt: "not-a-date" },
    { purchasedAt: "2026-02-30T00:00:00Z" }, { signedAt: "2026-02-30T00:00:00Z" },
    { signedAt: "2026-09-03T24:00:00Z" }, { revokedAt: "2026-08-01T00:00:00Z" },
    { revokedAt: "2026-10-01T00:00:00Z" },
  ]) assert.throws(() => appleIntakeSnapshot({ ...purchase, ...invalid } as VerifiedLifetimePurchase), /invalid_intake_purchase/);
});


test("equivalent timestamp offsets yield the same snapshot", () => {
  assert.deepEqual(appleIntakeSnapshot(purchase), appleIntakeSnapshot({ ...purchase,
    purchasedAt: "2026-09-01T01:00:00+01:00", signedAt: "2026-09-02T01:00:00+01:00" }));
});
