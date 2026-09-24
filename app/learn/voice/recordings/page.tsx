import type { Metadata } from "next";
import Link from "next/link";
import { SavedVoiceTakes } from "@/components/learning/SavedVoiceTakes";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import styles from "@/components/learning/Learning.module.css";

export const metadata: Metadata = {
  title: "Saved Voice Takes | GuitarHub",
  description: "Play or delete the voice-lesson takes GuitarHub saved in this browser.",
  robots: { index: false, follow: true },
};

/**
 * Deliberately not redirected with the rest of /learn/voice (lib/voice-redirects.ts):
 * takes live in this origin's IndexedDB, and Suede Sing cannot reach them.
 */
export default function SavedVoiceTakesPage() {
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><span>Saved voice takes</span></nav>
    <div className={styles.hero}><h1>Saved voice takes</h1><p>The voice lessons moved to <a href={SING_VOICE_COURSE}>Suede Sing</a>, where every lesson is free. Takes you recorded in a GuitarHub voice lesson stay in this browser and were never uploaded, so they are listed here to play or delete. Clearing this site&apos;s browser data also removes them.</p></div>
    <SavedVoiceTakes />
  </>;
}
