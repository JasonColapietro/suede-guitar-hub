import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { forwardToIntake, intakeBody, intakeSummary, INTAKE_MAX_BODY_BYTES, prepareIntakeEvent, type IntakeEvent } from "../lib/intake-forward.ts";

const SECRET = "s".repeat(48);
const ENV = { SUEDE_INTAKE_SOURCE: "guitarhub", SUEDE_INTAKE_SECRET: SECRET };
const EVENT: IntakeEvent = {
  id: "application:6f1c2c3e-9a8b-4c1d-8e2f-0a1b2c3d4e5f",
  kind: "application",
  property: "guitarhub.org",
  occurredAt: "2026-10-23T09:14:00.000Z",
  summary: "GuitarHub founding room application: Ana Diaz",
  person: { email: "ana@example.com", name: "Ana Diaz" },
  details: { experience: null, goal: "Play one complete song cleanly" },
};

type Call = { url: string; init: RequestInit };

/** A fetch double that answers from a script, one entry per attempt. */
function scripted(...steps: Array<Response | Error>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step.clone();
  }) as typeof fetch;
  return { calls, fetcher };
}

function recordSleeps() {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => { delays.push(ms); } };
}

const accepted = (duplicate: boolean) => new Response(JSON.stringify({ accepted: true, duplicate }), { status: 202 });
const status = (code: number) => new Response(JSON.stringify({ error: "x" }), { status: code });

function header(call: Call, name: string): string | null {
  return new Headers(call.init.headers).get(name);
}

test("signs the raw body with HMAC-SHA256 over `${timestamp}.${body}` and names the source", async () => {
  const { calls, fetcher } = scripted(accepted(false));
  const before = Math.floor(Date.now() / 1000);
  const result = await forwardToIntake(EVENT, ENV, fetcher, recordSleeps().sleep);
  assert.deepEqual(result, { ok: true, duplicate: false });
  assert.equal(calls.length, 1);

  const [call] = calls;
  assert.equal(call.url, "https://agents.suedeai.ai/api/intake/events");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.body, JSON.stringify(EVENT));
  assert.equal(header(call, "content-type"), "application/json");
  assert.equal(header(call, "x-suede-intake-source"), "guitarhub");

  const timestamp = header(call, "x-suede-intake-timestamp") ?? "";
  assert.match(timestamp, /^\d+$/);
  assert.ok(Math.abs(Number(timestamp) - before) <= 5, "timestamp is current Unix seconds");
  const expected = `v1=${createHmac("sha256", SECRET).update(`${timestamp}.${String(call.init.body)}`, "utf8").digest("hex")}`;
  assert.equal(header(call, "x-suede-intake-signature"), expected);
  assert.ok(call.init.signal instanceof AbortSignal, "each attempt carries a timeout");
});

test("SUEDE_INTAKE_URL overrides the endpoint and the source id is trimmed", async () => {
  const { calls, fetcher } = scripted(accepted(false));
  await forwardToIntake(EVENT, { ...ENV, SUEDE_INTAKE_SOURCE: " guitarhub ", SUEDE_INTAKE_URL: " https://hub.example/api/intake/events " }, fetcher);
  assert.equal(calls[0].url, "https://hub.example/api/intake/events");
  assert.equal(header(calls[0], "x-suede-intake-source"), "guitarhub");
});

test("202 reports stored and duplicate events, and stops", async () => {
  for (const duplicate of [false, true]) {
    const { calls, fetcher } = scripted(accepted(duplicate));
    assert.deepEqual(await forwardToIntake(EVENT, ENV, fetcher), { ok: true, duplicate });
    assert.equal(calls.length, 1);
  }
  const { fetcher } = scripted(new Response("not json", { status: 202 }));
  assert.deepEqual(await forwardToIntake(EVENT, ENV, fetcher), { ok: true, duplicate: false });
});

test("retries 5xx and 429 with 400 ms then 1,200 ms backoff, re-signing the same body", async () => {
  const { calls, fetcher } = scripted(status(503), status(429), accepted(false));
  const { delays, sleep } = recordSleeps();
  assert.deepEqual(await forwardToIntake(EVENT, ENV, fetcher, sleep), { ok: true, duplicate: false });
  assert.equal(calls.length, 3);
  assert.deepEqual(delays, [400, 1_200]);
  for (const call of calls) {
    assert.equal(call.init.body, JSON.stringify(EVENT), "the event id and body never change between attempts");
    const timestamp = header(call, "x-suede-intake-timestamp");
    assert.equal(header(call, "x-suede-intake-signature"), `v1=${createHmac("sha256", SECRET).update(`${timestamp}.${String(call.init.body)}`).digest("hex")}`);
  }
});

test("retries network errors and timeouts, then reports unreachable after three attempts", async () => {
  const { calls, fetcher } = scripted(new TypeError("fetch failed"), new DOMException("timed out", "TimeoutError"), status(500));
  const { delays, sleep } = recordSleeps();
  assert.deepEqual(await forwardToIntake(EVENT, ENV, fetcher, sleep), { ok: false, reason: "unreachable" });
  assert.equal(calls.length, 3);
  assert.deepEqual(delays, [400, 1_200]);
});

test("400, 401 and 413 are rejections and are never retried", async () => {
  for (const code of [400, 401, 413]) {
    const { calls, fetcher } = scripted(status(code), accepted(false));
    const { delays, sleep } = recordSleeps();
    assert.deepEqual(await forwardToIntake(EVENT, ENV, fetcher, sleep), { ok: false, reason: "rejected" });
    assert.equal(calls.length, 1, `${code} is not retried`);
    assert.deepEqual(delays, []);
  }
});

test("missing source, missing secret or a secret under 32 bytes sends nothing", async () => {
  for (const env of [
    {},
    { SUEDE_INTAKE_SECRET: SECRET },
    { SUEDE_INTAKE_SOURCE: "  ", SUEDE_INTAKE_SECRET: SECRET },
    { SUEDE_INTAKE_SOURCE: "guitarhub" },
    { SUEDE_INTAKE_SOURCE: "guitarhub", SUEDE_INTAKE_SECRET: "x".repeat(31) },
  ]) {
    const { calls, fetcher } = scripted(accepted(false));
    assert.deepEqual(await forwardToIntake(EVENT, env, fetcher), { ok: false, reason: "not-configured" });
    assert.equal(calls.length, 0);
  }
});

test("summaries are one line and at most 200 characters", () => {
  assert.equal(intakeSummary("  GuitarHub\n application:\tAna  "), "GuitarHub application: Ana");
  assert.equal(intakeSummary("x".repeat(500)).length, 200);
});

/** The body the sender actually posted, parsed. */
async function postedEvent(event: IntakeEvent): Promise<{ raw: string; event: IntakeEvent }> {
  const { calls, fetcher } = scripted(accepted(false));
  assert.deepEqual(await forwardToIntake(event, ENV, fetcher), { ok: true, duplicate: false });
  const raw = String(calls[0].init.body);
  const timestamp = header(calls[0], "x-suede-intake-timestamp");
  assert.equal(header(calls[0], "x-suede-intake-signature"), `v1=${createHmac("sha256", SECRET).update(`${timestamp}.${raw}`).digest("hex")}`, "the shaped body is the signed body");
  return { raw, event: JSON.parse(raw) as IntakeEvent };
}

test("a name the site accepts (up to 200 characters) is cut to the hub's 120 and kept on one line", async () => {
  const { event } = await postedEvent({ ...EVENT, person: { email: "ana@example.com", name: `Ana\n  ${"D".repeat(196)}` } });
  assert.equal(event.person?.name?.length, 120);
  assert.ok(event.person?.name?.startsWith("Ana D"));
  assert.ok(event.person?.name?.endsWith("…"));
  assert.equal(prepareIntakeEvent({ ...EVENT, person: { name: "Ana Diaz" } }).person?.name, "Ana Diaz");
  // A surrogate pair at the cut is never split.
  const emoji = prepareIntakeEvent({ ...EVENT, person: { name: `${"x".repeat(118)}🎸🎸` } }).person?.name ?? "";
  assert.ok(emoji.length <= 120);
  assert.doesNotMatch(emoji, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});

test("an email the hub's validator refuses moves to details.submitted_email instead of failing the event", async () => {
  for (const email of ["a@b.c", "ana@localhost", ".ana@example.com", "ana..diaz@example.com", "ana.@example.com"]) {
    const { event } = await postedEvent({ ...EVENT, person: { email, name: "Ana Diaz" } });
    assert.deepEqual(event.person, { name: "Ana Diaz" }, email);
    assert.equal(event.details?.submitted_email, email);
    assert.deepEqual(Object.keys(event.details ?? {}), ["submitted_email", "experience", "goal"], "the rescued address comes first");
  }
  for (const email of ["ana@example.com", "o'brien+gh@mail.example.co.uk", "A_B-c@Example.ORG"]) {
    const { event } = await postedEvent({ ...EVENT, person: { email, name: "Ana Diaz" } });
    assert.equal(event.person?.email, email);
    assert.equal(event.details?.submitted_email, undefined);
  }
  const noPerson = prepareIntakeEvent({ ...EVENT, person: { email: "a@b.c" } });
  assert.equal(noPerson.person, undefined, "an empty person is left out");
  assert.equal(JSON.stringify(noPerson).includes('"person"'), false);
});

test("detail strings are cut to 2,000 characters and the body never exceeds 32,768 bytes", async () => {
  assert.equal(prepareIntakeEvent({ ...EVENT, details: { goal: "g".repeat(2_500) } }).details?.goal?.toString().length, 2_000);

  // Multibyte text: 40 fields of 2,000 three-byte characters is about 240 KB.
  const heavy: IntakeEvent = { ...EVENT, details: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`field${i}`, "界".repeat(2_000)])) };
  const { raw, event } = await postedEvent(heavy);
  assert.ok(Buffer.byteLength(raw, "utf8") <= INTAKE_MAX_BODY_BYTES, `${Buffer.byteLength(raw, "utf8")} bytes`);
  assert.equal(Object.keys(event.details ?? {}).length, 40, "every field survives, shortened");
  assert.deepEqual(event.person, EVENT.person);
  assert.equal(event.id, EVENT.id);

  // An ordinary application is sent unchanged.
  assert.equal(intakeBody(EVENT), JSON.stringify(EVENT));

  // When shortening details is not enough, details and then attribution go; the person still arrives.
  const oversized: IntakeEvent = { ...EVENT, attribution: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`a${i}`, "x".repeat(300)])) };
  const fitted = JSON.parse(intakeBody(oversized)) as IntakeEvent;
  assert.ok(Buffer.byteLength(intakeBody(oversized), "utf8") <= INTAKE_MAX_BODY_BYTES);
  assert.equal(fitted.details, undefined);
  assert.equal(fitted.attribution, undefined);
  assert.deepEqual(fitted.person, EVENT.person);
});
