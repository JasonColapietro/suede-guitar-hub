import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { AppStoreServerAPIClient, SignedDataVerifier, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { createAppleLearningVerifier, validateVerifiedLifetimePayload } from "../lib/learning-account/apple.ts";
import { GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID } from "../lib/learning-account/contracts.ts";

const token = "a1111111-1111-4111-8111-111111111111";
const claimant = "e5555555-5555-4555-8555-555555555555";
const payload: JWSTransactionDecodedPayload = {
  bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, type: "Non-Consumable",
  environment: "Production", quantity: 1, originalTransactionId: "123456789", transactionId: "123456789",
  purchaseDate: 1_780_000_000_000, signedDate: 1_780_001_000_000, inAppOwnershipType: "PURCHASED", appAccountToken: token,
};
test("verified lifetime payload validates exact product, bundle, type and environment", () => {
  assert.equal(validateVerifiedLifetimePayload(payload, "Production").appAccountToken, token);
  for (const changes of [
    { bundleId: "xyz.suedeai.app" }, { productId: "org.guitarhub.app.complete.annual" }, { type: "Consumable" },
    { quantity: 2 }, { quantity: undefined }, { environment: "Sandbox" }, { transactionId: "" },
    { originalTransactionId: "abc" }, { signedDate: 0 }, { purchaseDate: 1_880_000_000_000 },
    { revocationDate: -1 }, { revocationReason: 1 },
  ]) assert.throws(() => validateVerifiedLifetimePayload({ ...payload, ...changes }, "Production"));
});
test("unbound and family-shared purchases require recovery; revocation stays explicit", () => {
  for (const changes of [{ appAccountToken: undefined }, { inAppOwnershipType: "FAMILY_SHARED" }]) assert.throws(() => validateVerifiedLifetimePayload({ ...payload, ...changes }, "Production"), /ownership_recovery_required/);
  assert.notEqual(validateVerifiedLifetimePayload({ ...payload, revocationDate: 1_780_000_500_000 }, "Production").revokedAt, null);
});
test("a tokenless payload validates only with a claimed token, and family sharing is still refused", () => {
  const tokenless = { ...payload, appAccountToken: undefined };
  assert.throws(() => validateVerifiedLifetimePayload(tokenless, "Production"), /ownership_recovery_required/);
  assert.equal(validateVerifiedLifetimePayload(tokenless, "Production", claimant).appAccountToken, claimant);
  // A claimed purchase belongs to the claimant's binding; the database decides who may claim it.
  assert.equal(validateVerifiedLifetimePayload(payload, "Production", claimant).appAccountToken, claimant);
  assert.throws(() => validateVerifiedLifetimePayload({ ...tokenless, inAppOwnershipType: "FAMILY_SHARED" }, "Production", claimant), /ownership_recovery_required/);
  assert.throws(() => validateVerifiedLifetimePayload(tokenless, "Production", "not a uuid"), /invalid_uuid/);
  assert.throws(() => validateVerifiedLifetimePayload({ ...tokenless, productId: "org.guitarhub.app.complete.annual" }, "Production", claimant), /purchase_not_supported/);
});

// A fresh test key is never an Apple trust anchor and is never persisted.
const signingKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const root = readFileSync(new URL("../lib/learning-account/AppleRootCA-G3.pem", import.meta.url));
const config = { environment: "Production" as const, appAppleId: 1234567890, appleRootCertificates: [root], issuerId: token, keyId: "UNITTEST01", signingKey };
const forged = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.invalid`;

test("official cryptographic adapter rejects missing or untrusted roots and unsigned claims", async () => {
  assert.throws(() => createAppleLearningVerifier({ ...config, appleRootCertificates: [] }), /unavailable/);
  assert.throws(() => createAppleLearningVerifier({ ...config, appleRootCertificates: [Buffer.from("not a certificate")] }), /unavailable/);
  const verifier = createAppleLearningVerifier(config);
  await assert.rejects(() => verifier.verifyPurchase(forged, { accountId: token, appAccountToken: token }), /apple_verification_failed/);
  await assert.rejects(() => verifier.verifyClaim(forged, { accountId: token, appAccountToken: claimant }), /apple_verification_failed/);
  await assert.rejects(() => verifier.verifyNotification(forged), /apple_verification_failed/);
  await assert.rejects(() => verifier.reconcileTransaction("../../anything"), /invalid_purchase/);
});

/** Stands in for Apple: the signed transaction decodes to `submitted`, Apple's current record to `current`. */
function appleDouble(context: TestContext, submitted: Partial<JWSTransactionDecodedPayload>, current: Partial<JWSTransactionDecodedPayload> = submitted) {
  const lookups: string[] = [];
  context.mock.method(SignedDataVerifier.prototype, "verifyAndDecodeTransaction", async (signed: string) => ({ ...payload, ...(signed === "apple.current.record" ? current : submitted) }));
  context.mock.method(AppStoreServerAPIClient.prototype, "getTransactionInfo", async (transactionId: string) => { lookups.push(transactionId); return { signedTransactionInfo: "apple.current.record" }; });
  return lookups;
}
const fixture = "submitted.signed.transaction";

test("a claim stamps the claimant's binding on a verified purchase made before sign-in", async (context) => {
  for (const embedded of [undefined, token]) {
    const lookups = appleDouble(context, { appAccountToken: embedded });
    const claimed = await createAppleLearningVerifier(config).verifyClaim(fixture, { accountId: token, appAccountToken: claimant });
    assert.equal(claimed.accountId, token);
    assert.equal(claimed.appAccountToken, claimant);
    assert.equal(claimed.revokedAt, null);
    assert.deepEqual(lookups, ["123456789"]); // Apple's current record is checked, not only the submitted copy
    context.mock.restoreAll();
  }
});

test("a claim refuses revoked, family-shared, foreign-product and mismatched Apple records", async (context) => {
  const cases: [Partial<JWSTransactionDecodedPayload>, Partial<JWSTransactionDecodedPayload>, RegExp][] = [
    [{}, { revocationDate: 1_780_000_500_000 }, /purchase_revoked/],
    [{ inAppOwnershipType: "FAMILY_SHARED" }, {}, /ownership_recovery_required/],
    [{ productId: "org.guitarhub.app.complete.annual" }, {}, /purchase_not_supported/],
    [{ bundleId: "xyz.suedeai.app" }, {}, /purchase_not_supported/],
    [{}, { originalTransactionId: "987654321" }, /purchase_identity_mismatch/],
  ];
  for (const [submitted, current, expected] of cases) {
    appleDouble(context, { appAccountToken: undefined, ...submitted }, { appAccountToken: undefined, ...submitted, ...current });
    await assert.rejects(() => createAppleLearningVerifier(config).verifyClaim(fixture, { accountId: token, appAccountToken: claimant }), expected);
    context.mock.restoreAll();
  }
});

test("reconciling a claimed row uses the stored token; an unclaimed tokenless record is still refused", async (context) => {
  appleDouble(context, { appAccountToken: undefined });
  const verifier = createAppleLearningVerifier(config);
  assert.equal((await verifier.reconcileTransaction("123456789", claimant)).appAccountToken, claimant);
  await assert.rejects(() => verifier.reconcileTransaction("123456789"), /ownership_recovery_required/);
});

test("a refund notification for a claimed purchase reconciles with the claimed row's token", async (context) => {
  const other = "c3333333-3333-4333-8333-333333333333";
  const refund = { revocationDate: 1_780_000_500_000, signedDate: 1_780_002_000_000 };
  for (const embedded of [undefined, other]) {
    const lookups = appleDouble(context, { appAccountToken: embedded, ...refund });
    context.mock.method(SignedDataVerifier.prototype, "verifyAndDecodeNotification", async () => ({ notificationUUID: "f6666666-6666-4666-8666-666666666666", data: { signedTransactionInfo: fixture } }));
    const asked: string[] = [];
    const event = await createAppleLearningVerifier(config).verifyNotification("signed.notification.payload", async (originalTransactionId) => { asked.push(originalTransactionId); return claimant; });
    assert.deepEqual(asked, ["123456789"]);
    assert.deepEqual(lookups, ["123456789"]);
    assert.equal(event?.purchase.appAccountToken, claimant);
    assert.notEqual(event?.purchase.revokedAt, null);
    context.mock.restoreAll();
  }
  // An unclaimed row: a tokenless transaction is still refused, and a bound one keeps its own token.
  appleDouble(context, { appAccountToken: undefined, ...refund });
  context.mock.method(SignedDataVerifier.prototype, "verifyAndDecodeNotification", async () => ({ notificationUUID: "f6666666-6666-4666-8666-666666666666", data: { signedTransactionInfo: fixture } }));
  await assert.rejects(() => createAppleLearningVerifier(config).verifyNotification("signed.notification.payload", async () => undefined), /ownership_recovery_required/);
  await assert.rejects(() => createAppleLearningVerifier(config).verifyNotification("signed.notification.payload"), /ownership_recovery_required/);
  context.mock.restoreAll();
  appleDouble(context, { ...refund });
  context.mock.method(SignedDataVerifier.prototype, "verifyAndDecodeNotification", async () => ({ notificationUUID: "f6666666-6666-4666-8666-666666666666", data: { signedTransactionInfo: fixture } }));
  assert.equal((await createAppleLearningVerifier(config).verifyNotification("signed.notification.payload", async () => undefined))?.purchase.appAccountToken, token);
});
