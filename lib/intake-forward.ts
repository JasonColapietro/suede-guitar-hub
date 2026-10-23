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
  const body = JSON.stringify(event);
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
