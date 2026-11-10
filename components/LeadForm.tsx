"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { track } from "@/lib/analytics/tracker";
import { FIELD_GUIDES, fieldGuidePdf } from "@/lib/field-guides";
import type { Placement } from "@/lib/learning/free-module";
import { browserStorage, readFreeModuleChoice } from "@/lib/learning/free-module-store";

/** The printable pack every plan email links; the plan form opens it on this page too. */
export const CHART_PACK_PDF = "/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf";

type LeadSource = "plan" | "guide";

/** The `POST /api/leads` body: the shared lead contract plus the `company` honeypot, which people leave empty. */
export type LeadRequestBody = { email: string; source: LeadSource; placement?: Placement; guideId?: string; company: string };

export function leadRequestBody(input: { email: string; source: LeadSource; guideId?: string; placement: Placement | null; company: string }): LeadRequestBody {
  return {
    email: input.email.trim(),
    source: input.source,
    ...(input.placement ? { placement: input.placement } : {}),
    ...(input.guideId ? { guideId: input.guideId } : {}),
    company: input.company,
  };
}

export type LeadOutcome = "sent" | "invalid" | "failed";
export type LeadFetch = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status">>;

/** Posts the lead. Resolves to what happened and never throws, so no caller waits on or breaks over it. */
export async function sendLead(fetchFn: LeadFetch, body: LeadRequestBody): Promise<LeadOutcome> {
  try {
    const response = await fetchFn("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) return "sent";
    return response.status === 400 ? "invalid" : "failed";
  } catch {
    return "failed";
  }
}

function download(source: LeadSource, guideId?: string): { href: string; label: string } {
  const guide = source === "guide" ? FIELD_GUIDES.find((entry) => entry.slug === guideId) : undefined;
  if (guide) return { href: fieldGuidePdf(guide), label: "Download the PDF" };
  return { href: CHART_PACK_PDF, label: "Download the chord and pentatonic chart pack (PDF)" };
}

const STATUS: Record<"sending" | LeadOutcome, (email: string, source: LeadSource) => string> = {
  sending: (email) => `Sending to ${email}.`,
  sent: (email, source) => source === "guide"
    ? `On its way to ${email}: the guide, a 30-day plan and practice tips.`
    : `On its way to ${email}: your plan and practice tips.`,
  invalid: (email) => `${email} did not go through. Check the address and send it again.`,
  failed: () => "The email did not send just now. Send it again in a minute.",
};

/**
 * One email field and one button. Submitting opens the download on the spot and
 * posts the lead in the background: the server sends the first email before it
 * answers, which can take seconds, so nothing here waits on it, and a failed
 * post still leaves the download open.
 */
export function LeadForm({ source, guideId, buttonLabel, onSubmitted }: { source: LeadSource; guideId?: string; buttonLabel: string; onSubmitted?(): void }) {
  const id = useId();
  const honeypot = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | LeadOutcome>("idle");
  const file = download(source, guideId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = leadRequestBody({
      email,
      source,
      guideId,
      placement: readFreeModuleChoice(browserStorage())?.placement ?? null,
      company: honeypot.current?.value ?? "",
    });
    setUnlocked(true);
    setSentTo(body.email);
    setStatus("sending");
    try { track({ name: "magnet_submitted", source }); } catch { /* Measurement never blocks the download. */ }
    try { onSubmitted?.(); } catch { /* The caller's extra never blocks the download either. */ }
    void sendLead((url, init) => fetch(url, init), body).then(setStatus);
  }

  const showForm = status === "idle" || status === "invalid" || status === "failed";

  return (
    <div data-lead-form={source} className="text-left">
      {unlocked ? (
        <a
          href={file.href}
          download
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-deep"
        >
          {file.label} <span aria-hidden>↓</span>
        </a>
      ) : null}
      <p role="status" aria-live="polite" className={status === "idle" ? "sr-only" : "mt-3 text-sm text-ink/80"}>
        {status === "idle" ? "" : STATUS[status](sentTo, source)}
      </p>
      {showForm ? (
        <form onSubmit={submit} className={unlocked ? "mt-3 flex flex-col gap-3" : "flex flex-col gap-3"}>
          <label htmlFor={`${id}-email`} className="text-sm font-semibold text-indigo-deep">
            Your email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-indigo-deep/20 bg-white px-4 text-base text-ink"
          />
          {/* Honeypot: people never see or reach it and send it empty; a filled one marks a bot. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor={`${id}-company`}>Company</label>
            <input id={`${id}-company`} ref={honeypot} type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-indigo-deep px-6 py-3 font-semibold text-cream transition hover:bg-violet"
          >
            {buttonLabel} <span aria-hidden>→</span>
          </button>
          <p className="text-xs text-ink/70">We&apos;ll email your plan and practice tips. Unsubscribe any time.</p>
        </form>
      ) : null}
    </div>
  );
}
