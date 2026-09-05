"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getLesson, isModuleAvailable, lessonHref } from "@/lib/learning/curriculum";
import { getInstructionAsset } from "@/lib/learning/instructions";
import { beginRoutineAttempt, checkpointRoutineAttempt, defaultRoutineSeconds, editRoutineAttemptTarget, finishRoutineSession, newRoutineAttempt, newRoutineSession, parseRoutineState, preparationEvidence, reviewRoutineAttempt, routineChangeRate, routineElapsedSeconds, routinePrepared, routineStorageKey, routineTemplate, RoutineTimer, type RoutineAttempt, type RoutineBlock, type RoutineSession, type RoutineState } from "@/lib/learning/routine";
import { ChordDiagram } from "./LessonInstructionAssets";
import { TuningGuide } from "./TuningGuide";
import { useLearningProgress } from "./useLearningProgress";
import styles from "./PracticeRoutine.module.css";

let memory: string | null = null;
const eventName = "guitarhub-routine-change";
function read() { try { return memory ?? window.localStorage.getItem(routineStorageKey) ?? ""; } catch { return memory ?? ""; } }
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === routineStorageKey || event.key === null) { memory = null; callback(); } };
  window.addEventListener("storage", storage); window.addEventListener(eventName, callback);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(eventName, callback); };
}
const serverSnapshot = () => "";
function useRoutineStore() {
  const raw = useSyncExternalStore(subscribe, read, serverSnapshot);
  const state = useMemo(() => parseRoutineState(raw), [raw]);
  const [storageWarning, setStorageWarning] = useState(false);
  const change = useCallback((update: (state: RoutineState) => RoutineState) => {
    const next = parseRoutineState(JSON.stringify(update(parseRoutineState(read()))));
    memory = JSON.stringify(next);
    try { window.localStorage.setItem(routineStorageKey, memory); } catch { setStorageWarning(true); }
    window.dispatchEvent(new Event(eventName)); return next;
  }, []);
  return { state, change, storageWarning };
}
const stamp = () => new Date().toISOString();
const monotonicNow = () => performance.now();
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
function updateSession(state: RoutineState, id: string, update: (session: RoutineSession) => RoutineSession): RoutineState {
  return { ...state, sessions: state.sessions.map(session => session.id === id && !session.finishedAt ? { ...update(session), updatedAt: stamp() } : session) };
}
function replaceAttempt(state: RoutineState, sessionId: string, blockId: string, attempt: RoutineAttempt): RoutineState {
  return updateSession(state, sessionId, session => ({ ...session, blocks: session.blocks.map(block => block.blockId === blockId ? { ...block, attempts: block.attempts.map(item => item.id === attempt.id ? attempt : item) } : block) }));
}
function LessonLink({ id, pause }: { id: string; pause: () => void }) {
  const found = getLesson("guitar", id);
  if (!found) return null;
  const available = isModuleAvailable("guitar", found.module.id);
  return <Link href={lessonHref("guitar", id)} target="_blank" rel="noopener noreferrer" onClick={pause}>{available ? "Review GuitarHub instruction" : "GuitarHub curriculum preview"} (new tab)</Link>;
}

export function PracticeRoutine() {
  const { state, change, storageWarning } = useRoutineStore();
  const { progress } = useLearningProgress("guitar");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const runtime = useRef<{ sessionId: string; block: RoutineBlock; attempt: RoutineAttempt; clock: RoutineTimer } | null>(null);
  const session = state.sessions.find(item => item.id === state.currentSessionId);
  const block = routineTemplate.blocks.find(item => item.id === session?.selectedBlockId) ?? routineTemplate.blocks[0];
  const record = session?.blocks.find(item => item.blockId === block.id);
  const attempt = record?.attempts.at(-1);
  const prepared = routinePrepared(state, progress);
  const totalSeconds = routineTemplate.blocks.reduce((sum, item) => sum + (session?.blocks.find(record => record.blockId === item.id)?.plannedSeconds ?? state.durations[item.id]), 0);
  const checkpoint = useCallback((stop: boolean, interrupted: boolean, announce = true) => {
    const live = runtime.current; if (!live) return;
    const now = performance.now();
    const sample = live.clock.sample(now, live.attempt.targetSeconds * 1000);
    if (stop && !sample.interrupted) live.clock.pause(now, live.attempt.targetSeconds * 1000);
    const previousElapsed = live.attempt.elapsedMs;
    live.attempt = checkpointRoutineAttempt(live.attempt, live.block, sample.elapsedMs, stamp(), interrupted || sample.interrupted);
    const ended = live.attempt.status === "review";
    if (!stop && !ended && !sample.interrupted && Math.floor(previousElapsed / 1000) === Math.floor(live.attempt.elapsedMs / 1000)) return;
    change(state => replaceAttempt(state, live.sessionId, live.block.id, live.attempt));
    if (stop || ended || sample.interrupted) { runtime.current = null; if (announce) { setRunning(false); setMessage(ended ? "Time reached. Take a moment to review what you practiced." : "Paused. Resume when you are ready; time away will not be counted."); } }
  }, [change]);
  const pause = useCallback(() => checkpoint(true, true), [checkpoint]);
  useEffect(() => {
    const interval = window.setInterval(() => checkpoint(false, false), 250);
    const hide = () => { if (document.visibilityState === "hidden") checkpoint(true, true); };
    const leave = () => checkpoint(true, true);
    const anotherTab = (event: StorageEvent) => { if (event.key === routineStorageKey || event.key === null) { runtime.current = null; setRunning(false); setMessage("Another tab changed this routine. Review the saved state before resuming."); } };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", leave); window.addEventListener("storage", anotherTab);
    return () => { window.clearInterval(interval); checkpoint(true, true, false); document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", leave); window.removeEventListener("storage", anotherTab); };
  }, [checkpoint]);
  function start() {
    if (!session || !record || !prepared || document.visibilityState === "hidden") return;
    if (attempt && ["review", "reviewed", "skipped"].includes(attempt.status)) return;
    const next = beginRoutineAttempt(attempt ?? newRoutineAttempt(crypto.randomUUID(), stamp(), record.plannedSeconds));
    change(state => updateSession(state, session.id, current => ({ ...current, blocks: current.blocks.map(item => item.blockId === block.id ? { ...item, attempts: attempt ? item.attempts.map(old => old.id === next.id ? next : old) : [...item.attempts, next] } : item) })));
    const clock = new RoutineTimer(); clock.start(next.elapsedMs, monotonicNow());
    runtime.current = { sessionId: session.id, block, attempt: next, clock }; setRunning(true); setMessage("Timer running while this page is visible.");
  }
  function select(id: string) { pause(); if (session) change(state => updateSession(state, session.id, current => ({ ...current, selectedBlockId: id }))); }
  function repeat() {
    pause(); if (!session || !record) return;
    change(state => updateSession(state, session.id, current => ({ ...current, blocks: current.blocks.map(item => item.blockId === block.id ? { ...item, attempts: [...item.attempts.map(old => old.status === "paused" || old.status === "pending" || old.status === "review" ? { ...old, status: "skipped" as const, completeMinute: false } : old), newRoutineAttempt(crypto.randomUUID(), stamp(), item.plannedSeconds)] } : item) })));
    setMessage("A fresh attempt is ready. Your earlier attempt remains in history.");
  }
  function editDuration(id: string, value: number) {
    if (running || !Number.isInteger(value) || value < 15 || value > 3600) return;
    const currentAttempt = session?.blocks.find(item => item.blockId === id)?.attempts.at(-1);
    if (currentAttempt && ["pending", "paused", "review"].includes(currentAttempt.status) && value * 1000 < currentAttempt.elapsedMs) setMessage("The shorter duration is saved for your next attempt. This attempt keeps its elapsed time and target.");
    change(state => {
      const next = { ...state, durations: { ...state.durations, [id]: value } };
      if (!session) return next;
      return updateSession(next, session.id, current => ({ ...current, blocks: current.blocks.map(item => item.blockId === id ? { ...item, plannedSeconds: value, attempts: item.attempts.map((old, index) => index === item.attempts.length - 1 ? editRoutineAttemptTarget(old, value) : old) } : item) }));
    });
  }
  function exportHistory() {
    pause(); const data = { template: routineTemplate, progress: parseRoutineState(read()) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "guitarhub-routine-history.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className={styles.routine}>
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/learn/guitar" onClick={pause}>Guitar learning path</Link><span aria-hidden="true"> / </span><span>Daily practice</span></nav>
    <header className={styles.hero}><p className={styles.eyebrow}>A little practice, often</p><h1>Your first A/D routine.</h1><p>Tune up, check your chords, practice changes, and spend time on songs. Seven blocks, {defaultRoutineSeconds / 60} minutes. Adjust the time to fit today.</p></header>
    <p className={styles.note}>A free practice companion. Your history stays in this browser. Counts and reflections come from you and are saved separately from lesson checks and microphone results.</p>
    {storageWarning && <p role="alert" className={styles.note}>This browser could not save your routine to local storage. Keep this tab open and export your history before leaving.</p>}
    <details className={styles.preparation} open={!prepared}><summary><h2>Before the routine</h2><span>{prepared ? "Preparation available · review or reset" : "Learn the moves, then prepare"}</span></summary><p>Read or watch instruction first. Saved lesson evidence can satisfy preparation, or confirm that you have received instruction elsewhere and understand the exercise. These confirmations describe your preparation, not a skill test.</p>
      <ul className={styles.prepList}>{routineTemplate.preparation.map(item => { const evidence = preparationEvidence(item.id, state, progress); return <li key={item.id}><strong>{item.title}</strong><div className={styles.links}><LessonLink id={item.lessonIds[0]} pause={pause} /><a href={item.externalUrl} target="_blank" rel="noopener noreferrer" onClick={pause}>{item.externalLabel} (external, new tab)</a></div>{evidence === "lessonEvidence" ? <p>Available from your saved lesson evidence.</p> : <label className={styles.check}><input type="checkbox" checked={evidence === "selfReported"} disabled={running} onChange={event => { const checked = event.target.checked; change(state => { const preparation = { ...state.preparation }; if (checked) preparation[item.id] = { source: "selfReported", confirmedAt: stamp() }; else delete preparation[item.id]; return { ...state, preparation }; }); }} />I have received instruction and understand this exercise.</label>}</li>; })}</ul>
      <button type="button" className={styles.secondary} disabled={running || Object.keys(state.preparation).length === 0} onClick={() => change(state => ({ ...state, preparation: {} }))}>Reset my preparation confirmations</button>
    </details>
    <section aria-labelledby="routine-plan-title"><div className={styles.sectionHeading}><h2 id="routine-plan-title">Today’s plan</h2><span>{formatTime(totalSeconds)} planned</span></div><p>Adjust any block in seconds while the timer is paused. A little practice each day helps the movements become familiar.</p>
      <ol className={styles.plan}>{routineTemplate.blocks.map((item, index) => { const saved = session?.blocks.find(record => record.blockId === item.id); return <li key={item.id} data-current={!!session && block.id === item.id}><div><span className={styles.number}>{index + 1}</span>{session ? <button className={styles.blockLink} type="button" onClick={() => select(item.id)} aria-current={block.id === item.id ? "step" : undefined}>{item.title}</button> : <strong>{item.title}</strong>}</div><label><span className={styles.srOnly}>{item.title} planned seconds</span><input aria-label={`${item.title} planned seconds`} type="number" min="15" max="3600" step="1" key={saved?.plannedSeconds ?? state.durations[item.id]} defaultValue={saved?.plannedSeconds ?? state.durations[item.id]} disabled={running} onBlur={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 15 && value <= 3600) editDuration(item.id, value); else event.target.value = String(saved?.plannedSeconds ?? state.durations[item.id]); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span>sec</span></label></li>; })}</ol>
      {!session && <div className={styles.actions}><button type="button" className={styles.primary} disabled={!prepared} onClick={() => { change(state => newRoutineSession(state, crypto.randomUUID(), stamp())); setMessage("Routine ready. Start the first block when your guitar is in hand."); }}>Prepare today’s routine</button>{!prepared && <p>Complete preparation above to use the timer. The plan remains available to review.</p>}</div>}
    </section>
    {session && record && <section className={styles.practice} aria-labelledby="active-block-title"><p className={styles.eyebrow}>Block {routineTemplate.blocks.findIndex(item => item.id === block.id) + 1} of 7</p><h2 id="active-block-title">{block.title}</h2><p>{block.prompt}</p>
      <div className={styles.diagrams}>{block.assetIds.map(id => { const asset = getInstructionAsset(id); return asset?.kind === "chord" ? <ChordDiagram key={id} asset={asset} /> : null; })}</div>
      <div className={styles.links}><LessonLink id={block.lessonId} pause={pause} />{block.kind === "songs" && <a href={routineTemplate.preparation.find(item => item.id === "songs")!.externalUrl} target="_blank" rel="noopener noreferrer" onClick={pause}>Find suitable two-chord songs at JustinGuitar (external, new tab)</a>}</div><p className={styles.small}>Instruction links pause this routine. Time spent on another tab is excluded. Resume here when ready to practice.</p>
      {block.kind === "tuning" && <><p>Set up the tuner and respond to the microphone permission request before starting this block’s timer. Reference sounds, small adjustments, and rechecking are part of this self-reported tuning practice. Extend the time whenever needed.</p><TuningGuide onReadyChange={ready => { if (ready) setMessage("Your tuning checklist is confirmed by you. Review the tuning block below when ready; no lesson completion was recorded."); }} /></>}
      <div className={styles.timer} role="timer" aria-label="Practice time remaining">{formatTime(Math.ceil(((attempt?.targetSeconds ?? record.plannedSeconds) * 1000 - (attempt?.elapsedMs ?? 0)) / 1000))}</div><p className={styles.timeCaption}>{formatTime((attempt?.elapsedMs ?? 0) / 1000)} foreground time · {running ? "Running" : attempt?.status === "reviewed" ? "Reflection saved" : attempt?.status === "review" ? "Time reached" : attempt?.status === "skipped" ? "Skipped" : "Paused / ready"}</p>
      <div className={styles.actions}>{running ? <button type="button" className={styles.primary} onClick={pause}>Pause</button> : <button type="button" className={styles.primary} disabled={!prepared || !!attempt && ["review", "reviewed", "skipped"].includes(attempt.status)} onClick={start}>{attempt?.status === "reviewed" ? "Reflection saved" : attempt?.status === "review" ? "Review this attempt" : attempt?.status === "skipped" ? "Block skipped" : attempt && attempt.elapsedMs > 0 ? "Resume block" : "Start block"}</button>}{attempt && !running && <button className={styles.secondary} type="button" onClick={repeat}>Prepare a fresh attempt</button>}{!running && (!attempt || !["reviewed", "skipped"].includes(attempt.status)) && <button className={styles.secondary} type="button" disabled={(attempt?.targetSeconds ?? record.plannedSeconds) >= 3600} onClick={() => editDuration(block.id, Math.min(3600, (attempt?.targetSeconds ?? record.plannedSeconds) + 60))}>Add a minute</button>}</div>
      {block.kind === "changes" && <p className={styles.note}>Start with the named shape already formed. Enter your count after the timer. Only an uninterrupted 60-second attempt gets a per-minute count. Paused, partial, or edited attempts keep raw counts without an estimated rate. Around 30 is an early guide; 60 is a longer-term target, not an automatic pass.</p>}
      {attempt && !running && ["paused", "review"].includes(attempt.status) && <RoutineReview key={attempt.id} attempt={attempt} block={block} onSave={(reflection, count) => { change(state => replaceAttempt(state, session.id, block.id, reviewRoutineAttempt(attempt, reflection, count, stamp()))); setMessage("Self-reported reflection saved. This does not complete a lesson."); }} />}
      {attempt?.status === "reviewed" && <p role="status">Reflection saved: {attempt.reflection === "practiced" ? "practiced" : "revisit"}{attempt.manualCount !== null ? ` · ${attempt.manualCount} manual changes${routineChangeRate(attempt) !== null ? " in one continuous minute" : " (raw count, no per-minute rate)"}` : ""}.</p>}
      <div className={styles.actions}>{(!attempt || !running && !["reviewed", "skipped"].includes(attempt.status)) && <button type="button" className={styles.secondary} onClick={() => { pause(); const skipped = { ...(attempt ?? newRoutineAttempt(crypto.randomUUID(), stamp(), record.plannedSeconds)), status: "skipped" as const, completeMinute: false, updatedAt: stamp() }; change(state => updateSession(state, session.id, current => ({ ...current, blocks: current.blocks.map(item => item.blockId === block.id ? { ...item, attempts: attempt ? item.attempts.map(old => old.id === skipped.id ? skipped : old) : [...item.attempts, skipped] } : item) }))); }}>Skip this block</button>}{block.id !== "songs" && <button className={styles.secondary} type="button" onClick={() => select(routineTemplate.blocks[routineTemplate.blocks.findIndex(item => item.id === block.id) + 1].id)}>Next block</button>}<button type="button" className={styles.secondary} onClick={() => { pause(); change(state => finishRoutineSession(state, stamp())); setMessage("Routine saved. Any skipped or unfinished blocks remain visible in history."); }}>End and review routine</button></div>
    </section>}
    <p role="status" className={styles.status}>{message}</p>
    <section aria-labelledby="routine-history-title"><div className={styles.sectionHeading}><h2 id="routine-history-title">Your practice history</h2>{state.sessions.length > 0 && <button type="button" className={styles.secondary} onClick={exportHistory}>Export history</button>}</div><p>Saved in this browser. Returning restores paused time; closed-tab or background time is never added. Counts and reflections are kept as separate attempts.</p>{state.sessions.length === 0 ? <p>No routines yet.</p> : [...state.sessions].reverse().map(item => <details className={styles.history} key={item.id}><summary>{new Date(item.createdAt).toLocaleDateString()} · {formatTime(routineElapsedSeconds(item))} foreground time · {item.finishedAt ? "Ended" : "In progress"}</summary><ol>{item.blocks.map(saved => <li key={saved.blockId}><strong>{routineTemplate.blocks.find(block => block.id === saved.blockId)!.title}</strong>{saved.attempts.length ? <ul>{saved.attempts.map((attempt, index) => <li key={attempt.id}>Attempt {index + 1}: {formatTime(attempt.elapsedMs / 1000)} / {formatTime(attempt.targetSeconds)} · {attempt.status === "reviewed" ? `self-reported ${attempt.reflection}` : attempt.status === "review" ? "awaiting reflection" : attempt.status}{attempt.interrupted ? " · interrupted" : ""}{attempt.manualCount !== null ? ` · ${attempt.manualCount} manual changes${routineChangeRate(attempt) === null ? ", no per-minute rate" : " in one minute"}` : ""}</li>)}</ul> : <p>Not started</p>}</li>)}</ol></details>)}</section>
    <p className={styles.source}>Practice cadence based on the <a href={routineTemplate.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={pause}>{routineTemplate.sourceLabel}</a>. GuitarHub provides its own presentation and local practice record.</p>
  </div>;
}
function RoutineReview({ attempt, block, onSave }: { attempt: RoutineAttempt; block: RoutineBlock; onSave: (reflection: "practiced" | "revisit", count: number | null) => void }) {
  const [checked, setChecked] = useState(false);
  const [count, setCount] = useState("");
  const validCount = count === "" || Number.isInteger(Number(count)) && Number(count) >= 0 && Number(count) <= 10000;
  return <div className={styles.review}><h3>Review this attempt</h3><p>{attempt.status === "review" ? "The timer reached your target." : "This is a partial attempt."} Describe your practice; elapsed time does not verify accuracy.</p><label className={styles.check}><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />{block.selfCheck}</label>{block.kind === "changes" && <label className={styles.count}>My manual change count (optional)<input type="number" min="0" max="10000" step="1" inputMode="numeric" value={count} onChange={event => setCount(event.target.value)} /></label>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={!checked || !validCount} onClick={() => onSave("practiced", block.kind === "changes" && count !== "" ? Number(count) : null)}>Save: I practiced this</button><button type="button" className={styles.secondary} disabled={!validCount} onClick={() => onSave("revisit", block.kind === "changes" && count !== "" ? Number(count) : null)}>Save: I’ll revisit this</button></div></div>;
}
