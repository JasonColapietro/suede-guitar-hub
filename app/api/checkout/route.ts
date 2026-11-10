import { checkoutAvailable } from "@/lib/checkout/config";
import { createCheckoutHandlers } from "@/lib/checkout/handlers";
import { createStripeCheckoutSession } from "@/lib/checkout/stripe";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

export const runtime = "nodejs";

const handlers = createCheckoutHandlers({ available: checkoutAvailable, createSession: createStripeCheckoutSession });
export const POST = handlers.checkout;

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["POST"];
const notAllowed = methodNotAllowed(SERVED);
export const GET = notAllowed;
export const HEAD = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
