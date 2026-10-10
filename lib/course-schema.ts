/**
 * The `Course` node for the guitar path at /learn/guitar.
 *
 * Built from the curriculum the page renders, so the stage list, lesson count
 * and workload cannot describe a course the page does not show. Every property
 * is one this repository can state from its own data or from the App Store
 * listing the offer points at:
 *
 * - `courseWorkload` is the sum of the authored `minutes` on every lesson.
 * - `syllabusSections` is one entry per curriculum level, in path order, with
 *   that level's own minutes.
 * - `offers.category` is "Partially Free": the listing opens the first module
 *   of each track at no charge and sells the rest as one lifetime purchase.
 *   The price is set per region by the App Store and is not in this
 *   repository, so no `price` is published.
 *
 * Nothing here asserts ratings, enrollment, instructors or credentials.
 */
import { curricula, trackNames } from "./learning/curriculum.ts";
import { APP_STORE, SITE_URL } from "./site.ts";

export const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const GUITAR_COURSE_URL = `${SITE_URL}/learn/guitar`;
export const GUITAR_COURSE_ID = `${GUITAR_COURSE_URL}#course`;

/** ISO 8601 duration for a number of minutes, e.g. 861 → "PT14H21M". */
export function isoMinutes(total: number): string {
  if (!Number.isInteger(total) || total <= 0) throw new Error(`Invalid duration: ${total}`);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}`;
}

export function guitarCourseJsonLd() {
  const levels = curricula.guitar.levels;
  const sections = levels.map((level) => {
    const lessons = level.modules.flatMap((module) => module.lessons);
    return {
      "@type": "Syllabus",
      name: level.stage ? `Stage ${level.stage}: ${level.name}` : level.name,
      description: level.subtitle,
      timeRequired: isoMinutes(lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)),
    };
  });
  const lessons = levels.flatMap((level) => level.modules.flatMap((module) => module.lessons));
  const stages = levels.filter((level) => level.stage).length;
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": GUITAR_COURSE_ID,
    url: GUITAR_COURSE_URL,
    name: "Beginner Guitar Lessons, Step by Step",
    description:
      `${lessons.length} guided ${trackNames.guitar.toLowerCase()} lessons across ${stages} stages and a set of popular-song companions, ` +
      "from tuning and a first clean note through open chords, strumming, scales, barre chords, the whole neck, style and tone. " +
      "Each lesson pairs written instruction with a practice task.",
    // The path's share card. app/learn/[track]/opengraph-image.tsx serves it
    // through generateImageMetadata under the id "card".
    image: `${GUITAR_COURSE_URL}/opengraph-image/card`,
    inLanguage: "en-US",
    educationalLevel: "Beginner",
    provider: { "@type": "Organization", "@id": SUEDE_ORG_ID, name: "Suede AI", url: "https://suedeai.ai" },
    isPartOf: { "@id": WEBSITE_ID },
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "Online",
        courseWorkload: isoMinutes(minutes),
      },
    ],
    syllabusSections: sections,
    offers: [
      {
        "@type": "Offer",
        category: "Partially Free",
        url: APP_STORE.ios,
        availability: "https://schema.org/InStock",
      },
    ],
  };
}

/** Serialized for a `<script type="application/ld+json">`, with `<` escaped. */
export function jsonLdText(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
