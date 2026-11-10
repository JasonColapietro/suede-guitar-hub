import test from "node:test";
import assert from "node:assert/strict";
import { createLearningHandlers, type AccountBinding, type LearningHandlerDependencies } from "../lib/learning-auth/handlers.ts";
import { LearningAccountError, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const id = "a1111111-1111-4111-8111-111111111111", epoch = "b2222222-2222-4222-8222-222222222222", token = "d4444444-4444-4444-8444-444444444444";
const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "123", bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken: token, purchasedAt: "2026-09-01T00:00:00Z", signedAt: "2026-09-02T00:00:00Z", revokedAt: null };
const request = (body?: unknown) => new Request("https://guitarhub.org/api/learning/purchases/apple/claim", { method: body === undefined ? "GET" : "POST", headers: { origin: "https://guitarhub.org", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

type Verifier = Awaited<ReturnType<LearningHandlerDependencies["verifier"]>>;
const verifier = (overrides: Partial<Verifier> = {}): Verifier => ({
  verifyPurchase: async () => { throw new Error("the claim path must not use verifyPurchase"); },
  verifyClaim: async (_signed, binding) => ({ ...purchase, appAccountToken: binding.appAccountToken, accountId: binding.accountId }),
  reconcileTransaction: async () => purchase, verifyNotification: async () => null, ...overrides,
});

/** The account starts without a binding unless `bound` is set; creating it is a recorded write. */
function harness(overrides: Partial<LearningHandlerDependencies> = {}, bound = false) {
  const writes: string[] = [];
  let binding: AccountBinding | null = bound ? { appAccountToken: token, syncEpoch: epoch } : null;
  const deps: LearningHandlerDependencies = {
    enabled: () => true, resolveAccount: async () => ({ accountId: id, verifiedEmail: "buyer@example.com" }),
    getBinding: async (_account, create) => {
      if (create && !binding) { writes.push("binding"); binding = { appAccountToken: token, syncEpoch: epoch }; }
      return binding;
    },
    listAttempts: async () => [], listPurchases: async () => [], findPurchaseOwner: async () => null,
    appendAttempts: async () => [], clearHistory: async () => epoch,
    recordPurchase: async (_account, value) => { writes.push("purchase"); return value; },
    claimPurchase: async (_account, value) => { writes.push("claim"); return value; },
    verifier: async () => verifier(),
    listStripePurchases: async () => [], stripeLiveRequired: () => true,
    getFreeModule: async () => null, setFreeModule: async (_account, moduleId) => moduleId,
    environment: () => "Production", allowedLessons: new Map(), ...overrides,
  };
  return { handlers: createLearningHandlers(deps), writes };
}

test("a signed-in buyer links a purchase made before sign-in", async () => {
  const claims: unknown[][] = [];
  const h = harness({ claimPurchase: async (...args) => { claims.push(args); h.writes.push("claim"); return args[1]; } });
  const response = await h.handlers.claim(request({ signedTransaction: "verified fixture" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accountId: id, tracks: ["guitar", "voice"], environment: "Production" });
  assert.deepEqual(h.writes, ["binding", "claim"]); // the binding is created if missing
  // The database decides ownership from the claimant's own binding token and verified email.
  assert.equal(claims.length, 1);
  assert.equal(claims[0][0], id);
  assert.equal((claims[0][1] as VerifiedLifetimePurchase).appAccountToken, token);
  assert.equal(claims[0][2], "buyer@example.com");
});

test("the claim sends the claimant's binding to Apple verification and keeps an existing binding", async () => {
  const bindings: unknown[] = [];
  const h = harness({ verifier: async () => verifier({ verifyClaim: async (signed, binding) => { bindings.push([signed, binding]); return { ...purchase, accountId: binding.accountId }; } }) }, true);
  assert.equal((await h.handlers.claim(request({ signedTransaction: "verified fixture" }))).status, 200);
  assert.deepEqual(bindings, [["verified fixture", { accountId: id, appAccountToken: token }]]);
  assert.deepEqual(h.writes, ["claim"]);
});

test("a second account is refused with purchase_already_linked", async () => {
  const h = harness({ claimPurchase: async () => { throw new LearningAccountError("purchase_already_linked"); } });
  const response = await h.handlers.claim(request({ signedTransaction: "verified fixture" }));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "purchase_already_linked" });
});

test("claim needs sign-in, a string transaction, and writes nothing when Apple rejects it", async () => {
  const signedOut = harness({ resolveAccount: async () => null, verifier: async () => { throw new Error("must not reach Apple"); } });
  assert.equal((await signedOut.handlers.claim(request({ signedTransaction: "verified fixture" }))).status, 401);
  assert.deepEqual(signedOut.writes, []);

  const malformed = harness({ verifier: async () => { throw new Error("must not reach Apple"); } });
  for (const body of [{ signedTransaction: 3 }, {}]) {
    const response = await malformed.handlers.claim(request(body));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_signed_purchase" });
  }
  assert.deepEqual(malformed.writes, []);

  for (const code of ["apple_verification_failed", "purchase_revoked", "ownership_recovery_required"]) {
    const rejected = harness({ verifier: async () => verifier({ verifyClaim: async () => { throw new LearningAccountError(code); } }) }, true);
    const response = await rejected.handlers.claim(request({ signedTransaction: "verified fixture" }));
    assert.equal(response.status, code === "ownership_recovery_required" ? 409 : 400);
    assert.deepEqual(await response.json(), { error: code });
    assert.deepEqual(rejected.writes, []);
  }
});

test("a verifier result for another account, token or environment never reaches the database", async () => {
  for (const changes of [{ accountId: "c3333333-3333-4333-8333-333333333333" }, { appAccountToken: "c3333333-3333-4333-8333-333333333333" }, { environment: "Sandbox" as const }]) {
    const h = harness({ verifier: async () => verifier({ verifyClaim: async (_signed, binding) => ({ ...purchase, accountId: binding.accountId, ...changes }) }) }, true);
    assert.equal((await h.handlers.claim(request({ signedTransaction: "verified fixture" }))).status, 409);
    assert.deepEqual(h.writes, []);
  }
});

test("a claimed row reconciles without a token from Apple; an unclaimed row still requires one", async () => {
  const received: unknown[][] = [];
  const h = harness({
    listPurchases: async () => [
      { transactionId: "123", originalTransactionId: "123", appAccountToken: token, claimed: true },
      { transactionId: "456", originalTransactionId: "456", appAccountToken: token, claimed: false },
    ],
    verifier: async () => verifier({ reconcileTransaction: async (...args) => {
      received.push(args);
      return { ...purchase, transactionId: args[0], originalTransactionId: args[0] };
    } }),
  }, true);
  const response = await h.handlers.access(request());
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).tracks, ["guitar", "voice"]);
  assert.deepEqual(received, [["123", token], ["456", undefined]]);
});
