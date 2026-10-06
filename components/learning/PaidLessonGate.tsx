import Link from "next/link";
import type { LearningAccess } from "@/lib/learning/access";
import { lessonHref, trackNames, getLesson, MODULE_SAFETY_NOTE, TRACK_SAFETY_NOTE, type Lesson, type TrackId } from "@/lib/learning/curriculum";
import { APP_STORE } from "@/lib/site";
import styles from "./Learning.module.css";

/** Rendered on the server before any lesson instructions or session props are loaded. */
export function PaidLessonGate({ track, lesson, access, ready }: {
  track: TrackId; lesson: Pick<Lesson, "id" | "title" | "summary">; access: LearningAccess; ready: boolean;
}) {
  const moduleId = getLesson(track, lesson.id)?.module.id;
  const moduleSafety = moduleId ? MODULE_SAFETY_NOTE[moduleId as keyof typeof MODULE_SAFETY_NOTE] : undefined;
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href={`/learn/${track}`}>{trackNames[track]}</Link></nav>
    <header className={styles.hero}><p className={styles.badge}>Lifetime access required</p><h1>{lesson.title}</h1><p>{lesson.summary}</p></header>
    <section className={styles.panel} aria-labelledby="lesson-access-title">
      <h2 id="lesson-access-title">Unlock the full lesson</h2>
      <p>GuitarHub lessons require verified lifetime access for this learning track.</p>
      <p className={styles.notice}>{!ready
        ? "This topic is a curriculum outline. A complete guided lesson is not available yet."
        : access.status === "unavailable"
          ? "We could not verify your purchase. Try again shortly. Your saved practice history is kept."
          : !access.enabled
            ? "Web purchase verification is not available yet. Purchase or restore lifetime access in GuitarHub for iPhone to continue lessons in the app."
            : access.accountId
              ? "This account does not have verified lifetime access for this track. Use the account linked to your purchase."
              : "Sign in with the account linked to your lifetime purchase to open this lesson."}</p>
      <p className={styles.small}>{TRACK_SAFETY_NOTE[track]}</p>
      {moduleSafety && <p className={styles.small}>{moduleSafety}</p>}
      <div className={styles.actions}>
        {access.enabled && <Link className={styles.primary} href={`/account?next=${encodeURIComponent(lessonHref(track, lesson.id))}`}>{access.accountId ? "Check purchase access" : "Sign in to unlock"}</Link>}
        {!access.enabled && <a className={styles.primary} href={APP_STORE.ios}>Continue in GuitarHub for iPhone</a>}
        <Link className={styles.secondary} href="/practice">Use the free practice tools</Link>
      </div>
    </section>
  </>;
}
