import test from "node:test";
import assert from "node:assert/strict";
import { HostedIntakeOutbox, type HostedJob } from "../lib/intake/hosted-outbox.ts";
import { capturePurchaseWithStore, recoverPurchaseCaptures, captureRecordedPurchase, captureSubmittedApplication } from "../lib/intake/capture.ts";
import type { VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "456", bundleId: "org.guitarhub.app", productId: "org.guitarhub.app.complete.lifetime", appAccountToken: "sensitive-token", purchasedAt: "2026-10-25T12:00:00Z", signedAt: "2026-10-25T12:00:00Z", revokedAt: null };

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
  await captureRecordedPurchase(purchase);
  await captureSubmittedApplication({ name: "Synthetic", email: "synthetic@example.test", goal: "Practice", experience: "Beginner" });
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
