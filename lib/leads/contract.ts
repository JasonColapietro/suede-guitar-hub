import { FIELD_GUIDES } from "../field-guides.ts";
import type { Placement } from "../learning/free-module.ts";
import { normalizeEmail } from "../learning-account/stripe.ts";
import { AccountHTTPError } from "../learning-auth/http.ts";
import { PLAYER_LEVELS } from "../levels.ts";

export type { Placement };

/** The body of `POST /api/leads` (shared contract), with the email normalized. */
export type Lead = { email: string; source: "plan" | "guide"; placement?: Placement; guideId?: string };

/** A lead as the database holds it, with its place in the five-email sequence. */
export type StoredLead = Lead & { createdAt: string; emailsSent: number; unsubscribedAt: string | null };

const PLACEMENTS: readonly string[] = PLAYER_LEVELS.map((level) => level.id);
const GUIDE_SLUGS: readonly string[] = FIELD_GUIDES.map((guide) => guide.slug);

/** Conservative address check: only what the email provider accepts, so a bad address is refused before anything is stored or sent. */
export function isDeliverableEmail(value: string): boolean {
  const email = value.trim();
  if (email.length > 254) return false;
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@")) return false;
  const local = email.slice(0, at), domain = email.slice(at + 1);
  if (local.length > 64 || !/^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)*$/.test(local)) return false;   // no leading, trailing or consecutive dots
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) return false;
  return /^(?:[A-Za-z]{2,24}|xn--[A-Za-z0-9-]{2,59})$/.test(labels[labels.length - 1]);
}

function invalid(): never { throw new AccountHTTPError(400, "invalid_lead"); }

/** Validates the request body. `guideId` names a Field Guide and belongs only to a guide lead. */
export function parseLead(body: unknown): Lead {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid();
  const { email, source, placement, guideId } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isDeliverableEmail(email)) invalid();
  if (source !== "plan" && source !== "guide") invalid();
  const lead: Lead = { email: normalizeEmail(email), source };
  if (placement !== undefined && placement !== null) {
    if (typeof placement !== "string" || !PLACEMENTS.includes(placement)) invalid();
    lead.placement = placement as Placement;
  }
  if (source === "guide") {
    if (typeof guideId !== "string" || !GUIDE_SLUGS.includes(guideId)) invalid();
    lead.guideId = guideId;
  } else if (guideId !== undefined && guideId !== null) invalid();
  return lead;
}
