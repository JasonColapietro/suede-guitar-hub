import test from "node:test";
import assert from "node:assert/strict";
import { createLearningHandlers, type LearningHandlerDependencies } from "../lib/learning-auth/handlers.ts";
import { normalizeEmail, stripeTracks, type StripePurchase } from "../lib/learning-account/stripe.ts";
import { verifiedUserEmail } from "../lib/learning-auth/identity.ts";
import { GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const id = "a1111111-1111-4111-8111-111111111111", epoch = "b2222222-2222-4222-8222-222222222222", other = "c3333333-3333-4333-8333-333333333333";
const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "123", bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken: id, purchasedAt: "2026-09-01T00:00:00Z", signedAt: "2026-09-02T00:00:00Z", revokedAt: null };
const request = (body?: unknown, init: RequestInit = {}, query = "") => new Request(`https://guitarhub.org/api/learning/test${query}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "https://guitarhub.org", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...init });

function harness(overrides: Partial<LearningHandlerDependencies> = {}) {
  const writes: string[] = [];
  const deps: LearningHandlerDependencies = {
    enabled: () => true, resolveAccount: async () => ({ accountId: id, verifiedEmail: "buyer@example.com" }),
    getBinding: async (_account, create) => { if (create) writes.push("binding"); return { appAccountToken: id, syncEpoch: epoch }; },
    listAttempts: async () => [], listPurchases: async () => [{ transactionId: "123", originalTransactionId: "123", appAccountToken: id, claimed: false }],
    findPurchaseOwner: async () => ({ accountId: id, appAccountToken: id, claimed: false }),
    appendAttempts: async () => [], clearHistory: async () => other,
    recordPurchase: async (_account, value) => { writes.push("purchase"); return value; },
    claimPurchase: async (_account, value) => { writes.push("claim"); return value; },
    verifier: async () => ({ verifyClaim: async () => { throw new Error("claim not under test"); }, verifyPurchase: async () => ({ ...purchase, accountId: id }), reconcileTransaction: async () => purchase, verifyNotification: async () => ({ notificationId: other, purchase }) }),
    listStripePurchases: async () => [], stripeLiveRequired: () => true,
    getFreeModule: async () => null, setFreeModule: async (_account, moduleId) => moduleId,
    deleteAccountData: async () => {}, identityInUse: async () => true, deleteIdentity: async () => {},
    environment: () => "Production", allowedLessons: new Map([["g-l1-m1-02", "guitar"]]), ...overrides,
  };
  return { handlers: createLearningHandlers(deps), writes, deps };
}

const live: StripePurchase = { checkoutSessionId: "cs_1", paymentIntentId: "pi_1", email: "buyer@example.com", livemode: true, amountTotal: 7900, currency: "usd", purchasedAt: "2026-11-10T00:00:00Z", refundedAt: null };
test("a live Stripe purchase for the verified email grants both tracks", async () => {
  const h = harness({ listPurchases: async () => [], resolveAccount: async () => ({ accountId: id, verifiedEmail: "buyer@example.com" }), listStripePurchases: async (email) => { assert.equal(email, "buyer@example.com"); return [live]; } });
  assert.deepEqual(await (await h.handlers.access(request())).json(), { accountId: id, tracks: ["guitar", "voice"], environment: "Production", freeModuleId: null, purchaseSource: "stripe" });
});
test("refunded, test-mode in production, and unverified-email purchases grant nothing", async () => {
  assert.deepEqual(stripeTracks([{ ...live, refundedAt: "2026-11-11T00:00:00Z" }], true), []);
  assert.deepEqual(stripeTracks([{ ...live, livemode: false }], true), []);
  assert.deepEqual(stripeTracks([{ ...live, livemode: false }], false), ["guitar", "voice"]);
  const h = harness({ listPurchases: async () => [], resolveAccount: async () => ({ accountId: id, verifiedEmail: null }), listStripePurchases: async () => { throw new Error("must not be queried without a verified email"); } });
  assert.deepEqual((await (await h.handlers.access(request())).json()).tracks, []);
});
test("one live purchase is enough: a refunded Stripe purchase does not remove Apple access", async () => {
  const h = harness({ listStripePurchases: async () => [{ ...live, refundedAt: "2026-11-11T00:00:00Z" }] }); // harness default has one live Apple row
  const body = await (await h.handlers.access(request())).json();
  assert.deepEqual(body.tracks, ["guitar", "voice"]); assert.equal(body.purchaseSource, "apple");
});
test("email matching ignores case and surrounding space", () => assert.equal(normalizeEmail("  Buyer@Example.COM "), "buyer@example.com"));
test("the free module is stored once and the stored id is returned", async () => {
  let stored: string | null = null;
  const h = harness({ getFreeModule: async () => stored, setFreeModule: async (_a, m) => (stored ??= m) });
  const put = (moduleId: unknown) => h.handlers.freeModule(request({ moduleId }, { method: "PUT" }));
  assert.deepEqual(await (await put("g-l2-m1")).json(), { freeModuleId: "g-l2-m1" });
  assert.deepEqual(await (await put("g-l4-m1")).json(), { freeModuleId: "g-l2-m1" });
  assert.equal((await put("g-l1-m1")).status, 400);
  assert.equal((await (await h.handlers.access(request())).json()).freeModuleId, "g-l2-m1");
  assert.equal((await harness({ resolveAccount: async () => null }).handlers.freeModule(request({ moduleId: "g-l2-m1" }, { method: "PUT" }))).status, 401);
});
test("only a provider-confirmed email is used, normalised like the database", () => {
  assert.equal(verifiedUserEmail({ email: "  Buyer@Example.COM ", email_confirmed_at: "2026-11-10T00:00:00Z" }), "buyer@example.com");
  for (const user of [{ email: "buyer@example.com" }, { email: "buyer@example.com", email_confirmed_at: null }, { email: "buyer@example.com", email_confirmed_at: "" }, { email_confirmed_at: "2026-11-10T00:00:00Z" }, { email: "  ", email_confirmed_at: "2026-11-10T00:00:00Z" }]) assert.equal(verifiedUserEmail(user), null);
});
test("an Apple buyer keeps access when the Stripe and free-module lookups fail", async () => {
  const h = harness({
    listStripePurchases: async () => { throw new Error("stripe table unavailable"); },
    getFreeModule: async () => { throw new Error("free module table missing"); },
  });
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  let response: Response;
  try { response = await h.handlers.access(request()); } finally { console.error = original; }
  assert.equal(response.status, 200);
  assert.equal(logged.length, 1);
  assert.deepEqual(await response.json(), { accountId: id, tracks: ["guitar", "voice"], environment: "Production", freeModuleId: null, purchaseSource: "apple" });
});
test("a free-module failure still fails closed for an account with no purchase", async () => {
  const h = harness({ listPurchases: async () => [], getFreeModule: async () => { throw new Error("free module table missing"); } });
  assert.equal((await h.handlers.access(request())).status >= 500, true);
});
