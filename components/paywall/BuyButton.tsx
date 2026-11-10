"use client";

import { useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/tracker";
import { APP_STORE, LIFETIME_LAUNCH_ENDS, lifetimeOfferAt, type LifetimeOffer } from "@/lib/site";

/** setTimeout's longest delay; a launch end further away than this is picked up on the next render. */
const LONGEST_TIMEOUT_MS = 2_147_483_647;

function subscribeToLaunchEnd(onChange: () => void): () => void {
  const wait = LIFETIME_LAUNCH_ENDS.getTime() - Date.now();
  if (wait <= 0 || wait > LONGEST_TIMEOUT_MS) return () => {};
  const timer = setTimeout(onChange, wait);
  return () => clearTimeout(timer);
}

const offerNow = () => lifetimeOfferAt(new Date());

/**
 * The offer in force, read when the component renders, and re-read at the launch
 * end instant while the page stays open. A page built during the launch and
 * opened after it shows the regular price once it hydrates.
 */
export function useLifetimeOffer(): LifetimeOffer {
  return useSyncExternalStore(subscribeToLaunchEnd, offerNow, offerNow);
}

/** Web checkout when it is available; otherwise the App Store, where lifetime access is also sold. */
export function BuyButton({ checkoutAvailable, email, className }: { checkoutAvailable: boolean; email?: string; className?: string }) {
  const offer = useLifetimeOffer();
  const [state, setState] = useState<"ready" | "starting" | "failed">("ready");

  if (!checkoutAvailable) return <a data-buy-button className={className} href={APP_STORE.ios}>{offer.cta}</a>;

  async function startCheckout() {
    setState("starting");
    try { track({ name: "checkout_started", platform: "web" }); } catch { /* Measurement never blocks a purchase. */ }
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      const body: unknown = await response.json();
      const url = response.ok && typeof body === "object" && body !== null && "url" in body ? body.url : null;
      if (typeof url !== "string") throw new Error("checkout_unavailable");
      window.location.assign(url);
    } catch {
      setState("failed");
    }
  }

  return <>
    <button type="button" data-buy-button className={className} onClick={startCheckout} disabled={state === "starting"} aria-busy={state === "starting"}>{offer.webCta}</button>
    {state === "failed" && <p role="alert">Checkout is unavailable right now. Try again.</p>}
  </>;
}
