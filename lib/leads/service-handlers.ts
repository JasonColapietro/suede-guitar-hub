import { createHash } from "node:crypto";
import { serviceBackend } from "../learning-auth/backend";
import type { Lead, Placement, StoredLead } from "./contract";
import { createLeadHandlers, type EmailMessage } from "./handlers";
import { SEQUENCE_DAYS, sequenceCutoff } from "./sequence";

/** Inserts the lead; an existing row (including an unsubscribed one) is left untouched. */
async function storeLead(lead: Lead): Promise<"created" | "existing"> {
  const result = await serviceBackend().from("guitarhub_leads")
    .upsert({ email: lead.email, source: lead.source, placement: lead.placement ?? null, guide_id: lead.guideId ?? null }, { onConflict: "email", ignoreDuplicates: true })
    .select("email");
  if (result.error) throw new Error("lead_store_failed");
  return (result.data?.length ?? 0) > 0 ? "created" : "existing";
}

/** Subscribed leads whose next email is due, filtered in the database with the cut-offs `dueEmailIndex` uses. */
async function dueLeads(now: Date, limit: number): Promise<StoredLead[]> {
  const due = SEQUENCE_DAYS.map((_, index) => `and(emails_sent.eq.${index},created_at.lt."${sequenceCutoff(index, now).toISOString()}")`).join(",");
  const result = await serviceBackend().from("guitarhub_leads")
    .select("email,source,placement,guide_id,created_at,emails_sent,unsubscribed_at")
    .is("unsubscribed_at", null).lt("emails_sent", SEQUENCE_DAYS.length).or(due)
    .order("created_at", { ascending: true }).limit(limit);
  if (result.error) throw new Error("lead_query_failed");
  return (result.data ?? []).map((row) => ({
    email: row.email as string, source: row.source as Lead["source"],
    ...(row.placement ? { placement: row.placement as Placement } : {}),
    ...(row.guide_id ? { guideId: row.guide_id as string } : {}),
    createdAt: row.created_at as string, emailsSent: row.emails_sent as number, unsubscribedAt: (row.unsubscribed_at as string | null) ?? null,
  }));
}

/** Guarded on the current count, so a duplicate cron run or a racing submit never skips an email. */
async function markSent(email: string, index: number): Promise<void> {
  const result = await serviceBackend().from("guitarhub_leads")
    .update({ emails_sent: index + 1, last_sent_at: new Date().toISOString() })
    .eq("email", email).eq("emails_sent", index).is("unsubscribed_at", null);
  if (result.error) throw new Error("lead_mark_failed");
}

async function unsubscribe(email: string): Promise<void> {
  const result = await serviceBackend().from("guitarhub_leads")
    .update({ unsubscribed_at: new Date().toISOString() }).eq("email", email).is("unsubscribed_at", null);
  if (result.error) throw new Error("lead_unsubscribe_failed");
}

/** Resend's default team limit is a few requests a second; one instance spaces its sends to stay under it. */
const SEND_SPACING_MS = 550;
let nextSendAt = 0;

async function send(to: string, message: EmailMessage, unsubscribeUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("resend_key_unset");
  const wait = nextSendAt - Date.now();
  nextSendAt = Math.max(Date.now(), nextSendAt) + SEND_SPACING_MS;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // The same email to the same person within 24 hours is sent once, whichever of
      // the form and the daily run gets there first.
      "Idempotency-Key": `guitarhub-lead-${createHash("sha256").update(`${to}\n${message.subject}`).digest("hex")}`,
    },
    body: JSON.stringify({
      from: "GuitarHub <plan@guitarhub.org>",
      to: [to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
    // A hung provider must not hold the form or the daily run open.
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`resend_${response.status}`);
}

export const leadHandlers = createLeadHandlers({
  storeLead, dueLeads, markSent, unsubscribe, send,
  secret: () => process.env.GUITARHUB_LEADS_UNSUBSCRIBE_SECRET?.trim() || null,
  cronSecret: () => process.env.CRON_SECRET || null,
  now: () => new Date(),
});
