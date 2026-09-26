import type { Metadata } from "next";
import Link from "next/link";
import { CourseIndex } from "@/components/tone/CourseIndex";
import { TONE_COURSE_MINUTES, TONE_LESSONS, TONE_MODULES, toneLessonHref } from "@/lib/tone/course";
import { OG_IMAGE, SITE_URL, spellOut } from "@/lib/site";
import learning from "@/components/learning/Learning.module.css";
import styles from "@/components/tone/Tone.module.css";

const url = `${SITE_URL}/tone`;
const title = "Free Guitar Tone Course: Pickups, Amps, Pedals and Recording | GuitarHub";
// Counts are read from the course data, never typed: a lesson added to a
// module changes this line too.
const description = `A free ${TONE_LESSONS.length}-lesson guitar tone course: pickups, amps, pedals, signal chain, pedal power, recording and ${TONE_MODULES.find(part => part.id === "recipes")?.lessons.length ?? 0} tone recipes you can build and hear.`;
const hours = Math.round(TONE_COURSE_MINUTES / 30) / 2;

export const metadata: Metadata = {
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";

/** One Course node, with every lesson as a part of it, generated from the course data. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Course",
  "@id": `${url}#course`,
  name: "Guitar tone course",
  description,
  url,
  inLanguage: "en-US",
  isAccessibleForFree: true,
  provider: { "@id": SUEDE_ORG_ID },
  author: { "@id": JASON_PERSON_ID },
  educationalLevel: "Beginner to advanced",
  teaches: TONE_MODULES.map(part => part.title),
  timeRequired: `PT${TONE_COURSE_MINUTES}M`,
  offers: { "@type": "Offer", category: "Free", price: "0", priceCurrency: "USD" },
  hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: `PT${TONE_COURSE_MINUTES}M` },
  hasPart: TONE_LESSONS.map(lesson => ({
    "@type": "LearningResource",
    "@id": `${SITE_URL}${toneLessonHref(lesson.id)}#lesson`,
    name: lesson.title,
    url: `${SITE_URL}${toneLessonHref(lesson.id)}`,
    description: lesson.summary,
    timeRequired: `PT${lesson.minutes}M`,
  })),
};

export default function ToneCourse() {
  const first = TONE_LESSONS[0];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
    <header className={learning.hero}>
      <p className={styles.eyebrow}>Tone course · free</p>
      <h1>Where your tone<br />actually comes from.</h1>
      <p>{TONE_LESSONS.length} lessons in {spellOut(TONE_MODULES.length)} modules, about {hours} hours with the exercises. It follows the signal from the string to the speaker: pickups, amps, pedals, the order you plug them in, the power that keeps them quiet, how to record the result, and recipes for the sounds you came here for.</p>
      <div className={learning.actions}>
        <Link className={learning.primary} href={toneLessonHref(first.id)}>Start with {first.title.toLowerCase()}</Link>
        <Link className={learning.secondary} href="/tools/pedal-lab">Open the pedal lab</Link>
      </div>
      <p className={learning.small}>Every lesson ends with something to try on your own gear or in the browser tools, and a short check. No account: what you finish is kept in this browser.</p>
    </header>
    <CourseIndex />
    <section className={styles.panel} aria-labelledby="tone-tools">
      <h2 id="tone-tools">Tools the course uses</h2>
      <p className={learning.small}>Hear the ideas instead of taking them on trust. Each runs in your browser, and nothing is uploaded.</p>
      <div className={learning.actions}>
        <Link className={learning.secondary} href="/tools/pedal-lab">Pedal lab</Link>
        <Link className={learning.secondary} href="/tools/eq-ear-trainer">EQ ear trainer</Link>
        <Link className={learning.secondary} href="/tools/intonation-checker">Intonation checker</Link>
        <Link className={learning.secondary} href="/tools">All tools</Link>
      </div>
    </section>
  </>;
}
