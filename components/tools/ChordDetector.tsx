"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasWebAudio, startCapture, type Capture } from "@/lib/audio/capture";
import { bindPracticeLifecycle } from "@/lib/audio/practice-tools";
import { analyzeFrame, ChordSmoother, PITCH_CLASSES, type ChordMatch } from "@/lib/tools/chord-detector";
import styles from "./Tools.module.css";
import own from "./ChordDetector.module.css";

type Phase = "idle" | "requesting" | "listening" | "error";
type Display = { chord: ChordMatch | null; candidates: ChordMatch[]; chroma: number[]; silent: boolean };
type HistoryEntry = { name: string; at: number; key: number };

const FRAME = 8192, HOP = 4096, DISPLAY_MS = 100, STALE_MS = 1000, HISTORY = 8;
const EMPTY: Display = { chord: null, candidates: [], chroma: Array(12).fill(0), silent: true };

function inputError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
  if (name === "NotFoundError") return "No microphone was found. Connect an input device and try again.";
  if (name === "NotReadableError") return "The microphone could not be opened. Check whether another app is using it, then try again.";
  return "The chord detector could not get a reliable audio input. Check the microphone and try again.";
}
function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ChordDetector() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Press Start listening, then strum one chord and let it ring.");
  const [display, setDisplay] = useState<Display>(EMPTY);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hold, setHold] = useState(false);
  const capture = useRef<Capture | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const holding = useRef(false);
  const lastSampleAt = useRef(-Infinity);

  const stopResources = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    capture.current?.stop();
    capture.current = null;
  }, []);
  useEffect(() => bindPracticeLifecycle(() => {
    stopResources(); setPhase("idle"); setDisplay(EMPTY);
    setMessage("Listening paused. Start again when you return to this page.");
  }), [stopResources]);
  // A reading older than a second is not the chord in the room any more.
  useEffect(() => {
    if (phase !== "listening") return;
    const watchdog = window.setInterval(() => {
      if (!holding.current && performance.now() - lastSampleAt.current > STALE_MS) setDisplay(EMPTY);
    }, 250);
    return () => window.clearInterval(watchdog);
  }, [phase]);

  function toggleHold() {
    holding.current = !hold;
    setHold(!hold);
  }
  function stop() {
    const wasRequesting = phase === "requesting";
    stopResources(); setPhase("idle");
    if (!holding.current) setDisplay(EMPTY);
    setMessage(wasRequesting ? "Microphone request cancelled." : "Stopped listening. The microphone is off.");
  }
  async function listen() {
    stopResources();
    if (document.hidden) { setMessage("Return to this tab before starting."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !hasWebAudio()) {
      setPhase("error"); setMessage("The chord detector needs a secure HTTPS page and a browser with microphone and Web Audio support."); return;
    }
    const id = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    const smoother = new ChordSmoother({ windowSeconds: .5, stableFrames: 3 });
    const frame = new Float32Array(FRAME);
    let filled = 0, fresh = 0, lastRender = -Infinity, startedAt: number | null = null, key = 0;
    const heard: HistoryEntry[] = [];
    holding.current = false; setHold(false);
    setDisplay(EMPTY); setHistory([]);
    lastSampleAt.current = -Infinity;
    setPhase("requesting"); setMessage("Waiting for microphone permission. You can cancel.");
    try {
      const audio = await startCapture((samples, time, sampleRate) => {
        if (id !== generation.current || controller.signal.aborted || document.hidden) return;
        lastSampleAt.current = performance.now();
        startedAt ??= time;
        // Slide the newest samples into an 8192-sample frame; analyse every 4096 new ones.
        const n = Math.min(samples.length, FRAME);
        frame.copyWithin(0, n);
        frame.set(samples.subarray(samples.length - n), FRAME - n);
        filled = Math.min(FRAME, filled + n); fresh += n;
        if (filled < FRAME || fresh < HOP) return;
        fresh = 0;
        const out = smoother.push({ ...analyzeFrame(frame, sampleRate), time });
        if (out.chord && heard[0]?.name !== out.chord.name) {
          heard.unshift({ name: out.chord.name, at: time + samples.length / sampleRate - startedAt, key: key++ });
          heard.length = Math.min(heard.length, HISTORY);
        }
        const now = performance.now();
        if (holding.current || now - lastRender < DISPLAY_MS) return;
        lastRender = now;
        setDisplay({ chord: out.chord, candidates: out.candidates, chroma: Array.from(out.chroma), silent: out.silent });
        setHistory(previous => previous.length === heard.length && previous.every((entry, i) => entry.key === heard[i].key) ? previous : [...heard]);
      }, () => {
        if (id !== generation.current) return;
        stopResources(); setPhase("idle");
        setMessage("Listening stopped because audio was interrupted or another audio tool started. Start again when ready.");
      }, controller.signal);
      if (id !== generation.current || controller.signal.aborted || document.hidden) { audio.stop(); return; }
      capture.current = audio;
      setPhase("listening"); setMessage("Listening on this device. Strum a chord and let it ring.");
    } catch (error) {
      if (id !== generation.current || controller.signal.aborted) return;
      stopResources(); setPhase("error"); setDisplay(EMPTY);
      setMessage(inputError(error));
    }
  }

  const { chord, candidates, chroma } = display;
  const peak = Math.max(...chroma, 1e-9);
  const alternatives = candidates.filter(match => match.name !== chord?.name).slice(0, 3);
  const tones = new Set(chord?.notes ?? []);
  const ranked = chroma.map((value, pc) => ({ value, pc })).filter(x => x.value > .05).sort((a, b) => b.value - a.value);
  const chromaLabel = ranked.length ? `Pitch classes heard, strongest first: ${ranked.map(x => PITCH_CLASSES[x.pc]).join(", ")}` : "No pitch classes heard yet";
  const listening = phase === "listening";

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="chord-detector-title">
      <h2 id="chord-detector-title">Chord detector</h2>
      <p>Strum one chord at a time and let it ring. The readout shows the chord the sounding notes fit best, averaged over about half a second.</p>
      <div className={styles.row}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={listen} disabled={phase === "requesting" || listening}>{phase === "requesting" ? "Requesting microphone…" : "Start listening"}</button>
        <button type="button" className={styles.button} onClick={stop} disabled={phase === "idle" || phase === "error"}>{phase === "requesting" ? "Cancel microphone request" : "Stop"}</button>
        <button type="button" className={styles.button} aria-pressed={hold} onClick={toggleHold}>{hold ? "Holding display" : "Hold"}</button>
      </div>
      <p role="status" className={styles.status}>{message}{hold ? " The display is held; press Hold again to follow the guitar." : ""}</p>

      <div className={styles.readout} aria-label="Current chord">
        <strong>{chord ? chord.name : "–"}</strong>
        <span>{chord ? `Confidence ${Math.round(chord.confidence * 100)}% · notes ${chord.notes.join(" ")}` : listening ? display.silent ? "Quiet. Strum a chord." : "Listening for a steady chord…" : "Not listening"}</span>
      </div>
      {chord && <div className={own.confidence} aria-hidden="true"><span className={styles.bar}><span style={{ width: `${Math.round(chord.confidence * 100)}%` }} /></span></div>}

      <h3>Other close fits</h3>
      {alternatives.length ? <ol className={own.alternatives}>{alternatives.map(match => <li key={match.name}><strong>{match.name}</strong><span>{match.notes.join(" ")}</span><span className={styles.value}>{Math.round(match.confidence * 100)}%</span></li>)}</ol>
        : <p className={styles.caption}>Alternatives appear while a chord is ringing.</p>}

      <h3>Pitch classes heard</h3>
      <div className={own.chroma} role="img" aria-label={chromaLabel}>
        {chroma.map((value, pc) => <div key={pc} className={own.chromaColumn} data-tone={tones.has(PITCH_CLASSES[pc])} aria-hidden="true">
          <span className={own.chromaTrack}><span style={{ height: `${Math.round(value / peak * 100)}%` }} /></span>
          <span className={own.chromaName}>{PITCH_CLASSES[pc]}</span>
        </div>)}
      </div>
      <p className={styles.caption}>Bar height is the share of tonal energy in each pitch class, in any octave. Highlighted bars are the notes of the chord shown.</p>

      <h3>Recent chords</h3>
      {history.length ? <ol className={own.history} aria-label="Recent chords, newest first">{history.map(entry => <li key={entry.key}><strong>{entry.name}</strong><span>{clock(entry.at)}</span></li>)}</ol>
        : <p className={styles.caption}>Each new chord it settles on is added here with the time since you started listening.</p>}
    </section>
    <section className={styles.panel} aria-labelledby="chord-detector-how">
      <h2 id="chord-detector-how">How to read it</h2>
      <ul className={own.notes}>
        <li>It hears pitch classes, not strings. An open C and a C barre chord both read as C, and it cannot tell which strings you fretted.</li>
        <li>Chords that share notes are easy to confuse: Am7 and C6 contain the same four notes, as do Csus2 and Gsus4. Check the alternatives.</li>
        <li>A chord with a missing tone, or a loud melody note on top, can read as a different chord. Mute unplayed strings and strum evenly.</li>
        <li>A quiet room helps. Voices, a TV or a backing track add notes of their own.</li>
        <li>Confidence says how well the sound fits the chord shown, not whether you played it well. This is not a lesson score.</li>
      </ul>
    </section>
  </div>;
}
