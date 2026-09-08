"use client";
import { getLessonInstructions } from "@/lib/learning/instructions";
import Link from "next/link";
import { curricula, trackNames, lessonHref, getLesson, type TrackId } from "@/lib/learning/curriculum";
import { completedCount, nextLessonId } from "@/lib/learning/progress";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { LessonLibrary } from "./LessonLibrary";
import { accessibleLessonIds, canOpenModule, isLessonReady } from "@/lib/learning/access";
import { useLearningAccess } from "./LearningAccessProvider";
const lessonTypes = { concept: "Learn", exercise: "Practice", song: "Song", checkpoint: "Checkpoint" };
export function LearningPath({ track }: { track: TrackId }) {
  const { progress } = useLearningProgress(track);
  const curriculum = curricula[track];
  const access = useLearningAccess();
  const ownsTrack = access.status === "verified" && access.tracks.includes(track);
  const ids = accessibleLessonIds(track, access);
  const completed = completedCount(ids, progress);
  const nextId = nextLessonId(ids, progress);
  const next = nextId ? getLesson(track, nextId) : undefined;
  return <>
    <nav className={styles.trackSwitch} aria-label="Learning track">{(["guitar", "voice"] as const).map(id => <Link key={id} href={`/learn/${id}`} aria-current={track === id ? "page" : undefined}>{trackNames[id]}</Link>)}</nav>
    <div className={styles.hero}><h1>{track === "guitar" ? "Your hands know the way. Teach them one step at a time." : "Find your voice. Give it a little room."}</h1><p>{track === "guitar" ? "Get comfortable with your instrument, learn the first shapes, then bring them together in time." : "Build comfortable habits first. Work on breath, pitch, and songs in a range that feels easy today."}</p></div>
    {next && <section className={styles.continue} aria-label="Continue learning">
      <div><p className={styles.small}>{completed === ids.length ? (ownsTrack ? "Available lessons complete" : "Free module complete") : completed > 0 ? "Pick up where you left off" : "Start here"}</p><h2>{next.lesson.title}</h2><p>{completed} of {ids.length} {ownsTrack ? "available" : "free"} lessons marked ready · {next.lesson.minutes} min next session</p><progress className={styles.progress} aria-label={ownsTrack ? "Available lessons marked ready" : "Free lessons marked ready"} value={completed} max={ids.length} /></div>
      <Link className={styles.primary} href={lessonHref(track, next.lesson.id)}>{completed === ids.length ? "Review the basics" : completed > 0 ? "Continue learning" : "Start first lesson"}</Link>
    </section>}
    <p className={`${styles.small} ${styles.muted}`}>{access.accountId ? "Your progress is saved in this browser for your signed-in account. Earlier guest progress is kept separately." : "Your progress is saved in this browser."} Each saved result identifies its evidence: your own assessment, a visual reading check, or a microphone exercise. You can revisit any available lesson.</p>
    <div className={styles.notice}>{access.status === "unavailable" ? "We could not verify account access. The free guitar sampler remains available; your saved history is kept." : ownsTrack ? "Your account has Complete Lifetime access. Open any guided lesson or microphone exercise. Topics without instruction remain curriculum outlines." : access.enabled ? "The first guitar module is free. Sign in to check access from an account-linked iOS lifetime purchase." : "The first guitar module is free. Other guided lessons are previews while purchase access is being connected on the web."}{track === "voice" && " Voice currently contains curriculum outlines."}{access.enabled && <> <Link href="/account">View account</Link></>}</div>
    {track === "guitar" && <section className={styles.continue} aria-label="Daily guitar practice"><div><h2>Your first A/D routine</h2><p>Seven familiar blocks, 21 suggested minutes. Prepare with instruction, then tune, work on shapes, change chords, and play songs.</p></div><Link className={styles.primary} href="/learn/guitar/routine">Open practice routine</Link></section>}
    <LessonLibrary track={track} />
    {curriculum.levels.map((level, levelIndex) => <details className={styles.level} key={level.id} open={levelIndex === 0}>
      <summary><span className={styles.stage} aria-hidden="true">{level.stage ?? "♪"}</span><div><h2>{level.name}</h2><p className={styles.muted}>{level.subtitle}</p><span className={styles.badge}>{level.modules.length} modules</span><span className={styles.badge}>{level.modules.some(module => module.lessons.some(lesson => isLessonReady(track, lesson.id))) ? (levelIndex === 0 ? "First guitar module free" : ownsTrack ? "Lifetime access" : "Lesson previews") : "Curriculum outlines"}</span></div></summary>
      {level.modules.map((module) => { const available = canOpenModule(track, module.id, access); return <section className={styles.module} key={module.id} aria-labelledby={module.id}>
        <header className={styles.moduleHeader}><h3 id={module.id}>{module.name}</h3><p>Practice goal: {module.promise}</p><span className={styles.badge}>{module.lessons.length} lessons</span>{!available && <span className={styles.badge}>Preview</span>}</header>
        <ol className={styles.lessons}>{module.lessons.map((lesson, index) => {
          const record = progress.lessons[lesson.id]; const ready = isLessonReady(track, lesson.id); const done = ready && record?.assessment === "ready";
          return <li key={lesson.id}><Link className={styles.lessonLink} href={lessonHref(track, lesson.id)}><span className={`${styles.lessonStatus} ${done ? styles.done : ""}`} aria-label={done ? "Marked ready" : `Lesson ${index + 1}`}>{done ? "✓" : index + 1}</span><span><strong>{lesson.title}</strong><span className={`${styles.small} ${styles.muted}`} style={{display:"block"}}>{lessonTypes[lesson.type]}{lesson.practiceSpec ? " · Microphone exercise" : getLessonInstructions(lesson.id)?.quiz ? " · Reading check" : getLessonInstructions(lesson.id) ? " · Self-assessment" : " · Preview outline"}{record?.assessment === "repeat" ? " · Revisit" : ""}</span></span><span className={styles.small}>{available && ready ? `${lesson.minutes} min` : ready ? "Preview" : "Outline"}</span></Link></li>;
        })}</ol>
      </section>; })}
    </details>)}
  </>;
}
