import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isTrackId, trackNames } from "@/lib/learning/curriculum";
import { LearningPath } from "@/components/learning/LearningPath";
import { OG_IMAGE, SITE_URL } from "@/lib/site";
import styles from "@/components/learning/Learning.module.css";
export function generateStaticParams() { return [{ track: "guitar" }, { track: "voice" }]; }

/**
 * The `openGraph` and `twitter` blocks carry this track's own title, copy and
 * URL. Without them Next falls back to the root layout's, so a share of the
 * guitar path — the destination of the site-wide "Start learning" link —
 * previewed as the home page.
 *
 * `images` is required alongside them: a page-level `openGraph` key replaces
 * the layout's resolved object wholesale, and a block without `images` ships no
 * `og:image` at all. See OG_IMAGE in lib/site.ts.
 */
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  const canonical = `${SITE_URL}/learn/${track}`;
  const title = `Learn ${track} step by step | GuitarHub`;
  const description = `Follow the GuitarHub ${track} curriculum from the first foundations. Free first module, guided practice, and browser-local progress.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "GuitarHub",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();
  return <><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><span>{trackNames[track]}</span></nav><LearningPath track={track} /></>;
}
