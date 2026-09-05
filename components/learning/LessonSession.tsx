"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PracticeCoach } from "@/components/practice/PracticeCoach";
import { type Lesson, type LearningModule, type TrackId } from "@/lib/learning/curriculum";
import { elapsedSeconds, type Assessment, type LessonRecord } from "@/lib/learning/progress";
import { useLearningProgress, useReadingQuizProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { TuningGuide } from "./TuningGuide";
import type { PracticeResult } from "@/lib/audio/practice";
import type { LessonInstructions } from "@/lib/learning/instructions";
import { readingQuizResult, type ReadingQuizAttempt } from "@/lib/learning/instructions";
import { LessonInstructionAssets, ReadingQuiz } from "./LessonInstructionAssets";
import { StageTwoPractice } from "./StageTwoPractice";
import { isStageTwoAsset } from "@/lib/learning/stage-two";
import { lessonPracticeSeconds, noStageTwoEvidence } from "@/lib/learning/stage-two-evidence";
export type { LessonInstructions } from "@/lib/learning/instructions";
export function LessonSession({ track, lesson, module, instructions }: { track: TrackId; lesson: Lesson; module: LearningModule; instructions?: LessonInstructions }) {
  const { progress, save } = useLearningProgress(track);
  const reading = useReadingQuizProgress(track, lesson.id, instructions?.quiz);
  const currentReadingResult = instructions?.quiz && reading.currentAttempt ? readingQuizResult(instructions.quiz, reading.currentAttempt) : null;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [assessment, setAssessment] = useState<Assessment>("repeat");
  const [message, setMessage] = useState("");
  const [checkedCriteria, setCheckedCriteria] = useState<string[]>([]);
  const [tuningReady, setTuningReady] = useState(false);
  const [manualEvidence, setManualEvidence] = useState(noStageTwoEvidence), [studyEvidence, setStudyEvidence] = useState(noStageTwoEvidence);
  const stageAssets = instructions?.assets.filter(isStageTwoAsset) ?? [];
  const needsManual = stageAssets.some(asset => asset.kind === "manualChanges");
  const needsStudy = stageAssets.some(asset => asset.kind === "study");
  const needsTuning = track === "guitar" && ["g-l1-m1-02", "g-l1-m1-04"].includes(lesson.id);
  const completionMinimumBPM = lesson.practiceSpec?.completionMinimumBPM;
  const requiresMeasuredCompletion = completionMinimumBPM !== undefined || lesson.practiceSpec?.revision !== undefined;
  const criteriaReady = !instructions || instructions.criteria.every(item => checkedCriteria.includes(item));
  const canMarkReady = !requiresMeasuredCompletion && criteriaReady && (!needsTuning || tuningReady) && (!needsManual || manualEvidence.ready) && (!needsStudy || studyEvidence.ready) && (!instructions?.quiz || currentReadingResult?.passed === true);
  const recordedPracticeSeconds = lessonPracticeSeconds(0, needsManual ? manualEvidence : noStageTwoEvidence, needsStudy ? studyEvidence : noStageTwoEvidence);
  const reflectionSeconds = lessonPracticeSeconds(seconds, needsManual ? manualEvidence : noStageTwoEvidence, needsStudy ? studyEvidence : noStageTwoEvidence);
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
  function persist(record: LessonRecord, attemptId?: string) {
    const persisted = save(lesson.id, record, attemptId);
    setMessage(persisted ? "Saved in this browser." : "Saved for this open page only. Browser storage is unavailable, so this attempt may be lost when you close or reload the page.");
  }
  function saveAssessment() {
    if (instructions?.quiz) return;
    if (assessment === "ready" && !canMarkReady) { setMessage(requiresMeasuredCompletion ? `This checkpoint needs a passing result on the current full Play exercise${completionMinimumBPM !== undefined ? ` at ${completionMinimumBPM} BPM or faster` : ""}. You can still save a reflection to revisit it.` : "Complete the lesson self-checks and required practice evidence before marking ready. You can still save another pass."); return; }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: reflectionSeconds, assessment, source: "selfReported", score: null });
    setFinished(false);
  }
  function recordReadingAttempt(attempt?: ReadingQuizAttempt) {
    if (!attempt || !instructions?.quiz) return;
    const result = readingQuizResult(instructions.quiz, attempt);
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: seconds, assessment: result?.passed ? "ready" : "repeat", source: "readingQuiz", score: null, readingQuizAttempt: attempt });
  }
  function measuredResult(result: PracticeResult, attemptId: string) {
    if (result.disposition !== "scored" || result.score === null || result.passed === null) {
      setMessage("No measured result saved: there was not enough clear sound to judge this attempt. Try again in a quieter room, or record your own assessment below.");
      return;
    }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: result.practiceSeconds, assessment: result.passed ? "ready" : "repeat", source: "measured", score: result.score, bpm: result.bpm, completionMinimumBPM: result.completionMinimumBPM, practiceSpecRevision: result.practiceSpecRevision }, attemptId);
  }
  return <>
    <div className={styles.lessonGrid}>
      <div>
        {needsTuning && <TuningGuide key={lesson.id} onReadyChange={setTuningReady} />}
        <section className={styles.panel}>
          <h2>{instructions ? "Make yourself comfortable" : "Lesson outline"}</h2>
          {instructions ? <>
            <ul className={styles.steps}>{instructions.setup.map(step => <li key={step}>{step}</li>)}</ul>
            <LessonInstructionAssets assets={instructions.assets.filter(asset => !isStageTwoAsset(asset))} startCollapsed={lesson.type === "checkpoint"} />
            <h2>Work through it</h2>
            <ol className={styles.steps}>{instructions.steps.map(step => <li key={step.title}><strong>{step.title}</strong>{step.body}<p className={styles.check}>Look: {step.lookCheck}</p><p className={styles.check}>Listen: {step.listenCheck}</p></li>)}</ol>
            {stageAssets.length > 0 && <StageTwoPractice lessonId={lesson.id} assets={stageAssets} checkpoint={lesson.type === "checkpoint"} onManualEvidenceChange={setManualEvidence} onStudyEvidenceChange={setStudyEvidence} />}
            <h3>Your practice blocks</h3><p className={styles.small}>Use these as a guide. Pause or repeat any block.</p><ol className={styles.practiceSegments}>{instructions.practiceSegments.map(segment => <li key={segment.instruction}><strong>{segment.seconds} sec</strong><span>{segment.instruction}</span></li>)}</ol>
            {instructions.quiz && <ReadingQuiz key={lesson.id} quiz={instructions.quiz} assets={instructions.assets} attempts={reading.attempts} currentAttempt={reading.currentAttempt} onStart={() => recordReadingAttempt(reading.start())} onAnswer={(questionId, optionIndex) => recordReadingAttempt(reading.answer(questionId, optionIndex))} storageWarning={reading.storageWarning} />}
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
        {!lesson.practiceSpec && <div className={styles.notice}>{instructions?.quiz ? "This lesson checks written notation. A reading result is separate from playing ability, microphone feedback, and your own observations." : "This lesson uses your own assessment. Pitch, timing, tone quality, and technique are not scored here."}</div>}
      </div>
      <aside>
        <section id="practice-session" className={styles.panel} aria-label="Practice session">
          <h2>{needsManual || needsStudy ? "Optional practice timer" : "A few focused minutes"}</h2><p className={styles.small}>Suggested time: {lesson.minutes} minutes. Pause when you need a break. The timer also pauses when this tab is hidden.</p>
          {(needsManual || needsStudy) && <p className={styles.small}>{recordedPracticeSeconds > 0 ? `Your latest saved exercise has ${Math.floor(recordedPracticeSeconds / 60)} min ${recordedPracticeSeconds % 60} sec of practice. That duration will be used for your lesson reflection; this optional timer will not be added.` : "Save your exercise above to use its recorded practice time. You do not need to start this separate timer."}</p>}
          <div className={styles.timer} role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds practiced`}>{formatted}</div>
          <p role="status" className={styles.small}>{seconds >= targetSeconds ? "You’ve reached the suggested time. Finish when you’re ready." : running ? "Practice timer running" : seconds > 0 ? "Practice timer paused" : "Ready when you are"}</p>
          <div className={styles.actions}>{running ? <button type="button" className={styles.primary} onClick={pause}>Pause</button> : <button type="button" className={styles.primary} onClick={start}>{seconds > 0 ? "Resume" : "Start timer"}</button>}<button type="button" className={styles.secondary} onClick={reset} disabled={seconds === 0 && !running}>Reset</button></div>
          <button type="button" className={styles.secondary} onClick={finish} disabled={lesson.type !== "concept" && reflectionSeconds === 0}>{lesson.type === "concept" && reflectionSeconds === 0 ? "I’ve read the lesson" : "Finish practice"}</button>
          {instructions?.quiz && <p className={styles.small}>{currentReadingResult ? `Reading result: ${currentReadingResult.correctCount}/${currentReadingResult.total}. ${currentReadingResult.passed ? "Ready to continue the reading path." : "Review the missed topics and try a new reading attempt."}` : "Complete the reading check to record a reading result. Your timer and self-checks do not answer its questions."} Answers save as you submit them. A retry keeps your previous attempts.</p>}
          {finished && !instructions?.quiz && <form onSubmit={event => { event.preventDefault(); saveAssessment(); }}>
            <fieldset className={styles.assessment}><legend>How did it feel?</legend><label><input type="radio" name="assessment" value="repeat" checked={assessment === "repeat"} onChange={() => setAssessment("repeat")} />I want another pass</label><label><input type="radio" name="assessment" value="ready" disabled={!canMarkReady} checked={assessment === "ready"} onChange={() => setAssessment("ready")} />I’m ready for the next lesson</label></fieldset>
            {!canMarkReady && <p className={styles.small}>{requiresMeasuredCompletion ? `A passing result on the current full Play exercise${completionMinimumBPM !== undefined ? ` at ${completionMinimumBPM} BPM or faster` : ""} marks this checkpoint ready. Your reflection can record that you want another pass.` : `Confirm the lesson self-checks${needsTuning ? " and tuning preparation" : ""}${needsManual ? " and save your count from a full minute" : ""}${needsStudy ? " and save a self-reported full study take" : ""} before marking ready. You can always choose another pass.`}</p>}
            <p className={`${styles.small} ${styles.muted}`}>This is your self-assessment. Saving it does not create a microphone score.</p><div className={styles.actions}><button className={styles.primary} type="submit" disabled={assessment === "ready" && !canMarkReady}>Save self-assessment</button></div>
          </form>}
        </section>
        {message && <p className={styles.saved} role="status">{message}</p>}
        {previous && <section className={styles.panel} style={{marginTop:"1rem"}}><h2>Last saved attempt</h2><p>{previous.assessment === "ready" ? "Marked ready to continue" : "Marked to revisit"}</p><p className={styles.small}>{previous.source === "measured" ? `Microphone result: ${previous.score}%${previous.bpm !== undefined ? ` at ${Math.round(previous.bpm)} BPM` : " on this exercise"}.` : previous.source === "readingQuiz" ? "Reading responses saved separately. No microphone score." : "Self-reported. No automatic score."}</p>{previous.completionMinimumBPM !== undefined && previous.bpm !== undefined && previous.bpm < previous.completionMinimumBPM && <p className={styles.small}>Practice score saved. This checkpoint requires at least {previous.completionMinimumBPM} BPM.</p>}<p className={styles.small}>{Math.floor(previous.practiceSeconds / 60)} min {previous.practiceSeconds % 60} sec timed practice</p></section>}
        {(progress.measuredAttempts?.filter(attempt => attempt.lessonId === lesson.id).length ?? 0) > 0 && <details className={styles.panel} style={{ marginTop: "1rem" }}><summary>Saved microphone attempts</summary><ol className={styles.steps}>{progress.measuredAttempts!.filter(attempt => attempt.lessonId === lesson.id).slice().reverse().map(attempt => <li key={attempt.id}>{attempt.record.score}%{attempt.record.bpm !== undefined ? ` at ${attempt.record.bpm} BPM` : ""}<p className={styles.small}>{new Date(attempt.record.updatedAt).toLocaleString()}{lesson.practiceSpec?.revision !== undefined && attempt.record.practiceSpecRevision !== lesson.practiceSpec.revision ? " · Earlier exercise revision; retained as practice evidence" : ""}</p></li>)}</ol></details>}
        <Link className={styles.secondary} href={`/learn/${track}`}>Back to your path</Link>
      </aside>
    </div>
  </>;
}
