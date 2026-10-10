"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { catalogLesson } from "@/lib/learning/catalog";
import { lessonHref, trackNames } from "@/lib/learning/track";
import { completedCount, nextLessonId } from "@/lib/learning/progress";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { LessonLibrary } from "./LessonLibrary";
import { accessibleLessonIds, canOpenModule, hasVerifiedTrackAccess, isLessonReady } from "@/lib/learning/access";
import { useLearningAccess } from "./LearningAccessProvider";
import { PracticeStats, StarRating } from "@/components/interactive/PracticeStats";
import { bestLessonStars } from "@/lib/learning/rewards";
import type { PathLesson, PathOutline } from "@/lib/learning/path-outline";

const lessonTypes = { concept: "Learn", exercise: "Practice", song: "Song", checkpoint: "Checkpoint" };

/**
 * The outline (titles, names, flags) comes from the server page; this
 * component adds what only the browser knows: saved progress, purchase access
 * and which stage is open. `singCourseHref` is passed down so the Suede Sing
 * redirect table stays on the server too.
 */
export function LearningPath({ outline, singCourseHref }: { outline: PathOutline; singCourseHref: string }) {
  const { track } = outline;
  const { progress } = useLearningProgress(track);
  const [searchOpened, setSearchOpened] = useState(false);
  const lessons = new Map<string, { lesson: PathLesson; stage?: number }>(outline.levels.flatMap(level => level.modules.flatMap(module => module.lessons.map(lesson => [lesson.id, { lesson, stage: level.stage }] as const))));
  const access = useLearningAccess();
  const ownsTrack = hasVerifiedTrackAccess(track, access);
  const ids = accessibleLessonIds(track, access);
  const completed = completedCount(ids, progress);
  const nextId = nextLessonId(ids, progress);
  const next = nextId ? lessons.get(nextId) : undefined;
  const currentStageId = (nextId ? catalogLesson(track, nextId)?.level.id : undefined) ?? outline.levels[0].id;

  // /learn/guitar#stage-3 (the level picker's link) opens and shows that stage.
  useEffect(() => {
    const reveal = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target instanceof HTMLDetailsElement) { target.open = true; target.scrollIntoView({ block: "start" }); }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return <>
    <nav className={styles.trackSwitch} aria-label="Learning track"><Link href="/learn/guitar" aria-current={track === "guitar" ? "page" : undefined}>{trackNames.guitar}</Link><a href={singCourseHref}>{trackNames.voice} on Suede Sing</a></nav>
    <div className={styles.hero}><h1>{track === "guitar" ? "Beginner guitar lessons, step by step." : "Find your voice. Give it a little room."}</h1><p>{track === "guitar" ? `${outline.stageCount} stages, starting with first notes, open chords, strumming, and songs. Browse the curriculum, then continue into later stages as your playing develops.` : "Build comfortable habits first. Work on breath, pitch, and songs in a range that feels easy today."}</p></div>

    {track === "guitar" && <p className={styles.small}>Already know A and D? <Link href="/learn/guitar/routine">Practice A-to-D chord changes with the free routine</Link>, or <Link href="/session">build a practice session around your available time</Link>.</p>}

    {next && <section className={styles.continue} aria-label="Continue learning">
      <div><p className={styles.small}>{completed === ids.length ? "Available lessons complete" : completed > 0 ? "Pick up where you left off" : "Start here"}</p><h2>{next.lesson.title}</h2><p>{next.stage ? `Stage ${next.stage} · ` : ""}{next.lesson.minutes} min · {completed} of {ids.length} available lessons done</p><progress className={styles.progress} aria-label="Lessons done" value={completed} max={ids.length} /><div style={{ marginTop: ".9rem" }}><PracticeStats tone="dark" /></div></div>
      <Link className={styles.primary} href={lessonHref(track, next.lesson.id)}>{completed === ids.length ? "Review" : completed > 0 ? "Continue" : "Start first lesson"}</Link>
    </section>}

    {track === "guitar" && <nav className={styles.stageJump} aria-label="Jump to a stage">
      {outline.levels.filter(level => level.stage).map(level => <a key={level.id} href={`#stage-${level.stage}`} data-current={level.id === currentStageId}>Stage {level.stage} · {level.name}</a>)}
      <Link href="/advanced">Advanced Lab →</Link>
    </nav>}

    <p className={`${styles.small} ${styles.muted}`}>{access.status === "unavailable" ? "We could not verify purchase access. Lessons remain locked and your history is kept." : ownsTrack ? "Verified lifetime access: every guided lesson in this track is open." : "Every lesson requires verified lifetime access. Browse the curriculum below."} Progress saves in this browser.{access.enabled && <> <Link href="/account">Account</Link></>}</p>

    {outline.levels.map(level => {
      const lessonIds = level.modules.flatMap(module => module.lessons.map(lesson => lesson.id));
      const doneHere = lessonIds.filter(id => progress.lessons[id]?.assessment === "ready" && isLessonReady(track, id)).length;
      const open = level.modules.some(module => canOpenModule(track, module.id, access));
      return <details className={styles.level} key={level.id} id={level.stage ? `stage-${level.stage}` : level.id} open={level.id === currentStageId}>
        <summary><span className={styles.stage} aria-hidden="true">{level.stage ?? "♪"}</span><div><h2>{level.name}</h2><p className={styles.muted}>{level.subtitle}</p><span className={styles.stageMeta}><span>{lessonIds.length} lessons</span>{doneHere > 0 && <span>{doneHere} done</span>}<span>{open ? "Open" : "Lifetime access"}</span>{level.who && <span>{level.who}</span>}</span></div></summary>
        {level.modules.map((module) => { const available = canOpenModule(track, module.id, access); return <section className={styles.module} key={module.id} aria-labelledby={module.id}>
          <header className={styles.moduleHeader}><h3 id={module.id}>{module.name}</h3><p>{module.promise}</p>{!available && <span className={styles.badge}>Preview</span>}</header>
          <ol className={styles.lessons}>{module.lessons.map((lesson, index) => {
            const record = progress.lessons[lesson.id]; const ready = isLessonReady(track, lesson.id); const done = ready && record?.assessment === "ready";
            return <li key={lesson.id}><Link className={styles.lessonLink} href={lessonHref(track, lesson.id)}><span className={`${styles.lessonStatus} ${done ? styles.done : ""}`} aria-label={done ? "Done" : `Lesson ${index + 1}`}>{done ? "✓" : index + 1}</span><span><strong>{lesson.title}</strong><span className={`${styles.small} ${styles.muted}`} style={{display:"block"}}>{lessonTypes[lesson.type]}{lesson.mic ? " · Mic exercise" : lesson.quiz ? " · Reading check" : ""}{record?.assessment === "repeat" ? " · Revisit" : ""}</span></span><span className={styles.small}>{lesson.mic && bestLessonStars(progress.measuredAttempts ?? [], lesson.id) > 0 ? <StarRating stars={bestLessonStars(progress.measuredAttempts ?? [], lesson.id)} /> : available && ready ? `${lesson.minutes} min` : ready ? "Preview" : "Outline"}</span></Link></li>;
          })}</ol>
        </section>; })}
        {level.extras.length > 0 && <p className={`${styles.small} ${styles.stageExtras}`}>Drill it in the Advanced Lab: {level.extras.map((extra, index) => <span key={extra.href}>{index > 0 && " · "}<Link href={extra.href}>{extra.title}</Link></span>)}</p>}
      </details>;
    })}

    {track === "guitar" && <section className={styles.continue} aria-label="Daily guitar practice"><div><h2>Need a daily routine?</h2><p>Seven blocks, about 21 minutes: tune, shapes, changes and songs.</p></div><Link className={styles.primary} href="/learn/guitar/routine">Open practice routine</Link></section>}

    {/* The search and its index load the first time the panel opens; the
        lesson titles it searches are already listed in the stages above. */}
    <details className={styles.level} onToggle={event => { if (event.currentTarget.open) setSearchOpened(true); }}>
      <summary><span className={styles.stage} aria-hidden="true">⌕</span><div><h2>Search every lesson and song</h2><p className={styles.muted}>By song, artist, chord or skill.</p></div></summary>
      {searchOpened && <LessonLibrary track={track} />}
    </details>
  </>;
}
