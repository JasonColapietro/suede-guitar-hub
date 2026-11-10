"use client";

import Link from "next/link";
import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from "react";
import type { PaywallTrigger } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/tracker";
import { OFFER, type LifetimeOffer } from "@/lib/site";
import { BuyButton } from "./BuyButton";
import styles from "./Paywall.module.css";

/**
 * The lifetime offer as a modal dialog. `showModal()` makes the rest of the page
 * inert, so focus stays inside while it is open. Escape, a tap on the backdrop
 * or the close button each close it in one step.
 */
export function Paywall({ trigger, open, onClose, checkoutAvailable, returnTo, offer }: {
  trigger: PaywallTrigger; open: boolean; onClose(): void; checkoutAvailable: boolean; returnTo: string;
  /** Priced by the server for this request; without it the price line is left out. */
  offer?: LifetimeOffer;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    try { track({ name: "paywall_viewed", trigger }); } catch { /* Measurement never blocks the offer. */ }
  }, [open, trigger]);

  if (!open) return null;

  function closeOnEscape(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onClose();
  }
  // The browser's own cancel (Escape, the Android back gesture) leaves closing to the owner of `open`.
  function closeOnCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }
  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onKeyDown={closeOnEscape} onCancel={closeOnCancel} onClick={closeOnBackdrop}>
    <div className={styles.body}>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><span aria-hidden="true">×</span></button>
      <p className={styles.kicker}>Lifetime access</p>
      <h2 id={titleId} className={styles.title}>{OFFER.promise}</h2>
      {offer && <p className={styles.price}>
        {offer.launch && <><s className={styles.regular} aria-hidden="true">{offer.regularDisplay}</s>{" "}</>}
        <strong>{offer.display}</strong> one time
      </p>}
      {offer?.launchNote && <p className={styles.note}>{offer.launchNote}</p>}
      <p>One purchase opens the full guitar and voice curriculum for good, with practice you can check at every step.</p>
      <p className={styles.guarantee}>{OFFER.guarantee}</p>
      <BuyButton checkoutAvailable={checkoutAvailable} className={styles.buy} offer={offer} />
      <p className={styles.signIn}>Already have lifetime access? <Link href={`/account?next=${encodeURIComponent(returnTo)}`}>Sign in</Link></p>
    </div>
  </dialog>;
}
