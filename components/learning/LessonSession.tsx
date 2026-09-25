"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PracticeCoach } from "@/components/practice/PracticeCoach";
import { MODULE_SAFETY_NOTE, TRACK_SAFETY_NOTE, type Lesson, type LearningModule, type TrackId } from "@/lib/learning/curriculum";
import { elapsedSeconds, type Assessment, type LessonRecord } from "@/lib/learning/progress";
import { useLearningProgress, useReadingQuizProgress } from "./useLearningProgress";
import styles from "./Learning.module.css";
import { TuningGuide } from "./TuningGuide";
import type { PracticeResult } from "@/lib/audio/practice";
import type { LessonInstructions } from "@/lib/learning/instructions";
import { readingQuizResult, type ReadingQuizAttempt } from "@/lib/learning/reading-quiz";
import { LessonInstructionAssets, ReadingQuiz } from "./LessonInstructionAssets";
import { StageTwoPractice } from "./StageTwoPractice";
import { isStageTwoAsset } from "@/lib/learning/stage-two";
import { lessonPracticeSeconds, noStageTwoEvidence } from "@/lib/learning/stage-two-evidence";
import { VocalMaterial } from "./VocalMaterial";
import type { VocalModuleMaterial } from "@/lib/learning/vocal-material";
import { useLearningAccess } from "./LearningAccessProvider";
import { hasVerifiedTrackAccess } from "@/lib/learning/access";
export type { LessonInstructions } from "@/lib/learning/instructions";
export function LessonSession({ track, lesson, module, instructions, vocalMaterial }: { track: TrackId; lesson: Lesson; module: LearningModule; instructions?: LessonInstructions; vocalMaterial?: VocalModuleMaterial }) {
  const access = useLearningAccess();
  const { progress, save, saveUnscored } = useLearningProgress(track);
  const reading = useReadingQuizProgress(track, lesson.id, instructions?.quiz);
  const currentReadingResult = instructions?.quiz && reading.currentAttempt ? readingQuizResult(instructions.quiz, reading.currentAttempt) : null;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [manualEvidence, setManualEvidence] = useState(noStageTwoEvidence), [studyEvidence, setStudyEvidence] = useState(noStageTwoEvidence);
  const stageAssets = instructions?.assets.filter(isStageTwoAsset) ?? [];
  const needsManual = stageAssets.some(asset => asset.kind === "manualChanges");
  const needsStudy = stageAssets.some(asset => asset.kind === "study");
  const needsTuning = track === "guitar" && ["g-l1-m1-02", "g-l1-m1-04"].includes(lesson.id);
  const completionMinimumBPM = lesson.practiceSpec?.completionMinimumBPM;
  const requiresMeasuredCompletion = !!lesson.practiceSpec;
  // No tick-box gate. The written "you're ready when" list is guidance to read,
  // and the only things that hold a lesson back are real saved evidence: a
  // passing microphone check, a passing reading check, or a saved count/study.
  const canMarkReady = !requiresMeasuredCompletion && (!needsManual || manualEvidence.ready) && (!needsStudy || studyEvidence.ready) && (!instructions?.quiz || currentReadingResult?.passed === true);
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
    setMessage("");
  }
  function reset() {
    accumulated.current = 0; started.current = null;
    setSeconds(0); setRunning(false); setMessage("");
  }
  function persist(record: LessonRecord, attemptId?: string, result?: PracticeResult) {
    const persisted = save(lesson.id, record, attemptId, result);
    setMessage(persisted ? "Saved in this browser." : "Saved for this open page only. Browser storage is unavailable, so this attempt may be lost when you close or reload the page.");
  }
  function saveAssessment(assessment: Assessment) {
    if (instructions?.quiz) return;
    if (running) pause();
    if (assessment === "ready" && !canMarkReady) { setMessage(requiresMeasuredCompletion ? `This checkpoint completes with a passing Play check${completionMinimumBPM !== undefined ? ` at ${completionMinimumBPM} BPM or faster` : ""}.` : "Save the exercise above first, then mark the lesson done."); return; }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: reflectionSeconds, assessment, source: "selfReported", score: null });
  }
  function recordReadingAttempt(attempt?: ReadingQuizAttempt) {
    if (!attempt || !instructions?.quiz) return;
    const result = readingQuizResult(instructions.quiz, attempt);
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: seconds, assessment: result?.passed ? "ready" : "repeat", source: "readingQuiz", score: null, readingQuizAttempt: attempt });
  }
  function measuredResult(result: PracticeResult, attemptId: string) {
    if (result.disposition !== "scored" || result.score === null || result.passed === null) {
      saveUnscored(lesson.id, result, attemptId);
      setMessage("No measured result saved: there was not enough clear sound to judge this attempt. Try again in a quieter room, or record your own assessment below.");
      return;
    }
    persist({ updatedAt: new Date().toISOString(), practiceSeconds: result.practiceSeconds, assessment: result.passed ? "ready" : "repeat", source: "measured", score: result.score, bpm: result.bpm, completionMinimumBPM: result.completionMinimumBPM, practiceSpecRevision: result.practiceSpecRevision }, attemptId, result);
  }
  const coach = lesson.practiceSpec && <PracticeCoach key={lesson.id} recentAttempts={(progress.measuredAttempts ?? []).filter(attempt => attempt.lessonId === lesson.id).map(attempt => ({ bpm: attempt.record.bpm ?? 0, score: attempt.record.score, disposition: "scored" as const, passed: attempt.record.assessment === "ready", specRevision: attempt.record.practiceSpecRevision }))} spec={lesson.practiceSpec} track={track} onComplete={measuredResult} onUnscoredResult={(result, id) => saveUnscored(lesson.id, result, id)} />;
  const done = previous?.assessment === "ready";
  return <>
    {/* The exercise comes first. It used to sit under several screens of
        instructions, and on the first microphone lesson it was replaced
        entirely by a notice until a seven-box tuning form was ticked, so on a
        phone it looked like the exercise never loaded. */}
    {needsTuning && <details className={styles.panel}><summary className={styles.foldTitle}>Tune up first (optional)</summary><TuningGuide key={lesson.id} /></details>}
    {coach && <section className={styles.exercise} aria-label="Exercise"><h2 className={styles.sectionTitle}>The exercise</h2><p className={styles.small}>Start in <strong>Practice</strong>: the coach waits for each note. Switch to <strong>Play</strong> for the full check at tempo.{requiresMeasuredCompletion ? ` Passing Play${completionMinimumBPM !== undefined ? ` at ${completionMinimumBPM} BPM` : ""} completes this lesson.` : ""}</p>{coach}</section>}
    <div className={styles.lessonGrid}>
      <div>
        <section className={styles.panel}>
          <h2>{instructions ? "How to do it" : "Lesson outline"}</h2>
          {instructions ? <>
            <ul className={styles.steps}>{instructions.setup.map(step => <li key={step}>{step}</li>)}</ul>
            <LessonInstructionAssets assets={instructions.assets.filter(asset => !isStageTwoAsset(asset))} startCollapsed={lesson.type === "checkpoint"} />
            <ol className={styles.steps}>{instructions.steps.map(step => <li key={step.title}><strong>{step.title}</strong>{step.body}<p className={styles.check}>Look: {step.lookCheck}</p><p className={styles.check}>Listen: {step.listenCheck}</p></li>)}</ol>
            {stageAssets.length > 0 && <StageTwoPractice lessonId={lesson.id} assets={stageAssets} checkpoint={lesson.type === "checkpoint"} onManualEvidenceChange={setManualEvidence} onStudyEvidenceChange={setStudyEvidence} />}
            <details className={styles.fold}><summary className={styles.foldTitle}>Practice plan · {instructions.practiceSegments.length} short blocks</summary><ol className={styles.practiceSegments}>{instructions.practiceSegments.map(segment => <li key={segment.instruction}><strong>{segment.seconds} sec</strong><span>{segment.instruction}</span></li>)}</ol></details>
            {instructions.quiz && <ReadingQuiz key={lesson.id} quiz={instructions.quiz} assets={instructions.assets} attempts={reading.attempts} currentAttempt={reading.currentAttempt} onStart={() => recordReadingAttempt(reading.start())} onAnswer={(questionId, optionIndex) => recordReadingAttempt(reading.answer(questionId, optionIndex))} storageWarning={reading.storageWarning} />}
            <h3>You&apos;re ready when</h3><ul className={styles.steps}>{instructions.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}</ul>
            <details className={styles.fold}><summary className={styles.foldTitle}>If it feels difficult</summary><ul className={styles.steps}>{instructions.commonFixes.map(step => <li key={step}>{step}</li>)}</ul></details>
          </> : <>
            <p>{lesson.summary}</p>
            <ol className={styles.steps}><li><strong>Set your focus</strong>{module.skill}. Work on one small part at a time.</li><li><strong>Try it slowly</strong>{lesson.type === "concept" ? "Read the outline, then find the idea on your instrument or try it comfortably with your voice." : "Repeat the exercise at a pace where you can notice what changes. Pause whenever you need to reset."}</li><li><strong>Check your own attempt</strong>{lesson.practiceSpec ? "Use the microphone exercise above for the specific pitch or timing task. Listen separately for sound quality and comfort." : "Listen to your attempt and decide whether you want another pass. This outline has no automatic performance assessment."}</li></ol>
            <p className={`${styles.small} ${styles.muted}`}>This lesson currently contains an outline. Demonstration recordings, song arrangements, and a full written lesson are not included here yet.</p>
          </>}
          <p className={`${styles.small} ${styles.muted}`}>{TRACK_SAFETY_NOTE[track]}</p>
          {/* The module-level caution renders here too, so it does not depend on
              which branch a lesson takes. The track note was lost for the whole
              voice track once already by living in only one of them. */}
          {MODULE_SAFETY_NOTE[module.id as keyof typeof MODULE_SAFETY_NOTE] && <p className={`${styles.small} ${styles.muted}`}>{MODULE_SAFETY_NOTE[module.id as keyof typeof MODULE_SAFETY_NOTE]}</p>}
        </section>
        {track === "voice" && vocalMaterial && <VocalMaterial lessonId={lesson.id} material={vocalMaterial} accountId={access.accountId} libraryHref={hasVerifiedTrackAccess("voice", access) ? "/learn/voice/materials" : undefined} />}
      </div>
      <aside>
        <section id="practice-session" className={styles.panel} aria-label="Finish this lesson">
          <h2>{done ? "Lesson done ✓" : "Finish this lesson"}</h2>
          <p className={styles.small}>{instructions?.completion ?? module.promise}</p>
          {requiresMeasuredCompletion
            ? <p className={styles.small}>{done ? "Your passing Play check is saved." : `Pass the Play check${completionMinimumBPM !== undefined ? ` at ${completionMinimumBPM} BPM or faster` : ""} in the exercise above. It saves automatically when you press Save.`}</p>
            : instructions?.quiz
              ? <p className={styles.small}>{currentReadingResult ? `Reading result: ${currentReadingResult.correctCount}/${currentReadingResult.total}. ${currentReadingResult.passed ? "Passed. This lesson is done." : "Review the missed topics and try again."}` : "Answer the reading check to finish. Answers save as you go."}</p>
              : <>
                <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => saveAssessment("ready")} disabled={!canMarkReady}>{done ? "Done again" : "Mark lesson done"}</button><button type="button" className={styles.secondary} onClick={() => saveAssessment("repeat")}>Needs another pass</button></div>
                {!canMarkReady && <p className={styles.small}>Save the {needsManual ? "one-minute count" : "study"} above first. It is the proof you practised.</p>}
              </>}
          <details className={styles.fold}>
            <summary className={styles.foldTitle}>Practice timer · {formatted}</summary>
            <p className={styles.small}>Suggested: {lesson.minutes} min. Pauses when this tab is hidden.</p>
            <div className={styles.timer} role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds practiced`}>{formatted}</div>
            <p role="status" className={styles.small}>{seconds >= targetSeconds ? "You’ve reached the suggested time." : running ? "Running" : seconds > 0 ? "Paused" : "Ready when you are"}</p>
            <div className={styles.actions}>{running ? <button type="button" className={styles.primary} onClick={pause}>Pause</button> : <button type="button" className={styles.primary} onClick={start}>{seconds > 0 ? "Resume" : "Start timer"}</button>}<button type="button" className={styles.secondary} onClick={reset} disabled={seconds === 0 && !running}>Reset</button></div>
            {(needsManual || needsStudy) && recordedPracticeSeconds > 0 && <p className={styles.small}>Your saved exercise already records {Math.floor(recordedPracticeSeconds / 60)} min {recordedPracticeSeconds % 60} sec, which is what gets saved.</p>}
          </details>
          {message && <p className={styles.saved} role="status">{message}</p>}
          {instructions && <p className={`${styles.small} ${styles.muted}`}>What this shows: {instructions.evidence} It does not assess: {instructions.limitation}</p>}
          {!lesson.practiceSpec && !instructions?.quiz && <p className={`${styles.small} ${styles.muted}`}>Your own call. Pitch, timing and tone are not scored in this lesson.</p>}
        </section>
        {previous && <section className={styles.panel}><h2>Last saved</h2><p>{previous.assessment === "ready" ? "Done" : "Marked to revisit"}</p><p className={styles.small}>{previous.source === "measured" ? `Microphone result: ${previous.score}%${previous.bpm !== undefined ? ` at ${Math.round(previous.bpm)} BPM` : " on this exercise"}.` : previous.source === "readingQuiz" ? "Reading check saved. No microphone score." : "Self-reported. No automatic score."}</p>{previous.completionMinimumBPM !== undefined && previous.bpm !== undefined && previous.bpm < previous.completionMinimumBPM && <p className={styles.small}>Practice score saved. This checkpoint requires at least {previous.completionMinimumBPM} BPM.</p>}</section>}
        {(progress.measuredAttempts?.filter(attempt => attempt.lessonId === lesson.id).length ?? 0) > 0 && <details className={styles.panel}><summary className={styles.foldTitle}>Saved microphone attempts</summary><ol className={styles.steps}>{progress.measuredAttempts!.filter(attempt => attempt.lessonId === lesson.id).slice().reverse().map(attempt => <li key={attempt.id}>{attempt.record.score}%{attempt.record.bpm !== undefined ? ` at ${attempt.record.bpm} BPM` : ""}<p className={styles.small}>{new Date(attempt.record.updatedAt).toLocaleString()}{lesson.practiceSpec?.revision !== undefined && attempt.record.practiceSpecRevision !== lesson.practiceSpec.revision ? " · Earlier exercise revision; retained as practice evidence" : ""}</p></li>)}</ol></details>}
        <Link className={styles.secondary} href={`/learn/${track}`}>Back to all lessons</Link>
      </aside>
    </div>
  </>;
}
