import { accountConfiguration } from "../learning-auth/config.ts";

export type CheckoutConfiguration = { secretKey: string; webhookSecret: string };

/**
 * Web checkout runs only when the site can also unlock what it sells: accounts on,
 * a Stripe secret key and a webhook secret. Production takes live keys only, matching
 * `stripeLiveRequired()`, so a production sale is always one that unlocks lessons.
 */
export function checkoutConfiguration(): CheckoutConfiguration | null {
  if (!accountConfiguration()) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !webhookSecret) return null;
  if (process.env.VERCEL_ENV === "production" && !secretKey.startsWith("sk_live_")) return null;
  return { secretKey, webhookSecret };
}

export function checkoutAvailable(): boolean {
  return checkoutConfiguration() !== null;
}
