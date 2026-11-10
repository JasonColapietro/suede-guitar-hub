import { PaidLessonGate } from "@/components/learning/PaidLessonGate";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allLessons, getLesson, isTrackId, lessonHref, trackNames } from "@/lib/learning/curriculum";
import { getLessonInstructions } from "@/lib/learning/instructions";
import { canOpenModule, hasVerifiedTrackAccess, isLessonReady } from "@/lib/learning/access";
import { isFreeModuleCandidate } from "@/lib/learning/free-module";
import { checkoutAvailable } from "@/lib/checkout/config";
import { FreeModuleLesson } from "@/components/learning/FreeModuleLesson";
import { FreeModuleEnd } from "@/components/learning/FreeModuleEnd";
import { singCompanionForLesson } from "@/lib/learning/voice-proof";
import { voiceEditorialForLesson } from "@/lib/learning/voice-editorial";
import { LessonEditorialPanel } from "@/components/learning/LessonEditorial";
import { lessonGlossary } from "@/lib/learning/jargon";
import { LessonGlossary } from "@/components/learning/LessonGlossary";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
import { LessonSession } from "@/components/learning/LessonSession";
import { vocalMaterialForModule } from "@/lib/learning/vocal-material";
import styles from "@/components/learning/Learning.module.css";
import { lessonKeywords } from "@/lib/keywords";
import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";
import { cardFor } from "@/lib/og-cards";
type Params = { track: string; lessonId: string };
// Never cache a purchaser's lesson response for another visitor.
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) return {};
  const entry = getLesson(track, lessonId);
  if (!entry) return {};
  const title = `${entry.lesson.title} | GuitarHub ${trackNames[track]}`;
  const description = entry.lesson.summary;
  const canonical = `${SITE_URL}${lessonHref(track, lessonId)}`;
  // A lesson has no colocated image, so explicitly preserve the public track
  // card when replacing the layout's Open Graph object. Only the title and
  // summary already shown in the locked preview belong in share metadata.
  const image = track === "guitar" ? {
    ...OG_IMAGE,
    url: `${SITE_URL}/learn/guitar/opengraph-image/card`,
    alt: cardFor("/learn/guitar").alt,
  } : OG_IMAGE;
  return {
    title,
    description,
    keywords: lessonKeywords(track, entry.lesson.title, entry.module.name),
    alternates: { canonical },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) notFound();
  const entry = getLesson(track, lessonId);
  if (!entry) notFound();
  const { lesson, module, level } = entry;
  const access = await getVerifiedLearningAccess();
  const ready = isLessonReady(track, lesson.id);
  const available = ready && canOpenModule(track, module.id, access);
  const gate = <PaidLessonGate track={track} lesson={lesson} access={access} ready={ready} />;
  // A visitor the server has not placed may have chosen this module in the
  // browser. The lesson goes in the response and the client decides; every
  // other module stays locked here.
  const browserChoice = !available && track === "guitar" && ready && isFreeModuleCandidate(module.id) && access.freeModuleId === null;
  if (!available && !browserChoice) return gate;
  // The lesson as seen by the visitor whose free module this is.
  const viewer = browserChoice ? { ...access, freeModuleId: module.id } : access;
  const freeModule = track === "guitar" && viewer.freeModuleId === module.id && !hasVerifiedTrackAccess(track, viewer);
  const lessons = allLessons(track);
  const index = lessons.findIndex(item => item.lesson.id === lessonId);
  const previous = lessons[index - 1];
  // A measured companion for the voice lessons Sing can score. It supplements
  // the authored lesson body; it is not evidence that every voice skill is
  // measured.
  const companion = track === "voice" ? singCompanionForLesson(lesson.id) : undefined;
  // What to read and what to sing. Resolved through the contract so a renamed
  // chapter fails a test rather than rotting here.
  const editorial = track === "voice" ? voiceEditorialForLesson(lesson.id) : undefined;
  const vocalMaterial = track === "voice" ? vocalMaterialForModule(module.id) : undefined;
  const next = lessons[index + 1];
  const page = <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href={`/learn/${track}`}>{trackNames[track]}</Link><span aria-hidden="true">/</span><span>{module.name}</span></nav>
    <div className={styles.hero}><p className={styles.small}>{level.stage ? `Stage ${level.stage} · ` : ""}{module.name}{ready ? ` · ${lesson.minutes} min` : ""}</p><h1>{lesson.title}</h1><p>{lesson.summary}</p></div>
    <LessonSession key={`${access.accountId}:${lesson.id}`} track={track} lesson={lesson} module={{ id: module.id, name: module.name, promise: module.promise, skill: module.skill }} instructions={getLessonInstructions(lesson.id)} vocalMaterial={vocalMaterial} />
    {companion && <>
      <div className={styles.notice}>{companion.measured
        ? "Suede Sing measures this one. Work it there and the numbers are real."
        : "Suede Sing has the room for this, though nothing scores it yet — your ear and a recording are the evidence."}</div>
      <div className={styles.actions}><a className={styles.primary} href={companion.href}>{companion.label}</a></div>
    </>}
    <LessonGlossary terms={lessonGlossary(track, lesson.id)} />
    <LessonEditorialPanel editorial={editorial} />
    <nav className={styles.lessonNavigation} aria-label="Lesson navigation">{previous ? <Link href={lessonHref(track, previous.lesson.id)}>Previous: {previous.lesson.title}</Link> : <Link href={`/learn/${track}`}>View the path</Link>}{next && <Link href={lessonHref(track, next.lesson.id)}>{isLessonReady(track, next.lesson.id) && canOpenModule(track, next.module.id, viewer) ? "Next" : "Preview next"}: {next.lesson.title}</Link>}</nav>
    {freeModule && <FreeModuleEnd moduleId={module.id} checkoutAvailable={checkoutAvailable()} />}
  </>;
  return browserChoice ? <FreeModuleLesson moduleId={module.id} locked={gate}>{page}</FreeModuleLesson> : page;
}
