import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unsubscribe links carry `<email>.<signature>`, both base64url: the email so the
 * link works without a database lookup, the HMAC-SHA256 so nobody can unsubscribe
 * an address they do not receive mail at.
 */
function signature(email: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`guitarhub-lead-unsubscribe\n${email}`).digest();
}

export function unsubscribeToken(email: string, secret: string): string {
  return `${Buffer.from(email, "utf8").toString("base64url")}.${signature(email, secret).toString("base64url")}`;
}

/** The email the token was issued for, or null for a forged, altered or malformed token. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  if (!secret || typeof token !== "string" || token.length > 1_024) return null;
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const email = Buffer.from(match[1], "base64url").toString("utf8");
  if (!email.includes("@")) return null;
  const given = Buffer.from(match[2], "base64url");
  const expected = signature(email, secret);
  return given.length === expected.length && timingSafeEqual(given, expected) ? email : null;
}
