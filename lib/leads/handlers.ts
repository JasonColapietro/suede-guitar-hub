import { createHash, timingSafeEqual } from "node:crypto";
import { isSameOriginMutation } from "../learning-auth/config.ts";
import { AccountHTTPError, accountErrorResponse, accountJSON, boundedAccountBody } from "../learning-auth/http.ts";
import { SITE_URL } from "../site.ts";
import { parseLead, type Lead, type StoredLead } from "./contract.ts";
import { dueEmailIndex, sequenceEmail } from "./sequence.ts";
import { unsubscribeToken, verifyUnsubscribeToken } from "./token.ts";

export type EmailMessage = { subject: string; text: string; html: string };

export type LeadDependencies = {
  /** Inserts the lead unless the email is already stored; an existing row (unsubscribed or not) is left as it is. */
  storeLead(lead: Lead): Promise<"created" | "existing">;
  /** Subscribed leads with an email due at `now`, oldest first. */
  dueLeads(now: Date, limit: number): Promise<StoredLead[]>;
  /** Records email `index` as sent; a no-op unless the lead is still at `index` and subscribed. */
  markSent(email: string, index: number): Promise<void>;
  unsubscribe(email: string): Promise<void>;
  /** Resolves only when the provider accepted the message. */
  send(to: string, message: EmailMessage, unsubscribeUrl: string): Promise<void>;
  /** The unsubscribe-token key; null when unset, and then no email is sent. */
  secret(): string | null;
  cronSecret(): string | null;
  now(): Date;
};

/** A send the provider refused for this address (a 4xx that retrying cannot fix). The lead is retired, not retried. */
export class PermanentSendError extends Error {}

/** The provider's answer to a send: 4xx other than auth (401, 403), timeout (408), conflict (409) and rate limit (429) is permanent; the rest retry. */
export function sendFailureForStatus(status: number): Error {
  const permanent = status >= 400 && status < 500 && ![401, 403, 408, 409, 429].includes(status);
  return permanent ? new PermanentSendError(`resend_${status}`) : new Error(`resend_${status}`);
}

/** Leads one daily run handles. */
export const DISPATCH_LIMIT = 200;
/** A run stops after this many failed sends in a row: the provider is down, and tomorrow's run retries. */
const CONSECUTIVE_FAILURE_LIMIT = 3;

const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function page(status: number, heading: string, message: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<meta name="robots" content="noindex"><title>${heading} | GuitarHub</title></head>`
    + `<body style="font-family:Georgia,serif;background:#f7f3ee;color:#251152;max-width:560px;margin:0 auto;padding:48px 16px;line-height:1.5">`
    + `<h1>${heading}</h1><p>${message}</p><p><a href="${SITE_URL}/" style="color:#251152">Back to GuitarHub</a></p></body></html>`;
  return new Response(html, { status, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
}

function sameSecret(given: string | null, expected: string): boolean {
  if (given === null) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string, secret: string): string {
  return `${SITE_URL}/api/leads/unsubscribe?token=${unsubscribeToken(email, secret)}`;
}

export function createLeadHandlers(deps: LeadDependencies) {
  /** Sends email `index` and records it only after the provider accepts it. Never throws: a failure waits for the daily run. */
  async function deliver(lead: Lead, index: number, now: Date): Promise<"sent" | "failed" | "rejected"> {
    const secret = deps.secret();
    if (!secret) { console.error("leads: unsubscribe secret is unset; email waits for the daily run"); return "failed"; }
    const url = unsubscribeUrl(lead.email, secret);
    try {
      await deps.send(lead.email, sequenceEmail(index, lead, url, now), url);
    } catch (error) {
      console.error("leads: send failed", index, error instanceof Error ? error.message : "unknown");
      if (error instanceof PermanentSendError) {
        // The provider will never take this address. Retire it with the existing
        // unsubscribed_at marker so it is not retried and does not hold up other leads.
        try { await deps.unsubscribe(lead.email); } catch { console.error("leads: could not retire a rejected address"); }
        return "rejected";
      }
      return "failed";
    }
    try { await deps.markSent(lead.email, index); }
    catch { console.error("leads: email sent but not recorded", index); }
    return "sent";
  }

  async function unsubscribeFromRequest(request: Request): Promise<"done" | "invalid" | "unavailable"> {
    const secret = deps.secret();
    if (!secret) return "unavailable";
    const email = verifyUnsubscribeToken(new URL(request.url).searchParams.get("token") ?? "", secret);
    if (!email) return "invalid";
    try { await deps.unsubscribe(email); return "done"; }
    catch { console.error("leads: unsubscribe failed"); return "unavailable"; }
  }

  return {
    /** `POST /api/leads`. Same-origin browser posts only: a missing or foreign Origin is refused. */
    async submit(request: Request): Promise<Response> {
      try {
        if (!isSameOriginMutation(request)) throw new AccountHTTPError(403, "invalid_origin");
        const body = await boundedAccountBody(request, 1_024);
        // Honeypot: the form's hidden `company` field stays empty for people. A filled one is a bot:
        // answer exactly as for success, store and send nothing.
        const company = body && typeof body === "object" ? (body as Record<string, unknown>).company : undefined;
        if (typeof company === "string" && company.trim() !== "") return new Response(null, { status: 204, headers: NO_STORE });
        const lead = parseLead(body);
        let stored: "created" | "existing";
        try { stored = await deps.storeLead(lead); }
        catch { console.error("leads: store failed"); return accountJSON({ error: "lead_service_unavailable" }, 503); }
        // Only a new lead gets email 1 here. A repeat submission, or an unsubscribed
        // address submitted again, gets nothing; an unsent email 1 goes out on the daily run.
        if (stored === "created") await deliver(lead, 0, deps.now());
        return new Response(null, { status: 204, headers: NO_STORE });
      } catch (error) {
        return accountErrorResponse(error);
      }
    },

    /** `GET /api/leads/unsubscribe?token=…`: unsubscribes and shows a confirmation page. */
    async unsubscribe(request: Request): Promise<Response> {
      const result = await unsubscribeFromRequest(request);
      if (result === "invalid") return page(400, "Link not recognised", "This unsubscribe link is incomplete. Open the Unsubscribe link at the foot of any GuitarHub email to stop the emails.");
      if (result === "unavailable") return page(503, "Try again in a minute", "We could not update your email settings just now. Open the same link again in a minute to finish unsubscribing.");
      return page(200, "You are unsubscribed", "GuitarHub will send you no more plan or practice emails. Your free module and practice tools stay open on guitarhub.org.");
    },

    /** `POST /api/leads/unsubscribe?token=…`: the one-click unsubscribe the List-Unsubscribe-Post header announces. */
    async unsubscribePost(request: Request): Promise<Response> {
      const result = await unsubscribeFromRequest(request);
      const status = result === "done" ? 200 : result === "invalid" ? 400 : 503;
      return new Response(null, { status, headers: NO_STORE });
    },

    /** `GET /api/leads/dispatch`: the daily Vercel Cron run that sends every due email, one per lead. */
    async dispatch(request: Request): Promise<Response> {
      const cronSecret = deps.cronSecret();
      if (!cronSecret || !sameSecret(request.headers.get("authorization"), `Bearer ${cronSecret}`)) return accountJSON({ error: "unauthorized" }, 401);
      if (!deps.secret()) { console.error("leads: unsubscribe secret is unset; dispatch skipped"); return accountJSON({ error: "lead_service_unavailable" }, 503); }
      const now = deps.now();
      let leads: StoredLead[];
      try { leads = await deps.dueLeads(now, DISPATCH_LIMIT); }
      catch { console.error("leads: due leads query failed"); return accountJSON({ error: "lead_service_unavailable" }, 503); }
      let sent = 0, failed = 0, rejected = 0, failedInARow = 0;
      for (const stored of leads.slice(0, DISPATCH_LIMIT)) {
        const index = dueEmailIndex(stored, now);
        if (index === null) continue;
        const { email, source, placement, guideId } = stored;
        const lead: Lead = { email, source, ...(placement ? { placement } : {}), ...(guideId ? { guideId } : {}) };
        // Only provider trouble (5xx, 429, timeout) counts toward the breaker; a rejected address does not.
        const result = await deliver(lead, index, now);
        if (result === "sent") { sent += 1; failedInARow = 0; }
        else if (result === "rejected") rejected += 1;
        else { failed += 1; failedInARow += 1; if (failedInARow >= CONSECUTIVE_FAILURE_LIMIT) break; }
      }
      return accountJSON({ sent, failed, rejected });
    },
  };
}
