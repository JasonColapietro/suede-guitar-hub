"use client";

import { buildApplicationEmailFallback } from "@/lib/application";
import { useState, type FormEvent } from "react";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "done" }
  | { state: "error"; message: string; fallbackHref?: string };

export default function ApplyForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const submission = {
      name: data.get("name"),
      email: data.get("email"),
      experience: data.get("experience"),
      goal: data.get("goal"),
    };
    setStatus({ state: "submitting" });

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      const result = (await response.json()) as
        | { ok: true }
        | {
            ok: false;
            error: string;
            fallback?: { kind: "email"; address: string };
          };
      if (result.ok) {
        setStatus({ state: "done" });
        form.reset();
      } else {
        const fallbackHref =
          result.fallback?.kind === "email"
            ? buildApplicationEmailFallback(submission) ?? undefined
            : undefined;
        setStatus({ state: "error", message: result.error, fallbackHref });
      }
    } catch {
      setStatus({
        state: "error",
        message:
          "Something went wrong. Use the email fallback below and we'll take it from there.",
        fallbackHref:
          buildApplicationEmailFallback(submission) ?? undefined,
      });
    }
  }

  if (status.state === "done") {
    return (
      <div className="rounded-3xl bg-white/10 p-8 text-center">
        <p className="font-display text-2xl text-peach">Application received.</p>
        <p className="mt-3 text-violet-soft">
          We read every application personally. If the founding room fits your
          goal, we&apos;ll reply with the next step.
        </p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-cream placeholder:text-white/40 focus:border-violet-soft focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="text-sm font-semibold text-violet-soft" htmlFor="apply-name">Name</label>
      <input
        id="apply-name"
        name="name"
        required
        maxLength={200}
        autoComplete="name"
        placeholder="Your name"
        className={inputClasses}
      />
      <label className="text-sm font-semibold text-violet-soft" htmlFor="apply-email">Email</label>
      <input
        id="apply-email"
        name="email"
        type="email"
        required
        maxLength={320}
        autoComplete="email"
        placeholder="you@example.com"
        className={inputClasses}
      />
      <label className="text-sm font-semibold text-violet-soft" htmlFor="apply-experience">Playing experience</label>
      <input
        id="apply-experience"
        name="experience"
        maxLength={500}
        placeholder="Two years, mostly self-taught"
        className={inputClasses}
      />
      <label className="text-sm font-semibold text-violet-soft" htmlFor="apply-goal">Your 30-day breakthrough</label>
      <textarea
        id="apply-goal"
        name="goal"
        required
        rows={4}
        maxLength={2000}
        placeholder="Play one complete song from count-in to final chord without stopping"
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="mt-2 rounded-full bg-peach px-8 py-4 font-semibold text-indigo-deep transition hover:brightness-105 disabled:opacity-60"
      >
        {status.state === "submitting" ? "Sending application…" : "Apply to the founding room"}
      </button>
      {status.state === "error" ? (
        <div role="alert" className="grid gap-3 text-sm text-peach">
          <p>{status.message}</p>
          {status.fallbackHref ? (
            <a
              href={status.fallbackHref}
              className="inline-flex min-h-11 w-fit items-center rounded-full border border-peach/40 px-5 py-2 font-semibold underline underline-offset-4 hover:bg-white/5"
            >
              Email this application instead
            </a>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
