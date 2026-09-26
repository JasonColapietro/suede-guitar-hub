"use client";
import Link from "next/link";
import { TONE_LESSONS, TONE_MODULES, toneLessonHref } from "@/lib/tone/course";
import { completedCount, nextToneLesson } from "@/lib/tone/progress";
import { useToneProgress } from "./useToneProgress";
import styles from "./Tone.module.css";

const ALL_IDS = TONE_LESSONS.map(lesson => lesson.id);

/** Every module and lesson, with this browser's progress laid over it. */
export function CourseIndex() {
  const { progress, loaded } = useToneProgress();
  const done = completedCount(progress, ALL_IDS);
  const nextId = nextToneLesson(progress, ALL_IDS);
  const next = TONE_LESSONS.find(lesson => lesson.id === nextId);
  const started = loaded && done > 0;

  return <>
    <nav className={styles.overview} aria-label="Course modules">
      {TONE_MODULES.map((part, index) => {
        const ids = part.lessons.map(lesson => lesson.id);
        return <a key={part.id} href={`#${part.id}`}>
          <strong>{index + 1}. {part.title}</strong>
          <span>{loaded ? `${completedCount(progress, ids)} of ${ids.length} done` : `${ids.length} lessons`}</span>
        </a>;
      })}
    </nav>

    {started && <section className={styles.continue} aria-labelledby="tone-continue">
      <div>
        <span className={styles.label}>Your progress in this browser</span>
        <h2 id="tone-continue">{next ? `Next: ${next.title}` : "Course complete"}</h2>
        <p>{done} of {ALL_IDS.length} lessons passed or marked read.</p>
        <span className={styles.meter} aria-hidden="true"><span style={{ width: `${Math.round(done / ALL_IDS.length * 100)}%` }} /></span>
      </div>
      {next && <Link className={styles.continueLink} href={toneLessonHref(next.id)}>Continue</Link>}
    </section>}

    {TONE_MODULES.map((part, index) => <section key={part.id} id={part.id} className={styles.part} aria-labelledby={`${part.id}-title`}>
      <div className={styles.moduleHead}>
        <h2 id={`${part.id}-title`}><span className={styles.number} aria-hidden="true">{index + 1}</span>{part.title}</h2>
        <p>{part.blurb}</p>
      </div>
      <ol className={styles.lessons}>
        {part.lessons.map(lesson => {
          const record = progress[lesson.id];
          return <li key={lesson.id}>
            <Link className={styles.card} href={toneLessonHref(lesson.id)}>
              <h3>{lesson.title}</h3>
              <p>{lesson.summary}</p>
              <span className={styles.meta}>
                {record ? <span className={styles.done}>{record.how === "quiz" ? "Passed" : "Read"}</span> : null}
                {lesson.recipe ? <span className={styles.pill}>Recipe</span> : null}
                <span>{lesson.minutes} min</span>
              </span>
            </Link>
          </li>;
        })}
      </ol>
    </section>)}
  </>;
}
