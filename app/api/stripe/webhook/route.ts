import { checkoutAvailable, checkoutConfiguration } from "@/lib/checkout/config";
import { parseStripeEvent } from "@/lib/checkout/stripe";
import { createStripeWebhookHandler } from "@/lib/checkout/webhook";
import { captureStripePurchase } from "@/lib/intake/capture";
import { recordStripePurchase, refundStripePurchase } from "@/lib/learning-auth/backend";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

// Signature checks read the exact raw body (`request.text()` in the handler); this path stays outside the proxy.ts matcher.
export const runtime = "nodejs";

export const POST = createStripeWebhookHandler({
  available: checkoutAvailable,
  parse(rawBody, signature) {
    const configuration = checkoutConfiguration();
    if (!configuration) throw new Error("checkout_unavailable");
    return parseStripeEvent(rawBody, signature, configuration.webhookSecret);
  },
  recordPurchase: recordStripePurchase,
  refundPurchase: refundStripePurchase,
  capturePurchase: captureStripePurchase,
});

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["POST"];
const notAllowed = methodNotAllowed(SERVED);
export const GET = notAllowed;
export const HEAD = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
