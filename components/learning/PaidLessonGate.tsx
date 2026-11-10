import Link from "next/link";
import type { LearningAccess } from "@/lib/learning/access";
import { lessonHref, trackNames, getLesson, MODULE_SAFETY_NOTE, TRACK_SAFETY_NOTE, type Lesson, type TrackId } from "@/lib/learning/curriculum";
import { checkoutAvailable } from "@/lib/checkout/config";
import { APP_STORE, OFFER, lifetimeOfferAt } from "@/lib/site";
import { BuyButton } from "@/components/paywall/BuyButton";
import styles from "./Learning.module.css";

/** Rendered on the server before any lesson instructions or session props are loaded. */
export function PaidLessonGate({ track, lesson, access, ready }: {
  track: TrackId; lesson: Pick<Lesson, "id" | "title" | "summary">; access: LearningAccess; ready: boolean;
}) {
  const moduleId = getLesson(track, lesson.id)?.module.id;
  const moduleSafety = moduleId ? MODULE_SAFETY_NOTE[moduleId as keyof typeof MODULE_SAFETY_NOTE] : undefined;
  const webCheckout = checkoutAvailable();
  // The lesson route renders per request, so this is the offer in force right now.
  const offer = lifetimeOfferAt(new Date());
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href={`/learn/${track}`}>{trackNames[track]}</Link></nav>
    <header className={styles.hero}><p className={styles.badge}>Lifetime access required</p><h1>{lesson.title}</h1><p>{lesson.summary}</p></header>
    <section className={styles.panel} aria-labelledby="lesson-access-title">
      <h2 id="lesson-access-title">Unlock the full lesson</h2>
      <p>GuitarHub lessons require verified lifetime access for this learning track.</p>
      {webCheckout
        ? <p>Lifetime access is {offer.oneTime}, and one purchase opens every guided lesson.</p>
        : <p>Lifetime access is {offer.oneTime} in {APP_STORE.name} for iPhone. Start the first module free in the app, then one purchase opens the full guitar and voice curriculum.</p>}
      {offer.launchNote && <p>{offer.launchNote}</p>}
      <p>{OFFER.guarantee}</p>
      <p className={styles.notice}>{!ready
        ? "This topic is a curriculum outline. A complete guided lesson is not available yet."
        : access.status === "unavailable"
          ? "We could not verify your purchase. Try again shortly. Your saved practice history is kept."
          : !access.enabled && !webCheckout
            ? "Web purchase verification is not available yet. Purchase or restore lifetime access in GuitarHub for iPhone to continue lessons in the app."
            : access.accountId
              ? "This account does not have verified lifetime access for this track. Use the account linked to your purchase."
              : "Sign in with the account linked to your lifetime purchase to open this lesson."}</p>
      <p className={styles.small}>{TRACK_SAFETY_NOTE[track]}</p>
      {moduleSafety && <p className={styles.small}>{moduleSafety}</p>}
      <div className={styles.actions}>
        <BuyButton checkoutAvailable={webCheckout} className={styles.primary} offer={offer} />
        {access.enabled && <Link className={styles.secondary} href={`/account?next=${encodeURIComponent(lessonHref(track, lesson.id))}`}>{access.accountId ? "Check purchase access" : "Sign in to unlock"}</Link>}
        <Link className={styles.secondary} href="/practice">Use the free practice tools</Link>
      </div>
    </section>
  </>;
}
