import type { Metadata } from "next";
import Link from "next/link";
import { LabIndex } from "@/components/advanced/LabIndex";
import { PracticeStats } from "@/components/interactive/PracticeStats";
import { DRILLS, SKILL_AREAS } from "@/lib/advanced/drills";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/advanced/Advanced.module.css";

const url = `${SITE_URL}/advanced`;
const title = "Advanced Guitar Drills with Live Feedback | GuitarHub Advanced Lab";
const description = `${DRILLS.length} free scored drills for experienced guitarists: legato, sweeps, bends, modes, guide tones, syncopated sixteenths, ear training, fretboard, improvisation, etudes and tone.`;

export const metadata: Metadata = {
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

export default function AdvancedLab() {
  return <>
    <header className={learning.hero}>
      <p className={styles.eyebrow}>Advanced Lab · free</p>
      <h1>Past the basics.<br />Now make it clean at tempo.</h1>
      <p>{DRILLS.length} drills across the {SKILL_AREAS.length} skill areas a complete player needs. Practice mode waits for every note. Play mode scores the whole pass at tempo, and the coach tells you when to push faster.</p>
      <div className={learning.actions}>
        <Link className={learning.primary} href={`/advanced/${DRILLS[0].id}`}>Start with legato</Link>
        <Link className={learning.secondary} href="/learn/guitar#stage-6">Stage 6 and 7 lessons</Link>
      </div>
      <p className={learning.small}>The coach listens through your microphone, so a quiet room works best. Nothing is recorded or uploaded, and results stay in this browser.</p>
      <PracticeStats editable />
    </header>
    <LabIndex />
  </>;
}
