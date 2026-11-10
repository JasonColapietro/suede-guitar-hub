import { normalizeEmail } from "../learning-account/stripe.ts";
import { isSameOriginMutation } from "../learning-auth/config.ts";
import { AccountHTTPError, accountErrorResponse, accountJSON, boundedAccountBody } from "../learning-auth/http.ts";

export type CheckoutDependencies = {
  available(): boolean;
  createSession(input: { email: string | null; origin: string }): Promise<{ url: string }>;
};

/** Optional: Stripe asks for the email on its own page when the buyer has not given one yet. */
function checkoutEmail(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string" || input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) throw new AccountHTTPError(400, "invalid_email");
  return normalizeEmail(input);
}

export function createCheckoutHandlers(deps: CheckoutDependencies) {
  return {
    async checkout(request: Request): Promise<Response> {
      try {
        if (!isSameOriginMutation(request)) throw new AccountHTTPError(403, "invalid_origin");
        // Never take a payment the site cannot turn into lesson access.
        if (!deps.available()) throw new AccountHTTPError(503, "checkout_unavailable");
        const body = await boundedAccountBody(request, 1_024);
        const email = checkoutEmail(body.email);
        const { url } = await deps.createSession({ email, origin: new URL(request.url).origin });
        return accountJSON({ url });
      } catch (error) {
        if (error instanceof AccountHTTPError) return accountErrorResponse(error);
        // Stripe error details stay in the server log, never in the response.
        console.error("checkout: session creation failed", error instanceof Error ? error.name : "unknown");
        return accountJSON({ error: "checkout_unavailable" }, 503);
      }
    },
  };
}
