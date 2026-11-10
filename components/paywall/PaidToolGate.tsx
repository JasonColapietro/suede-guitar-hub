"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useLearningAccess } from "@/components/learning/LearningAccessProvider";
import { hasVerifiedTrackAccess, type LearningAccess } from "@/lib/learning/access";
import { fetchPaidAccess } from "@/lib/paywall/remote-access";
import { OFFER, PAID_TOOLS, type LifetimeOffer } from "@/lib/site";
import { Paywall } from "./Paywall";

/** "practice session builder, song readiness score and practice evidence log", from the registry. */
const PAID_TOOL_NAMES = (() => {
  const names = PAID_TOOLS.map((tool) => tool.title.charAt(0).toLowerCase() + tool.title.slice(1));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names.join("");
})();

type PaidToolGateProps = {
  checkoutAvailable: boolean;
  /** Where signing in returns the visitor: the page this gate sits on. */
  returnTo: string;
  /** A fixed, non-interactive example of the tool's output, rendered on the server. */
  preview: ReactNode;
  /** Priced by the server; without it the panel leaves the amount to the paywall's checkout. */
  offer?: LifetimeOffer;
  /**
   * The access a server layout already verified. When given, the gate decides
   * from it and makes no request; when omitted, it asks the access endpoint.
   */
  access?: LearningAccess;
  /** The working tool, rendered only for verified lifetime access. */
  children: ReactNode;
};

/**
 * A lifetime-access tool on a public page. Until the visitor's guitar access is
 * verified it shows the server-rendered preview and an offer panel whose button
 * opens the paywall; once verified it renders the tool itself. The page around
 * it keeps its introduction either way, so it stays indexable.
 */
export function PaidToolGate({ checkoutAvailable, returnTo, preview, offer, access, children }: PaidToolGateProps) {
  const [remote, setRemote] = useState<"open" | "locked">("locked");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const titleId = useId();
  const asksServer = access === undefined;

  useEffect(() => {
    if (!asksServer) return;
    let cancelled = false;
    void fetchPaidAccess((input, init) => fetch(input, init)).then((result) => { if (!cancelled) setRemote(result); });
    return () => { cancelled = true; };
  }, [asksServer]);

  const open = access ? hasVerifiedTrackAccess("guitar", access) : remote === "open";
  if (open) return <>{children}</>;

  return <div data-paid-tool-gate className="grid gap-6">
    {preview}
    <section aria-labelledby={titleId} className="rounded-3xl bg-indigo-deep p-7 text-cream md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-pale">Included with lifetime access</p>
      <h2 id={titleId} className="mt-3 font-display text-3xl leading-snug">Open this tool with lifetime access.</h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
        {offer ? `Lifetime access is ${offer.oneTime}.` : "Lifetime access is one purchase."} It opens the {PAID_TOOL_NAMES}, the Advanced Lab drills, the A-to-D chord routine and every guided guitar lesson, for good.
      </p>
      {offer?.launchNote && <p className="mt-3 text-sm text-white/70">{offer.launchNote}</p>}
      <p className="mt-3 max-w-2xl font-semibold text-peach">{OFFER.guarantee}</p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <button type="button" onClick={() => setPaywallOpen(true)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105">
          Unlock lifetime access
        </button>
        <p className="text-sm text-white/75">Already have lifetime access? <Link className="underline underline-offset-4" href={`/account?next=${encodeURIComponent(returnTo)}`}>Sign in</Link></p>
      </div>
    </section>
    <Paywall trigger="locked_item" open={paywallOpen} onClose={() => setPaywallOpen(false)} checkoutAvailable={checkoutAvailable} returnTo={returnTo} offer={offer} />
    <span data-paid-tool-gate-end hidden></span>
  </div>;
}

/** The gate inside the learn layout, which has already verified access: no second request. */
export function LearningPaidToolGate(props: Omit<PaidToolGateProps, "access">) {
  return <PaidToolGate {...props} access={useLearningAccess()} />;
}
