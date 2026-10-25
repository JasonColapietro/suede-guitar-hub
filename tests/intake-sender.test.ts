import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applicationEvent, purchaseEvent, HUB_CONTRACT_SHA, sendIntakeEvent } from "../lib/intake/sender.ts";
import { signBody, validAcknowledgement, isDraftHubEvent, DETAIL_FIELDS, ATTRIBUTION_FIELDS } from "../lib/intake/contract.ts";
import { LocalIntakeOutbox } from "../lib/intake/local-outbox.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/intake-contract-v1.json", import.meta.url), "utf8"));
const input = { name: "Synthetic", email: "synthetic@example.test", goal: "Practice", experience: "Beginner" };
const receipt = "11111111-1111-4111-8111-111111111111";
const at = "2026-10-25T12:00:00Z";
const config = { enabled: true, source: "guitarhub", secret: "synthetic-test-secret-000000000000000000" };
const event = () => applicationEvent(input, receipt, at);
const response = (status: number, body: unknown = { accepted: true, duplicate: false }, headers = {}) => new Response(JSON.stringify(body), { status, headers });

test("shared draft fixture schema, signature and acknowledgement examples conform", () => {
  assert.equal(HUB_CONTRACT_SHA, "0b33f45a0bdde87b8e7746666d6200c17d0c4b82");
  assert.equal(fixture.contractCommit, "b13442a26d5893073f6e06514839b77da4e5a488");
  const official = JSON.parse(readFileSync(new URL("./fixtures/intake-owner-v1-signing.json", import.meta.url), "utf8"));
  assert.equal(signBody(official.secret, official.timestamp, official.rawBody), official.signature);
  assert.deepEqual(DETAIL_FIELDS, fixture.detailFields);
  assert.deepEqual(ATTRIBUTION_FIELDS, fixture.attributionFields);
  for (const value of fixture.valid) assert.equal(isDraftHubEvent(value), true);
  for (const { event: value } of fixture.invalid) assert.equal(isDraftHubEvent(value), false);
  assert.equal(signBody(fixture.signing.secret, fixture.signing.timestamp, fixture.signing.body), fixture.signing.signature);
  fixture.acknowledgements.accepted.forEach((value: unknown) => assert.equal(validAcknowledgement(value), true));
  fixture.acknowledgements.rejected.forEach((value: unknown) => assert.equal(validAcknowledgement(value), false));
});

test("application builder omits arbitrary request keys, credential text and URL secrets before storage", () => {
  const value = applicationEvent({ ...input, password: "private", goal: "password=private", experience: "https://user:pass@example.test/path?token=private#private" }, receipt, at);
  assert.equal(isDraftHubEvent(value), true);
  assert.doesNotMatch(JSON.stringify(value), /private|user:pass/);
  assert.deepEqual(Object.keys(value.details), ["application_id", "interest", "note"]);
  assert.equal(value.summary, "GuitarHub founding room application");
});

test("disabled and misconfigured transport performs no I/O; valid transport signs exact bytes and isolates source/property", async () => {
  const fetcher: typeof fetch = async (_url, options) => {
    const body = options?.body as string;
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("x-suede-intake-source"), "guitarhub");
    assert.equal(headers.get("x-suede-intake-signature"), signBody(config.secret, "1000", body));
    assert.equal(JSON.parse(body).property, "guitarhub.org");
    assert.equal(options?.redirect, "error");
    return response(202);
  };
  const noIO: typeof fetch = async () => { throw new Error("unexpected I/O"); };
  assert.deepEqual(await sendIntakeEvent(event(), {}, noIO), { state: "blocked", reason: "disabled" });
  assert.deepEqual(await sendIntakeEvent(event(), { ...config, source: "seo-site" }, noIO), { state: "blocked", reason: "configuration" });
  assert.deepEqual(await sendIntakeEvent({ ...event(), property: "other.test" } as unknown as ReturnType<typeof event>, config, noIO), { state: "blocked", reason: "payload" });
  assert.deepEqual(await sendIntakeEvent(event(), config, fetcher, () => 1000000), { state: "delivered" });
});

test("only valid 202 ACK delivers; 401 remains blocked; transient errors retain retry and Retry-After", async () => {
  for (const ack of fixture.acknowledgements.rejected) assert.equal((await sendIntakeEvent(event(), config, async () => response(202, ack))).state, "retry");
  assert.deepEqual(await sendIntakeEvent(event(), config, async () => response(401)), { state: "blocked", reason: "http-401" });
  assert.deepEqual(await sendIntakeEvent(event(), config, async () => response(429, {}, { "retry-after": "120" })), { state: "retry", reason: "http-429", retryAfterMs: 120000 });
  assert.equal((await sendIntakeEvent(event(), config, async () => { throw new Error("private provider failure"); })).state, "retry");
  assert.equal((await sendIntakeEvent(event(), config, async () => response(503))).state, "retry");
});

test("deadline bounds uncooperative network and response-body reads, and oversized ACKs never deliver", async () => {
  const never: typeof fetch = () => new Promise(() => {});
  assert.deepEqual(await sendIntakeEvent(event(), config, never, Date.now, 10), { state: "retry", reason: "timeout" });
  const stalled: typeof fetch = async () => new Response(new ReadableStream({ start() {} }), { status: 202 });
  assert.deepEqual(await sendIntakeEvent(event(), config, stalled, Date.now, 10), { state: "retry", reason: "timeout" });
  assert.equal((await sendIntakeEvent(event(), config, async () => response(202, { accepted: true, duplicate: false, extra: "x".repeat(2000) }))).state, "retry");
});

function local() {
  const directory = mkdtempSync(join(tmpdir(), "guitarhub-intake-"));
  const path = join(directory, "queue.sqlite");
  return { path, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test("accepted local queue survives close/reopen, leases survive crashes, and stale workers cannot acknowledge", () => {
  const h = local(); let store = new LocalIntakeOutbox(h.path);
  try {
    const id = store.enqueueApplication(input, receipt, at);
    const abandoned = store.claim(1000)!;
    assert.equal(abandoned.id, id);
    store.close(); store = new LocalIntakeOutbox(h.path);
    assert.equal(store.claim(2000), undefined);
    const retry = store.claim(31000)!;
    assert.equal(retry.id, id); assert.equal(retry.body, abandoned.body);
    assert.equal(store.finish(abandoned, { state: "delivered" }, 31001), false);
    assert.equal(store.finish(retry, { state: "delivered" }, 31001), true);
    assert.equal(store.get(id)?.state, "delivered");
    assert.equal(store.enqueueApplication(input, receipt, at), id);
    assert.throws(() => store.enqueueApplication({ ...input, goal: "Changed" }, receipt, at), /identity_conflict/);
  } finally { store.close(); h.cleanup(); }
});

test("401 persists blocked across restart, explicit repair retries original identity and content", async () => {
  const h = local(); let store = new LocalIntakeOutbox(h.path);
  try {
    const id = store.enqueueApplication(input, receipt, at);
    const original = store.get(id)!.body;
    assert.equal(await store.dispatchOne({}, async () => { throw new Error("no I/O"); }), false);
    await store.dispatchOne(config, async () => response(401), () => 1000);
    store.close(); store = new LocalIntakeOutbox(h.path);
    assert.equal(store.get(id)?.state, "blocked");
    assert.equal(store.retryBlockedApplication(id), true);
    await store.dispatchOne(config, async () => response(202), () => 2000);
    assert.equal(store.get(id)?.state, "delivered"); assert.equal(store.get(id)?.body, original);
  } finally { store.close(); h.cleanup(); }
});

test("spam and canary capacity cannot exhaust application capacity; purchase/failure snapshots cannot dispatch", () => {
  const h = local(); const store = new LocalIntakeOutbox(h.path);
  try {
    for (const lane of ["spam", "canary"] as const) {
      for (let i = 0; i < 100; i++) store.retainObservation(`${lane}:fixture:${i}`, lane);
      assert.throws(() => store.retainObservation(`${lane}:overflow`, lane), /capacity/);
    }
    const purchaseId = store.retainApple({ environment: "Production", originalTransactionId: "123", transactionId: "456", bundleId: "org.guitarhub.app", productId: "org.guitarhub.app.complete.lifetime", appAccountToken: "sensitive-token", purchasedAt: at, signedAt: at, revokedAt: null });
    store.retainFailure("failure:fixture", "application-notification-failed", at);
    assert.equal(store.get(purchaseId)?.reason, "purchase-lifecycle-contract");
    assert.equal(store.get("failure:fixture")?.reason, "failure-alert-contract");
    assert.equal(store.claim(1000), undefined);
    const id = store.enqueueApplication(input, receipt, at);
    assert.equal(store.claim(1000)?.id, id);
  } finally { store.close(); h.cleanup(); }
});

test("transient failure retains immutable bytes and respects future retry time", () => {
  const h = local(); const store = new LocalIntakeOutbox(h.path);
  try {
    const id = store.enqueueApplication(input, receipt, at);
    const job = store.claim(1000)!;
    assert.equal(store.finish(job, { state: "retry", reason: "http-429", retryAfterMs: 120000 }, 1001, 0), true);
    assert.equal(store.claim(121000), undefined);
    assert.equal(store.claim(121001)?.body, job.body);
    assert.equal(store.get(id)?.attempts, 2);
  } finally { store.close(); h.cleanup(); }
});

test("purchase and notification ingress use immutable canonical acceptance payload across refunds", () => {
  const purchase = { environment: "Production" as const, originalTransactionId: "123", transactionId: "456", bundleId: "org.guitarhub.app" as const, productId: "org.guitarhub.app.complete.lifetime" as const, appAccountToken: "sensitive-token", purchasedAt: at, signedAt: at, revokedAt: null };
  assert.deepEqual(purchaseEvent(purchase), purchaseEvent({ ...purchase, transactionId: "789", signedAt: "2026-10-26T12:00:00Z", revokedAt: "2026-10-26T00:00:00Z" }));
  assert.equal(isDraftHubEvent(purchaseEvent(purchase)), true);
  assert.doesNotMatch(JSON.stringify(purchaseEvent(purchase)), /sensitive-token|revoked|active|"123"|"456"/);
  assert.equal(purchaseEvent({ ...purchase, environment: "Sandbox" }).canary, true);
});

test("sandbox purchase observations use separate capacity and genuine purchase acceptance persists exactly once", () => {
  const h = local(); const store = new LocalIntakeOutbox(h.path);
  const purchase = { environment: "Production" as const, originalTransactionId: "123", transactionId: "456", bundleId: "org.guitarhub.app" as const, productId: "org.guitarhub.app.complete.lifetime" as const, appAccountToken: "sensitive-token", purchasedAt: at, signedAt: at, revokedAt: null };
  try {
    const id = store.enqueueAcceptedPurchase(purchase);
    assert.equal(store.enqueueAcceptedPurchase({ ...purchase, signedAt: "2026-10-26T12:00:00Z" }), id);
    const sandbox = store.enqueueAcceptedPurchase({ ...purchase, environment: "Sandbox" });
    assert.equal(store.get(sandbox)?.lane, "canary");
    assert.equal(store.get(id)?.lane, "purchase");
    const a = store.claim(1000)!; const b = store.claim(1000)!;
    assert.deepEqual(new Set([a.id, b.id]), new Set([id, sandbox]));
    assert.equal(store.claim(1000), undefined);
  } finally { store.close(); h.cleanup(); }
});

test("strict Gregorian dates reject rollover and invalid time/offset before durable capture or send", async () => {
  for (const occurredAt of ["2026-02-30T00:00:00Z", "2026-09-01T24:00:00Z", "2026-09-01T12:00:00+00:99", "2026-09-31T00:00:00Z"]) {
    assert.throws(() => applicationEvent(input, receipt, occurredAt), /invalid_intake_application/);
    assert.equal((await sendIntakeEvent({ ...event(), occurredAt }, config, async () => { throw new Error("must not send"); })).state, "blocked");
  }
  const tampered = { ...event(), details: { ...event().details, password: "synthetic-private" } };
  assert.deepEqual(await sendIntakeEvent(tampered, config, async () => { throw new Error("must not send"); }), { state: "blocked", reason: "payload" });
});
