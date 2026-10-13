"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PracticeWorkspaceState } from "@/lib/practice-workspace";

/** Load the tool validators after hydration, keeping them out of the initial
 * homepage bundle. All reads stay local and no new storage format is created. */
export default function PracticeWorkspace({ compact = false }: { compact?: boolean }) {
  const [workspace, setWorkspace] = useState<PracticeWorkspaceState | null>(null);
  useEffect(() => {
    let disposed = false;
    let detach = () => {};
    void import("@/lib/practice-workspace").then(({ readPracticeWorkspace, WORKSPACE_KEYS }) => {
      if (disposed) return;
      const refresh = () => setWorkspace(readPracticeWorkspace((key) => window.localStorage.getItem(key)));
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || WORKSPACE_KEYS.some((key) => key === event.key)) refresh();
      };
      const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
      refresh();
      window.addEventListener("storage", onStorage);
      window.addEventListener("pageshow", refresh);
      document.addEventListener("visibilitychange", onVisible);
      detach = () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("pageshow", refresh);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }).catch(() => { /* Core tool links and server-rendered page remain usable. */ });
    return () => { disposed = true; detach(); };
  }, []);

  if (compact && !workspace?.hasSavedWork) return null;
  const heading = workspace?.hasSavedWork ? "Pick up where you left off." : "Make this session count.";
  return (
    <section aria-labelledby="practice-workspace-title" className={compact ? "mx-auto max-w-6xl px-6 pt-12" : "my-10"}>
      <div className="rounded-3xl border border-indigo-deep/10 bg-white p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet">Your practice workspace</p>
            <h2 id="practice-workspace-title" className="mt-2 font-display text-2xl text-indigo-deep sm:text-3xl">{heading}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/70">Your plan, session, tempo work, and evidence together. Saved in this browser.</p>
          </div>
          <Link href={compact ? "/practice#practice-workspace-title" : workspace?.next.href ?? "/session"}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-indigo-deep px-5 py-3 text-sm font-semibold text-cream hover:bg-indigo-mid">
            {compact ? "Open your workspace" : workspace?.next.label ?? "Build this session"} <span aria-hidden className="ml-2">→</span>
          </Link>
        </div>
        {workspace?.storageUnavailable && <p role="status" className="mt-4 text-sm text-ink/70">This browser is blocking access to saved practice. You can still open and use every tool below.</p>}
        {!compact && workspace && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {workspace.cards.map((card) => (
              <Link key={card.href} href={card.href} className="group flex min-w-0 flex-col rounded-2xl border border-indigo-deep/10 bg-cream/60 p-5 transition hover:border-violet/40 hover:bg-cream">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet">{card.label}</p>
                <h3 className="mt-2 font-display text-xl text-indigo-deep">{card.title}</h3>
                <p className="mt-2 text-sm font-semibold text-ink/80">{card.metric}</p>
                {card.percent !== null && <progress aria-label={`${card.label}: checked progress`} aria-valuetext={card.metric} value={card.percent} max={100} className="practice-workspace-progress mt-3 h-2 w-full" />}
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink/70">{card.detail}</p>
                <span className="mt-4 text-sm font-semibold text-indigo-deep group-hover:underline">{card.cta} <span aria-hidden>→</span></span>
              </Link>
            ))}
          </div>
        )}
        {!compact && !workspace && <p className="mt-5 text-sm text-ink/70">Open the <Link href="/session" className="font-semibold underline">session builder</Link>, <Link href="/breakthrough" className="font-semibold underline">30-day planner</Link>, <Link href="/tempo" className="font-semibold underline">tempo ladder</Link>, or <Link href="/log" className="font-semibold underline">practice log</Link>.</p>}
        {!compact && <p className="mt-5 text-xs leading-relaxed text-ink/60">Checked steps are your practice record. Compare recordings and logged results to judge what improved. Browser data stays on this device; export your evidence log to keep a backup.</p>}
      </div>
    </section>
  );
}
