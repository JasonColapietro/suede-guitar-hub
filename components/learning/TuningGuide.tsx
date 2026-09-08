"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { startCapture, playReference, type Capture } from "@/lib/audio/capture";
import { bindPracticeLifecycle, confirmTuningPreparation, estimateTuningPitch, tunerInputError, tuningConfiguration, tuningReading } from "@/lib/audio/practice-tools";
import authored from "@/lib/learning/data/beginner-guitar-instruction.json";
import styles from "./Learning.module.css";

const strings = tuningConfiguration.targets.map(target => ({ ...target, name: authored.demoAssets["six-open-strings"].strings.find(string => string.string === target.string)!.name }));
type Phase = "idle" | "requesting" | "listening" | "reference" | "error";
type Reading = NonNullable<ReturnType<typeof tuningReading>>;

/** Tuning preparation is explicitly confirmed by the learner; readings never award progress. */
export function TuningGuide({ onReadyChange }: { onReadyChange?: (ready: boolean) => void }) {
  const [selected, setSelected] = useState(6);
  const [route, setRoute] = useState<"microphone" | "external">("microphone");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reading, setReading] = useState<Reading | null>(null);
  const [message, setMessage] = useState("Pick a string, then start the tuner. Play one string at a time.");
  const [checked, setChecked] = useState<number[]>([]);
  const [rechecked, setRechecked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const capture = useRef<Capture | null>(null);
  const request = useRef<AbortController | null>(null);
  const playback = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const quietUntil = useRef(0);
  const lastDisplayTime = useRef(-Infinity);
  const lastSampleAt = useRef(-Infinity);
  const target = strings.find(string => string.string === selected)!;
  const allChecked = strings.every(string => checked.includes(string.string)) && rechecked;
  const cents = reading?.centsFromTarget ?? null;
  const inTune = reading?.direction === "nearTarget";
  const differentNote = reading?.direction === "checkStringAndOctave";

  const stopResources = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    capture.current?.stop();
    capture.current = null;
    if (playback.current && !playback.current.signal.aborted) {
      playback.current.abort();
      quietUntil.current = performance.now() + 1000;
    }
    playback.current = null;
  }, []);
  useEffect(() => bindPracticeLifecycle(() => {
    stopResources(); setPhase("idle"); setReading(null);
    setMessage("Tuner paused. Start it again when you return to this page.");
  }), [stopResources]);
  useEffect(() => {
    if (phase !== "listening") return;
    const watchdog = window.setInterval(() => { if (performance.now() - lastSampleAt.current > tuningConfiguration.maximumReadingAgeSeconds * 1000) setReading(null); }, 250);
    return () => window.clearInterval(watchdog);
  }, [phase]);
  function stop() {
    stopResources(); setPhase("idle"); setReading(null);
    setMessage("Tuner stopped. Let the room settle before starting again.");
  }
  function changeTarget(value: number) {
    stopResources(); setSelected(value); setPhase("idle"); setReading(null);
    setMessage("Check the selected string and octave, then start the tuner.");
  }
  function chooseRoute(value: "microphone" | "external") {
    stopResources(); setRoute(value); setPhase("idle"); setReading(null);
    setChecked([]); setRechecked(false); setConfirmed(false); onReadyChange?.(false);
    setMessage(value === "external" ? "Use your own tuner and the standard tuning targets below." : "Pick a string, then start the tuner.");
  }
  async function listen() {
    stopResources(); setReading(null);
    setConfirmed(false); setRechecked(false); onReadyChange?.(false);
    if (document.hidden) { setMessage("Return to this tab before starting the tuner."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setPhase("error"); setMessage("Microphone tuning needs a secure HTTPS page and a browser with microphone and Web Audio support. You can use your own tuner and the targets below."); return;
    }
    if (performance.now() < quietUntil.current) { setMessage("Wait a moment for the reference sound to fade, then start the tuner."); return; }
    const id = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    lastDisplayTime.current = -Infinity;
    lastSampleAt.current = -Infinity;
    setPhase("requesting"); setMessage("Waiting for microphone permission. You can cancel or use your own tuner.");
    try {
      const audio = await startCapture((samples, time, sampleRate) => {
        if (id !== generation.current || controller.signal.aborted || document.hidden) return;
        const context = capture.current?.context;
        if (!context) { setReading(null); return; }
        lastSampleAt.current = performance.now();
        // Limit visual updates while processing every available capture block.
        if (time - lastDisplayTime.current < .1) return;
        lastDisplayTime.current = time;
        setReading(tuningReading(estimateTuningPitch(samples, sampleRate), time + samples.length / sampleRate, context.currentTime, selected));
      }, () => {
        if (id !== generation.current) return;
        stopResources(); setPhase("idle"); setReading(null);
        setMessage("Tuner stopped because audio was interrupted or another audio tool started. Restart when ready.");
      }, controller.signal);
      if (id !== generation.current || controller.signal.aborted || document.hidden) { audio.stop(); return; }
      capture.current = audio;
      setPhase("listening"); setMessage("Listening on this device. Pick the selected string once and let it settle.");
    } catch (error) {
      if (id !== generation.current || controller.signal.aborted) return;
      stopResources(); setPhase("error"); setReading(null);
      setMessage(tunerInputError(error));
    }
  }
  async function hear() {
    stopResources(); setReading(null);
    setConfirmed(false); setRechecked(false); onReadyChange?.(false);
    if (document.hidden) { setMessage("Return to this tab before playing a reference."); return; }
    const id = ++generation.current;
    const controller = new AbortController(); playback.current = controller;
    setPhase("reference"); setMessage(`Playing ${target.note}, then waiting for the sound to fade. The microphone is off.`);
    try {
      // playReference includes a silent decay interval; never listen over the reference.
      const finished = await playReference(target.frequencyHz, controller.signal);
      if (id !== generation.current || controller.signal.aborted) return;
      if (!finished) stopResources();
      playback.current = null;
      setPhase("idle"); setMessage(finished ? "Reference is off. Start the tuner when you are ready to play." : "Reference stopped. Let the sound fade before starting the tuner.");
    } catch {
      if (id !== generation.current || controller.signal.aborted) return;
      playback.current = null;
      setPhase("error"); setMessage("Reference playback is unavailable. You can still use the tuner or an external reference.");
    }
  }
  function reviseChecklist() {
    if (confirmed) { setConfirmed(false); onReadyChange?.(false); }
  }
  function confirm() {
    const outcome = confirmTuningPreparation({ allChecked, referenceActive: phase === "reference", quietUntil: quietUntil.current, now: performance.now() }, () => {
      stopResources(); setReading(null); setPhase("idle");
      setConfirmed(true); onReadyChange?.(true);
    });
    if (outcome === "waitingForFade") setMessage("Let the reference fade before confirming and continuing to the lesson.");
    else if (outcome === "confirmed") setMessage("Tuning check confirmed by you. The tuner is stopped; continue to the lesson below.");
  }
  return <section className={styles.panel} aria-labelledby="tuning-guide-title">
    <h2 id="tuning-guide-title">{onReadyChange ? "First, tune your guitar" : "Guitar tuner"}</h2>
      <p>Use standard tuning: low E2, A2, D3, G3, B3, high E4. Check every string before playing. This tuner is free to use.</p>
    <fieldset className={styles.assessment}><legend>Choose your tuner</legend>
      <label><input type="radio" name="tuning-route" checked={route === "microphone"} onChange={() => chooseRoute("microphone")} />Use this microphone tuner</label>
      <label><input type="radio" name="tuning-route" checked={route === "external"} onChange={() => chooseRoute("external")} />Use my own tuner</label>
    </fieldset>
    <fieldset className={styles.assessment}><legend>Select the string you are checking</legend><div className={styles.actions}>{strings.map(string => <button type="button" key={string.string} className={selected === string.string ? styles.primary : styles.secondary} aria-pressed={selected === string.string} onClick={() => changeTarget(string.string)} disabled={phase === "reference"}>String {string.string}: {string.note}</button>)}</div></fieldset>
    <p><strong>Target: string {selected}, {target.name} ({target.note})</strong></p>
    <p className={styles.small}>{target.frequencyHz.toFixed(1)} Hz · A4 = 440 Hz · open string, no fret pressed</p>
    {route === "microphone" && <>
      <div className={styles.notice} aria-label="Current tuner reading">
        {phase === "listening" && reading && cents !== null ? <><p>Heard <strong>{reading.name}</strong> ({reading.frequency.toFixed(1)} Hz)</p><div className={styles.tuningMeter} aria-hidden="true"><span data-near={inTune} style={{ left: `${50 + Math.max(-50, Math.min(50, cents))}%` }} /></div><p><strong>{Math.abs(cents).toFixed(1)} cents {cents < 0 ? "below" : "above"} {target.note}</strong></p><p>{inTune ? `Close to target (within ${tuningConfiguration.toleranceCents} cents). Recheck after the other strings.` : differentNote ? "This is a different note or octave. Verify the string and peg before adjusting; do not chase the needle with a large turn." : cents < 0 ? "Below target. Make a small adjustment to raise the pitch, then play again." : "Above target. Make a small adjustment to lower the pitch, then play again."}</p></> : <p>{phase === "listening" ? "No clear single note yet. Mute the other strings, pluck once, and let the note ring." : "The tuner will show the detected note and octave here."}</p>}
      </div>
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={listen} disabled={phase === "requesting" || phase === "listening" || phase === "reference"}>{phase === "requesting" ? "Requesting microphone…" : "Start tuner"}</button><button type="button" className={styles.secondary} onClick={stop} disabled={phase === "idle" || phase === "error"}>{phase === "requesting" ? "Cancel microphone request" : "Stop tuner"}</button></div>
    </>}
    {route === "external" && <div className={styles.notice}>Choose standard tuning on a clip-on tuner, pedal tuner, or another tuner you trust. Confirm the selected note and octave; the two E strings are two octaves apart.{onReadyChange && " The checklist below records your check, not a microphone measurement."}</div>}
    <div className={styles.actions}><button type="button" className={styles.secondary} onClick={hear} disabled={phase === "reference"}>Hear {target.note} reference</button>{phase === "reference" && <button type="button" className={styles.secondary} onClick={stop}>Stop reference</button>}</div>
    <p className={`${styles.small} ${styles.muted}`}>Reference tones demonstrate pitch using a synthesized sound. Playback stops microphone capture and includes time for the sound to fade.</p>
    <p role="status" className={styles.small}>{message}</p>
    <ol className={styles.steps}><li>Trace the selected string to its tuning peg before turning it. Peg directions differ between guitars.</li><li>Pluck one string and make small adjustments. Recheck the correct octave if the reading is far away; stop if a string feels unusually tight.</li><li>After the last adjustment, make another pass over all six strings. There is no speed requirement.</li></ol>
    {onReadyChange && <><fieldset className={styles.assessment}><legend>Confirm what you checked</legend>{strings.map(string => <label key={string.string}><input type="checkbox" checked={checked.includes(string.string)} onChange={event => { reviseChecklist(); setRechecked(false); setChecked(previous => event.target.checked ? [...previous, string.string] : previous.filter(value => value !== string.string)); }} />I checked string {string.string}: {string.name} ({string.note})</label>)}<label><input type="checkbox" checked={rechecked} onChange={event => { reviseChecklist(); setRechecked(event.target.checked); }} />I rechecked all six after the last adjustment</label></fieldset>
    <p className={`${styles.small} ${styles.muted}`}>These are your confirmations. Pitch readings never tick a box or award lesson completion for you.</p>
    <div className={styles.actions}><button type="button" className={styles.primary} onClick={confirm} disabled={!allChecked || confirmed || phase === "reference"}>{confirmed ? "Tuning check confirmed" : "Confirm tuning check"}</button></div></>}
  </section>;
}
