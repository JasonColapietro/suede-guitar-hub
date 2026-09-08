import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { TuningGuide } from "@/components/learning/TuningGuide";
import { Metronome } from "@/components/practice/Metronome";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import learningStyles from "@/components/learning/Learning.module.css";
import styles from "@/components/practice/PracticeTools.module.css";

const title = "Free Guitar Tuner and Metronome | GuitarHub";
const description = "Tune your guitar one string at a time, hear standard tuning references, and practice with a steady four-beat metronome. Free in your browser, with no account.";
const url = `${SITE_URL}/practice`;
const application = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": `${url}#tool`,
  name: "Guitar tuner and metronome", description, url, applicationCategory: "EducationalApplication",
  operatingSystem: "Web", browserRequirements: "Requires JavaScript and Web Audio. The tuner also requires a secure connection and microphone permission.",
  isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};
export const metadata: Metadata = {
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

export default function PracticePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(application) }} />
    <a className={learningStyles.skip} href="#practice-main">Skip to practice tools</a><SiteNav />
    <main id="practice-main" className={learningStyles.shell}>
      <nav className={learningStyles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn/guitar">Guitar lessons</Link><span aria-hidden="true">/</span><span aria-current="page">Practice</span></nav>
      <header className={learningStyles.hero}><p className={styles.eyebrow}>The practice room</p><h1>Tune up.<br />Find your tempo.</h1><p>Check your strings, then play along with the click. These tools are free to use on their own, before a lesson or during your own practice.</p><div className={styles.links}><a className={learningStyles.secondary} href="#metronome-title">Metronome</a><a className={learningStyles.secondary} href="#tuner">Guitar tuner</a><Link className={learningStyles.secondary} href="/learn/guitar/routine">A/D practice routine</Link></div></header>
      <div className={styles.tools}><Metronome /><div className={styles.tuner} id="tuner"><TuningGuide /></div></div>
      <p className={learningStyles.notice}>The tuner asks for microphone access when you start it. Audio is processed in this browser and is not uploaded or saved. The metronome and reference tones do not need microphone permission. Starting another audio tool stops the current one; leaving this page or hiding the tab stops the sound and microphone.</p>
      <p className={learningStyles.small}>Use one string at a time. The tuner shows pitch and octave, not complete chords or a lesson score. These tools do not record lesson completion.</p>
      <div className={styles.links}><Link className={learningStyles.primary} href="/learn/guitar">Back to guitar lessons</Link><Link className={learningStyles.secondary} href="/tools">More practice tools</Link></div>
    </main><SiteFooter />
  </>;
}
