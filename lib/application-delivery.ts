import { randomUUID } from "node:crypto";
import type { CohortApplication } from "./application.ts";
import { forwardToIntake, INTAKE_PROPERTY, intakeSummary, type IntakeEvent, type IntakeForwardResult } from "./intake-forward.ts";

/**
 * Founding-room applications are not stored on this site, so they travel two
 * durable paths at once: the Resend email to info@suedeai.ai and the Suede AI
 * lead intake hub. Either one landing means the application was delivered; the
 * visitor sees the email fallback only when both failed.
 */

export type EmailDeliveryResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "not-configured" | "failed" };

export type ApplicationDeliveryResult = {
  readonly delivered: boolean;
  readonly eventId: string;
  readonly email: EmailDeliveryResult;
  readonly intake: IntakeForwardResult;
};

export type ApplicationDeliveryOptions = {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetcher?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly now?: () => Date;
};

/** Only what the form collects. Never anything else about the applicant. */
export function applicationIntakeEvent(application: CohortApplication, eventId: string, occurredAt: string): IntakeEvent {
  return {
    id: eventId,
    kind: "application",
    property: INTAKE_PROPERTY,
    occurredAt,
    summary: intakeSummary(`GuitarHub founding room application: ${application.name}`),
    person: { email: application.email, name: application.name },
    details: {
      experience: application.experience || null,
      goal: application.goal,
    },
  };
}

export async function sendApplicationEmail(
  application: CohortApplication,
  reference: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<EmailDeliveryResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("apply: RESEND_API_KEY is unset; email path skipped", { reference });
    return { ok: false, reason: "not-configured" };
  }

  const text = [
    `New GuitarHub application`,
    ``,
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `Experience: ${application.experience || "(not given)"}`,
    `Goal: ${application.goal}`,
    ``,
    `Reference: ${reference}`,
  ].join("\n");

  let response: Response | null = null;
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GuitarHub Applications <applications@guitarhub.org>",
        to: ["info@suedeai.ai"],
        reply_to: application.email,
        subject: `GuitarHub application — ${application.name}`,
        text,
      }),
      // A hung provider must not hold the request open; the intake path still runs.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("apply: email request failed", error instanceof Error ? error.name : "unknown");
  }

  if (!response?.ok) {
    const detail = response ? await response.text().catch(() => "") : "";
    console.error("apply: email send failed", response?.status ?? "network", detail);
    return { ok: false, reason: "failed" };
  }
  return { ok: true };
}

/**
 * Sends the email and forwards to the hub in parallel, and awaits both before
 * returning so a serverless runtime cannot drop either. One event id per call:
 * the hub's retries reuse it, so a repeated forward is a no-op there.
 */
export async function deliverApplication(
  application: CohortApplication,
  options: ApplicationDeliveryOptions = {},
): Promise<ApplicationDeliveryResult> {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const eventId = `application:${randomUUID()}`;
  const occurredAt = (options.now?.() ?? new Date()).toISOString();
  const event = applicationIntakeEvent(application, eventId, occurredAt);

  const [email, intake] = await Promise.all([
    sendApplicationEmail(application, eventId, env, fetcher),
    forwardToIntake(event, env, fetcher, options.sleep).catch((): IntakeForwardResult => ({ ok: false, reason: "unreachable" })),
  ]);

  const delivered = email.ok || intake.ok;
  if (!delivered) {
    console.error("apply: application not delivered by email or intake", { eventId, email: email.reason, intake: intake.ok ? "ok" : intake.reason });
  }
  return { delivered, eventId, email, intake };
}
