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

function invalid(): never { throw new AccountHTTPError(400, "invalid_lead"); }

/** Validates the request body. `guideId` names a Field Guide and belongs only to a guide lead. */
export function parseLead(body: unknown): Lead {
  if (!body || typeof body !== "object" || Array.isArray(body)) invalid();
  const { email, source, placement, guideId } = body as Record<string, unknown>;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid();
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
