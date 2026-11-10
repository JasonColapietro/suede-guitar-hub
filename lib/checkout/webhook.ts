import type { StripePurchase } from "../learning-account/stripe.ts";
import { accountJSON } from "../learning-auth/http.ts";
import type { StripeWebhookEvent } from "./stripe.ts";

export type StripeWebhookDependencies = {
  available(): boolean;
  parse(rawBody: string, signature: string | null): StripeWebhookEvent;
  recordPurchase(eventId: string, type: string, purchase: StripePurchase): Promise<"recorded" | "duplicate">;
  refundPurchase(eventId: string, paymentIntentId: string, refundedAt: string): Promise<"refunded" | "duplicate" | "unknown_purchase">;
  capturePurchase?(purchase: StripePurchase): Promise<void>;
};

/** A capture failure never reverses a recorded sale; ledger reconciliation can retry it. */
async function capturePurchase(deps: Pick<StripeWebhookDependencies, "capturePurchase">, purchase: StripePurchase): Promise<void> {
  try { await deps.capturePurchase?.(purchase); }
  catch { console.error("[intake] stripe purchase capture pending ledger reconciliation"); }
}

/**
 * Stripe retries any non-2xx answer, so a 2xx means "nothing left to do": recorded, a duplicate,
 * or an event that grants nothing. A ledger outage, a refund that arrives before its purchase,
 * or a site that cannot record sales answers 503 and the event comes back.
 */
export function createStripeWebhookHandler(deps: StripeWebhookDependencies): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!deps.available()) return accountJSON({ error: "checkout_unavailable" }, 503);
    let event: StripeWebhookEvent;
    try { event = deps.parse(await request.text(), request.headers.get("stripe-signature")); }
    catch { return accountJSON({ error: "invalid_signature" }, 400); }
    try {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        // An unpaid session (a bank debit still clearing) records nothing; its async_payment_succeeded event does.
        // A duplicate is captured too: the success page usually records the sale first and does not capture it,
        // and the outbox holds one entry per checkout session however often it is enqueued.
        if (event.purchase) {
          await deps.recordPurchase(event.id, event.type, event.purchase);
          await capturePurchase(deps, event.purchase);
        }
      } else if (event.type === "charge.refunded" && event.fullyRefunded) {
        if (await deps.refundPurchase(event.id, event.paymentIntentId, event.refundedAt) === "unknown_purchase") {
          return accountJSON({ error: "unknown_purchase" }, 503);
        }
      }
      return accountJSON({ received: true });
    } catch (error) {
      console.error("stripe webhook: ledger write failed", error instanceof Error ? error.name : "unknown");
      return accountJSON({ error: "account_service_unavailable" }, 503);
    }
  };
}
