import type { Metadata } from "next";
import Link from "next/link";
import Article from "@/components/Article";
import { paidCheckoutSession } from "@/lib/checkout/stripe";
import { recordStripePurchase } from "@/lib/learning-auth/backend";
import type { StripePurchase } from "@/lib/learning-account/stripe";
import AccountSignIn from "../../account/sign-in";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lifetime access | GuitarHub", robots: { index: false, follow: false } };

/** Stripe substitutes `{CHECKOUT_SESSION_ID}` with a `cs_…` id; anything else never reaches Stripe. */
function checkoutSessionId(value: string | string[] | undefined): string | null {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]{1,255}$/.test(value) ? value : null;
}

async function confirmedPurchase(sessionId: string | null): Promise<StripePurchase | null> {
  if (!sessionId) return null;
  try { return await paidCheckoutSession(sessionId); }
  catch (error) {
    console.error("checkout success: session lookup failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

/** Records the sale now so access never waits for the webhook; the webhook records the same session idempotently. */
async function recordPurchase(purchase: StripePurchase): Promise<boolean> {
  try { await recordStripePurchase(`session:${purchase.checkoutSessionId}`, "checkout.success_page", purchase); return true; }
  catch (error) {
    console.error("checkout success: purchase record failed", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string | string[] }> }) {
  const purchase = await confirmedPurchase(checkoutSessionId((await searchParams).session_id));
  if (!purchase) {
    return <Article eyebrow="GuitarHub" title="Finishing your purchase" dek="Your lessons unlock as soon as Stripe confirms the payment." updated="2026-11-10" showPracticeCallToAction={false}>
      <p role="status">Your payment is not confirmed yet. Card payments confirm within moments, so refresh this page to check again.</p>
      <p>Bank payments can take a few business days. Once Stripe confirms yours, sign in with the email you paid with and every lesson is open.</p>
      <p><Link href="/account?next=/learn/guitar">Sign in to your account</Link> · <Link href="/learn/guitar">Guitar lessons</Link></p>
    </Article>;
  }
  const recorded = await recordPurchase(purchase);
  return <Article eyebrow="GuitarHub" title="Lifetime access is yours" dek="Every guitar and voice lesson is unlocked. Sign in and start playing." updated="2026-11-10" showPracticeCallToAction={false}>
    <p role="status">Payment confirmed for <strong>{purchase.email}</strong>.</p>
    <p>Your access belongs to this email. Send yourself a sign-in code, enter it here, and you go straight to your guitar lessons.</p>
    {!recorded && <p>Your lessons finish unlocking within a few minutes. If a lesson still shows as locked after you sign in, refresh it shortly.</p>}
    <AccountSignIn initialEmail={purchase.email} returnTo="/learn/guitar" />
  </Article>;
}
