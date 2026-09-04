"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PracticeCoach } from "@/components/practice/PracticeCoach";
import { type Lesson, type LearningModule, type TrackId } from "@/lib/learning/curriculum";
import { elapsedSeconds, type Assessment, type LessonRecord } from "@/lib/learning/progress";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { StringGuide } from "./StringGuide";
import { TuningGuide } from "./TuningGuide";
import type { PracticeResult } from "@/lib/audio/practice";
import type { LessonInstructions } from "@/lib/learning/instructions";
export type { LessonInstructions } from "@/lib/learning/instructions";
export function LessonSession({ track, lesson, module, instructions }: { track: TrackId; lesson: Lesson; module: LearningModule; instructions?: LessonInstructions }) {
  const { progress, save } = useLearningProgress(track);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [assessment, setAssessment] = useState<Assessment>("repeat");
  const [message, setMessage] = useState("");
  const [checkedCriteria, setCheckedCriteria] = useState<string[]>([]);
  const [tuningReady, setTuningReady] = useState(false);
  const needsTuning = track === "guitar" && ["g-l1-m1-02", "g-l1-m1-04"].includes(lesson.id);
  const criteriaReady = !instructions || instructions.criteria.every(item => checkedCriteria.includes(item));
  const canMarkReady = criteriaReady && (!needsTuning || tuningReady);
  const accumulated = useRef(0);
  const started = useRef<number | null>(null);
  const targetSeconds = lesson.minutes * 60;
  const formatted = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const previous = progress.lessons[lesson.id];

  function pause() {
    const now = performance.now();
    if (started.current !== null) accumulated.current += Math.max(0, now - started.current);
    started.current = null;
    setSeconds(elapsedSeconds(accumulated.current, null, now));
    setRunning(false);
  }
  useEffect(() => {
    if (!running) return;
    const tick = () => setSeconds(elapsedSeconds(accumulated.current, started.current, performance.now()));
    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const now = performance.now();
        if (started.current !== null) accumulated.current += Math.max(0, now - started.current);
        started.current = null;
        setSeconds(elapsedSeconds(accumulated.current, null, now));
        setRunning(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [running]);
  function start() {
    started.current = performance.now();
    setRunning(true);
    setFinished(false);
    setMessage("");
  }
  function reset() {
    accumulated.current = 0; started.current = null;
    setSeconds(0); setRunning(false); setFinished(false); setMessage("");
  }
  function finish() { pause(); setFinished(true); }
  function persist(record: LessonRecord) {
    const persisted = save(lesson.id, record);
    setMessage(persisted ? "Saved in this browser." : "Saved for this open page only. Browser storage is unavailable, so this attempt may be lost when you close or reload the page.");
  }
  function saveAssessment() {
    if (assessment === "ready" && !canMarkReady) { setMessage("Confirm each lesson self-check and complete tuning preparation before marking ready. You can still save another pass."); return; }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: seconds, assessment, source: "selfReported", score: null });
    setFinished(false);
  }
  function measuredResult(result: PracticeResult) {
    if (result.disposition !== "scored" || result.score === null || result.passed === null) {
      setMessage("No measured result saved: there was not enough clear sound to judge this attempt. Try again in a quieter room, or record your own assessment below.");
      return;
    }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: result.practiceSeconds, assessment: result.passed ? "ready" : "repeat", source: "measured", score: result.score });
  }
  return <>
    <div className={styles.lessonGrid}>
      <div>
        {needsTuning && <TuningGuide key={lesson.id} onReadyChange={setTuningReady} />}
        <section className={styles.panel}>
          <h2>{instructions ? "Make yourself comfortable" : "Lesson outline"}</h2>
          {instructions ? <>
            <ul className={styles.steps}>{instructions.setup.map(step => <li key={step}>{step}</li>)}</ul>
            {track === "guitar" && lesson.type !== "concept" && <StringGuide canHide={lesson.type === "checkpoint"} />}
            <h2>Work through it</h2>
            <ol className={styles.steps}>{instructions.steps.map(step => <li key={step.title}><strong>{step.title}</strong>{step.body}<p className={styles.check}>Look: {step.lookCheck}</p><p className={styles.check}>Listen: {step.listenCheck}</p></li>)}</ol>
            <h3>Your practice blocks</h3><p className={styles.small}>Use these as a guide. Pause or repeat any block.</p><ol className={styles.practiceSegments}>{instructions.practiceSegments.map(segment => <li key={segment.instruction}><strong>{segment.seconds} sec</strong><span>{segment.instruction}</span></li>)}</ol>
            <fieldset className={styles.assessment}><legend>Your self-check</legend>{instructions.criteria.map(criterion => <label key={criterion}><input type="checkbox" checked={checkedCriteria.includes(criterion)} onChange={event => setCheckedCriteria(previous => event.target.checked ? [...previous, criterion] : previous.filter(item => item !== criterion))} />{criterion}</label>)}</fieldset>
            <h3>If it feels difficult</h3><ul className={styles.steps}>{instructions.commonFixes.map(step => <li key={step}>{step}</li>)}</ul>
          </> : <>
            <p>{lesson.summary}</p>
            <ol className={styles.steps}><li><strong>Set your focus</strong>{module.skill}. Work on one small part at a time.</li><li><strong>Try it slowly</strong>{lesson.type === "concept" ? "Read the outline, then find the idea on your instrument or try it comfortably with your voice." : "Repeat the exercise at a pace where you can notice what changes. Pause whenever you need to reset."}</li><li><strong>Check your own attempt</strong>{lesson.practiceSpec ? "Use the microphone exercise below for the specific pitch or timing task. Listen separately for sound quality and comfort." : "Listen to your attempt and decide whether you want another pass. This outline has no automatic performance assessment."}</li></ol>
            <p className={`${styles.small} ${styles.muted}`}>This lesson currently contains an outline. Demonstration recordings, song arrangements, and a full written lesson are not included here yet.</p>
          </>}
          <h3>Ready for another step</h3><p>{instructions?.completion ?? module.promise}</p>{instructions && <><p className={styles.check}>{instructions.ifNotReady}</p><p className={styles.check}>What this check shows: {instructions.evidence}</p><p className={styles.check}>It does not assess: {instructions.limitation}</p></>}
          <p className={`${styles.small} ${styles.muted}`}>{track === "voice" ? "Keep the range and volume comfortable. Stop if singing hurts or makes you hoarse; a pitch reading cannot assess vocal health." : "Keep your hand and shoulder relaxed. Stop and reset if you feel pain. Pitch feedback cannot judge tension, fingering, or buzzing."}</p>
        </section>
        {lesson.practiceSpec && (!needsTuning || tuningReady) && <PracticeCoach key={lesson.id} spec={lesson.practiceSpec} track={track} onComplete={measuredResult} />}
        {lesson.practiceSpec && needsTuning && !tuningReady && <div className={styles.notice}>Complete and confirm the free tuning check above to open the pitch exercise. You can use this tuner or your own.</div>}
        {!lesson.practiceSpec && <div className={styles.notice}>This lesson uses your own assessment. Pitch, timing, tone quality, and technique are not scored here.</div>}
      </div>
      <aside>
        <section id="practice-session" className={styles.panel} aria-label="Practice session">
          <h2>A few focused minutes</h2><p className={styles.small}>Suggested time: {lesson.minutes} minutes. Pause when you need a break. The timer also pauses when this tab is hidden.</p>
          <div className={styles.timer} role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds practiced`}>{formatted}</div>
          <p role="status" className={styles.small}>{seconds >= targetSeconds ? "You’ve reached the suggested time. Finish when you’re ready." : running ? "Practice timer running" : seconds > 0 ? "Practice timer paused" : "Ready when you are"}</p>
          <div className={styles.actions}>{running ? <button type="button" className={styles.primary} onClick={pause}>Pause</button> : <button type="button" className={styles.primary} onClick={start}>{seconds > 0 ? "Resume" : "Start timer"}</button>}<button type="button" className={styles.secondary} onClick={reset} disabled={seconds === 0 && !running}>Reset</button></div>
          <button type="button" className={styles.secondary} onClick={finish} disabled={lesson.type !== "concept" && seconds === 0}>{lesson.type === "concept" && seconds === 0 ? "I’ve read the lesson" : "Finish practice"}</button>
          {finished && <form onSubmit={event => { event.preventDefault(); saveAssessment(); }}>
            <fieldset className={styles.assessment}><legend>How did it feel?</legend><label><input type="radio" name="assessment" value="repeat" checked={assessment === "repeat"} onChange={() => setAssessment("repeat")} />I want another pass</label><label><input type="radio" name="assessment" value="ready" disabled={!canMarkReady} checked={assessment === "ready"} onChange={() => setAssessment("ready")} />I’m ready for the next lesson</label></fieldset>
            {!canMarkReady && <p className={styles.small}>Confirm the lesson self-checks{needsTuning ? " and tuning preparation" : ""} before marking ready. You can always choose another pass.</p>}
            <p className={`${styles.small} ${styles.muted}`}>This is your self-assessment. Saving it does not create a microphone score.</p><div className={styles.actions}><button className={styles.primary} type="submit" disabled={assessment === "ready" && !canMarkReady}>Save self-assessment</button></div>
          </form>}
        </section>
        {message && <p className={styles.saved} role="status">{message}</p>}
        {previous && <section className={styles.panel} style={{marginTop:"1rem"}}><h2>Last saved attempt</h2><p>{previous.assessment === "ready" ? "Marked ready to continue" : "Marked to revisit"}</p><p className={styles.small}>{previous.source === "measured" ? `Microphone result: ${previous.score}% on this exercise.` : "Self-reported. No automatic score."}</p><p className={styles.small}>{Math.floor(previous.practiceSeconds / 60)} min {previous.practiceSeconds % 60} sec timed practice</p></section>}
        <Link className={styles.secondary} href={`/learn/${track}`}>Back to your path</Link>
      </aside>
    </div>
  </>;
}
