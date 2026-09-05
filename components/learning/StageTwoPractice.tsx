"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { claimAudioSession } from "@/lib/audio/capture";
import { isFullStudyTake, manualChangeRate, manualMinuteResult, studyPosition, studySoundEvents, type ChordStudy, type ManualChangeAttempt, type StageTwoAsset, type StudyAttempt } from "@/lib/learning/stage-two";
import { manualPracticeEvidence, noStageTwoEvidence, studyPracticeEvidence, type StageTwoEvidence } from "@/lib/learning/stage-two-evidence";
import { useStageTwoProgress } from "./useLearningProgress";
import styles from "./StageTwoPractice.module.css";

type ManualAsset = Extract<StageTwoAsset, { kind: "manualChanges" }>;
function ManualChanges({ lessonId, asset, checkpoint, history, record, onEvidenceChange }: {
  lessonId: string; asset: ManualAsset; checkpoint: boolean; history: ManualChangeAttempt[];
  record: (attempt: ManualChangeAttempt) => boolean; onEvidenceChange: (evidence: StageTwoEvidence) => void;
}) {
  const [startingChord, setStartingChord] = useState<"A" | "D">(asset.defaultStartingChord);
  const [running, setRunning] = useState(false), [remaining, setRemaining] = useState(60);
  const [trial, setTrial] = useState<ManualChangeAttempt | null>(null), [count, setCount] = useState("");
  const [saved, setSaved] = useState(false), [message, setMessage] = useState("");
  const active = useRef<{ attempt: ManualChangeAttempt; startedAt: number; release: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ record, onEvidenceChange });
  const inputId = useId();
  useEffect(() => { callbacks.current = { record, onEvidenceChange }; }, [record, onEvidenceChange]);
  const latest = history.at(-1);
  useEffect(() => { onEvidenceChange(manualPracticeEvidence(latest, checkpoint, asset.earlyReadinessCount)); }, [latest, checkpoint, asset.earlyReadinessCount, onEvidenceChange]);
  const end = useCallback((interrupted: boolean, announce = true) => {
    const run = active.current;
    if (!run) return;
    active.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    run.release();
    const attempt = { ...run.attempt, ...manualMinuteResult(run.startedAt, performance.now() / 1000, interrupted) };
    const persisted = callbacks.current.record(attempt);
    callbacks.current.onEvidenceChange(manualPracticeEvidence(attempt, checkpoint, asset.earlyReadinessCount));
    if (announce) { setRunning(false); setRemaining(Math.ceil(60 - attempt.durationSeconds)); setTrial(attempt); setMessage(persisted ? interrupted ? "This attempt stopped. Enter a partial count, or prepare a fresh minute." : "The full minute is finished. Enter the changes you counted." : "Browser storage is unavailable. This trial is kept for this open page only."); }
  }, [checkpoint, asset.earlyReadinessCount]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) end(true); };
    const pageHide = () => end(true);
    window.addEventListener("pagehide", pageHide); document.addEventListener("visibilitychange", hidden);
    return () => { end(true, false); window.removeEventListener("pagehide", pageHide); document.removeEventListener("visibilitychange", hidden); };
  }, [end]);
  function start() {
    if (document.hidden || active.current) return;
    callbacks.current.onEvidenceChange(noStageTwoEvidence); setCount(""); setSaved(false); setTrial(null); setRemaining(60); setMessage("");
    const attempt: ManualChangeAttempt = { id: crypto.randomUUID(), lessonId, createdAt: new Date().toISOString(), startingChord, count: null, durationSeconds: 0, completedMinute: false, interrupted: false };
    const run = { attempt, startedAt: performance.now() / 1000, release: () => {} };
    active.current = run;
    run.release = claimAudioSession(() => end(true));
    callbacks.current.record(attempt);
    setRunning(true);
    timer.current = setInterval(() => {
      if (!active.current) return;
      const elapsed = Math.max(0, performance.now() / 1000 - active.current.startedAt);
      if (elapsed >= 60) end(false); else setRemaining(Math.ceil(60 - elapsed));
    }, 100);
  }
  function saveCount() {
    if (!trial || saved || !/^\d+$/.test(count)) return;
    const number = Number(count);
    if (!Number.isSafeInteger(number) || number < 0 || number > 10000) return;
    const attempt = { ...trial, count: number };
    const persisted = record(attempt);
    setTrial(attempt); setSaved(true); onEvidenceChange(manualPracticeEvidence(attempt, checkpoint, asset.earlyReadinessCount));
    setMessage(persisted ? "Your count is saved in this browser." : "Your count is kept for this open page only; browser storage is unavailable.");
  }
  return <section className={styles.card} aria-label="One-minute chord changes">
    <h3>One minute. Count your changes.</h3><p>The timer measures the minute. You count each change; the microphone stays off.</p>
    <div className={styles.actions} role="group" aria-label="Starting chord">{(["A", "D"] as const).map(chord => <button type="button" key={chord} aria-pressed={startingChord === chord} disabled={running || trial !== null} onClick={() => setStartingChord(chord)}>Start on {chord}</button>)}</div>
    <p>Form {startingChord} before starting. That setup is zero. Move to {startingChord === "A" ? "D" : "A"} and strum: one. Move back and strum: two.</p><p className={styles.caption}>{asset.countRule}</p>
    <div className={styles.timer} role="timer" aria-label={`${remaining} seconds remaining`}>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div>
    {running ? <button type="button" onClick={() => end(true)}>Stop this attempt</button> : !trial ? <button type="button" onClick={start}>Start 60 seconds</button> : <>
      <p>{trial.completedMinute ? "A full, continuous minute." : `${Math.floor(trial.durationSeconds)} seconds of partial practice. This is not a changes-per-minute result.`}</p>
      <label htmlFor={inputId}>Changes you counted</label><input id={inputId} inputMode="numeric" type="text" pattern="[0-9]*" value={count} disabled={saved} onChange={event => setCount(event.target.value)} />
      <div className={styles.actions}><button type="button" disabled={saved || !/^\d+$/.test(count) || Number(count) > 10000} onClick={saveCount}>{saved ? "Count saved" : "Save my count"}</button><button type="button" onClick={() => { setTrial(null); setCount(""); setRemaining(60); setSaved(false); onEvidenceChange(noStageTwoEvidence); setMessage(""); }}>Prepare a new minute</button></div>
    </>}
    {message && <p role="status" className={styles.message}>{message}</p>}
    <p className={styles.caption}>{asset.earlyReadinessCount} changes in a full minute is an early readiness guide; {asset.longerTermGoalCount} is a longer-term goal. A formed destination counts in this speed exercise. Check clean sound in the separate accuracy block.</p>
    {history.length > 0 && <details><summary>Previous counts ({history.length})</summary><ol className={styles.history}>{[...history].reverse().map(attempt => <li key={attempt.id}><strong>{attempt.count === null ? "Count not entered" : `${attempt.count} changes`}</strong> · {manualChangeRate(attempt) !== null ? "full 60-second minute" : `${Math.floor(attempt.durationSeconds)}-second partial practice`} · started on {attempt.startingChord}<span>{new Date(attempt.createdAt).toLocaleString()} · learner-entered count</span></li>)}</ol></details>}
  </section>;
}

type StudyRun = { context: AudioContext; startedAt: number | null; firstBar: number; lastBar: number; bpm: number; mode: "practice" | "listen"; release: () => void; nodes: OscillatorNode[] };
function StudyPlayer({ lessonId, study, history, record, onEvidenceChange }: { lessonId: string; study: ChordStudy; history: StudyAttempt[]; record: (attempt: StudyAttempt) => boolean; onEvidenceChange: (evidence: StageTwoEvidence) => void }) {
  const [mode, setMode] = useState<"practice" | "listen">("practice"), [speed, setSpeed] = useState(100), [phraseId, setPhraseId] = useState("all");
  const [variantId, setVariantId] = useState(study.variants.find(variant => variant.isDefault)?.id ?? study.variants[0].id);
  const [backing, setBacking] = useState(false), [clicks, setClicks] = useState(true);
  const [phase, setPhase] = useState<"idle" | "preparing" | "playing" | "paused" | "finished">("idle");
  const [position, setPosition] = useState(() => studyPosition(study, 0, study.defaultBPM, 1, study.barCount));
  const [practiceSeconds, setPracticeSeconds] = useState(0), [interrupted, setInterrupted] = useState(false), [timelineFinished, setTimelineFinished] = useState(false);
  const [playedAllBars, setPlayedAllBars] = useState(false), [reviewBar, setReviewBar] = useState(0), [saved, setSaved] = useState(false), [message, setMessage] = useState("");
  const run = useRef<StudyRun | null>(null), animation = useRef(0), accumulated = useRef(0);
  const callback = useRef(onEvidenceChange);
  const controlId = useId();
  useEffect(() => { callback.current = onEvidenceChange; }, [onEvidenceChange]);
  const latest = history.at(-1);
  useEffect(() => { onEvidenceChange(studyPracticeEvidence(latest, study)); }, [latest, study, onEvidenceChange]);
  const phrase = study.phrases.find(item => item.id === phraseId), firstBar = phrase?.startBar ?? 1, lastBar = phrase?.endBar ?? study.barCount;
  const bpm = study.defaultBPM * speed / 100, variant = study.variants.find(item => item.id === variantId)!;
  const closeRun = useCallback(() => {
    const active = run.current;
    if (!active) return;
    run.current = null; cancelAnimationFrame(animation.current);
    if (active.startedAt !== null && active.mode === "practice") accumulated.current += studyPosition(study, active.context.currentTime - active.startedAt, active.bpm, active.firstBar, active.lastBar).musicSeconds;
    active.release(); active.context.onstatechange = null;
    active.nodes.forEach(node => { try { node.stop(); node.disconnect(); } catch { /* Already ended. */ } });
    void active.context.close().catch(() => {});
  }, [study]);
  const pause = useCallback((reason = "Paused. Resume restarts this bar with a fresh four-beat count-in.", announce = true) => {
    const active = run.current;
    if (!active) return;
    const current = studyPosition(study, active.startedAt === null ? 0 : active.context.currentTime - active.startedAt, active.bpm, active.firstBar, active.lastBar);
    closeRun(); callback.current(noStageTwoEvidence);
    if (announce) { setPosition(current); setPracticeSeconds(accumulated.current); setInterrupted(true); setPhase("paused"); setMessage(reason); }
  }, [closeRun, study]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause("Paused while this page was hidden. Resume with a fresh count-in when you are ready."); };
    const pageHide = () => pause("Paused when leaving this page. Resume with a fresh count-in.");
    document.addEventListener("visibilitychange", hidden); window.addEventListener("pagehide", pageHide);
    return () => { pause("", false); document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", pageHide); };
  }, [pause]);
  async function start(resume: boolean) {
    if (document.hidden || run.current) return;
    onEvidenceChange(noStageTwoEvidence); setSaved(false); setMessage(""); setTimelineFinished(false); setPhase("preparing");
    const restartBar = resume ? Math.max(firstBar, Math.min(lastBar, position.bar)) : firstBar;
    if (!resume) { accumulated.current = 0; setPracticeSeconds(0); setInterrupted(false); }
    setPosition(studyPosition(study, 0, bpm, restartBar, lastBar));
    let active: StudyRun | null = null;
    try {
      const context = new AudioContext({ latencyHint: "interactive" });
      active = { context, startedAt: null, firstBar: restartBar, lastBar, bpm, mode, release: () => {}, nodes: [] };
      run.current = active;
      active.release = claimAudioSession(() => pause("Another audio activity interrupted the study. Resume when you are ready."));
      await context.resume();
      if (run.current !== active || document.hidden) { if (run.current === active) pause(); return; }
      const master = context.createGain(); master.gain.value = .85; master.connect(context.destination);
      active.startedAt = context.currentTime + .08;
      for (const event of studySoundEvents(study, bpm, restartBar, lastBar, variantId, mode === "listen" || backing, clicks)) {
        const oscillator = context.createOscillator(), gain = context.createGain(), start = active.startedAt + event.at, end = start + event.duration;
        oscillator.type = event.type; oscillator.frequency.value = event.frequency;
        oscillator.connect(gain); gain.connect(master);
        gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(event.gain, start + Math.min(.012, event.duration / 4));
        gain.gain.setValueAtTime(event.gain, Math.max(start + .015, end - .12)); gain.gain.exponentialRampToValueAtTime(.0001, end);
        oscillator.start(start); oscillator.stop(end); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        active.nodes.push(oscillator);
      }
      context.onstatechange = () => { if (run.current === active && context.state !== "running") pause("Sound was interrupted. Resume from this bar when you are ready."); };
      setPhase("playing");
      const tick = () => {
        if (!active || run.current !== active || active.startedAt === null) return;
        const next = studyPosition(study, context.currentTime - active.startedAt, bpm, restartBar, lastBar);
        setPosition(next);
        if (next.finished) { closeRun(); setPracticeSeconds(accumulated.current); setTimelineFinished(true); setPhase("finished"); setMessage(mode === "listen" ? "Listening finished. No practice time or playing result was added." : "The selected bars finished. Record your own reflection below."); return; }
        animation.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      if (active && run.current !== active) return;
      closeRun(); setPhase("paused"); setInterrupted(true); setMessage("Sound could not start. Your place is preserved; try again or use the written chart.");
    }
  }
  function reset() { closeRun(); accumulated.current = 0; setPracticeSeconds(0); setPhase("idle"); setPlayedAllBars(false); setReviewBar(0); setSaved(false); setInterrupted(false); setTimelineFinished(false); setMessage(""); onEvidenceChange(noStageTwoEvidence); }
  function saveReflection() {
    if (mode !== "practice" || saved || practiceSeconds <= 0) return;
    const attempt: StudyAttempt = { id: crypto.randomUUID(), lessonId, studyId: study.id, createdAt: new Date().toISOString(), bpm, firstBar, lastBar, variantId, practiceSeconds, usedBacking: backing, usedClicks: clicks, interrupted, timelineFinished, learnerPlayedAllBars: playedAllBars, reviewBar: reviewBar || null };
    const persisted = record(attempt); setSaved(true); onEvidenceChange(studyPracticeEvidence(attempt, study));
    setMessage(persisted ? "Your study reflection is saved in this browser." : "Your reflection is kept for this open page only; browser storage is unavailable.");
  }
  return <section className={styles.card} aria-label={`${study.title} original chord study`}>
    <h3>{study.title} · an original A/D study</h3><p>{study.barCount} bars in 4/4. D starts on string 4; A starts on string 5. {variant.action}</p>
    <div className={styles.actions} role="group" aria-label="Study mode">{(["practice", "listen"] as const).map(intent => <button key={intent} type="button" disabled={phase !== "idle"} aria-pressed={mode === intent} onClick={() => setMode(intent)}>{intent === "practice" ? "Practice · unscored" : "Listen"}</button>)}</div>
    <label htmlFor={`${controlId}-phrase`}>Bars to practice</label><select id={`${controlId}-phrase`} value={phraseId} disabled={phase !== "idle"} onChange={event => setPhraseId(event.target.value)}><option value="all">All {study.barCount} bars</option>{study.phrases.map(phrase => <option key={phrase.id} value={phrase.id}>{phrase.label}</option>)}</select>
    <label htmlFor={`${controlId}-variant`}>Strumming pattern</label><select id={`${controlId}-variant`} value={variantId} disabled={phase !== "idle"} onChange={event => setVariantId(event.target.value)}>{study.variants.map(variant => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select>
    <label htmlFor={`${controlId}-speed`}>Tempo · {bpm} BPM ({speed}%)</label><input id={`${controlId}-speed`} type="range" min="25" max="125" step="5" value={speed} disabled={phase !== "idle"} onChange={event => setSpeed(Number(event.target.value))} />
    {mode === "practice" && <label className={styles.check}><input type="checkbox" checked={backing} disabled={phase !== "idle"} onChange={event => setBacking(event.target.checked)} />Synthesized chord backing</label>}
    <label className={styles.check}><input type="checkbox" checked={clicks} disabled={phase !== "idle"} onChange={event => setClicks(event.target.checked)} />Clicks during the music</label>
    <p className={styles.caption}>Four count-in beats come before the music. Listen plays generated chord tones. Practice keeps the microphone off and adds no pitch, chord, or timing score.</p>
    <div className={styles.chart} aria-label="Written chord chart">{study.bars.map(bar => <div key={bar.number} className={styles.bar} data-current={phase === "playing" && !position.countingIn && position.bar === bar.number} data-selected={bar.number >= firstBar && bar.number <= lastBar} aria-label={`Bar ${bar.number}, ${bar.chord}, ${variantId === "one-per-bar" ? "downstroke on beat 1, let ring through 2, 3 and 4" : "one downstroke on each beat"}`}><small>{bar.number}</small><strong>{bar.chord}</strong><span aria-hidden="true">{variantId === "one-per-bar" ? "↓ · · ·" : "↓ ↓ ↓ ↓"}</span></div>)}</div>
    {(phase === "playing" || phase === "paused") && <div className={styles.position} role="status">{position.countingIn ? <strong>Count in · {position.countInRemaining}</strong> : <><strong>{study.bars[position.bar - 1].chord}</strong><span>Bar {position.bar} of {study.barCount} · beat {position.beatInBar} of 4</span><span>{variantId === "four-per-bar" || position.beatInBar === 1 ? "Downstroke" : "Let ring"}</span></>}</div>}
    <div className={styles.actions}>{phase === "idle" && <button type="button" onClick={() => void start(false)}>{mode === "listen" ? "Listen to selected bars" : "Start selected bars"}</button>}{phase === "preparing" && <><span role="status">Preparing sound…</span><button type="button" onClick={() => pause()}>Cancel</button></>}{phase === "playing" && <button type="button" onClick={() => pause()}>Pause</button>}{phase === "paused" && <><button type="button" onClick={() => void start(true)}>Restart bar {position.bar} with count-in</button><button type="button" onClick={() => { setTimelineFinished(false); setPhase("finished"); }}>End this attempt</button></>}</div>
    {message && <p role="status" className={styles.message}>{message}</p>}
    {phase === "finished" && mode === "practice" && <div className={styles.reflection}><h4>Your reflection · {Math.floor(practiceSeconds)} seconds practiced</h4><label className={styles.check}><input type="checkbox" disabled={saved} checked={playedAllBars} onChange={event => setPlayedAllBars(event.target.checked)} />I played all the selected bars</label><label htmlFor={`${controlId}-review`}>Bar to revisit</label><select id={`${controlId}-review`} disabled={saved} value={reviewBar} onChange={event => setReviewBar(Number(event.target.value))}><option value="0">No particular bar</option>{study.bars.filter(bar => bar.number >= firstBar && bar.number <= lastBar).map(bar => <option key={bar.number} value={bar.number}>Bar {bar.number}</option>)}</select><p>{interrupted ? "This take was interrupted. Save it as practice, then try a fresh full take when ready." : "A full take means you tried all 16 bars without stopping. It does not require a mistake-free performance."}</p><button type="button" disabled={saved || practiceSeconds <= 0} onClick={saveReflection}>{saved ? "Reflection saved" : "Save my reflection"}</button><p className={styles.caption}>This is self-reported playing. Listening or watching the chart does not complete the study.</p></div>}
    {phase === "finished" && <button type="button" onClick={reset}>Prepare another take</button>}
    {history.length > 0 && <details><summary>Saved study practice ({history.length})</summary><ol className={styles.history}>{[...history].reverse().map(attempt => <li key={attempt.id}>Bars {attempt.firstBar}–{attempt.lastBar} · {attempt.bpm} BPM · {Math.floor(attempt.practiceSeconds)} sec<span>{isFullStudyTake(attempt, study) ? "Self-reported full take" : "Practice reflection"}{attempt.interrupted ? " · interrupted" : ""} · {attempt.usedBacking ? "with chord backing" : "without chord backing"}{attempt.reviewBar ? ` · revisit bar ${attempt.reviewBar}` : ""}</span></li>)}</ol></details>}
  </section>;
}

export function StageTwoPractice({ lessonId, assets, checkpoint, onManualEvidenceChange, onStudyEvidenceChange }: { lessonId: string; assets: StageTwoAsset[]; checkpoint: boolean; onManualEvidenceChange: (evidence: StageTwoEvidence) => void; onStudyEvidenceChange: (evidence: StageTwoEvidence) => void }) {
  const { history, recordChange, recordStudy } = useStageTwoProgress("guitar");
  return <div className={styles.stack}>{assets.map(asset => {
    if (asset.kind === "manualChanges") return <ManualChanges key={asset.id} lessonId={lessonId} asset={asset} checkpoint={checkpoint} history={history.changes.filter(attempt => attempt.lessonId === lessonId)} record={recordChange} onEvidenceChange={onManualEvidenceChange} />;
    if (asset.kind === "study") return <StudyPlayer key={asset.id} lessonId={lessonId} study={asset.study} history={history.studies.filter(attempt => attempt.lessonId === lessonId && attempt.studyId === asset.study.id)} record={recordStudy} onEvidenceChange={onStudyEvidenceChange} />;
    if (asset.kind === "panels") return <section key={asset.id} className={styles.card}><h3>A chord accuracy cycle</h3><ol className={styles.steps}>{asset.panels.map(panel => <li key={panel.number}><strong>{panel.label}</strong><p>{panel.action}</p></li>)}</ol></section>;
    if (asset.kind === "anchor") return <section key={asset.id} className={styles.card}><h3>Keep a light index-finger anchor</h3><p>{asset.textAlternative}</p><ol className={styles.steps}>{asset.sequence.map(step => <li key={step.number}><strong>{step.chord ?? "Keep contact"}</strong><p>{step.action}</p></li>)}</ol><p className={styles.caption}>Suggested block: {asset.suggestedSeconds / 60} minutes. This is silent movement practice; loosen your hand whenever needed.</p></section>;
    if (asset.kind === "barGuide") return <section key={asset.id} className={styles.card}><h3>Four beats make a bar</h3><div className={styles.beatGuide}>{asset.beats.map(beat => <div key={beat.beatInBar}><strong>{beat.beatInBar}</strong><span>{beat.action}</span></div>)}</div><p>{asset.textAlternative}</p><p className={styles.caption}>Say the four beats evenly. Reading this diagram adds no timing score.</p></section>;
    if (asset.kind === "externalLinks") return <section key={asset.id} className={styles.card}><h3>Optional songs to practice elsewhere</h3><p>These links open external lessons. Their recordings and arrangements are not included in GuitarHub, and opening a link does not complete a lesson.</p><ul className={styles.links}>{asset.options.map(option => <li key={option.id}><a href={option.url} target="_blank" rel="noopener noreferrer">{option.title} <span className={styles.caption}>(opens a new tab)</span></a><p>{option.description}</p></li>)}</ul></section>;
    return <section key={asset.id} className={styles.card}><h3>{asset.barCount} bars · {asset.targetCount} written attacks</h3><p>The full timing check below uses {asset.bpm} BPM. Slower Play attempts retain a practice score; passing this named checkpoint requires the authored tempo and accuracy.</p><p className={styles.caption}>Use the visual beat guide during microphone capture. Speaker clicks can be mistaken for your attacks.</p></section>;
  })}</div>;
}
