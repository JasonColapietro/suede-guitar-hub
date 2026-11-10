import type { LearningTrack } from "./contracts.ts";

/** One row of `guitarhub_stripe_purchases`, keyed by the email the buyer paid with. */
export type StripePurchase = {
  checkoutSessionId: string;
  paymentIntentId: string;
  email: string;
  livemode: boolean;
  amountTotal: number;
  currency: string;
  purchasedAt: string;
  refundedAt: string | null;
};

/** Matches the database's `lower(btrim(email))`. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** One unrefunded purchase of the right mode unlocks both tracks; a test-mode purchase never counts where live mode is required. */
export function stripeTracks(purchases: readonly StripePurchase[], liveRequired: boolean): LearningTrack[] {
  return purchases.some((purchase) => purchase.refundedAt === null && (purchase.livemode || !liveRequired)) ? ["guitar", "voice"] : [];
}
