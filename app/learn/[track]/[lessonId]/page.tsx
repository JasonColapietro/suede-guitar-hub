import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allLessons, getLesson, isTrackId, isModuleAvailable, lessonHref, trackNames } from "@/lib/learning/curriculum";
import { getLessonInstructions } from "@/lib/learning/instructions";
import { LessonSession } from "@/components/learning/LessonSession";
import styles from "@/components/learning/Learning.module.css";
type Params = { track: string; lessonId: string };
export function generateStaticParams() { return (["guitar", "voice"] as const).flatMap(track => allLessons(track).map(({ lesson }) => ({ track, lessonId: lesson.id }))); }
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) return {};
  const entry = getLesson(track, lessonId);
  if (!entry) return {};
  return { title: `${entry.lesson.title} | GuitarHub ${trackNames[track]}`, description: entry.lesson.summary, alternates: { canonical: lessonHref(track, lessonId) }, robots: { index: isModuleAvailable(track, entry.module.id), follow: true } };
}
export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { track, lessonId } = await params;
  if (!isTrackId(track)) notFound();
  const entry = getLesson(track, lessonId);
  if (!entry) notFound();
  const { lesson, module, level } = entry;
  const available = isModuleAvailable(track, module.id);
  const lessons = allLessons(track);
  const index = lessons.findIndex(item => item.lesson.id === lessonId);
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  return <>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn">Learning paths</Link><span aria-hidden="true">/</span><Link href={`/learn/${track}`}>{trackNames[track]}</Link><span aria-hidden="true">/</span><span>{module.name}</span></nav>
    <div className={styles.hero}><p className={styles.small}>Stage {level.stage} · {module.name} · {lesson.minutes} min</p><h1>{lesson.title}</h1>{available ? <p>{lesson.summary}</p> : <span className={styles.badge}>Curriculum preview</span>}</div>
    {available && <div className={styles.actions}><a className={styles.secondary} href="#practice-session">Go to practice timer</a></div>}
    {available ? <LessonSession key={lesson.id} track={track} lesson={lesson} module={module} instructions={getLessonInstructions(lesson.id)} /> : <section className={styles.panel}><h2>Inside this lesson</h2><p>{lesson.summary}</p><h3>Practice goal</h3><p>{module.promise}</p><div className={styles.notice}>This is a preview of the curriculum. The web currently includes the first module of each track. Paid access and iOS purchase recognition are not available on the web yet.</div><Link className={styles.primary} href={lessonHref(track, lessons[0].lesson.id)}>Try the free first module</Link></section>}
    <nav className={styles.lessonNavigation} aria-label="Lesson navigation">{previous ? <Link href={lessonHref(track, previous.lesson.id)}>Previous: {previous.lesson.title}</Link> : <Link href={`/learn/${track}`}>View the path</Link>}{next && <Link href={lessonHref(track, next.lesson.id)}>{isModuleAvailable(track, next.module.id) ? "Next" : "Preview next"}: {next.lesson.title}</Link>}</nav>
  </>;
}
