import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allLessons, getLesson, isTrackId, isFreeModule, isModuleAvailable, lessonHref, trackNames, MODULE_SAFETY_NOTE, TRACK_SAFETY_NOTE } from "@/lib/learning/curriculum";
import { getLessonInstructions } from "@/lib/learning/instructions";
import { canOpenModule, isLessonReady } from "@/lib/learning/access";
import { singCompanionForLesson } from "@/lib/learning/voice-proof";
import { voiceEditorialForLesson } from "@/lib/learning/voice-editorial";
import { LessonEditorialPanel } from "@/components/learning/LessonEditorial";
import { lessonGlossary } from "@/lib/learning/jargon";
import { LessonGlossary } from "@/components/learning/LessonGlossary";
import { getVerifiedLearningAccess } from "@/lib/learning-auth/access";
import { LessonSession } from "@/components/learning/LessonSession";
import styles from "@/components/learning/Learning.module.css";
type Params = { track: string; lessonId: string };
export function generateStaticParams() { return (["guitar", "voice"] as const).flatMap(track => allLessons(track).map(({ lesson }) => ({ track, lessonId: lesson.id }))); }
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) return {};
  const entry = getLesson(track, lessonId);
  if (!entry) return {};
  return { title: `${entry.lesson.title} | GuitarHub ${trackNames[track]}`, description: entry.lesson.summary, alternates: { canonical: lessonHref(track, lessonId) }, // Indexable when a visitor can actually read it: ready, and either the
  // sampler or a level the catalog declares free. Keyed to isModuleAvailable
  // alone, twenty-one readable guitar lessons were noindex.
  robots: { index: isLessonReady(track, lessonId) && (isModuleAvailable(track, entry.module.id) || isFreeModule(track, entry.module.id)), follow: true } };
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
  const moduleSafety = MODULE_SAFETY_NOTE[module.id as keyof typeof MODULE_SAFETY_NOTE] as string | undefined;
  const next = lessons[index + 1];
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href={`/learn/${track}`}>{trackNames[track]}</Link><span aria-hidden="true">/</span><span>{module.name}</span></nav>
    <div className={styles.hero}><p className={styles.small}>{level.stage ? `Stage ${level.stage} · ` : ""}{module.name}{ready ? ` · ${lesson.minutes} min` : ""}</p><h1>{lesson.title}</h1>{available ? <p>{lesson.summary}</p> : <span className={styles.badge}>{ready ? "Lesson preview" : "Curriculum outline"}</span>}</div>
    {available && <div className={styles.actions}><a className={styles.secondary} href="#practice-session">Go to practice timer</a></div>}
    {available ? <LessonSession key={`${access.accountId ?? "guest"}:${lesson.id}`} track={track} lesson={lesson} module={module} instructions={getLessonInstructions(lesson.id)} /> : <section className={styles.panel}>
      <h2>Inside this lesson</h2><p>{lesson.summary}</p><h3>Practice goal</h3><p>{module.promise}</p>
      <div className={styles.notice}>{!ready
        ? "This topic is a curriculum outline. A complete guided lesson and completion check are not available yet."
        : access.status === "unavailable"
          ? "We could not verify your lifetime access. Your saved progress is kept. Try again shortly, or continue with the free sampler."
          : access.enabled
            ? "This lesson requires Complete Lifetime access linked to your account. Sign in to the same account used for a linked iOS purchase."
            : "The first two stages of this track are free. This guided lesson is a preview while account-linked purchase access is being connected on the web."}</div>
      {/* The preview branch renders instead of LessonSession, so it carries the
          same safety note as an open guided lesson. */}
      <p className={styles.small}>{TRACK_SAFETY_NOTE[track]}</p>
      {/* And the module's own caution where the track line is not enough. The
          mixed-voice sustain and the effects module both need explicit stop
          symptoms because nothing here measures vocal strain. */}
      {moduleSafety && <p className={styles.small}>{moduleSafety}</p>}
      <div className={styles.actions}>{ready && access.enabled && <Link className={styles.primary} href={`/account?next=${encodeURIComponent(lessonHref(track, lesson.id))}`}>{access.accountId ? "View account access" : "Sign in to check access"}</Link>}<Link className={styles.secondary} href={lessonHref(track, lessons[0].lesson.id)}>Try a free {track} lesson</Link></div>
    </section>}
    {companion && <>
      <div className={styles.notice}>{companion.measured
        ? "Suede Sing measures this one. Work it there and the numbers are real."
        : "Suede Sing has the room for this, though nothing scores it yet — your ear and a recording are the evidence."}</div>
      <div className={styles.actions}><a className={styles.primary} href={companion.href}>{companion.label}</a></div>
    </>}
    {/* The words this lesson's own prose uses, resolved where they are read.
        Before this, `passaggio`, `twang`, `mix` and `pressed phonation` reached
        beginners on these pages with no definition anywhere on the site, and a
        glossary nobody is pointed at would not have changed that. Rendered
        outside the available/preview branches on purpose so locked lessons do
        not lose the definitions their summaries use. */}
    <LessonGlossary terms={lessonGlossary(track, lesson.id)} />
    {/* Outside the available/preview branches for the same reason the glossary
        is: locked lessons should still expose their cited reading and song. */}
    <LessonEditorialPanel editorial={editorial} />
    <nav className={styles.lessonNavigation} aria-label="Lesson navigation">{previous ? <Link href={lessonHref(track, previous.lesson.id)}>Previous: {previous.lesson.title}</Link> : <Link href={`/learn/${track}`}>View the path</Link>}{next && <Link href={lessonHref(track, next.lesson.id)}>{isLessonReady(track, next.lesson.id) && canOpenModule(track, next.module.id, access) ? "Next" : "Preview next"}: {next.lesson.title}</Link>}</nav>
  </>;
}
