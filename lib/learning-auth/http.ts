import { isSameOriginMutation } from "./config.ts";

export class AccountHTTPError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}

export function accountJSON(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store", Vary: "Cookie, Authorization",
    "X-Content-Type-Options": "nosniff",
  } });
}

/** Native Bearer requests are verified separately; browser writes require Origin. */
export function requireAccountMutationOrigin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!/^Bearer [^\s]{1,8192}$/i.test(authorization ?? "") && !isSameOriginMutation(request)) throw new AccountHTTPError(403, "invalid_origin");
}

export async function boundedAccountBody(request: Request, maximumBytes = 524_288): Promise<Record<string, unknown>> {
  if ((request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new AccountHTTPError(415, "json_required");
  const reader = request.body?.getReader();
  if (!reader) throw new AccountHTTPError(400, "invalid_body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try { chunk = await reader.read(); } catch { throw new AccountHTTPError(400, "invalid_body"); }
    const { value, done } = chunk;
    if (done) break;
    length += value.byteLength;
    if (length > maximumBytes) { try { await reader.cancel(); } catch { /* Size rejection still applies. */ } throw new AccountHTTPError(413, "body_too_large"); }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new AccountHTTPError(400, "invalid_body"); }
}

export function accountErrorResponse(error: unknown): Response {
  if (error instanceof AccountHTTPError) return accountJSON({ error: error.code }, error.status);
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const conflicts = ["purchase_owner_conflict", "purchase_event_conflict", "attempt_identity_conflict", "sync_epoch_changed", "ownership_recovery_required", "account_changed"];
  const invalid = ["invalid_uuid", "invalid_attempt", "invalid_attempt_details", "invalid_evidence", "invalid_purchase", "invalid_signed_purchase", "invalid_notification", "purchase_not_supported", "purchase_identity_mismatch", "apple_verification_failed"];
  if (conflicts.includes(code)) return accountJSON({ error: code }, 409);
  if (invalid.includes(code)) return accountJSON({ error: code }, 400);
  return accountJSON({ error: "account_service_unavailable" }, 503);
}

export function attemptCursor(value: string | null): string {
  if (value === null) return "0";
  if (!/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) throw new AccountHTTPError(400, "invalid_cursor");
  return value;
}
