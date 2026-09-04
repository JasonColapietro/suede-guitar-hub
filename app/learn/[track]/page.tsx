import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isTrackId, trackNames } from "@/lib/learning/curriculum";
import { LearningPath } from "@/components/learning/LearningPath";
import styles from "@/components/learning/Learning.module.css";
export function generateStaticParams() { return [{ track: "guitar" }, { track: "voice" }]; }
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  return { title: `Learn ${track} step by step | GuitarHub`, description: `Follow the GuitarHub ${track} curriculum from the first foundations. Free first module, guided practice, and browser-local progress.`, alternates: { canonical: `/learn/${track}` } };
}
export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();
  return <><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><span>{trackNames[track]}</span></nav><LearningPath track={track} /></>;
}
