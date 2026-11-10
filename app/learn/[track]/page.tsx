import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isTrackId, trackNames } from "@/lib/learning/curriculum";
import { LearningPath } from "@/components/learning/LearningPath";
import { learningPathOutline } from "@/lib/learning/path-outline";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import { APP_STORE, LIFETIME, OFFER, SITE_URL, lifetimeOfferAt } from "@/lib/site";
import { BuyButton } from "@/components/paywall/BuyButton";
import { checkoutAvailable } from "@/lib/checkout/config";
import { trackKeywords } from "@/lib/keywords";
import styles from "@/components/learning/Learning.module.css";
import { FieldGuideShelf } from "@/components/FieldGuides";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { GUITAR_COURSE_ID, guitarCourseJsonLd, jsonLdText } from "@/lib/course-schema";
import { pageJsonLd } from "@/lib/page-schema";
// Voice is not served here: /learn/voice redirects to the course on Suede Sing
// (lib/voice-redirects.ts), so only the guitar path is generated.
export function generateStaticParams() { return [{ track: "guitar" }]; }

/**
 * The `openGraph` and `twitter` blocks carry this track's own title, copy and
 * URL. Without them Next falls back to the root layout's, so a share of the
 * guitar path — the destination of the site-wide "Start learning" link —
 * previewed as the home page.
 *
 * They deliberately carry no `images` key: the colocated opengraph-image.tsx
 * and twitter-image.tsx supply this track's own card, and Next attaches a
 * colocated card only when the page leaves `images` unset.
 */
/** One source for the title and description, read by the metadata and the WebPage node. */
function trackCopy(track: "guitar" | "voice") {
  return track === "guitar"
    ? {
        title: "Beginner Guitar Lessons, Step by Step | GuitarHub",
        description: `Beginner guitar lessons from first notes to open chords, the pentatonic scale and your first solo. Start free, then unlock every lesson for ${LIFETIME.display}.`,
      }
    : {
        title: "Free Voice Lessons & Vocal Training | GuitarHub",
        description: "Practice 21 free guided voice lessons from GuitarHub's 102-lesson voice curriculum, with breath, pitch, registers, songs, and Suede Sing exercises.",
      };
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  const canonical = `${SITE_URL}/learn/${track}`;
  const { title, description } = trackCopy(track);
  return {
    title,
    description,
    keywords: trackKeywords(track),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "GuitarHub",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();
  // The guitar path is the course: a Course node built from the curriculum
  // this page renders (lib/course-schema.ts).
  const course = track === "guitar" ? guitarCourseJsonLd() : null;
  const crumbs = [{ name: "Learning paths", href: "/learn" }, { name: trackNames[track], href: `/learn/${track}` }];
  const copy = trackCopy(track);
  // Built ahead of time: priced from the offer in force at build.
  const offer = lifetimeOfferAt(new Date());
  const page = pageJsonLd({
    canonical: `${SITE_URL}/learn/${track}`,
    name: copy.title,
    description: copy.description,
    ...(course ? { mainEntity: GUITAR_COURSE_ID } : {}),
    crumbs,
    breadcrumbs: false,
  });
  return <>{course && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(course) }} />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(page) }} /><BreadcrumbJsonLd crumbs={crumbs} /><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><span>{trackNames[track]}</span></nav><div className={styles.notice}><p>Every guided lesson opens with lifetime access: {offer.oneTime}, bought on guitarhub.org or in {APP_STORE.name} for iPhone. One purchase covers both when you sign in with the same email. Your first module is free: <Link href="/start">take the five-question placement</Link> and start it today. Questions about pricing, access or your data are answered in <Link href="/faq">the GuitarHub FAQ</Link>.</p>{offer.launchNote && <p>{offer.launchNote}</p>}<p>{OFFER.guarantee}</p><div className={styles.actions}><BuyButton checkoutAvailable={checkoutAvailable()} offer={offer} className={styles.primary} /><Link className={styles.secondary} href="/faq#how-to-get-lifetime-access">How lifetime access works</Link></div></div><p className={styles.small}>New to the vocabulary? <Link href="/glossary">The glossary</Link> defines every word this curriculum uses, in one sentence each.</p><LearningPath outline={learningPathOutline(track)} singCourseHref={SING_VOICE_COURSE} /><FieldGuideShelf id="lesson-field-guides" title="Take a field guide with you" intro="Free PDFs to keep beside the lessons. Download one, put it on the music stand, and come back to the next lesson." hrefs={["/method", "/how-to-practice-guitar-effectively", "/practicing-guitar-with-a-metronome", "/how-to-memorize-songs-on-guitar", "/guitar-practice-plateau", "/resources/how-to-practice-clean-guitar-tone"]} moreHref="/guides#field-guides" /></>;
}
