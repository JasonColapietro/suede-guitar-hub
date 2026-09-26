"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasWebAudio, startCapture, type Capture } from "@/lib/audio/capture";
import { estimatePitch, noteName } from "@/lib/audio/dsp";
import { bindPracticeLifecycle } from "@/lib/audio/practice-tools";
import { acceptCapture, CaptureCollector, captureBand, expectedMidi, frequencyForMidi, intonationVerdict, openMidi, TOLERANCE, TUNINGS, type ReferenceKind } from "@/lib/tools/intonation";
import styles from "./Tools.module.css";
import own from "./IntonationChecker.module.css";

type Step = "reference" | "fretted";
type Phase = "idle" | "requesting" | "waiting" | "measuring" | "error";
type StringResult = { reference?: number; fretted?: number; kind: ReferenceKind };

const WINDOW = 2048, HOP = 1024, WAIT_LIMIT_S = 10, STALE_MS = 1500;
const STRINGS = [6, 5, 4, 3, 2, 1];

function inputError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
  if (name === "NotFoundError") return "No microphone was found. Connect an input device and try again.";
  if (name === "NotReadableError") return "The microphone could not be opened. Check whether another app is using it, then try again.";
  return "The intonation checker could not get a reliable audio input. Check the microphone and try again.";
}
const signed = (cents: number) => `${cents > 0 ? "+" : cents < 0 ? "−" : "±"}${Math.abs(cents).toFixed(1)}`;

export function IntonationChecker() {
  const [tuningId, setTuningId] = useState(TUNINGS[0].id);
  const [string, setString] = useState(6);
  const [kind, setKind] = useState<ReferenceKind>("harmonic");
  const [tolerance, setTolerance] = useState<number>(TOLERANCE.default);
  const [results, setResults] = useState<Record<number, StringResult>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<Step | null>(null);
  const [message, setMessage] = useState("Retune the open string, then capture its reference.");
  const capture = useRef<Capture | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const lastSampleAt = useRef(-Infinity);
  const tuning = TUNINGS.find(t => t.id === tuningId) ?? TUNINGS[0];
  const current = results[string];
  const referenceLabel = kind === "harmonic" ? "12th-fret harmonic" : "open string";

  const stopResources = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    capture.current?.stop();
    capture.current = null;
  }, []);
  useEffect(() => bindPracticeLifecycle(() => {
    stopResources(); setPhase("idle"); setStep(null);
    setMessage("Capture stopped because the page was hidden. Start the step again when you return.");
  }), [stopResources]);
  // No audio for a while during a capture means the input died quietly.
  useEffect(() => {
    if (phase !== "waiting" && phase !== "measuring") return;
    const watchdog = window.setInterval(() => {
      if (lastSampleAt.current > 0 && performance.now() - lastSampleAt.current > STALE_MS) {
        stopResources(); setPhase("error"); setStep(null);
        setMessage("The microphone stopped sending audio. Check the input and try the step again.");
      }
    }, 250);
    return () => window.clearInterval(watchdog);
  }, [phase, stopResources]);

  function reset(next: string) { stopResources(); setPhase("idle"); setStep(null); setMessage(next); }
  function chooseTuning(id: string) {
    setTuningId(id); setResults({});
    reset("Tuning changed, so the results table was cleared. Retune every string before checking.");
  }
  function chooseString(value: number) {
    setString(value);
    reset(`String ${value} selected. Retune it open, then capture the ${referenceLabel}.`);
  }
  function chooseKind(value: ReferenceKind) {
    setKind(value);
    // A reference of the other kind would be compared against the wrong octave.
    setResults(previous => { const next = { ...previous }; delete next[string]; return next; });
    reset(value === "harmonic" ? "Reference: the 12th-fret harmonic. Touch the string lightly right over the 12th fret wire and pluck." : "Reference: the open string, compared one octave up. Use this if the harmonic will not ring cleanly.");
  }
  function cancel() {
    const wasActive = phase !== "idle";
    reset(wasActive ? "Capture cancelled. The microphone is off." : message);
  }

  async function run(which: Step) {
    stopResources();
    if (document.hidden) { setMessage("Return to this tab before capturing."); return; }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !hasWebAudio()) {
      setPhase("error"); setMessage("The intonation checker needs a secure HTTPS page and a browser with microphone and Web Audio support."); return;
    }
    const id = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    const targetString = string, targetKind = kind;
    const midi = expectedMidi(tuning, targetString, which, targetKind), band = captureBand(midi);
    const collector = new CaptureCollector();
    let pending = new Float32Array(0), processed = 0, firstTime: number | null = null, measuring = false;
    const prompt = which === "reference"
      ? targetKind === "harmonic" ? `Play the 12th-fret harmonic on string ${targetString} (${noteName(midi)}) and let it ring.` : `Play string ${targetString} open (${noteName(midi)}) and let it ring.`
      : `Fret string ${targetString} at the 12th fret and play it (${noteName(midi)}). Press straight down with normal pressure.`;
    lastSampleAt.current = -Infinity;
    setStep(which); setPhase("requesting"); setMessage("Waiting for microphone permission. You can cancel.");
    const finish = (readings: number[]) => {
      stopResources(); setPhase("idle"); setStep(null);
      const outcome = acceptCapture(readings, midi);
      if (!outcome.ok) { setMessage(outcome.message); return; }
      setResults(previous => {
        const before = previous[targetString]?.kind === targetKind ? previous[targetString] : undefined;
        const next: StringResult = which === "reference" ? { kind: targetKind, reference: outcome.frequency } : { kind: targetKind, reference: before?.reference, fretted: outcome.frequency };
        return { ...previous, [targetString]: next };
      });
      setMessage(which === "reference"
        ? `Reference captured: ${outcome.frequency.toFixed(2)} Hz. Now fret the 12th fret and capture the fretted note.`
        : `Fretted note captured: ${outcome.frequency.toFixed(2)} Hz. The result is below.`);
    };
    try {
      const audio = await startCapture((samples, time, sampleRate) => {
        if (id !== generation.current || controller.signal.aborted || document.hidden) return;
        lastSampleAt.current = performance.now();
        firstTime ??= time;
        const joined = new Float32Array(pending.length + samples.length);
        joined.set(pending); joined.set(samples, pending.length);
        let offset = 0, state = collector.state;
        for (; offset + WINDOW <= joined.length; offset += HOP) {
          const window = joined.subarray(offset, offset + WINDOW);
          let energy = 0;
          for (let i = 0; i < window.length; i++) energy += window[i] * window[i];
          const estimate = estimatePitch(window, sampleRate, band);
          state = collector.push(estimate?.frequency ?? null, (processed + offset + WINDOW) / sampleRate, Math.sqrt(energy / WINDOW));
          if (state.state === "done") break;
        }
        processed += offset;
        pending = joined.slice(offset);
        if (state.state === "done") { finish(state.readings); return; }
        if (state.state === "collecting" && !measuring) { measuring = true; setPhase("measuring"); setMessage("Note found. Keep it ringing while it measures…"); }
        if (state.state === "waiting" && time - firstTime > WAIT_LIMIT_S) {
          stopResources(); setPhase("idle"); setStep(null);
          setMessage(`No steady ${noteName(midi)} was heard in ${WAIT_LIMIT_S} seconds. Check the string and try the step again.`);
        }
      }, () => {
        if (id !== generation.current) return;
        stopResources(); setPhase("idle"); setStep(null);
        setMessage("Capture stopped because audio was interrupted or another audio tool started. Try the step again.");
      }, controller.signal);
      if (id !== generation.current || controller.signal.aborted || document.hidden) { audio.stop(); return; }
      capture.current = audio;
      setPhase("waiting"); setMessage(prompt);
    } catch (error) {
      if (id !== generation.current || controller.signal.aborted) return;
      stopResources(); setPhase("error"); setStep(null);
      setMessage(inputError(error));
    }
  }

  const busy = phase === "requesting" || phase === "waiting" || phase === "measuring";
  const verdict = current?.reference && current.fretted ? intonationVerdict(current.reference, current.fretted, tolerance, current.kind) : null;
  const open = openMidi(tuning, string), fretted = open + 12;

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="intonation-title">
      <h2 id="intonation-title">Check one string at a time</h2>
      <div className={styles.fields}>
        <label className={styles.field}>Tuning
          <select value={tuningId} onChange={event => chooseTuning(event.target.value)} disabled={busy}>
            {TUNINGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className={styles.field}>Tolerance: <span className={styles.value}>±{tolerance} cents</span>
          <input type="range" min={TOLERANCE.min} max={TOLERANCE.max} step={.5} value={tolerance} aria-valuetext={`plus or minus ${tolerance} cents`} onChange={event => setTolerance(Number(event.target.value))} />
        </label>
      </div>
      <fieldset className={own.fieldset} disabled={busy}>
        <legend>String</legend>
        <div className={styles.segmented}>{STRINGS.map(s => <button type="button" key={s} aria-pressed={string === s} onClick={() => chooseString(s)}>{s} · {noteName(openMidi(tuning, s)).replace(/-?\d+$/, "")}</button>)}</div>
      </fieldset>
      <fieldset className={own.fieldset} disabled={busy}>
        <legend>Reference</legend>
        <div className={styles.segmented}>
          <button type="button" aria-pressed={kind === "harmonic"} onClick={() => chooseKind("harmonic")}>12th-fret harmonic</button>
          <button type="button" aria-pressed={kind === "open"} onClick={() => chooseKind("open")}>Open string</button>
        </div>
      </fieldset>
      <p className={styles.caption}>String {string}: open {noteName(open)} ({frequencyForMidi(open).toFixed(1)} Hz). {kind === "harmonic" ? `The harmonic and the fretted note should both be ${noteName(fretted)}.` : `The fretted note should be ${noteName(fretted)}, one octave above the open string.`}</p>

      <ol className={own.steps}>
        <li data-done={Boolean(current?.reference)}>
          <span>1. Retune string {string} open, then play the {referenceLabel}.</span>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => run("reference")} disabled={busy}>{kind === "harmonic" ? "Capture harmonic" : "Capture open string"}</button>
          <span className={styles.caption}>{current?.reference ? `${current.reference.toFixed(2)} Hz` : "Not captured yet"}</span>
        </li>
        <li data-done={Boolean(current?.fretted)}>
          <span>2. Fret the same string at the 12th fret and play it.</span>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => run("fretted")} disabled={busy || !current?.reference}>Capture fretted note</button>
          <span className={styles.caption}>{current?.fretted ? `${current.fretted.toFixed(2)} Hz` : current?.reference ? "Not captured yet" : "Capture the reference first"}</span>
        </li>
      </ol>
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={cancel} disabled={!busy}>{phase === "requesting" ? "Cancel microphone request" : "Cancel capture"}</button>
      </div>
      <p role="status" className={styles.status}>{phase === "measuring" ? `Measuring ${step === "reference" ? "the reference" : "the fretted note"}. ` : ""}{message}</p>

      <div className={styles.readout} aria-label="Result for this string">
        <strong>{verdict ? `${signed(verdict.cents)}¢` : "–"}</strong>
        <span>{verdict ? verdict.status === "in-tune" ? "In tune at the 12th fret" : `Fretted note ${verdict.status}` : "Capture both notes to compare"}</span>
      </div>
      {verdict && <>
        <div className={styles.meter} aria-hidden="true"><span data-near={verdict.status === "in-tune"} style={{ left: `${50 + Math.max(-50, Math.min(50, verdict.cents * 2.5))}%` }} /></div>
        <p className={verdict.status === "in-tune" ? styles.good : styles.warn}>{verdict.advice}</p>
      </>}
    </section>

    <section className={styles.panel} aria-labelledby="intonation-results">
      <h2 id="intonation-results">This session</h2>
      <div className={styles.scroller}>
        <table className={own.table}>
          <caption className={styles.caption}>Results stay on this page until you reload it or change the tuning. Tolerance ±{tolerance} cents.</caption>
          <thead><tr><th scope="col">String</th><th scope="col">Reference</th><th scope="col">Fretted</th><th scope="col">Difference</th><th scope="col">Verdict</th></tr></thead>
          <tbody>{STRINGS.map(s => {
            const row = results[s], v = row?.reference && row.fretted ? intonationVerdict(row.reference, row.fretted, tolerance, row.kind) : null;
            const reference = row?.reference ? `${row.reference.toFixed(2)} Hz${row.kind === "open" ? " (open)" : ""}` : "–";
            return <tr key={s} aria-current={s === string ? "true" : undefined}>
              <th scope="row">{s} · {noteName(openMidi(tuning, s))}</th>
              <td>{reference}</td>
              <td>{row?.fretted ? `${row.fretted.toFixed(2)} Hz` : "–"}</td>
              <td>{v ? `${signed(v.cents)} cents` : "–"}</td>
              <td className={v ? v.status === "in-tune" ? styles.good : styles.warn : undefined}>{v ? v.status === "in-tune" ? "In tune" : v.status === "sharp" ? "Sharp: saddle back" : "Flat: saddle forward" : "Not checked"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className={styles.panel} aria-labelledby="intonation-safety">
      <h2 id="intonation-safety">Before you turn a screw</h2>
      <ul className={own.notes}>
        <li>Retune the open string before every check. A string that has drifted gives a wrong answer.</li>
        <li>Use fresh strings. Old strings intonate badly, and no saddle position fixes a dead string.</li>
        <li>Adjust in small steps, then retune and recheck. On some bridges, loosen the string slightly before turning the saddle screw.</li>
        <li>A floating tremolo needs rebalancing as you go, because retuning one string moves the others. If you are not comfortable doing this, a guitar tech can.</li>
        <li>This tool compares pitch. It does not measure neck relief or action, which also affect intonation.</li>
      </ul>
    </section>
  </div>;
}
