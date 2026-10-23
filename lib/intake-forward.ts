import { createHmac } from "node:crypto";

/**
 * Lead intake sender: reports an identified person to the Suede AI lead intake
 * hub (Agent Studio) through one signed endpoint. Port of the reference sender
 * in Agent Studio's docs/intake/CONTRACT.md; keep the two in step.
 *
 * Server code only: it reads SUEDE_INTAKE_SECRET and node:crypto, so never
 * import it from a client component. Signups and logins on the shared Supabase
 * project are captured by database triggers, never sent from here.
 */

export type IntakeKind = "signup" | "login" | "lead" | "booking" | "purchase" | "application" | "waitlist";

export interface IntakeEvent {
  readonly id: string;
  readonly kind: IntakeKind;
  readonly property: string;
  readonly occurredAt: string;
  readonly summary: string;
  readonly person?: { readonly email?: string; readonly name?: string; readonly phone?: string };
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
  readonly attribution?: Readonly<Record<string, string>>;
  readonly canary?: boolean;
  readonly suspectedSpam?: { readonly reason: string };
}

export type IntakeForwardResult =
  | { readonly ok: true; readonly duplicate: boolean }
  | { readonly ok: false; readonly reason: "not-configured" | "rejected" | "unreachable" };

/** Every GuitarHub event names the host the person used. */
export const INTAKE_PROPERTY = "guitarhub.org";
/** The hub turns the summary into an email subject and refuses anything longer. */
export const INTAKE_SUMMARY_MAX = 200;

const DEFAULT_URL = "https://agents.suedeai.ai/api/intake/events";
const BACKOFF_MS = [0, 400, 1_200] as const;

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** One line, at most the hub's summary limit. */
export function intakeSummary(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, INTAKE_SUMMARY_MAX);
}

// The hub validates every event and answers 400 to anything outside its
// schema, and a 400 is never retried, so a lead that fails validation is lost.
// Events are shaped to pass before they are sent. Ported from suede-seo's
// site/lib/intake.cjs.

/** The hub's person.name limit. */
export const INTAKE_NAME_MAX = 120;
/** Bodies over this are refused with 413; the contract caps senders at 32 KB. */
export const INTAKE_MAX_BODY_BYTES = 32_768;
const DETAIL_VALUE_MAX = 2_000;
const MAX_DETAILS = 40;
const DETAIL_KEY = /^[A-Za-z0-9_.-]{1,64}$/;
/** zod's email rule, which is what the hub runs. */
const HUB_EMAIL = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

type DetailValue = string | number | boolean | null;

/** Cut to a UTF-16 length (what the hub's max() counts) without splitting a surrogate pair. */
function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  let end = max - 1;
  const code = value.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1;
  return `${value.slice(0, end)}…`;
}

function bytes(body: string): number {
  return Buffer.byteLength(body, "utf8");
}

/**
 * The event the hub will accept. A name is collapsed to one line and cut to
 * 120 characters. An email the site accepted but the hub's validator refuses
 * (for example `a@b.c`) moves to `details.submitted_email`, first so the
 * 40-key cap cannot drop it, and the event still lands with the address
 * readable on the ticket. Detail strings are cut to 2,000 characters.
 */
export function prepareIntakeEvent(event: IntakeEvent): IntakeEvent {
  const person: { email?: string; name?: string; phone?: string } = {};
  const rescued: Record<string, DetailValue> = {};
  const email = event.person?.email?.trim() ?? "";
  if (email && email.length <= 320 && HUB_EMAIL.test(email)) person.email = email;
  else if (email) rescued.submitted_email = clip(email, 320);
  const name = clip((event.person?.name ?? "").replace(/\s+/g, " ").trim(), INTAKE_NAME_MAX);
  if (name) person.name = name;
  if (event.person?.phone) person.phone = event.person.phone;

  const details: Record<string, DetailValue> = {};
  for (const [key, value] of Object.entries({ ...rescued, ...(event.details ?? {}) })) {
    if (Object.keys(details).length >= MAX_DETAILS) break;
    if (!DETAIL_KEY.test(key) || value === undefined) continue;
    details[key] = typeof value === "string" ? clip(value, DETAIL_VALUE_MAX) : value;
  }

  return {
    ...event,
    person: Object.keys(person).length ? person : undefined,
    details: Object.keys(details).length ? details : undefined,
  };
}

/**
 * Serializes the event at no more than 32,768 bytes. Over the cap, the longest
 * detail string is halved until it fits; if details alone cannot get it there,
 * details and then attribution are dropped. Identity, summary and person are
 * bounded by the schema and always kept.
 */
export function intakeBody(event: IntakeEvent): string {
  let body = JSON.stringify(event);
  if (bytes(body) <= INTAKE_MAX_BODY_BYTES) return body;
  const details: Record<string, DetailValue> = { ...(event.details ?? {}) };
  for (;;) {
    let longest: string | null = null;
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === "string" && value.length > 1 && (longest === null || value.length > (details[longest] as string).length)) longest = key;
    }
    if (longest === null) break;
    const value = details[longest] as string;
    details[longest] = clip(value, Math.ceil(value.length / 2));
    body = JSON.stringify({ ...event, details });
    if (bytes(body) <= INTAKE_MAX_BODY_BYTES) return body;
  }
  // JSON.stringify leaves out undefined fields.
  body = JSON.stringify({ ...event, details: undefined });
  if (bytes(body) <= INTAKE_MAX_BODY_BYTES) return body;
  return JSON.stringify({ ...event, details: undefined, attribution: undefined });
}

/**
 * Signs and posts one event. Retries 429, 5xx and network errors up to three
 * attempts (0 ms, 400 ms, 1,200 ms; 4 s timeout each) and never retries 400,
 * 401 or 413. Never throws: the caller decides what a failed forward means.
 */
export async function forwardToIntake(
  event: IntakeEvent,
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<IntakeForwardResult> {
  const source = env.SUEDE_INTAKE_SOURCE?.trim();
  const secret = env.SUEDE_INTAKE_SECRET;
  if (!source || !secret || Buffer.byteLength(secret, "utf8") < 32) {
    console.error("[intake] not configured: set SUEDE_INTAKE_SOURCE and SUEDE_INTAKE_SECRET", { id: event.id });
    return { ok: false, reason: "not-configured" };
  }
  const url = env.SUEDE_INTAKE_URL?.trim() || DEFAULT_URL;
  const body = intakeBody(prepareIntakeEvent(event));
  for (const delay of BACKOFF_MS) {
    if (delay > 0) await sleep(delay);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex")}`;
    try {
      const response = await fetcher(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-suede-intake-source": source,
          "x-suede-intake-timestamp": timestamp,
          "x-suede-intake-signature": signature,
        },
        body,
        signal: AbortSignal.timeout(4_000),
      });
      if (response.status === 202) {
        const json = (await response.json().catch(() => null)) as { duplicate?: unknown } | null;
        return { ok: true, duplicate: json?.duplicate === true };
      }
      if (response.status === 400 || response.status === 401 || response.status === 413) {
        console.error("[intake] rejected", { id: event.id, status: response.status });
        return { ok: false, reason: "rejected" };
      }
    } catch {
      // Network error or timeout: retry.
    }
  }
  console.error("[intake] unreachable after retries", { id: event.id });
  return { ok: false, reason: "unreachable" };
}
