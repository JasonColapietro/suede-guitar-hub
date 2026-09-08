import test from "node:test";
import assert from "node:assert/strict";
import { createLearningHandlers, type LearningHandlerDependencies } from "../lib/learning-auth/handlers.ts";
import { createEmailAuthHandlers, type EmailAuthClient } from "../lib/learning-auth/email-handlers.ts";
import { boundedAccountBody } from "../lib/learning-auth/http.ts";
import { parseAccountBearer, verifiedProviderUser } from "../lib/learning-auth/identity.ts";
import { LearningAccountError, parseLearningAttempt, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type VerifiedLifetimePurchase } from "../lib/learning-account/contracts.ts";

const id = "a1111111-1111-4111-8111-111111111111", epoch = "b2222222-2222-4222-8222-222222222222", other = "c3333333-3333-4333-8333-333333333333";
const purchase: VerifiedLifetimePurchase = { environment: "Production", originalTransactionId: "123", transactionId: "123", bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken: id, purchasedAt: "2026-09-01T00:00:00Z", signedAt: "2026-09-02T00:00:00Z", revokedAt: null };
const attempt = { version: 1, id: other, lessonId: "g-l1-m1-02", track: "guitar", kind: "study", createdAt: "2026-09-01T00:00:00Z", practiceSeconds: 60, exerciseRevision: null, source: "selfReported", disposition: "reflection", assessment: "repeat", score: null, bpm: null, details: {} };
const request = (body?: unknown, init: RequestInit = {}, query = "") => new Request(`https://guitarhub.org/api/learning/test${query}`, { method: body === undefined ? "GET" : "POST", headers: { origin: "https://guitarhub.org", "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...init });

function harness(overrides: Partial<LearningHandlerDependencies> = {}) {
  const writes: string[] = [];
  const deps: LearningHandlerDependencies = {
    enabled: () => true, resolveAccount: async () => ({ accountId: id }),
    getBinding: async (_account, create) => { if (create) writes.push("binding"); return { appAccountToken: id, syncEpoch: epoch }; },
    listAttempts: async () => [], listPurchases: async () => [{ transactionId: "123", originalTransactionId: "123", appAccountToken: id }],
    findPurchaseOwner: async () => ({ accountId: id, appAccountToken: id }),
    appendAttempts: async (account, scope, attempts) => { assert.equal(account,id); assert.equal(scope,epoch); assert.equal(attempts.length,1); writes.push("attempt"); return [{ attempt_id: other, sequence: "1" }]; },
    clearHistory: async (account, scope) => { assert.equal(account,id); assert.equal(scope,epoch); writes.push("clear"); return other; },
    recordPurchase: async (_account, value) => { writes.push("purchase"); return value; },
    verifier: async () => ({ verifyPurchase: async () => ({ ...purchase, accountId: id }), reconcileTransaction: async () => purchase, verifyNotification: async () => ({ notificationId: other, purchase }) }),
    environment: () => "Production", allowedLessons: new Map([["g-l1-m1-02", "guitar"]]), ...overrides,
  };
  return { handlers: createLearningHandlers(deps), writes, deps };
}

test("disabled and unauthenticated handlers perform no writes or Apple lookups", async () => {
  for (const overrides of [{ enabled: () => false }, { resolveAccount: async () => null }]) {
    const h = harness({ ...overrides, verifier: async () => { throw new Error("must not reach Apple"); } });
    assert.ok([401,503].includes((await h.handlers.purchase(request({ accountId: id, signedTransaction: "fake" }))).status));
    assert.deepEqual(h.writes, []);
  }
});
test("cookie mutations require origin and a purported native bearer still requires provider verification", async () => {
  const h = harness({ resolveAccount: async () => null });
  assert.equal((await h.handlers.binding(request({}, { headers: {} }))).status, 403);
  assert.equal((await h.handlers.binding(request({}, { headers: { authorization: "Basic fake" } }))).status, 403);
  assert.equal((await h.handlers.binding(request({}, { headers: { authorization: "Bearer fake" } }))).status, 401);
  assert.deepEqual(h.writes, []);
});
test("body account conflicts and malformed batches cannot change another account", async () => {
  const h = harness();
  assert.equal((await h.handlers.appendAttempts(request({ accountId: other, syncEpoch: epoch, attempts: [attempt] }))).status, 409);
  assert.equal((await h.handlers.appendAttempts(request({ accountId: id, syncEpoch: epoch, attempts: [attempt, { ...attempt, score: -1 }] }))).status, 400);
  assert.deepEqual(h.writes, []);
  assert.equal((await h.handlers.appendAttempts(request({ accountId: id, syncEpoch: epoch, attempts: [attempt] }))).status, 200);
  assert.deepEqual(h.writes, ["attempt"]);
});
test("malformed or rejected Apple messages create no binding or purchase writes", async () => {
  const h = harness({ verifier: async () => ({ verifyPurchase: async () => { throw new LearningAccountError("apple_verification_failed"); }, reconcileTransaction: async () => purchase, verifyNotification: async () => { throw new LearningAccountError("apple_verification_failed"); } }) });
  for (const response of [await h.handlers.purchase(request({ accountId: id, signedTransaction: 3 })), await h.handlers.purchase(request({ accountId: id, signedTransaction: "unsigned" })), await h.handlers.notification(request({ signedPayload: "unsigned" })), await h.handlers.notification(request({ unexpected: true }))]) assert.equal(response.status, 400);
  assert.deepEqual(h.writes, []);
});
test("only accepted exact-owner, exact-environment Apple state reaches purchase recording", async () => {
  const good = harness();
  assert.equal((await good.handlers.purchase(request({ accountId: id, signedTransaction: "verified fixture" }))).status, 200);
  assert.deepEqual(good.writes, ["purchase"]);
  for (const changes of [{ accountId: other }, { appAccountToken: other }, { environment: "Sandbox" as const }]) {
    const h = harness({ verifier: async () => ({ verifyPurchase: async () => ({ ...purchase, accountId: id, ...changes }), reconcileTransaction: async () => purchase, verifyNotification: async () => null }) });
    assert.equal((await h.handlers.purchase(request({ accountId: id, signedTransaction: "fixture" }))).status, 409);
    assert.deepEqual(h.writes, []);
  }
});
test("access reconciles refunds and refuses stale access when Apple fails", async () => {
  const refunded = harness({ verifier: async () => ({ verifyPurchase: async () => ({ ...purchase, accountId:id }), reconcileTransaction: async () => ({ ...purchase, revokedAt: purchase.signedAt }), verifyNotification: async () => null }) });
  assert.deepEqual((await (await refunded.handlers.access(request())).json()).tracks, []);
  assert.deepEqual(refunded.writes, ["purchase"]);
  const unavailable = harness({ verifier: async () => { throw new Error("private provider failure"); } });
  const response = await unavailable.handlers.access(request());
  assert.equal(response.status, 503);
  assert.equal(await response.text(), '{"error":"account_service_unavailable"}');
  assert.deepEqual(unavailable.writes, []);
});
test("unclaimed notifications cannot create ownership", async () => {
  const h = harness({ findPurchaseOwner: async () => null });
  assert.equal((await h.handlers.notification(request({ signedPayload: "verified fixture" }))).status,200);
  assert.deepEqual(h.writes, []);
});
test("a newer stored refund overrides an older active Apple response", async () => {
  const h=harness({recordPurchase:async()=>({...purchase,revokedAt:"2026-09-04T00:00:00Z"})});
  assert.deepEqual((await(await h.handlers.access(request())).json()).tracks,[]);
  assert.deepEqual((await(await h.handlers.purchase(request({accountId:id,signedTransaction:"fixture"}))).json()).tracks,[]);
});
test("reads reject old epochs/cursors, detect concurrent reset, and preserve bigint cursors", async () => {
  let lookups = 0;
  const changing = harness({ getBinding: async () => ({ appAccountToken:id, syncEpoch: ++lookups === 1 ? epoch : other }) });
  assert.equal((await changing.handlers.readAttempts(request())).status,409);
  const h = harness({ listAttempts: async () => [{ sequence: "9007199254740993", body: attempt }] });
  assert.equal((await h.handlers.readAttempts(request(undefined,{},"?after=4"))).status,409);
  assert.equal((await h.handlers.readAttempts(request(undefined,{},`?after=4&syncEpoch=${other}`))).status,409);
  const result = await (await h.handlers.readAttempts(request(undefined,{},`?after=4&syncEpoch=${epoch}`))).json();
  assert.equal(result.cursor,"9007199254740993");
  assert.equal(result.nextCursor,null);
});
test("history deletion requires matching account, explicit intent and a sync epoch", async () => {
  const h = harness();
  assert.equal((await h.handlers.clearHistory(request({ accountId:id, syncEpoch:epoch }, { method:"DELETE" }))).status,400);
  assert.deepEqual(h.writes,[]);
  assert.equal((await h.handlers.clearHistory(request({ accountId:id, syncEpoch:epoch, confirmation:"DELETE_GUITARHUB_CLOUD_HISTORY" }, { method:"DELETE" }))).status,200);
  assert.deepEqual(h.writes,["clear"]);
});
test("HTTP parser enforces exact JSON media type, size, encoding and object bodies", async () => {
  for (const input of [new Request("https://guitarhub.org",{method:"POST",headers:{"content-type":"application/jsonp"},body:"{}"}), new Request("https://guitarhub.org",{method:"POST",headers:{"content-type":"application/json"},body:"[]"}), new Request("https://guitarhub.org",{method:"POST",headers:{"content-type":"application/json"},body:new Uint8Array([255])})]) await assert.rejects(()=>boundedAccountBody(input));
  await assert.rejects(()=>boundedAccountBody(request({text:"x".repeat(100)}),20),/body_too_large/);
});
test("provider identity rejects anonymous/invalid sessions and distinguishes provider outage", async () => {
  assert.equal(parseAccountBearer("Bearer actual-token"),"actual-token");
  assert.equal(parseAccountBearer(null),null);
  assert.throws(()=>parseAccountBearer("Basic token"));
  for (const user of [null,{id,is_anonymous:true},{id:"email@example.org"}]) assert.equal(await verifiedProviderUser(async()=>({data:{user},error:null})),null);
  assert.equal((await verifiedProviderUser(async()=>({data:{user:{id}},error:null})))?.id,id);
  assert.equal(await verifiedProviderUser(async()=>({data:{user:null},error:{status:401}})),null);
  await assert.rejects(()=>verifiedProviderUser(async()=>({data:{user:null},error:{status:503}})),/unavailable/);
});

function emailHarness(error: unknown = null, anonymous = false) {
  const calls: unknown[]=[];
  const client: EmailAuthClient = {auth:{
    signInWithOtp:async(options)=>{calls.push(options);return{error};},
    verifyOtp:async(options)=>{calls.push(options);return{error};},
    getUser:async()=>({data:{user:{id,is_anonymous:anonymous}},error:null}),
    signOut:async(options)=>{calls.push(options);return{error:null};},
  }};
  return {calls,handlers:createEmailAuthHandlers({enabled:()=>true,client:async()=>client})};
}
test("email send never creates users, exposes account existence, or accepts foreign origins", async () => {
  for (const error of [null,{message:"User not found"},{message:"Email rate limit"}]) {
    const h=emailHarness(error);
    const response=await h.handlers.send(request({email:"Existing@Example.org"}));
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{accepted:true});
    assert.deepEqual(h.calls,[{email:"existing@example.org",options:{shouldCreateUser:false}}]);
  }
  const h=emailHarness();
  assert.equal((await h.handlers.send(request({email:"existing@example.org"},{headers:{origin:"https://evil.example",authorization:"Bearer fake"}}))).status,403);
  assert.deepEqual(h.calls,[]);
});
test("email verification requires provider acceptance and a fresh non-anonymous user", async () => {
  assert.equal((await emailHarness().handlers.verify(request({email:"existing@example.org",code:"123456"}))).status,200);
  for (const h of [emailHarness({message:"secret provider detail"}),emailHarness(null,true)]) {
    const response=await h.handlers.verify(request({email:"existing@example.org",code:"123456"}));
    assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:"sign_in_failed"});
    assert.deepEqual(h.calls.at(-1),{scope:"local"});
  }
});

test("UTF-8 sized history pages preserve every record and advance only across returned rows", async () => {
  const details = Object.fromEntries(Array.from({length: 16}, (_, i) => [`part${i}`, "界".repeat(1_000)]));
  const rows = Array.from({length: 100}, (_, i) => ({sequence: String(i + 1), body: {
    ...attempt, id: `${String(i + 1).padStart(8, "0")}-3333-4333-8333-333333333333`, details,
  }}));
  for (const row of rows) parseLearningAttempt(row.body, new Map([["g-l1-m1-02", "guitar"]]));
  const h = harness({listAttempts: async (_, cursor) => rows.filter(row => BigInt(row.sequence) > BigInt(cursor)).slice(0, 101)});
  const received: string[] = [];
  let cursor = "0";
  let pages = 0;
  for (;;) {
    const response = await h.handlers.readAttempts(request(undefined, {}, `?after=${cursor}&syncEpoch=${epoch}`));
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(new TextEncoder().encode(text).byteLength <= 2_000_000);
    const page = JSON.parse(text);
    assert.ok(page.attempts.length > 0 && page.attempts.length <= 100);
    received.push(...page.attempts.map((item: {id: string}) => item.id));
    assert.equal(page.cursor, String(received.length));
    pages++;
    if (page.nextCursor === null) break;
    assert.equal(page.nextCursor, page.cursor);
    assert.ok(BigInt(page.cursor) > BigInt(cursor));
    cursor = page.nextCursor;
    assert.ok(pages < 10);
  }
  assert.ok(pages > 1);
  assert.deepEqual(received, rows.map(row => row.body.id));
});
