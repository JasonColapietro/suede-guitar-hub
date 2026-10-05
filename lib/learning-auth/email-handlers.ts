import { accountUUID } from "../learning-account/contracts.ts";
import { isSameOriginMutation, safeAccountDestination } from "./config.ts";
import { AccountHTTPError, accountErrorResponse, accountJSON, boundedAccountBody } from "./http.ts";

export type EmailAuthClient = { auth: {
  signInWithOtp(options: { email: string; options: { shouldCreateUser: boolean } }): Promise<{ error: unknown }>;
  verifyOtp(options: { email: string; token: string; type: "email" }): Promise<{ error: unknown }>;
  getUser(): Promise<{ data: { user: { id: string; is_anonymous?: boolean } | null }; error: unknown }>;
  signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
} };

function emailAddress(input: unknown): string {
  if (typeof input !== "string" || input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) throw new AccountHTTPError(400, "invalid_email");
  return input.trim().toLowerCase();
}

export function createEmailAuthHandlers(deps: {
  enabled(): boolean; signupEnabled?(): boolean; client(): Promise<EmailAuthClient | null>;
  protect?(request: Request, action: "send" | "verify", email: string): Promise<void>;
}) {
  async function protect(request: Request, action: "send" | "verify", email: string) {
    if (deps.signupEnabled?.() && !deps.protect) throw new AccountHTTPError(503, "account_service_unavailable");
    await deps.protect?.(request, action, email);
  }
  const route = (operation: (request: Request, client: EmailAuthClient) => Promise<Response>) => async (request: Request) => {
    try {
      if (!isSameOriginMutation(request)) throw new AccountHTTPError(403, "invalid_origin");
      if (!deps.enabled()) throw new AccountHTTPError(503, "account_service_unavailable");
      const client = await deps.client();
      if (!client) throw new AccountHTTPError(503, "account_service_unavailable");
      return await operation(request, client);
    } catch (error) {
      const response = accountErrorResponse(error);
      if (response.status === 429) response.headers.set("Retry-After", "60");
      return response;
    }
  };
  return {
    send: route(async (request, client) => {
      const body = await boundedAccountBody(request, 1_024);
      const email = emailAddress(body.email);
      await protect(request, "send", email);
      let result: { error: unknown };
      try { result = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: deps.signupEnabled?.() === true } }); }
      catch { throw new AccountHTTPError(503, "email_delivery_unavailable"); }
      // Do not distinguish missing accounts from accepted requests. Operational failures
      // still need an honest recovery path; never return provider messages to the browser.
      if (result.error && typeof result.error === "object") {
        const error = result.error as { status?: number; code?: string };
        if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") throw new AccountHTTPError(429, "try_again_later");
        if ((error.status ?? 0) >= 500 || error.code === "unexpected_failure") throw new AccountHTTPError(503, "email_delivery_unavailable");
        if (deps.signupEnabled?.() && error.code !== "user_not_found" && error.code !== "signup_disabled") throw new AccountHTTPError(503, "email_delivery_unavailable");
      }
      return accountJSON({ accepted: true });
    }),
    verify: route(async (request, client) => {
      const body = await boundedAccountBody(request, 1_024);
      const email = emailAddress(body.email);
      if (typeof body.code !== "string" || !/^\d{6,10}$/.test(body.code)) throw new AccountHTTPError(400, "invalid_code");
      await protect(request, "verify", email);
      try {
        const result = await client.auth.verifyOtp({ email, token: body.code, type: "email" });
        if (!result.error) {
          const current = await client.auth.getUser();
          if (!current.error && current.data.user && !current.data.user.is_anonymous) {
            accountUUID(current.data.user.id);
            return accountJSON({ signedIn: true, destination: safeAccountDestination(typeof body.next === "string" ? body.next : null) });
          }
        }
      } catch { /* Provider response details never enter the response. */ }
      try { await client.auth.signOut({ scope: "local" }); } catch { /* Rejected verification remains rejected. */ }
      throw new AccountHTTPError(401, "sign_in_failed");
    }),
    signOut: route(async (request, client) => {
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) throw new AccountHTTPError(503, "sign_out_failed");
      return new Response(null, { status: 303, headers: { Location: new URL("/account", request.url).toString(), "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    }),
  };
}
