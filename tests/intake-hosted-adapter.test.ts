import test from "node:test";
import assert from "node:assert/strict";
import { HostedIntakeOutbox, type HostedJob } from "../lib/intake/hosted-outbox.ts";
import { capturePurchaseWithStore, recoverPurchaseCaptures, captureRecordedPurchase, captureStripePurchase, captureSubmittedApplication } from "../lib/intake/capture.ts";
import type { StripePurchase } from "../lib/learning-account/stripe.ts";
import type { VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "456", bundleId: "org.guitarhub.app", productId: "org.guitarhub.app.complete.lifetime", appAccountToken: "sensitive-token", purchasedAt: "2026-10-25T12:00:00Z", signedAt: "2026-10-25T12:00:00Z", revokedAt: null };

const stripe: StripePurchase = { checkoutSessionId: "cs_live_1", paymentIntentId: "pi_1", email: "buyer@example.com", livemode: true, amountTotal: 8453, currency: "usd", purchasedAt: "2026-11-10T12:00:00.000Z", refundedAt: null };

test("hosted adapter enqueues immutable purchase plus unsupported lifecycle snapshot without leaking tokens", async () => {
  const calls: { name: string; args: Readonly<Record<string, unknown>> }[] = [];
  const store = new HostedIntakeOutbox(async (name, args) => { calls.push({ name, args }); return { data: args.p_id, error: null }; });
  await capturePurchaseWithStore(purchase, store);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].name, "guitarhub_intake_enqueue");
  assert.equal(calls[0].args.p_lane, "purchase");
  assert.equal(calls[0].args.p_blocked_reason, null);
  assert.equal(calls[1].args.p_lane, "lifecycle");
  assert.equal(calls[1].args.p_blocked_reason, "purchase-lifecycle-contract");
  assert.doesNotMatch(JSON.stringify(calls), /sensitive-token|appAccountToken|"123"|"456"/);
});

test("persistence failure and malformed database acknowledgements cannot report queued success", async () => {
  const error = new HostedIntakeOutbox(async () => ({ data: null, error: { message: "synthetic internal detail" } }));
  await assert.rejects(() => error.enqueueAcceptedPurchase(purchase), /^Error: intake_persistence_unavailable$/);
  const invalid = new HostedIntakeOutbox(async () => ({ data: true, error: null }));
  await assert.rejects(() => invalid.enqueueAcceptedPurchase(purchase), /persistence_acknowledgement/);
});

test("disabled hosted dispatch never touches persistence or network", async () => {
  const store = new HostedIntakeOutbox(async () => { throw new Error("unexpected database I/O"); });
  assert.equal(await store.dispatchOne(), false);
});

test("route capture is on: without account storage it rejects before any network I/O, for callers to log", async () => {
  // Under Next an unconfigured backend throws account_service_unavailable; under plain node the
  // storage module itself does not load. Either way the capture rejects and nothing is sent.
  const savedKey = process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = async () => { fetched += 1; throw new Error("unexpected network I/O"); };
  try {
    await assert.rejects(() => captureRecordedPurchase(purchase));
    await assert.rejects(() => captureStripePurchase(stripe));
    await assert.rejects(() => captureSubmittedApplication({ name: "Synthetic", email: "synthetic@example.test", goal: "Practice", experience: "Beginner" }));
  } finally {
    globalThis.fetch = originalFetch;
    if (savedKey !== undefined) process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY = savedKey;
  }
  assert.equal(fetched, 0);
});

test("hosted adapter enqueues a Stripe purchase once per Checkout Session, test mode in the canary lane", async () => {
  const calls: Readonly<Record<string, unknown>>[] = [];
  const store = new HostedIntakeOutbox(async (_name, args) => { calls.push(args); return { data: args.p_id, error: null }; });
  const id = await store.enqueueStripePurchase(stripe);
  assert.match(id, /^guitarhub:stripe:[a-f0-9]{64}$/);
  assert.equal(await store.enqueueStripePurchase({ ...stripe, refundedAt: "2026-11-11T12:00:00.000Z" }), id);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].p_lane, "purchase");
  assert.equal(calls[0].p_blocked_reason, null);
  await store.enqueueStripePurchase({ ...stripe, livemode: false });
  assert.equal(calls[2].p_lane, "canary");
  assert.doesNotMatch(JSON.stringify(calls), /buyer@example\.com|cs_live_1|pi_1/);
});

test("hosted completion fences by claimed token and sends retry delay without changing stored body", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new HostedIntakeOutbox(async (_name, args) => { calls.push({ ...args }); return { data: true, error: null }; });
  const job = { id: "fixture:purchase", token: "11111111-1111-4111-8111-111111111111", attempts: 1 } as HostedJob;
  assert.equal(await store.finish(job, { state: "retry", reason: "http-429", retryAfterMs: 120000 }, 0), true);
  assert.deepEqual(calls, [{ p_id: job.id, p_token: job.token, p_state: "pending", p_reason: "http-429", p_delay_ms: 120000 }]);
});

test("authoritative ledger replay recovers missed purchase acceptance and stops on persistence failure", async () => {
  const seen: string[] = [];
  async function* rows() { yield purchase; yield purchase; }
  const store = { enqueueAcceptedPurchase: async (row: VerifiedLifetimePurchase) => { seen.push(row.originalTransactionId); return "id"; }, retainApple: async () => "snapshot" };
  assert.equal(await recoverPurchaseCaptures(rows(), store), 2);
  assert.deepEqual(seen, ["123", "123"]);
  await assert.rejects(() => recoverPurchaseCaptures(rows(), { ...store, enqueueAcceptedPurchase: async () => { throw new Error("synthetic outage"); } }), /synthetic outage/);
});

test("hosted timeout aborts underlying RPC rather than only abandoning its promise", async () => {
  let signal: AbortSignal | undefined;
  const store = new HostedIntakeOutbox(async (_name, _args, abortSignal) => {
    signal = abortSignal;
    return new Promise(() => {});
  }, 10);
  await assert.rejects(() => store.enqueueAcceptedPurchase(purchase), /intake_persistence_timeout/);
  assert.equal(signal?.aborted, true);
});
