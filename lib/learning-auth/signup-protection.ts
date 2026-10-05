import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { AccountHTTPError } from "./http.ts";

export type RateResult = { success: boolean; reason?: string };
/** No raw email/IP is stored by this guard. Redis keys are keyed digests. */
export function createSignupProtection(deps: {
  configuration(): { salt: string; vercel: boolean } | null;
  checkBot(): Promise<{ isBot: boolean }>;
  limit(bucket: "send-ip" | "send-email" | "verify-ip" | "verify-email", identity: string): Promise<RateResult>;
}) {
  return async (request: Request, action: "send" | "verify", email: string) => {
    const config = deps.configuration();
    if (!config || !config.vercel || config.salt.length < 32) throw new AccountHTTPError(503, "account_service_unavailable");
    // Vercel overwrites this header. Never trust arbitrary X-Forwarded-For.
    const ip = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (!ip || !isIP(ip)) throw new AccountHTTPError(503, "account_service_unavailable");
    const bot = await deps.checkBot();
    if (bot.isBot) throw new AccountHTTPError(403, "verification_required");
    const digest = (value: string) => createHmac("sha256", config.salt).update(value).digest("hex");
    for (const [kind, value] of [["ip",ip],["email",email]] as const) {
      const result = await deps.limit(`${action}-${kind}`, digest(`${kind}:${value}`));
      if (result.reason === "timeout") throw new AccountHTTPError(503, "account_service_unavailable");
      if (!result.success) throw new AccountHTTPError(429, "try_again_later");
    }
  };
}
