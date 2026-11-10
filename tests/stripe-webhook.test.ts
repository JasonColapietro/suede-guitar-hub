import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createStripeWebhookHandler } from "../lib/checkout/webhook.ts";
import { parseStripeEvent, type StripeWebhookEvent } from "../lib/checkout/stripe.ts";
import type { StripePurchase } from "../lib/learning-account/stripe.ts";

// No Stripe key exists here: signatures are computed locally and every write is a double.
const at = "2026-11-10T12:00:00.000Z";
const live: StripePurchase = {
  checkoutSessionId: "cs_live_1", paymentIntentId: "pi_1", email: "buyer@example.com", livemode: true,
  amountTotal: 7900, currency: "usd", purchasedAt: at, refundedAt: null,
};

type Deps = Parameters<typeof createStripeWebhookHandler>[0];

/** A ledger double with the database's idempotency: a repeated event id or checkout session is a duplicate. */
function hook(overrides: Partial<Deps> = {}) {
  const writes: string[] = []; const captured: StripePurchase[] = [];
  const events = new Set<string>(); const sessions = new Set<string>();
  const deps: Deps = {
    available: () => true,
    parse: (rawBody, signature) => { if (signature !== "t=1,v1=valid") throw new Error("bad_signature"); return JSON.parse(rawBody) as StripeWebhookEvent; },
    recordPurchase: async (eventId, _type, purchase) => {
      if (events.has(eventId) || sessions.has(purchase.checkoutSessionId)) return "duplicate";
      events.add(eventId); sessions.add(purchase.checkoutSessionId); writes.push(`record:${eventId}`);
      return "recorded";
    },
    refundPurchase: async (eventId, paymentIntentId) => {
      if (events.has(eventId)) return "duplicate";
      events.add(eventId); writes.push(`refund:${eventId}:${paymentIntentId}`);
      return "refunded";
    },
    capturePurchase: async (purchase) => { captured.push(purchase); },
    ...overrides,
  };
  return { handle: createStripeWebhookHandler(deps), writes, captured };
}

function deliver(event: unknown, signature: string | null = "t=1,v1=valid") {
  return new Request("https://guitarhub.org/api/stripe/webhook", {
    method: "POST", body: JSON.stringify(event),
    headers: { "Content-Type": "application/json", ...(signature ? { "Stripe-Signature": signature } : {}) },
  });
}

test("a completed checkout records the purchase once, however often Stripe delivers it", async () => {
  const h = hook(); const event = { id: "evt_1", type: "checkout.session.completed", purchase: live };
  assert.equal((await h.handle(deliver(event))).status, 200);
  assert.equal((await h.handle(deliver(event))).status, 200);
  assert.deepEqual(h.writes, ["record:evt_1"]);              // the double returns "duplicate" the second time
  assert.equal(h.captured.length, 1);
});

test("a delayed payment that succeeds later records the purchase", async () => {
  const h = hook();
  assert.equal((await h.handle(deliver({ id: "evt_5", type: "checkout.session.async_payment_succeeded", purchase: live }))).status, 200);
  assert.deepEqual(h.writes, ["record:evt_5"]);
  assert.deepEqual(h.captured, [live]);
});

test("an unpaid session and an unrelated event are acknowledged and write nothing", async () => {
  const h = hook();
  assert.equal((await h.handle(deliver({ id: "evt_6", type: "checkout.session.completed", purchase: null }))).status, 200);
  assert.equal((await h.handle(deliver({ id: "evt_7", type: "ignored" }))).status, 200);
  assert.deepEqual(h.writes, []);
  assert.equal(h.captured.length, 0);
});

test("a full refund removes access; a partial refund does not", async () => {
  const h = hook();
  await h.handle(deliver({ id: "evt_2", type: "charge.refunded", paymentIntentId: "pi_1", fullyRefunded: false, refundedAt: at }));
  assert.deepEqual(h.writes, []);
  await h.handle(deliver({ id: "evt_3", type: "charge.refunded", paymentIntentId: "pi_1", fullyRefunded: true, refundedAt: at }));
  assert.deepEqual(h.writes, ["refund:evt_3:pi_1"]);
  assert.equal((await h.handle(deliver({ id: "evt_3", type: "charge.refunded", paymentIntentId: "pi_1", fullyRefunded: true, refundedAt: at }))).status, 200);
  assert.deepEqual(h.writes, ["refund:evt_3:pi_1"]);
});

test("a refund for a payment not yet recorded is refused so Stripe retries it", async () => {
  const h = hook({ refundPurchase: async () => "unknown_purchase" });
  assert.equal((await h.handle(deliver({ id: "evt_4", type: "charge.refunded", paymentIntentId: "pi_9", fullyRefunded: true, refundedAt: at }))).status, 503);
});

test("a bad signature is 400 and a capture failure does not undo the recorded purchase", async () => {
  const forged = hook();
  const event = { id: "evt_1", type: "checkout.session.completed", purchase: live };
  assert.equal((await forged.handle(deliver(event, "t=1,v1=forged"))).status, 400);
  assert.equal((await forged.handle(deliver(event, null))).status, 400);
  assert.deepEqual(forged.writes, []);
  const errors: unknown[][] = []; const original = console.error; console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const failing = hook({ capturePurchase: async () => { throw new Error("outbox down"); } });
    assert.equal((await failing.handle(deliver(event))).status, 200);
    assert.deepEqual(failing.writes, ["record:evt_1"]);
  } finally { console.error = original; }
  assert.equal(errors.length, 1);
});

test("a ledger outage or a site without checkout answers non-2xx so Stripe retries", async () => {
  const errors: unknown[][] = []; const original = console.error; console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    const down = hook({ recordPurchase: async () => { throw new Error("database down"); } });
    assert.equal((await down.handle(deliver({ id: "evt_1", type: "checkout.session.completed", purchase: live }))).status, 503);
    const refundDown = hook({ refundPurchase: async () => { throw new Error("database down"); } });
    assert.equal((await refundDown.handle(deliver({ id: "evt_3", type: "charge.refunded", paymentIntentId: "pi_1", fullyRefunded: true, refundedAt: at }))).status, 503);
  } finally { console.error = original; }
  assert.equal(errors.length, 2);
  let parsed = false;
  const off = hook({ available: () => false, parse: () => { parsed = true; return { id: "evt_1", type: "ignored" }; } });
  assert.equal((await off.handle(deliver({ id: "evt_1", type: "ignored" }))).status, 503);
  assert.equal(parsed, false);
  assert.deepEqual(off.writes, []);
});

// parseStripeEvent against Stripe's own signing scheme, with a locally generated header.
const secret = "whsec_synthetic_test_secret";
function signed(event: Record<string, unknown>, signingSecret = secret) {
  const payload = JSON.stringify({ object: "event", api_version: "2026-10-28.clover", livemode: false, created: 1_762_776_000, ...event });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret }) };
}
function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1", object: "checkout.session", mode: "payment", payment_status: "paid", livemode: false,
    amount_total: 8453, currency: "usd", created: 1_762_776_000, payment_intent: "pi_test_1",
    customer_email: null, customer_details: { email: " Buyer@Example.com " }, metadata: { product: "guitarhub_lifetime" },
    ...overrides,
  };
}

test("parseStripeEvent verifies the raw body's signature before reading it", () => {
  const { payload, signature } = signed({ id: "evt_s1", type: "checkout.session.completed", data: { object: session() } });
  assert.throws(() => parseStripeEvent(payload, signature, "whsec_other"));
  assert.throws(() => parseStripeEvent(payload, null, secret));
  assert.throws(() => parseStripeEvent(payload.replace("8453", "1"), signature, secret));
  assert.deepEqual(parseStripeEvent(payload, signature, secret), {
    id: "evt_s1", type: "checkout.session.completed",
    purchase: { checkoutSessionId: "cs_test_1", paymentIntentId: "pi_test_1", email: "buyer@example.com", livemode: false,
      amountTotal: 8453, currency: "usd", purchasedAt: "2025-11-10T12:00:00.000Z", refundedAt: null },
  });
});

test("parseStripeEvent records only paid sessions this site created, on completion or later async success", () => {
  const read = (event: Record<string, unknown>) => { const { payload, signature } = signed(event); return parseStripeEvent(payload, signature, secret); };
  assert.deepEqual(read({ id: "evt_s2", type: "checkout.session.completed", data: { object: session({ payment_status: "unpaid" }) } }),
    { id: "evt_s2", type: "checkout.session.completed", purchase: null });
  assert.equal((read({ id: "evt_s3", type: "checkout.session.completed", data: { object: session({ metadata: { product: "other" } }) } }) as { purchase: unknown }).purchase, null);
  assert.equal((read({ id: "evt_s4", type: "checkout.session.completed", data: { object: session({ customer_details: { email: null } }) } }) as { purchase: unknown }).purchase, null);
  const later = read({ id: "evt_s5", type: "checkout.session.async_payment_succeeded", data: { object: session() } });
  assert.equal(later.type, "checkout.session.async_payment_succeeded");
  assert.equal((later as { purchase: StripePurchase | null }).purchase?.checkoutSessionId, "cs_test_1");
  assert.deepEqual(read({ id: "evt_s6", type: "checkout.session.async_payment_failed", data: { object: session({ payment_status: "unpaid" }) } }), { id: "evt_s6", type: "ignored" });
});

test("parseStripeEvent reads a refunded charge's payment intent and whether it is fully refunded", () => {
  const read = (event: Record<string, unknown>) => { const { payload, signature } = signed(event); return parseStripeEvent(payload, signature, secret); };
  const charge = { id: "ch_1", object: "charge", amount: 8453, amount_refunded: 8453, refunded: true, payment_intent: "pi_test_1" };
  assert.deepEqual(read({ id: "evt_r1", type: "charge.refunded", created: 1_762_862_400, data: { object: charge } }),
    { id: "evt_r1", type: "charge.refunded", paymentIntentId: "pi_test_1", fullyRefunded: true, refundedAt: "2025-11-11T12:00:00.000Z" });
  assert.equal((read({ id: "evt_r2", type: "charge.refunded", data: { object: { ...charge, amount_refunded: 1000, refunded: false } } }) as { fullyRefunded: boolean }).fullyRefunded, false);
  assert.deepEqual(read({ id: "evt_r3", type: "charge.refunded", data: { object: { ...charge, payment_intent: null } } }), { id: "evt_r3", type: "ignored" });
});
