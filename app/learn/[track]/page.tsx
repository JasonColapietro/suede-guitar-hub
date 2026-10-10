import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isTrackId, trackNames } from "@/lib/learning/curriculum";
import { LearningPath } from "@/components/learning/LearningPath";
import { APP_STORE, SITE_URL } from "@/lib/site";
import { trackKeywords } from "@/lib/keywords";
import styles from "@/components/learning/Learning.module.css";
import { FieldGuideShelf } from "@/components/FieldGuides";
import { BreadcrumbJsonLd } from "@/components/Breadcrumbs";
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
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  const canonical = `${SITE_URL}/learn/${track}`;
  const title =
    track === "guitar"
      ? "Beginner Guitar Lessons, Step by Step | GuitarHub"
      : "Free Voice Lessons & Vocal Training | GuitarHub";
  const description =
    track === "guitar"
      ? "Beginner guitar lessons from first notes to open chords, strumming, and songs. Unlock every lesson with lifetime access in GuitarHub for iPhone."
      : "Practice 21 free guided voice lessons from GuitarHub's 102-lesson voice curriculum, with breath, pitch, registers, songs, and Suede Sing exercises.";
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
  return <><BreadcrumbJsonLd crumbs={[{ name: "Learning paths", href: "/learn" }, { name: trackNames[track], href: `/learn/${track}` }]} /><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><span>{trackNames[track]}</span></nav><div className={styles.notice}><p>Every guided lesson opens with lifetime access, a one-time purchase in {APP_STORE.name} for iPhone. The App Store shows the price before you confirm, and Restore Purchases brings your access back on a new iPhone. Questions about pricing, access or your data are answered in <Link href="/faq">the GuitarHub FAQ</Link>.</p><div className={styles.actions}><a className={styles.primary} href={APP_STORE.ios}>Get lifetime access on iPhone</a><Link className={styles.secondary} href="/faq#how-to-get-lifetime-access">How lifetime access works</Link></div></div><p className={styles.small}>New to the vocabulary? <Link href="/glossary">The glossary</Link> defines every word this curriculum uses, in one sentence each.</p><LearningPath track={track} /><FieldGuideShelf id="lesson-field-guides" title="Take a field guide with you" intro="Free PDFs to keep beside the lessons. Download one, put it on the music stand, and come back to the next lesson." hrefs={["/method", "/how-to-practice-guitar-effectively", "/practicing-guitar-with-a-metronome", "/how-to-memorize-songs-on-guitar", "/guitar-practice-plateau", "/resources/how-to-practice-clean-guitar-tone"]} moreHref="/guides#field-guides" /></>;
}
