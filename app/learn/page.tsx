import type { Metadata } from "next";
import Link from "next/link";
import { allLessons, curricula } from "@/lib/learning/curriculum";
import { isLessonReady } from "@/lib/learning/access";
import { APP_STORE, OG_IMAGE, SITE_URL, spellOut } from "@/lib/site";
import styles from "@/components/learning/Learning.module.css";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import { keywordsFor } from "@/lib/keywords";

const CANONICAL = `${SITE_URL}/learn`;
const TITLE = "Guitar Curriculum & Voice Learning Paths | GuitarHub";
const DESCRIPTION =
  "Browse the GuitarHub guitar curriculum with lifetime lesson access, try free chord practice, or follow the voice learning path on Suede Sing.";

/**
 * The `openGraph` and `twitter` blocks are the point of this object, not
 * decoration. Without them Next resolves the root layout's, so a share of this
 * page previewed as the home page: same title, same description, same card.
 *
 * `images` is required alongside them. A page-level `openGraph` key replaces
 * the layout's resolved object wholesale, taking the file-convention card with
 * it, so a block without `images` ships no `og:image` at all. See OG_IMAGE in
 * lib/site.ts.
 */
export const metadata: Metadata = {
  keywords: keywordsFor("/learn"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};
export default function LearnPage() {
  // Stage lessons and popular-song companions are different kinds of lesson,
  // so the card counts them separately instead of adding them into one total.
  const guitarLessons = allLessons("guitar");
  const stageLessons = guitarLessons.filter(entry => entry.level.stage).length;
  const songCompanions = guitarLessons.length - stageLessons;
  const stages = curricula.guitar.levels.filter(level => level.stage).length;
  const hasOutlines = (["guitar", "voice"] as const).some(track => allLessons(track).some(entry => !isLessonReady(track, entry.lesson.id)));
  return <>
    <div className={styles.hero}><h1>Choose your guitar or voice learning path.</h1><p>Explore the guitar curriculum here or continue to voice lessons on Suede Sing. Guitar lessons open with lifetime access from GuitarHub for iPhone; the A-to-D chord practice routine is free.</p></div>
    <div className={styles.tracks}>
      {(["guitar", "voice"] as const).map((track) => <section className={styles.track} key={track}>
        <svg className={styles.instrument} viewBox="0 0 400 80" aria-hidden="true">
          {track === "guitar" ? [0,1,2,3,4,5].map(i => <line key={i} x1="0" x2="400" y1={10+i*12} y2={10+i*12} stroke="currentColor" strokeWidth={1+i*.2} opacity={.2+i*.12} />) : <path d="M0 40 H25 Q35 8 45 40 T65 40 T85 40 Q95 72 105 40 Q115 0 125 40 T145 40 Q155 80 165 40 Q180 -12 195 40 T225 40 Q240 8 255 40 T285 40 Q295 65 305 40 H400" fill="none" stroke="currentColor" strokeWidth="2" />}
        </svg>
        <h2>{track === "guitar" ? "Guitar" : "Voice"}</h2>
        <p>{track === "guitar" ? "From your first clean note to open chords, a steady strum, and a song you can finish." : "From an easy breath to a steady tone, comfortable pitch matching, and your first song."}</p>
        {track === "guitar"
          ? <p className={styles.small}>{stageLessons} lessons in {spellOut(stages)} stages · {songCompanions} song companions · Lifetime access</p>
          : <p className={styles.small}>Moved to Suede Sing, where all seven stages are free. Your <Link href="/learn/voice/recordings">saved voice takes</Link> and the lifetime <Link href="/learn/voice/materials">voice practice library</Link> stay here.</p>}
        {track === "guitar"
          ? <Link className={styles.primary} href="/learn/guitar">Explore guitar</Link>
          : <a className={styles.primary} href={SING_VOICE_COURSE}>Voice lessons on Suede Sing</a>}
      </section>)}
    </div>
    <div className={styles.actions}><Link className={styles.secondary} href="/practice">Open the tuner and metronome</Link><Link className={styles.secondary} href="/learn/guitar/routine">Practice A-to-D chord changes</Link></div>
    <div className={styles.notice}>Unlock every guided guitar lesson with lifetime access, a one-time purchase in <a href={APP_STORE.ios}>{APP_STORE.name}</a> for iPhone; the App Store shows the price before you confirm. The tuner, metronome, practice routine and Advanced Lab are free. Web progress is saved in this browser. <Link href="/faq#how-to-get-lifetime-access">How lifetime access works</Link></div>
    <section className={styles.hero}><h2 className="font-display text-3xl mb-4">Learn it. Practice it. Try it through.</h2><p>{hasOutlines ? "Written lessons and curriculum outlines give each session a focus." : "Written lessons give each session a focus."} Where a microphone exercise is available, you can practice first and then play a measured attempt. For other lessons, you record your own assessment. A completed session records that you practiced, and a measured attempt shows what you can play.</p></section>
  </>;
}
