"use client";
import { useEffect } from "react";
import Link from "next/link";
import { hasInstructionQuiz } from "@/lib/learning/instruction-index";
import { curricula, trackNames, lessonHref, getLesson, type TrackId } from "@/lib/learning/curriculum";
import { completedCount, nextLessonId } from "@/lib/learning/progress";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { LessonLibrary } from "./LessonLibrary";
import { accessibleLessonIds, canOpenModule, hasVerifiedTrackAccess, isLessonReady } from "@/lib/learning/access";
import { useLearningAccess } from "./LearningAccessProvider";
import { SING_VOICE_COURSE } from "@/lib/voice-redirects";
import { levelForStage } from "@/lib/levels";
import { drillHref, getDrill } from "@/lib/advanced/drills";

const lessonTypes = { concept: "Learn", exercise: "Practice", song: "Song", checkpoint: "Checkpoint" };

/**
 * Advanced Lab drills that belong alongside a stage. The path covers the
 * ground in lessons; these add a scored drill where a skill otherwise only
 * appears in passing.
 */
const STAGE_EXTRAS: Record<number, readonly string[]> = {
  2: ["musical-alphabet-low-e"],
  5: ["movable-shape-roots"],
  6: ["every-c", "three-note-legato-g-major"],
  7: ["blues-landing-notes", "funk-sixteenths"],
};

export function LearningPath({ track }: { track: TrackId }) {
  const { progress } = useLearningProgress(track);
  const curriculum = curricula[track];
  const access = useLearningAccess();
  const ownsTrack = hasVerifiedTrackAccess(track, access);
  const ids = accessibleLessonIds(track, access);
  const completed = completedCount(ids, progress);
  const nextId = nextLessonId(ids, progress);
  const next = nextId ? getLesson(track, nextId) : undefined;
  const currentStageId = next?.level.id ?? curriculum.levels[0].id;

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
    <nav className={styles.trackSwitch} aria-label="Learning track"><Link href="/learn/guitar" aria-current={track === "guitar" ? "page" : undefined}>{trackNames.guitar}</Link><a href={SING_VOICE_COURSE}>{trackNames.voice} on Suede Sing</a></nav>
    <div className={styles.hero}><h1>{track === "guitar" ? "Guitar lessons, stage by stage." : "Find your voice. Give it a little room."}</h1><p>{track === "guitar" ? `${curriculum.levels.filter(level => level.stage).length} stages, from your first clean note to a set of your own. Start at the top, jump to your level, or pick up where you left off.` : "Build comfortable habits first. Work on breath, pitch, and songs in a range that feels easy today."}</p></div>

    {next && <section className={styles.continue} aria-label="Continue learning">
      <div><p className={styles.small}>{completed === ids.length ? (ownsTrack ? "Available lessons complete" : "Free lessons complete") : completed > 0 ? "Pick up where you left off" : "Start here"}</p><h2>{next.lesson.title}</h2><p>{next.level.stage ? `Stage ${next.level.stage} · ` : ""}{next.lesson.minutes} min · {completed} of {ids.length} {ownsTrack ? "available" : "free"} lessons done</p><progress className={styles.progress} aria-label="Lessons done" value={completed} max={ids.length} /></div>
      <Link className={styles.primary} href={lessonHref(track, next.lesson.id)}>{completed === ids.length ? "Review" : completed > 0 ? "Continue" : "Start first lesson"}</Link>
    </section>}

    {track === "guitar" && <nav className={styles.stageJump} aria-label="Jump to a stage">
      {curriculum.levels.filter(level => level.stage).map(level => <a key={level.id} href={`#stage-${level.stage}`} data-current={level.id === currentStageId}>Stage {level.stage} · {level.name}</a>)}
      <Link href="/advanced">Advanced Lab →</Link>
    </nav>}

    <p className={`${styles.small} ${styles.muted}`}>{access.status === "unavailable" ? "We could not verify account access. The free stages stay open and your history is kept." : ownsTrack ? "Complete Lifetime access: every guided lesson is open." : "Stages 1 and 2 are free. Later lessons show a preview on the web."} Progress saves in this browser.{access.enabled && <> <Link href="/account">Account</Link></>}</p>

    {curriculum.levels.map(level => {
      const lessonIds = level.modules.flatMap(module => module.lessons.map(lesson => lesson.id));
      const doneHere = lessonIds.filter(id => progress.lessons[id]?.assessment === "ready" && isLessonReady(track, id)).length;
      const open = level.modules.some(module => canOpenModule(track, module.id, access));
      const who = level.stage ? levelForStage(level.stage) : undefined;
      return <details className={styles.level} key={level.id} id={level.stage ? `stage-${level.stage}` : level.id} open={level.id === currentStageId}>
        <summary><span className={styles.stage} aria-hidden="true">{level.stage ?? "♪"}</span><div><h2>{level.name}</h2><p className={styles.muted}>{level.subtitle}</p><span className={styles.stageMeta}><span>{lessonIds.length} lessons</span>{doneHere > 0 && <span>{doneHere} done</span>}<span>{open ? (level.access === "free" ? "Free" : "Open") : "Preview"}</span>{who && <span>{who.label}</span>}</span></div></summary>
        {level.modules.map((module) => { const available = canOpenModule(track, module.id, access); return <section className={styles.module} key={module.id} aria-labelledby={module.id}>
          <header className={styles.moduleHeader}><h3 id={module.id}>{module.name}</h3><p>{module.promise}</p>{!available && <span className={styles.badge}>Preview</span>}</header>
          <ol className={styles.lessons}>{module.lessons.map((lesson, index) => {
            const record = progress.lessons[lesson.id]; const ready = isLessonReady(track, lesson.id); const done = ready && record?.assessment === "ready";
            return <li key={lesson.id}><Link className={styles.lessonLink} href={lessonHref(track, lesson.id)}><span className={`${styles.lessonStatus} ${done ? styles.done : ""}`} aria-label={done ? "Done" : `Lesson ${index + 1}`}>{done ? "✓" : index + 1}</span><span><strong>{lesson.title}</strong><span className={`${styles.small} ${styles.muted}`} style={{display:"block"}}>{lessonTypes[lesson.type]}{lesson.practiceSpec ? " · Mic exercise" : hasInstructionQuiz(lesson.id) ? " · Reading check" : ""}{record?.assessment === "repeat" ? " · Revisit" : ""}</span></span><span className={styles.small}>{available && ready ? `${lesson.minutes} min` : ready ? "Preview" : "Outline"}</span></Link></li>;
          })}</ol>
        </section>; })}
        {level.stage && STAGE_EXTRAS[level.stage] && <p className={`${styles.small} ${styles.stageExtras}`}>Drill it in the Advanced Lab: {STAGE_EXTRAS[level.stage].map((id, index) => { const drill = getDrill(id); return drill ? <span key={id}>{index > 0 && " · "}<Link href={drillHref(id)}>{drill.title}</Link></span> : null; })}</p>}
      </details>;
    })}

    {track === "guitar" && <section className={styles.continue} aria-label="Daily guitar practice"><div><h2>Need a daily routine?</h2><p>Seven blocks, about 21 minutes: tune, shapes, changes and songs.</p></div><Link className={styles.primary} href="/learn/guitar/routine">Open practice routine</Link></section>}

    <details className={styles.level}>
      <summary><span className={styles.stage} aria-hidden="true">⌕</span><div><h2>Search every lesson and song</h2><p className={styles.muted}>By song, artist, chord or skill.</p></div></summary>
      <LessonLibrary track={track} />
    </details>
  </>;
}
