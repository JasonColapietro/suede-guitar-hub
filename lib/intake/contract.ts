import { createHmac } from "node:crypto";

export const DETAIL_FIELDS = ["website", "message", "subject", "tool", "consent", "company_id", "ticket_kind", "submitted_email", "submitted_phone", "check", "run_id", "pages", "note", "product", "product_id", "plan", "amount", "currency", "order_id", "booking_id", "service", "scheduled_at", "application_id", "role", "organization", "interest", "email_confirmed", "captured_by", "provider", "user_id", "session_id", "referrer_host"] as const;
export const ATTRIBUTION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer", "landing_page", "source", "campaign", "referrer_host"] as const;
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max && value.isWellFormed() && !value.includes("\u0000");
const keys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
export const validAcknowledgement = (value: unknown): boolean => object(value) && value.accepted === true && typeof value.duplicate === "boolean";
export const signBody = (secret: string, timestamp: string, body: string): string => `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;

export function isStrictInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number.isFinite(Date.parse(value));
}

/** Strict normalized subset of the pinned draft; never used to collect arbitrary request bodies. */
export function isDraftHubEvent(value: unknown): boolean {
  if (!object(value) || !keys(value, ["id", "kind", "property", "occurredAt", "summary", "person", "details", "attribution", "canary", "suspectedSpam"])) return false;
  if (!text(value.id, 128) || !/^[A-Za-z0-9][A-Za-z0-9:_.-]{7,127}$/.test(value.id)
    || !["signup", "login", "lead", "booking", "purchase", "application", "waitlist"].includes(String(value.kind))
    || !text(value.property, 120) || !/^[a-z0-9.-]+(?:\/[a-z0-9._/-]*)?$/.test(value.property) || value.property.length < 3
    || !isStrictInstant(value.occurredAt)
    || !text(value.summary, 200) || !value.summary.trim()) return false;
  if (value.person !== undefined) {
    if (!object(value.person) || !keys(value.person, ["email", "name", "phone"])) return false;
    const person = value.person;
    if (person.email !== undefined && (!text(person.email, 320) || !/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(person.email))) return false;
    if (person.name !== undefined && !text(person.name, 120)) return false;
    if (person.phone !== undefined && (!text(person.phone, 40) || !/^[0-9+().\s-]*$/.test(person.phone))) return false;
  }
  if (value.details !== undefined && (!object(value.details) || !keys(value.details, DETAIL_FIELDS) || !Object.values(value.details).every((item) => item === null || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)) || text(item, 2000)))) return false;
  if (value.attribution !== undefined && (!object(value.attribution) || !keys(value.attribution, ATTRIBUTION_FIELDS) || !Object.values(value.attribution).every((item) => text(item, 300)))) return false;
  if (value.canary !== undefined && typeof value.canary !== "boolean") return false;
  if (value.suspectedSpam !== undefined && (!object(value.suspectedSpam) || !keys(value.suspectedSpam, ["reason"]) || !text(value.suspectedSpam.reason, 120) || !value.suspectedSpam.reason.trim())) return false;
  return true;
}
