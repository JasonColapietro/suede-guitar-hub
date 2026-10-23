import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { forwardToIntake, intakeSummary, type IntakeEvent } from "../lib/intake-forward.ts";

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
