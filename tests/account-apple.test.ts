import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";
import { createAppleLearningVerifier, validateVerifiedLifetimePayload } from "../lib/learning-account/apple.ts";
import { GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID } from "../lib/learning-account/contracts.ts";
import type { JWSTransactionDecodedPayload } from "@apple/app-store-server-library";

const token = "a1111111-1111-4111-8111-111111111111";
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
test("official cryptographic adapter rejects missing or untrusted roots and unsigned claims", async () => {
  // A fresh test key is never an Apple trust anchor and is never persisted.
  const signingKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const root = readFileSync(new URL("../lib/learning-account/AppleRootCA-G3.pem", import.meta.url));
  const config = { environment: "Production" as const, appAppleId: 1234567890, appleRootCertificates: [root], issuerId: token, keyId: "UNITTEST01", signingKey };
  assert.throws(() => createAppleLearningVerifier({ ...config, appleRootCertificates: [] }), /unavailable/);
  assert.throws(() => createAppleLearningVerifier({ ...config, appleRootCertificates: [Buffer.from("not a certificate")] }), /unavailable/);
  const verifier = createAppleLearningVerifier(config);
  const forged = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.invalid`;
  await assert.rejects(() => verifier.verifyPurchase(forged, { accountId: token, appAccountToken: token }), /apple_verification_failed/);
  await assert.rejects(() => verifier.verifyNotification(forged), /apple_verification_failed/);
  await assert.rejects(() => verifier.reconcileTransaction("../../anything"), /invalid_purchase/);
});
