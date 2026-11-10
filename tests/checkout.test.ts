import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { checkoutAvailable, checkoutConfiguration } from "../lib/checkout/config.ts";
import { createCheckoutHandlers } from "../lib/checkout/handlers.ts";
import { CHECKOUT_AMOUNT_CENTS, checkoutSessionParams, purchaseFromCheckoutSession } from "../lib/checkout/stripe.ts";
import { LIFETIME } from "../lib/site.ts";
import type { StripePurchase } from "../lib/learning-account/stripe.ts";

register("./component-render-hooks.mjs", import.meta.url);
register("./checkout-success-hooks.mjs", import.meta.url);
const { default: CheckoutSuccessPage, dynamic, metadata } = await import("../app/checkout/success/page.tsx");

// No Stripe key exists here: every Stripe and database call below is a double.
const globals = globalThis as typeof globalThis & {
  __checkoutSession: StripePurchase | null; __checkoutLookups: string[];
  __checkoutRecords: { eventId: string; type: string; purchase: StripePurchase }[]; __checkoutRecordFails: boolean;
};

function post(body: unknown, origin: string | null = "https://guitarhub.org") {
  return new Request("https://guitarhub.org/api/checkout", {
    method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
  });
}

test("checkout returns the Stripe URL and passes a valid email through", async () => {
  const seen: unknown[] = [];
  const { checkout } = createCheckoutHandlers({ available: () => true, createSession: async (input) => { seen.push(input); return { url: "https://checkout.stripe.com/c/pay/x" }; } });
  const response = await checkout(post({ email: " Buyer@Example.com " }));
  assert.deepEqual(await response.json(), { url: "https://checkout.stripe.com/c/pay/x" });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(seen, [{ email: "buyer@example.com", origin: "https://guitarhub.org" }]);
  assert.equal((await checkout(post({}))).status, 200);                  // email is optional
  assert.deepEqual(seen[1], { email: null, origin: "https://guitarhub.org" });
  assert.equal((await checkout(post({ email: "nope" }))).status, 400);
  assert.equal((await checkout(post({ email: 42 }))).status, 400);
  assert.equal(seen.length, 2);
});

test("checkout accepts only same-origin JSON and reports a Stripe failure without detail", async () => {
  let calls = 0;
  const { checkout } = createCheckoutHandlers({ available: () => true, createSession: async () => { calls++; throw new Error("sk_test_secret leaked?"); } });
  assert.equal((await checkout(post({}, null))).status, 403);
  assert.equal((await checkout(post({}, "https://evil.example"))).status, 403);
  const notJSON = new Request("https://guitarhub.org/api/checkout", { method: "POST", body: "email=a@b.co", headers: { Origin: "https://guitarhub.org", "Content-Type": "application/x-www-form-urlencoded" } });
  assert.equal((await checkout(notJSON)).status, 415);
  assert.equal(calls, 0);
  const originalError = console.error;
  console.error = () => {};
  try {
    const failed = await checkout(post({}));
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: "checkout_unavailable" });
  } finally { console.error = originalError; }
});

test("the site refuses to take payment when it could not unlock the purchase", async () => {
  const { checkout } = createCheckoutHandlers({ available: () => false, createSession: async () => { throw new Error("must not reach Stripe"); } });
  const response = await checkout(post({}));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "checkout_unavailable" });
});

test("checkout is unavailable unless accounts, the secret key and the webhook secret are all set", () => {
  const names = ["GUITARHUB_ACCOUNTS_ENABLED", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "GUITARHUB_SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "VERCEL_ENV"];
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const accounts = { GUITARHUB_ACCOUNTS_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://drzuelosizfllruocmly.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x", GUITARHUB_SUPABASE_SERVICE_ROLE_KEY: "service" };
  const set = (values: Record<string, string>) => { for (const name of names) delete process.env[name]; Object.assign(process.env, values); };
  try {
    set({ ...accounts, STRIPE_SECRET_KEY: "sk_test_1", STRIPE_WEBHOOK_SECRET: "whsec_1" });
    assert.deepEqual(checkoutConfiguration(), { secretKey: "sk_test_1", webhookSecret: "whsec_1" });
    assert.equal(checkoutAvailable(), true);
    set({ STRIPE_SECRET_KEY: "sk_test_1", STRIPE_WEBHOOK_SECRET: "whsec_1" });
    assert.equal(checkoutConfiguration(), null, "accounts off");
    assert.equal(checkoutAvailable(), false);
    set({ ...accounts, STRIPE_WEBHOOK_SECRET: "whsec_1" });
    assert.equal(checkoutConfiguration(), null, "no secret key");
    set({ ...accounts, STRIPE_SECRET_KEY: "sk_test_1" });
    assert.equal(checkoutConfiguration(), null, "no webhook secret");
    set({ ...accounts, STRIPE_SECRET_KEY: " ", STRIPE_WEBHOOK_SECRET: "whsec_1" });
    assert.equal(checkoutConfiguration(), null, "blank secret key");
    set({ ...accounts, STRIPE_SECRET_KEY: "sk_test_1", STRIPE_WEBHOOK_SECRET: "whsec_1", VERCEL_ENV: "production" });
    assert.equal(checkoutConfiguration(), null, "production with a test key");
    set({ ...accounts, STRIPE_SECRET_KEY: "sk_live_1", STRIPE_WEBHOOK_SECRET: "whsec_1", VERCEL_ENV: "production" });
    assert.deepEqual(checkoutConfiguration(), { secretKey: "sk_live_1", webhookSecret: "whsec_1" });
  } finally {
    for (const name of names) { if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name]; }
  }
});

test("the price sent to Stripe comes from LIFETIME", () => {
  assert.equal(CHECKOUT_AMOUNT_CENTS, 7900);
  assert.equal(CHECKOUT_AMOUNT_CENTS, LIFETIME.price * 100);
});

test("the Checkout session is a one-time $79 payment with tax added on top", () => {
  const params = checkoutSessionParams({ email: "buyer@example.com", origin: "https://guitarhub.org" });
  assert.deepEqual(params, {
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 7900, tax_behavior: "exclusive", product_data: { name: LIFETIME.name } } }],
    automatic_tax: { enabled: true },
    customer_email: "buyer@example.com",
    success_url: "https://guitarhub.org/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://guitarhub.org/learn/guitar",
    metadata: { product: "guitarhub_lifetime" },
    // Stripe copies the PaymentIntent's metadata onto its Charge, so a refund event can say whose sale it was.
    payment_intent_data: { metadata: { product: "guitarhub_lifetime" } },
  });
  assert.equal("customer_email" in checkoutSessionParams({ email: null, origin: "https://preview.guitarhub.org" }), false);
  assert.equal(checkoutSessionParams({ email: null, origin: "https://preview.guitarhub.org" }).cancel_url, "https://preview.guitarhub.org/learn/guitar");
});

test("only a paid GuitarHub session with an email becomes a purchase", () => {
  const paid = {
    id: "cs_test_1", payment_status: "paid", mode: "payment", livemode: false, amount_total: 8453, currency: "usd", created: 1_794_268_800,
    payment_intent: "pi_1", customer_email: null, customer_details: { email: " Buyer@Example.com " }, metadata: { product: "guitarhub_lifetime" },
  };
  assert.deepEqual(purchaseFromCheckoutSession(paid), {
    checkoutSessionId: "cs_test_1", paymentIntentId: "pi_1", email: "buyer@example.com", livemode: false,
    amountTotal: 8453, currency: "usd", purchasedAt: "2026-11-10T00:00:00.000Z", refundedAt: null,
  });
  assert.equal(purchaseFromCheckoutSession({ ...paid, payment_intent: { id: "pi_2" } })?.paymentIntentId, "pi_2");
  assert.equal(purchaseFromCheckoutSession({ ...paid, customer_details: null, customer_email: "Pre@Filled.com" })?.email, "pre@filled.com");
  // A delayed payment method completes the session unpaid; it must not grant access until Stripe reports it paid.
  assert.equal(purchaseFromCheckoutSession({ ...paid, payment_status: "unpaid" }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, payment_status: "no_payment_required" }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, customer_details: null, customer_email: null }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, payment_intent: null }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, mode: "subscription" }), null);
  assert.equal(purchaseFromCheckoutSession({ ...paid, metadata: {} }), null, "a session for another product on the same Stripe account");
  assert.equal(purchaseFromCheckoutSession({ ...paid, amount_total: null }), null);
});

function resetDoubles(session: StripePurchase | null, recordFails = false) {
  globals.__checkoutSession = session; globals.__checkoutLookups = []; globals.__checkoutRecords = []; globals.__checkoutRecordFails = recordFails;
}
const purchase: StripePurchase = { checkoutSessionId: "cs_1", paymentIntentId: "pi_1", email: "buyer@example.com", livemode: false, amountTotal: 7900, currency: "usd", purchasedAt: "2026-11-10T00:00:00.000Z", refundedAt: null };
const render = async (sessionId?: string | string[]) => renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve(sessionId === undefined ? {} : { session_id: sessionId }) }));

test("the success page shows the checkout email, records the purchase and pre-fills sign-in", async () => {
  assert.equal(dynamic, "force-dynamic");
  assert.deepEqual(metadata.robots, { index: false, follow: false });

  resetDoubles(purchase);
  const markup = await render("cs_1");
  assert.deepEqual(globals.__checkoutLookups, ["cs_1"]);
  assert.deepEqual(globals.__checkoutRecords, [{ eventId: "session:cs_1", type: "checkout.success_page", purchase }]);
  assert.match(markup, /buyer@example\.com/);
  assert.match(markup, /<input[^>]*id="account-email"[^>]*value="buyer@example\.com"/);
  assert.match(markup, /Send a sign-in code/);

  resetDoubles(null);
  const unconfirmed = await render("cs_1");
  assert.match(unconfirmed, /payment is not confirmed yet/);
  assert.doesNotMatch(unconfirmed, /account-email|Send a sign-in code/);
  assert.deepEqual(globals.__checkoutRecords, []);
});

test("the success page never asks Stripe about a malformed session id", async () => {
  for (const sessionId of [undefined, "", "pi_1", "cs_1/../x", ["cs_1", "cs_2"]]) {
    resetDoubles(purchase);
    const markup = await render(sessionId);
    assert.deepEqual(globals.__checkoutLookups, [], String(sessionId));
    assert.match(markup, /payment is not confirmed yet/);
    assert.doesNotMatch(markup, /account-email/);
  }
});

test("a paid buyer still gets the sign-in form when recording waits for the webhook", async () => {
  resetDoubles(purchase, true);
  const originalError = console.error;
  console.error = () => {};
  try {
    const markup = await render("cs_1");
    assert.match(markup, /<input[^>]*value="buyer@example\.com"/);
    assert.equal(globals.__checkoutRecords.length, 1);
  } finally { console.error = originalError; }
});
