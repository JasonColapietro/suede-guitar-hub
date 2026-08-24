"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "done" }
  | { state: "error"; message: string };

export default function ApplyForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ state: "submitting" });

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          experience: data.get("experience"),
          goal: data.get("goal"),
        }),
      });
      const result = (await response.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (result.ok) {
        setStatus({ state: "done" });
        form.reset();
      } else {
        setStatus({ state: "error", message: result.error });
      }
    } catch {
      setStatus({
        state: "error",
        message:
          "Something went wrong. Email info@suedeai.ai and we'll take it from there.",
      });
    }
  }

  if (status.state === "done") {
    return (
      <div className="rounded-3xl bg-white/10 p-8 text-center">
        <p className="font-display text-2xl text-peach">Application received.</p>
        <p className="mt-3 text-violet-soft">
          We read every application personally. Expect a reply within a few days.
        </p>
      </div>
    );
  }

  const inputClasses =
    "w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-cream placeholder:text-white/40 focus:border-violet-soft focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <label className="sr-only" htmlFor="apply-name">Name</label>
      <input
        id="apply-name"
        name="name"
        required
        maxLength={200}
        placeholder="Your name"
        className={inputClasses}
      />
      <label className="sr-only" htmlFor="apply-email">Email</label>
      <input
        id="apply-email"
        name="email"
        type="email"
        required
        maxLength={320}
        placeholder="Email address"
        className={inputClasses}
      />
      <label className="sr-only" htmlFor="apply-experience">Experience</label>
      <input
        id="apply-experience"
        name="experience"
        maxLength={500}
        placeholder="How long have you been playing?"
        className={inputClasses}
      />
      <label className="sr-only" htmlFor="apply-goal">Goal</label>
      <textarea
        id="apply-goal"
        name="goal"
        rows={4}
        maxLength={2000}
        placeholder="What would real progress look like for you this year?"
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="mt-2 rounded-full bg-peach px-8 py-4 font-semibold text-indigo-deep transition hover:brightness-105 disabled:opacity-60"
      >
        {status.state === "submitting" ? "Submitting…" : "Submit application"}
      </button>
      {status.state === "error" ? (
        <p role="alert" className="text-sm text-peach">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
