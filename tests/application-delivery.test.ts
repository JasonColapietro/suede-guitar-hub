import assert from "node:assert/strict";
import test from "node:test";

import { applicationIntakeEvent, deliverApplication } from "../lib/application-delivery.ts";
import type { CohortApplication } from "../lib/application.ts";

const APPLICATION: CohortApplication = {
  name: "Ana Diaz",
  email: "ana@example.com",
  experience: "Two years, mostly self-taught",
  goal: "Play one complete song cleanly",
};
const RESEND = "https://api.resend.com/emails";
const HUB = "https://agents.suedeai.ai/api/intake/events";
const CONFIGURED = { RESEND_API_KEY: "re_test", SUEDE_INTAKE_SOURCE: "guitarhub", SUEDE_INTAKE_SECRET: "s".repeat(48) };
const noSleep = async () => {};
const NOW = () => new Date("2026-10-23T09:14:00.000Z");

type Answer = Response | Error;

/** Routes each request by URL to its own scripted answers and records the bodies. */
function providers(email: Answer[], hub: Answer[]) {
  const sent = { email: [] as Record<string, unknown>[], hub: [] as Record<string, unknown>[] };
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url) === RESEND ? "email" : String(url) === HUB ? "hub" : null;
    assert.ok(target, `unexpected request to ${String(url)}`);
    sent[target].push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    const script = target === "email" ? email : hub;
    const answer = script[Math.min(sent[target].length - 1, script.length - 1)];
    if (answer instanceof Error) throw answer;
    return answer.clone();
  }) as typeof fetch;
  return { sent, fetcher };
}

const ok = () => new Response("{}", { status: 200 });
const accepted = () => new Response(JSON.stringify({ accepted: true, duplicate: false }), { status: 202 });
const fail = (code: number) => new Response("provider error", { status: code });

test("the intake event carries only what the form collects", () => {
  const event = applicationIntakeEvent(APPLICATION, "application:6f1c2c3e-9a8b-4c1d-8e2f-0a1b2c3d4e5f", "2026-10-23T09:14:00.000Z");
  assert.deepEqual(event, {
    id: "application:6f1c2c3e-9a8b-4c1d-8e2f-0a1b2c3d4e5f",
    kind: "application",
    property: "guitarhub.org",
    occurredAt: "2026-10-23T09:14:00.000Z",
    summary: "GuitarHub founding room application: Ana Diaz",
    person: { email: "ana@example.com", name: "Ana Diaz" },
    details: { experience: "Two years, mostly self-taught", goal: "Play one complete song cleanly" },
  });
  const sparse = applicationIntakeEvent({ ...APPLICATION, name: "N".repeat(200), experience: "" }, "application:x1234567", "2026-10-23T09:14:00.000Z");
  assert.equal(sparse.details?.experience, null);
  assert.ok(sparse.summary.length <= 200);
});

test("sends the email and forwards to the hub with one stable event id per submission", async () => {
  const { sent, fetcher } = providers([ok()], [fail(503), accepted()]);
  const result = await deliverApplication(APPLICATION, { env: CONFIGURED, fetcher, sleep: noSleep, now: NOW });
  assert.equal(result.delivered, true);
  assert.deepEqual(result.email, { ok: true });
  assert.deepEqual(result.intake, { ok: true, duplicate: false });
  assert.match(result.eventId, /^application:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  assert.equal(sent.hub.length, 2, "the hub retry resends the same event");
  for (const body of sent.hub) {
    assert.equal(body.id, result.eventId);
    assert.equal(body.kind, "application");
    assert.equal(body.occurredAt, "2026-10-23T09:14:00.000Z");
  }
  assert.equal(sent.email.length, 1);
  assert.equal(sent.email[0].reply_to, "ana@example.com");
  assert.match(String(sent.email[0].text), new RegExp(`Reference: ${result.eventId}$`));

  const second = await deliverApplication(APPLICATION, { env: CONFIGURED, fetcher: providers([ok()], [accepted()]).fetcher, sleep: noSleep });
  assert.notEqual(second.eventId, result.eventId, "a new submission is a new event");
});

test("starts both paths before waiting on either", async () => {
  const started: string[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetcher = (async (url: string | URL | Request) => {
    started.push(String(url));
    await gate;
    return String(url) === HUB ? accepted() : ok();
  }) as typeof fetch;
  const pending = deliverApplication(APPLICATION, { env: CONFIGURED, fetcher, sleep: noSleep });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(new Set(started), new Set([RESEND, HUB]));
  release();
  assert.equal((await pending).delivered, true);
});

test("a hub failure never fails an application the email delivered", async () => {
  for (const hub of [[fail(400)], [fail(401)], [new TypeError("fetch failed")]]) {
    const { fetcher } = providers([ok()], hub);
    const result = await deliverApplication(APPLICATION, { env: CONFIGURED, fetcher, sleep: noSleep });
    assert.equal(result.delivered, true);
    assert.equal(result.intake.ok, false);
  }
  const { sent, fetcher } = providers([ok()], [accepted()]);
  const unconfigured = await deliverApplication(APPLICATION, { env: { RESEND_API_KEY: "re_test" }, fetcher, sleep: noSleep });
  assert.equal(unconfigured.delivered, true);
  assert.deepEqual(unconfigured.intake, { ok: false, reason: "not-configured" });
  assert.equal(sent.hub.length, 0);
});

test("the hub delivers the application when Resend is down or unconfigured", async () => {
  for (const email of [[fail(500)], [new TypeError("fetch failed")]]) {
    const { fetcher } = providers(email, [accepted()]);
    const result = await deliverApplication(APPLICATION, { env: CONFIGURED, fetcher, sleep: noSleep });
    assert.equal(result.delivered, true);
    assert.deepEqual(result.email, { ok: false, reason: "failed" });
  }
  const { sent, fetcher } = providers([ok()], [accepted()]);
  const withoutResend = { SUEDE_INTAKE_SOURCE: CONFIGURED.SUEDE_INTAKE_SOURCE, SUEDE_INTAKE_SECRET: CONFIGURED.SUEDE_INTAKE_SECRET };
  const result = await deliverApplication(APPLICATION, { env: withoutResend, fetcher, sleep: noSleep });
  assert.equal(result.delivered, true);
  assert.deepEqual(result.email, { ok: false, reason: "not-configured" });
  assert.equal(sent.email.length, 0);
  assert.equal(sent.hub.length, 1);
});

test("only a failure on both paths is undelivered, and it says why the email path failed", async () => {
  const failed = await deliverApplication(APPLICATION, { env: CONFIGURED, fetcher: providers([fail(502)], [fail(500)]).fetcher, sleep: noSleep });
  assert.equal(failed.delivered, false);
  assert.deepEqual(failed.email, { ok: false, reason: "failed" });
  assert.deepEqual(failed.intake, { ok: false, reason: "unreachable" });

  const offline = await deliverApplication(APPLICATION, { env: {}, fetcher: providers([ok()], [accepted()]).fetcher, sleep: noSleep });
  assert.equal(offline.delivered, false);
  assert.deepEqual(offline.email, { ok: false, reason: "not-configured" });
  assert.deepEqual(offline.intake, { ok: false, reason: "not-configured" });
});
