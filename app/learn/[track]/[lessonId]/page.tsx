import { PaidLessonGate } from "@/components/learning/PaidLessonGate";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allLessons, getLesson, isTrackId, lessonHref, trackNames } from "@/lib/learning/curriculum";
import { getLessonInstructions } from "@/lib/learning/instructions";
import { canOpenModule, isLessonReady } from "@/lib/learning/access";
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
type Params = { track: string; lessonId: string };
// Never cache a purchaser's lesson response for another visitor.
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) return {};
  const entry = getLesson(track, lessonId);
  if (!entry) return {};
  return { title: `${entry.lesson.title} | GuitarHub ${trackNames[track]}`, description: entry.lesson.summary, keywords: lessonKeywords(track, entry.lesson.title, entry.module.name), alternates: { canonical: lessonHref(track, lessonId) },
  robots: { index: false, follow: true } };
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
  if (!available) return <PaidLessonGate track={track} lesson={lesson} access={access} ready={ready} />;
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
  return <>
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
    <nav className={styles.lessonNavigation} aria-label="Lesson navigation">{previous ? <Link href={lessonHref(track, previous.lesson.id)}>Previous: {previous.lesson.title}</Link> : <Link href={`/learn/${track}`}>View the path</Link>}{next && <Link href={lessonHref(track, next.lesson.id)}>{isLessonReady(track, next.lesson.id) && canOpenModule(track, next.module.id, access) ? "Next" : "Preview next"}: {next.lesson.title}</Link>}</nav>
  </>;
}
