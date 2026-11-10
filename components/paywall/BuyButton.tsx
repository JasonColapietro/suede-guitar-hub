"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/tracker";
import { APP_STORE, type LifetimeOffer } from "@/lib/site";

/**
 * Web checkout when it is available; otherwise the App Store, where lifetime access is also sold.
 * `offer` is the offer the server priced for this request. Without it (a page with no
 * per-request render) the label carries no amount and the price appears on the Stripe page.
 */
export function BuyButton({ checkoutAvailable, email, className, offer }: { checkoutAvailable: boolean; email?: string; className?: string; offer?: LifetimeOffer }) {
  const [state, setState] = useState<"ready" | "starting" | "failed">("ready");

  if (!checkoutAvailable) return <a data-buy-button className={className} href={APP_STORE.ios}>{offer?.cta ?? "Get lifetime access on iPhone"}</a>;

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
    <button type="button" data-buy-button className={className} onClick={startCheckout} disabled={state === "starting"} aria-busy={state === "starting"}>{offer?.webCta ?? "Get lifetime access"}</button>
    {state === "failed" && <p role="alert">Checkout is unavailable right now. Try again.</p>}
  </>;
}
