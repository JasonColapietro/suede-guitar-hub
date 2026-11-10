import Stripe from "stripe";
import { normalizeEmail, type StripePurchase } from "../learning-account/stripe.ts";
import { LIFETIME } from "../site.ts";
import { checkoutConfiguration } from "./config.ts";

/** The pre-tax price Stripe charges, in cents, from the one price the whole site shows. */
export const CHECKOUT_AMOUNT_CENTS = LIFETIME.price * 100;

/** Marks sessions this site created, so a paid session for anything else on the account never unlocks lessons. */
const CHECKOUT_PRODUCT = "guitarhub_lifetime";

export type CheckoutSessionInput = { email: string | null; origin: string };

export function checkoutSessionParams(input: CheckoutSessionInput): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [{
      quantity: 1,
      // `exclusive`: Stripe Tax adds sales tax on top, so the buyer sees the $79 the site advertises.
      price_data: { currency: "usd", unit_amount: CHECKOUT_AMOUNT_CENTS, tax_behavior: "exclusive", product_data: { name: LIFETIME.name } },
    }],
    automatic_tax: { enabled: true },
    ...(input.email ? { customer_email: input.email } : {}),
    success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/learn/guitar`,
    metadata: { product: CHECKOUT_PRODUCT },
  };
}

/** The fields of a Checkout Session this site reads; `Stripe.Checkout.Session` satisfies it. */
export type CheckoutSessionFields = {
  id: string;
  mode: string;
  payment_status: string;
  livemode: boolean;
  amount_total: number | null;
  currency: string | null;
  created: number;
  payment_intent: string | { id: string } | null;
  customer_email: string | null;
  customer_details: { email: string | null } | null;
  metadata: Record<string, string> | null;
};

/**
 * A purchase only when Stripe reports the money as paid. A delayed payment method
 * completes the session `unpaid`; that session grants nothing until it is paid.
 */
export function purchaseFromCheckoutSession(session: CheckoutSessionFields): StripePurchase | null {
  if (session.mode !== "payment" || session.payment_status !== "paid" || session.metadata?.product !== CHECKOUT_PRODUCT) return null;
  const email = session.customer_details?.email ?? session.customer_email;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!email?.trim() || !paymentIntentId || session.amount_total === null || !session.currency) return null;
  return {
    checkoutSessionId: session.id, paymentIntentId, email: normalizeEmail(email), livemode: session.livemode,
    amountTotal: session.amount_total, currency: session.currency,
    purchasedAt: new Date(session.created * 1000).toISOString(), refundedAt: null,
  };
}

function stripeClient(): Stripe {
  const configuration = checkoutConfiguration();
  if (!configuration) throw new Error("checkout_unavailable");
  return new Stripe(configuration.secretKey, { maxNetworkRetries: 2, timeout: 10_000 });
}

export async function createStripeCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }> {
  const session = await stripeClient().checkout.sessions.create(checkoutSessionParams(input));
  if (!session.url) throw new Error("checkout_session_without_url");
  return { url: session.url };
}

/** The paid purchase behind a Checkout Session id, or null when it is not paid or has no email. */
export async function paidCheckoutSession(sessionId: string): Promise<StripePurchase | null> {
  return purchaseFromCheckoutSession(await stripeClient().checkout.sessions.retrieve(sessionId));
}
