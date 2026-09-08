import { accountUUID } from "../learning-account/contracts.ts";
import { isSameOriginMutation } from "./config.ts";
import { AccountHTTPError, accountErrorResponse, accountJSON, boundedAccountBody } from "./http.ts";

export type EmailAuthClient = { auth: {
  signInWithOtp(options: { email: string; options: { shouldCreateUser: false } }): Promise<{ error: unknown }>;
  verifyOtp(options: { email: string; token: string; type: "email" }): Promise<{ error: unknown }>;
  getUser(): Promise<{ data: { user: { id: string; is_anonymous?: boolean } | null }; error: unknown }>;
  signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
} };

function emailAddress(input: unknown): string {
  if (typeof input !== "string" || input.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())) throw new AccountHTTPError(400, "invalid_email");
  return input.trim().toLowerCase();
}

export function createEmailAuthHandlers(deps: { enabled(): boolean; client(): Promise<EmailAuthClient | null> }) {
  const route = (operation: (request: Request, client: EmailAuthClient) => Promise<Response>) => async (request: Request) => {
    try {
      if (!isSameOriginMutation(request)) throw new AccountHTTPError(403, "invalid_origin");
      if (!deps.enabled()) throw new AccountHTTPError(503, "account_service_unavailable");
      const client = await deps.client();
      if (!client) throw new AccountHTTPError(503, "account_service_unavailable");
      return await operation(request, client);
    } catch (error) { return accountErrorResponse(error); }
  };
  return {
    send: route(async (request, client) => {
      const body = await boundedAccountBody(request, 1_024);
      const email = emailAddress(body.email);
      // Missing accounts, delivery errors and provider rate limits have one response.
      // Completing this request does not prove that an email was sent.
      try { await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }); } catch { /* No account-existence disclosure. */ }
      return accountJSON({ accepted: true });
    }),
    verify: route(async (request, client) => {
      const body = await boundedAccountBody(request, 1_024);
      const email = emailAddress(body.email);
      if (typeof body.code !== "string" || !/^\d{6,10}$/.test(body.code)) throw new AccountHTTPError(400, "invalid_code");
      try {
        const result = await client.auth.verifyOtp({ email, token: body.code, type: "email" });
        if (!result.error) {
          const current = await client.auth.getUser();
          if (!current.error && current.data.user && !current.data.user.is_anonymous) {
            accountUUID(current.data.user.id);
            return accountJSON({ signedIn: true, destination: "/account" });
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
