import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { POST } from "../app/api/apply/route.ts";

/**
 * The founding-room route answers success when EITHER the Resend email or the
 * lead intake forward landed, and offers the mailto fallback only when both
 * failed. These run the production route with a scripted fetch, so no email
 * is sent and no hub is called.
 */

const RESEND = "https://api.resend.com/emails";
const HUB = "https://agents.suedeai.ai/api/intake/events";
const ENV_KEYS = ["RESEND_API_KEY", "SUEDE_INTAKE_SOURCE", "SUEDE_INTAKE_SECRET", "SUEDE_INTAKE_URL"] as const;
const RESEND_ON = { RESEND_API_KEY: "re_test" };
const HUB_ON = { SUEDE_INTAKE_SOURCE: "guitarhub", SUEDE_INTAKE_SECRET: "s".repeat(48) };
const APPLICATION = { name: "Ana Diaz", email: "Ana@Example.com", experience: "Two years", goal: "Play one complete song cleanly" };
const FALLBACK = { kind: "email", address: "info@suedeai.ai" };

type Answer = Response | Error;
type Sent = { email: Record<string, unknown>[]; hub: Record<string, unknown>[] };

const realFetch = globalThis.fetch;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

/** Configures the route's providers and answers each one from its own script. */
function providers(env: Record<string, string>, email: Answer, hub: Answer): Sent {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  const sent: Sent = { email: [], hub: [] };
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url) === RESEND ? "email" : String(url) === HUB ? "hub" : null;
    assert.ok(target, `unexpected request to ${String(url)}`);
    sent[target].push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    const answer = target === "email" ? email : hub;
    if (answer instanceof Error) throw answer;
    return answer.clone();
  }) as typeof fetch;
  return sent;
}

const sentOk = () => new Response("{}", { status: 200 });
const accepted = () => new Response(JSON.stringify({ accepted: true, duplicate: false }), { status: 202 });
const status = (code: number) => new Response("provider error", { status: code });
const networkDown = () => new TypeError("fetch failed");

function apply(body: unknown = APPLICATION): Request {
  return new Request("https://guitarhub.org/api/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function answer(response: Response) {
  return { status: response.status, body: await response.json() };
}

test("success when both the email and the hub delivered, with the application forwarded as the form collected it", async () => {
  const sent = providers({ ...RESEND_ON, ...HUB_ON }, sentOk(), accepted());
  assert.deepEqual(await answer(await POST(apply())), { status: 200, body: { ok: true } });

  assert.equal(sent.email.length, 1);
  assert.equal(sent.hub.length, 1);
  const [event] = sent.hub;
  assert.match(String(event.id), /^application:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(event.kind, "application");
  assert.equal(event.property, "guitarhub.org");
  assert.deepEqual(event.person, { email: "ana@example.com", name: "Ana Diaz" });
  assert.deepEqual(event.details, { experience: "Two years", goal: "Play one complete song cleanly" });
  assert.match(String(sent.email[0].text), new RegExp(`Reference: ${String(event.id)}$`), "the email and the hub event share a reference");
});

test("success when only the email delivered: hub rejected or unconfigured", async () => {
  for (const [env, hub] of [
    [{ ...RESEND_ON, ...HUB_ON }, status(400)],
    [{ ...RESEND_ON, ...HUB_ON }, status(401)],
    [RESEND_ON, accepted()],
  ] as const) {
    const sent = providers(env, sentOk(), hub);
    assert.deepEqual(await answer(await POST(apply())), { status: 200, body: { ok: true } });
    assert.equal(sent.email.length, 1);
  }
});

test("success when only the hub delivered: Resend failing, unreachable or unconfigured", async () => {
  for (const [env, email] of [
    [{ ...RESEND_ON, ...HUB_ON }, status(500)],
    [{ ...RESEND_ON, ...HUB_ON }, networkDown()],
    [HUB_ON, sentOk()],
  ] as const) {
    const sent = providers(env, email, accepted());
    assert.deepEqual(await answer(await POST(apply())), { status: 200, body: { ok: true } });
    assert.equal(sent.hub.length, 1);
    assert.equal(sent.hub[0].kind, "application");
  }
});

test("both paths failed: 502 with the mailto fallback", async () => {
  for (const [email, hub] of [
    [status(500), status(401)],
    [networkDown(), status(400)],
  ] as const) {
    providers({ ...RESEND_ON, ...HUB_ON }, email, hub);
    const result = await answer(await POST(apply()));
    assert.equal(result.status, 502);
    assert.equal(result.body.ok, false);
    assert.deepEqual(result.body.fallback, FALLBACK);
  }
  providers(RESEND_ON, status(503), accepted());
  assert.equal((await POST(apply())).status, 502, "Resend down and the hub unconfigured");
});

test("Resend unconfigured and the hub failed or unconfigured: 503 with the mailto fallback", async () => {
  for (const [env, hub] of [
    [{}, accepted()],
    [HUB_ON, status(401)],
  ] as const) {
    const sent = providers(env, sentOk(), hub);
    const result = await answer(await POST(apply()));
    assert.equal(result.status, 503);
    assert.equal(result.body.ok, false);
    assert.deepEqual(result.body.fallback, FALLBACK);
    assert.equal(sent.email.length, 0);
  }
});

test("an invalid body or application is refused before either path runs", async () => {
  for (const body of ["{not json", { ...APPLICATION, email: "not-an-email" }, { ...APPLICATION, goal: " " }]) {
    const sent = providers({ ...RESEND_ON, ...HUB_ON }, sentOk(), accepted());
    const result = await answer(await POST(apply(body)));
    assert.equal(result.status, 400);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.fallback, undefined);
    assert.deepEqual(sent, { email: [], hub: [] });
  }
});
