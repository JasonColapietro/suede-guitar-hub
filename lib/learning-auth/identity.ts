import { accountUUID } from "../learning-account/contracts.ts";
import { AccountHTTPError } from "./http.ts";

export function parseAccountBearer(authorization: string | null | undefined): string | null {
  if (authorization === null || authorization === undefined) return null;
  const token = authorization.match(/^Bearer ([^\s]{1,8192})$/i)?.[1];
  if (!token) throw new AccountHTTPError(401, "sign_in_required");
  return token;
}

/** Only a fresh provider lookup may produce identity; decoded cookie/JWT data is never an input. */
export async function verifiedProviderUser<T extends { id: string; is_anonymous?: boolean }>(lookup: () => Promise<{ data: { user: T | null }; error: { status?: number } | null }>): Promise<T | null> {
  let result;
  try { result = await lookup(); } catch { throw new AccountHTTPError(503, "account_service_unavailable"); }
  if (result.error && (result.error.status === undefined || result.error.status >= 500)) throw new AccountHTTPError(503, "account_service_unavailable");
  if (result.error || !result.data.user || result.data.user.is_anonymous) return null;
  try { accountUUID(result.data.user.id); } catch { return null; }
  return result.data.user;
}
