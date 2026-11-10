import test from "node:test";
import assert from "node:assert/strict";
import { parseLead, type Lead, type StoredLead } from "../lib/leads/contract.ts";
import { PermanentSendError, createLeadHandlers, sendFailureForStatus, type EmailMessage } from "../lib/leads/handlers.ts";
import { SEQUENCE_DAYS, dueEmailIndex, sequenceEmail } from "../lib/leads/sequence.ts";
import { unsubscribeToken, verifyUnsubscribeToken } from "../lib/leads/token.ts";
import { FIELD_GUIDES, fieldGuidePdf } from "../lib/field-guides.ts";
import { LIFETIME_LAUNCH_ENDS, OFFER } from "../lib/site.ts";

// No Resend key or Supabase credentials exist here: storage and sending are doubles.
const LAUNCH = new Date("2026-11-10T15:00:00Z");

function leads({ failSend = 0, now = LAUNCH, rejected = [] }: { failSend?: number; now?: Date; rejected?: string[] } = {}) {
  const stored = new Map<string, StoredLead>();
  const sent: { to: string; message: EmailMessage; unsubscribeUrl: string }[] = [];
  let failures = failSend;
  let clock = now;
  const handlers = createLeadHandlers({
    async storeLead(lead: Lead) {
      if (stored.has(lead.email)) return "existing";
      stored.set(lead.email, { ...lead, createdAt: clock.toISOString(), emailsSent: 0, unsubscribedAt: null });
      return "created";
    },
    async dueLeads(at, limit) { return [...stored.values()].filter((lead) => dueEmailIndex(lead, at) !== null).slice(0, limit); },
    async markSent(email, index) {
      const lead = stored.get(email);
      if (lead && lead.emailsSent === index && lead.unsubscribedAt === null) lead.emailsSent = index + 1;
    },
    async unsubscribe(email) { const lead = stored.get(email); if (lead) lead.unsubscribedAt ??= clock.toISOString(); },
    async send(to, message, unsubscribeUrl) {
      if (rejected.includes(to)) throw new PermanentSendError("resend_422");
      if (failures > 0) { failures -= 1; throw new Error("resend_unavailable"); }
      sent.push({ to, message, unsubscribeUrl });
    },
    secret: () => "secret",
    cronSecret: () => "cron",
    now: () => clock,
  });
  return { ...handlers, stored, sent, setNow(next: Date) { clock = next; } };
}

function post(body: unknown, { origin = "https://guitarhub.org" as string | null } = {}) {
  return new Request("https://guitarhub.org/api/leads", {
    method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
  });
}
const get = (query: string) => new Request(`https://guitarhub.org/api/leads/unsubscribe${query}`);
const cron = () => new Request("https://guitarhub.org/api/leads/dispatch", { headers: { Authorization: "Bearer cron" } });

// The send path logs failures on purpose; keep the test output clean.
const quietly = async <T>(run: () => Promise<T>): Promise<T> => {
  const original = console.error;
  console.error = () => {};
  try { return await run(); } finally { console.error = original; }
};

test("a new lead is stored, gets email 1 once, and answers 204", async () => {
  const h = leads();
  assert.equal((await h.submit(post({ email: " New@Example.com ", source: "plan", placement: "beginner" }))).status, 204);
  assert.equal((await h.submit(post({ email: "new@example.com", source: "plan" }))).status, 204);
  assert.deepEqual(h.sent.map(m => m.to), ["new@example.com"]);          // the repeat sends nothing
  assert.equal(h.stored.get("new@example.com")!.emailsSent, 1);
  assert.equal(h.sent[0].unsubscribeUrl, `https://guitarhub.org/api/leads/unsubscribe?token=${unsubscribeToken("new@example.com", "secret")}`);
});

test("bad input is refused and a cross-site browser post is blocked", async () => {
  const h = leads();
  for (const body of [{ email: "x", source: "plan" }, { email: "a@b.co", source: "other" }, { email: "a@b.co", source: "guide" }, { email: "a@b.co", source: "guide", guideId: "nope" }, { email: "a@b.co", source: "plan", placement: "expert" }])
    assert.equal((await h.submit(post(body))).status, 400);
  assert.equal((await h.submit(post({ email: "a@b.co", source: "plan" }, { origin: "https://evil.example" }))).status, 403);
});

test("a post with no Origin is refused and stores and sends nothing", async () => {
  const h = leads();
  assert.equal((await h.submit(post({ email: "a@b.co", source: "plan" }, { origin: null }))).status, 403);
  assert.equal(h.stored.size, 0);
  assert.equal(h.sent.length, 0);
});

test("a filled honeypot answers 204 like a success but stores and sends nothing", async () => {
  const h = leads();
  const res = await h.submit(post({ email: "bot@example.com", source: "plan", company: "Acme" }));
  assert.equal(res.status, 204);
  assert.equal(h.stored.size, 0);
  assert.equal(h.sent.length, 0);
  assert.equal((await h.submit(post({ email: "real@example.com", source: "plan", company: "" }))).status, 204);   // empty is a person
  assert.deepEqual(h.sent.map((m) => m.to), ["real@example.com"]);
});

test("addresses the email provider would reject are refused up front", async () => {
  const h = leads();
  for (const email of ["a@b..com", "x<y@z.co", "a,b@c.co", "a..b@c.co", ".a@c.co", "a.@c.co", "a@b", "a@-b.co", "a@b.c", "a@b.c0m", `${"a".repeat(65)}@b.co`, `a@${"b".repeat(250)}.co`, "a b@c.co", "a@b@c.co"])
    assert.equal((await h.submit(post({ email, source: "plan" }))).status, 400, email);
  assert.equal(h.stored.size, 0);
  for (const email of ["first.last+tag@sub.example.co.uk", "a_b-c@xn--bcher-kva.example"])
    assert.equal(parseLead({ email, source: "plan" }).email, email.toLowerCase());
});

test("the body is capped at 1 KB and must be JSON", async () => {
  const h = leads();
  assert.equal((await h.submit(post({ email: "a@b.co", source: "plan", pad: "x".repeat(1_100) }))).status, 413);
  const form = new Request("https://guitarhub.org/api/leads", { method: "POST", body: "email=a@b.co", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://guitarhub.org" } });
  assert.equal((await h.submit(form)).status, 415);
  assert.equal(h.stored.size, 0);
});

test("parseLead keeps a guide id only on a guide lead", () => {
  const slug = FIELD_GUIDES[0].slug;
  assert.deepEqual(parseLead({ email: "A@B.co", source: "guide", guideId: slug, placement: "advanced" }), { email: "a@b.co", source: "guide", guideId: slug, placement: "advanced" });
  assert.throws(() => parseLead({ email: "a@b.co", source: "plan", guideId: slug }), { code: "invalid_lead" });
  assert.throws(() => parseLead(null), { code: "invalid_lead" });
});

test("when Resend fails the lead is kept, the answer is still 204, and the daily job sends it", async () => {
  const h = leads({ failSend: 1 });
  assert.equal((await quietly(() => h.submit(post({ email: "a@b.co", source: "plan" })))).status, 204);
  assert.equal(h.stored.get("a@b.co")!.emailsSent, 0);
  await h.dispatch(cron()); assert.equal(h.stored.get("a@b.co")!.emailsSent, 1);
});

test("when the database is down the form gets a fast 503 and nothing is sent", async () => {
  const h = createLeadHandlers({
    storeLead: async () => { throw new Error("db down"); }, dueLeads: async () => [], markSent: async () => {}, unsubscribe: async () => {},
    send: async () => { throw new Error("must not send"); }, secret: () => "secret", cronSecret: () => "cron", now: () => LAUNCH,
  });
  const response = await quietly(() => h.submit(post({ email: "a@b.co", source: "plan" })));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "lead_service_unavailable" });
});

test("five emails fall on days 0, 2, 4, 7 and 10, one per run, and stop at five or on unsubscribe", () => {
  assert.deepEqual([...SEQUENCE_DAYS], [0, 2, 4, 7, 10]);
  const lead = { createdAt: "2026-11-10T12:00:00Z", emailsSent: 1, unsubscribedAt: null };
  assert.equal(dueEmailIndex(lead, new Date("2026-11-11T12:00:00Z")), null);
  assert.equal(dueEmailIndex(lead, new Date("2026-11-12T12:00:00Z")), 1);
  assert.equal(dueEmailIndex({ ...lead, emailsSent: 4 }, new Date("2026-11-20T12:00:00Z")), 4);
  assert.equal(dueEmailIndex({ ...lead, emailsSent: 5 }, new Date("2026-12-20T12:00:00Z")), null);
  assert.equal(dueEmailIndex({ ...lead, unsubscribedAt: "2026-11-11T00:00:00Z" }, new Date("2026-11-20T12:00:00Z")), null);
  // A late sign-up gets its day-2 email on the day-2 run, not a day later.
  assert.equal(dueEmailIndex({ ...lead, createdAt: "2026-11-10T23:30:00Z" }, new Date("2026-11-12T15:00:00Z")), 1);
});

test("the daily job sends one email per lead per run, through the whole sequence", async () => {
  const h = leads();
  await h.submit(post({ email: "a@b.co", source: "plan" }));
  for (const day of [1, 2, 2, 3, 4, 7, 10, 11, 30]) {
    h.setNow(new Date(LAUNCH.getTime() + day * 86_400_000));
    assert.equal((await h.dispatch(cron())).status, 200);
  }
  assert.equal(h.sent.length, 5);
  assert.equal(h.stored.get("a@b.co")!.emailsSent, 5);
});

test("every email has the unsubscribe link, and the copy keeps the offer facts", () => {
  for (let i = 0; i < 5; i++) {
    const mail = sequenceEmail(i, { email: "a@b.co", source: "plan", placement: "beginner" }, "https://guitarhub.org/api/leads/unsubscribe?token=t");
    assert.ok(mail.text.includes("https://guitarhub.org/api/leads/unsubscribe?token=t")); assert.ok(mail.html.includes("unsubscribe?token=t"));
    assert.doesNotMatch(mail.text, /hears? (your )?chords|scores? (your )?chords|only \d+ left|last chance/i);
    assert.doesNotMatch(mail.text, /\b(detects?|listens?)\b|usually|was \$|\bsave\b|countdown|hours? left/i);
    assert.doesNotMatch(mail.html, /<img|utm_/i);                                 // no tracking pixel or tracked link
  }
  assert.ok(sequenceEmail(0, { email: "a@b.co", source: "plan" }, "u").text.includes(OFFER.promise));
  const last = sequenceEmail(4, { email: "a@b.co", source: "plan" }, "u", LAUNCH).text;
  assert.match(last, /\$79/); assert.ok(last.includes(OFFER.guarantee));
  assert.ok(last.includes("Launch price $79. Goes to $99 on December 1, 2026."));
});

test("after the launch the emails quote $99 one time and no launch note", () => {
  for (const index of [3, 4]) {
    const text = sequenceEmail(index, { email: "a@b.co", source: "plan" }, "u", LIFETIME_LAUNCH_ENDS).text;
    assert.ok(text.includes("$99 one time")); assert.doesNotMatch(text, /\$79|Launch price/);
    assert.ok(text.includes(OFFER.guarantee));
  }
});

test("emails 2 and 3 lead to the free module, 4 and 5 to the purchase", () => {
  const lead: Lead = { email: "a@b.co", source: "plan", placement: "intermediate" };
  for (const index of [1, 2]) assert.ok(sequenceEmail(index, lead, "u", LAUNCH).text.includes("https://guitarhub.org/start"));
  for (const index of [3, 4]) assert.match(sequenceEmail(index, lead, "u", LAUNCH).text, /https:\/\/guitarhub\.org\/learn\/guitar\/g-l4-m2-01/);
  const plan = sequenceEmail(0, lead, "u", LAUNCH).text;
  assert.ok(plan.includes("https://guitarhub.org/breakthrough"));
  assert.ok(plan.includes("https://guitarhub.org/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf"));
  assert.equal((plan.match(/^- Week \d/gm) ?? []).length, 4);
});

test("a guide lead's first email delivers the guide's PDF", async () => {
  const h = leads();
  const guide = FIELD_GUIDES[2];
  assert.equal((await h.submit(post({ email: "g@b.co", source: "guide", guideId: guide.slug }))).status, 204);
  assert.ok(h.sent[0].message.text.includes(`https://guitarhub.org${fieldGuidePdf(guide)}`));
  assert.match(h.sent[0].message.subject, /Field Guide/);
});

test("unsubscribe needs a valid token, confirms on a page, and holds against a new submission", async () => {
  const h = leads(); await h.submit(post({ email: "a@b.co", source: "plan" }));
  assert.equal((await h.unsubscribe(get("?token=forged"))).status, 400);
  const ok = await h.unsubscribe(get(`?token=${unsubscribeToken("a@b.co", "secret")}`));
  assert.equal(ok.status, 200); assert.match(await ok.text(), /unsubscribed/i);
  await h.submit(post({ email: "a@b.co", source: "plan" })); await h.dispatch(cron());
  assert.equal(h.sent.length, 1);                                            // only the original email 1
  assert.equal(verifyUnsubscribeToken(unsubscribeToken("a@b.co", "secret"), "other"), null);
});

test("one-click unsubscribe answers a POST with 200 and stops the sequence", async () => {
  const h = leads(); await h.submit(post({ email: "a@b.co", source: "plan" }));
  const oneClick = new Request(`https://guitarhub.org/api/leads/unsubscribe?token=${unsubscribeToken("a@b.co", "secret")}`, {
    method: "POST", body: "List-Unsubscribe=One-Click", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  assert.equal((await h.unsubscribePost(oneClick)).status, 200);
  assert.notEqual(h.stored.get("a@b.co")!.unsubscribedAt, null);
  h.setNow(new Date(LAUNCH.getTime() + 3 * 86_400_000)); await h.dispatch(cron());
  assert.equal(h.sent.length, 1);
  assert.equal((await h.unsubscribePost(new Request("https://guitarhub.org/api/leads/unsubscribe?token=x", { method: "POST" }))).status, 400);
});

test("tokens round-trip and reject tampering", () => {
  const token = unsubscribeToken("a@b.co", "secret");
  assert.equal(verifyUnsubscribeToken(token, "secret"), "a@b.co");
  const [, signature] = token.split(".");
  assert.equal(verifyUnsubscribeToken(`${Buffer.from("c@d.co").toString("base64url")}.${signature}`, "secret"), null);
  assert.equal(verifyUnsubscribeToken(token, ""), null);
  assert.equal(verifyUnsubscribeToken("", "secret"), null);
});

test("the daily job refuses a request without the cron secret", async () => {
  assert.equal((await leads().dispatch(get(""))).status, 401);
  const wrong = new Request("https://guitarhub.org/api/leads/dispatch", { headers: { Authorization: "Bearer nope" } });
  assert.equal((await leads().dispatch(wrong)).status, 401);
});

test("a run stops after three failed sends in a row and leaves the rest for tomorrow", async () => {
  const h = leads({ failSend: 10 });
  await quietly(async () => { for (const n of [1, 2, 3, 4, 5]) await h.submit(post({ email: `p${n}@b.co`, source: "plan" })); });
  const run = await quietly(() => h.dispatch(cron()));
  assert.deepEqual(await run.json(), { sent: 0, failed: 3, rejected: 0 });
});

test("three 5xx failures in a row still trip the breaker and nothing is retired", async () => {
  const h = leads({ failSend: 10 });
  await quietly(async () => { for (const n of [1, 2, 3, 4]) await h.submit(post({ email: `p${n}@b.co`, source: "plan" })); });
  const run = await quietly(() => h.dispatch(cron()));
  assert.deepEqual(await run.json(), { sent: 0, failed: 3, rejected: 0 });
  assert.ok([...h.stored.values()].every((lead) => lead.unsubscribedAt === null));
});

test("addresses the provider rejects are retired and never block the real lead behind them", async () => {
  const h = leads({ rejected: ["bad1@b.co", "bad2@b.co", "bad3@b.co"] });
  // Stored earlier (as if email 1 failed at submit), so they sort ahead of the real lead.
  for (const [i, email] of ["bad1@b.co", "bad2@b.co", "bad3@b.co", "real@b.co"].entries())
    h.stored.set(email, { email, source: "plan", createdAt: new Date(LAUNCH.getTime() - (10 - i) * 86_400_000).toISOString(), emailsSent: 0, unsubscribedAt: null });
  const run = await quietly(() => h.dispatch(cron()));
  assert.deepEqual(await run.json(), { sent: 1, failed: 0, rejected: 3 });
  assert.equal(h.stored.get("real@b.co")!.emailsSent, 1);
  for (const email of ["bad1@b.co", "bad2@b.co", "bad3@b.co"]) assert.ok(h.stored.get(email)!.unsubscribedAt);
  const next = await quietly(() => h.dispatch(cron()));   // retired leads are not retried
  assert.deepEqual(await next.json(), { sent: 1, failed: 0, rejected: 0 });   // only the real lead's next email; the retired three are skipped
});

test("provider statuses: 400 and 422 are permanent; auth, timeout, conflict, 429 and 5xx retry", () => {
  for (const status of [400, 404, 422]) assert.ok(sendFailureForStatus(status) instanceof PermanentSendError, String(status));
  for (const status of [401, 403, 408, 409, 429, 500, 503]) assert.ok(!(sendFailureForStatus(status) instanceof PermanentSendError), String(status));
});
