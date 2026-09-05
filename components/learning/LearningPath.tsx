"use client";
import { getLessonInstructions } from "@/lib/learning/instructions";
import Link from "next/link";
import { curricula, trackNames, availableLessons, isModuleAvailable, lessonHref, getLesson, type TrackId } from "@/lib/learning/curriculum";
import { completedCount, nextLessonId } from "@/lib/learning/progress";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
const lessonTypes = { concept: "Learn", exercise: "Practice", song: "Song", checkpoint: "Checkpoint" };
export function LearningPath({ track }: { track: TrackId }) {
  const { progress } = useLearningProgress(track);
  const curriculum = curricula[track];
  const available = availableLessons(track);
  const ids = available.map(({ lesson }) => lesson.id);
  const completed = completedCount(ids, progress);
  const nextId = nextLessonId(ids, progress);
  const next = nextId ? getLesson(track, nextId) : undefined;
  return <>
    <nav className={styles.trackSwitch} aria-label="Learning track">{(["guitar", "voice"] as const).map(id => <Link key={id} href={`/learn/${id}`} aria-current={track === id ? "page" : undefined}>{trackNames[id]}</Link>)}</nav>
    <div className={styles.hero}><h1>{track === "guitar" ? "Your hands know the way. Teach them one step at a time." : "Find your voice. Give it a little room."}</h1><p>{track === "guitar" ? "Get comfortable with your instrument, learn the first shapes, then bring them together in time." : "Build comfortable habits first. Work on breath, pitch, and songs in a range that feels easy today."}</p></div>
    {next && <section className={styles.continue} aria-label="Continue learning">
      <div><p className={styles.small}>{completed === ids.length ? "Free module complete" : completed > 0 ? "Pick up where you left off" : "Start here"}</p><h2>{next.lesson.title}</h2><p>{completed} of {ids.length} free lessons marked ready · {next.lesson.minutes} min next session</p><progress className={styles.progress} aria-label="Free lessons marked ready" value={completed} max={ids.length} /></div>
      <Link className={styles.primary} href={lessonHref(track, next.lesson.id)}>{completed === ids.length ? "Review the basics" : completed > 0 ? "Continue learning" : "Start first lesson"}</Link>
    </section>}
    <p className={`${styles.small} ${styles.muted}`}>Your progress is saved in this browser. Each saved result identifies its evidence: your own assessment, a visual reading check, or a microphone exercise. You can revisit any available lesson.</p>
    <div className={styles.notice}>The first module is free, matching the iOS sampler. Other modules are previews on the web while purchase access is being connected. An iOS purchase does not unlock web lessons yet.</div>
    {curriculum.levels.map((level, levelIndex) => <details className={styles.level} key={level.id} open={levelIndex === 0}>
      <summary><span className={styles.stage} aria-hidden="true">{level.stage}</span><div><h2>{level.name}</h2><p className={styles.muted}>{level.subtitle}</p><span className={styles.badge}>{level.modules.length} modules</span><span className={styles.badge}>{levelIndex === 0 ? "First module free" : "Curriculum preview"}</span></div></summary>
      {level.modules.map((module) => { const available = isModuleAvailable(track, module.id); return <section className={styles.module} key={module.id} aria-labelledby={module.id}>
        <header className={styles.moduleHeader}><h3 id={module.id}>{module.name}</h3><p>Practice goal: {module.promise}</p><span className={styles.badge}>{module.lessons.length} lessons</span>{!available && <span className={styles.badge}>Preview</span>}</header>
        <ol className={styles.lessons}>{module.lessons.map((lesson, index) => {
          const record = progress.lessons[lesson.id]; const done = record?.assessment === "ready";
          return <li key={lesson.id}><Link className={styles.lessonLink} href={lessonHref(track, lesson.id)}><span className={`${styles.lessonStatus} ${done ? styles.done : ""}`} aria-label={done ? "Marked ready" : `Lesson ${index + 1}`}>{done ? "✓" : index + 1}</span><span><strong>{lesson.title}</strong><span className={`${styles.small} ${styles.muted}`} style={{display:"block"}}>{lessonTypes[lesson.type]}{lesson.practiceSpec ? " · Microphone exercise" : getLessonInstructions(lesson.id)?.quiz ? " · Reading check" : " · Self-assessment"}{record?.assessment === "repeat" ? " · Revisit" : ""}</span></span><span className={styles.small}>{available ? `${lesson.minutes} min` : "Preview"}</span></Link></li>;
        })}</ol>
      </section>; })}
    </details>)}
  </>;
}
