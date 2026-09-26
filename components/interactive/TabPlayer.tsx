"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PracticeTarget } from "@/lib/audio/practice";
import { scoreTaps, tapAdvice, type TapScore } from "@/lib/learning/interactive";
import { noteName } from "@/lib/audio/dsp";
import { useGuitarVoice } from "./useGuitarVoice";
import styles from "./Interactive.module.css";
import { StarRating, usePracticeLog } from "./PracticeStats";
import { starsForTapScore } from "@/lib/learning/rewards";

const BEST_KEY = "guitarhub.tap-best.v1";
function readBest(key: string): number | null { try { const all = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, unknown>; return typeof all[key] === "number" ? all[key] as number : null; } catch { return null; } }
function writeBest(key: string, score: number) { try { const all = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, number>; all[key] = score; window.localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch {} }

export type TabTimeline = { mode: "pitchSequence" | "rhythm"; bpm: number; targets: readonly PracticeTarget[]; beatsPerBar?: number };

const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const STRUM = [40, 47, 52, 55, 59, 64];
const SPEEDS = [50, 75, 90, 100, 110, 125];
const COUNT_IN = 4;
const LEFT = 34;

type Mode = "listen" | "tap";
type Loop = { a: number; b: number } | null;

/**
 * A synced tab player in the style of the big lesson apps: the exercise as
 * tab (or rhythm slashes), a moving playhead, playback on a plucked-string
 * voice, a count-in and click, speed control, and an A–B loop set by tapping
 * two notes. Rhythm exercises add a tap-along mode scored against the grid,
 * which needs no microphone.
 */
export function TabPlayer({ timeline, title = "Hear it first", allowTap = timeline.mode === "rhythm", bestKey }: { timeline: TabTimeline; title?: string; allowTap?: boolean; /** Enables a saved personal best for tap-along. */ bestKey?: string }) {
  const { targets } = timeline;
  const beatsPerBar = timeline.beatsPerBar ?? 4;
  const rhythm = timeline.mode === "rhythm";
  const { get, close, error, interrupted } = useGuitarVoice();
  const [mode, setMode] = useState<Mode>("listen");
  const [speed, setSpeed] = useState(100);
  const [click, setClick] = useState(true);
  const [loop, setLoop] = useState<Loop>(null);
  const [marking, setMarking] = useState<null | "a" | "b">(null);
  const [playing, setPlaying] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const [current, setCurrent] = useState(-1);
  const [position, setPosition] = useState<number | null>(null);
  const [result, setResult] = useState<TapScore | null>(null);
  const [flash, setFlash] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const practice = usePracticeLog();
  useEffect(() => { if (bestKey) setBest(readBest(bestKey)); }, [bestKey]);
  const run = useRef<{ voice: Awaited<ReturnType<ReturnType<typeof useGuitarVoice>["get"]>>; generation: number; t0: number; spb: number; startBeat: number; endBeat: number; passes: number; targetTimes: number[]; taps: number[]; range: [number, number]; loop: boolean; mode: Mode } | null>(null);
  const generation = useRef(0);
  const frame = useRef(0);
  const scroller = useRef<HTMLDivElement | null>(null);

  const minGap = useMemo(() => targets.slice(1).reduce((gap, target, index) => Math.min(gap, target.beat - targets[index].beat), Infinity), [targets]);
  const pxPerBeat = Math.min(110, Math.max(rhythm ? 44 : 50, (rhythm ? 34 : 34) / (Number.isFinite(minGap) ? minGap : 1)));
  const lastBeat = targets.at(-1)?.beat ?? 0;
  const totalBeats = Math.max(beatsPerBar, (Math.floor(lastBeat / beatsPerBar + 1e-9) + 1) * beatsPerBar);
  const width = LEFT + totalBeats * pxPerBeat + 24;
  const xFor = (beat: number) => LEFT + beat * pxPerBeat + pxPerBeat * .35;
  const yFor = (string: number) => 22 + (string - 1) * 26;

  const stop = useCallback((keepMarks = true) => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    run.current = null;
    close();
    setPlaying(false); setCountIn(0); setPosition(null); setCurrent(-1);
    if (!keepMarks) { setLoop(null); setMarking(null); }
  }, [close]);
  useEffect(() => () => { generation.current++; cancelAnimationFrame(frame.current); }, []);
  useEffect(() => { if (interrupted) { cancelAnimationFrame(frame.current); run.current = null; setPlaying(false); setCountIn(0); setPosition(null); } }, [interrupted]);

  function sound(voice: Awaited<ReturnType<typeof get>>, target: PracticeTarget, at: number, level = .8) {
    if (target.midi != null) { voice.pluck(target.midi, at, level); return; }
    const up = (target.cue ?? "").includes("↑");
    const order = up ? STRUM.slice(3).reverse() : STRUM;
    order.forEach((midi, i) => voice.pluck(midi, at + i * .009, level * .32));
  }

  function schedulePass(voice: Awaited<ReturnType<typeof get>>, state: NonNullable<typeof run.current>, pass: number) {
    const passStart = state.t0 + pass * (state.endBeat - state.startBeat) * state.spb;
    for (let index = state.range[0]; index <= state.range[1]; index++) {
      const at = passStart + (targets[index].beat - state.startBeat) * state.spb;
      if (state.mode === "listen") sound(voice, targets[index], at);
    }
    if (click || state.mode === "tap") for (let beat = Math.ceil(state.startBeat); beat < state.endBeat - 1e-6; beat++) voice.click(passStart + (beat - state.startBeat) * state.spb, beat % beatsPerBar === 0);
  }

  async function play() {
    if (playing) { stop(); return; }
    setResult(null); setNewBest(false);
    const id = ++generation.current;
    let voice: Awaited<ReturnType<typeof get>>;
    try { voice = await get(); } catch { return; }
    if (id !== generation.current) return;
    const range: [number, number] = loop ? [Math.min(loop.a, loop.b), Math.max(loop.a, loop.b)] : [0, targets.length - 1];
    const spb = 60 / (timeline.bpm * speed / 100);
    const startBeat = loop ? targets[range[0]].beat : 0;
    const nextBeat = targets[range[1] + 1]?.beat;
    const endBeat = loop ? (nextBeat ?? targets[range[1]].beat + 1) : totalBeats;
    const now = voice.context.currentTime + .12;
    for (let i = 0; i < COUNT_IN; i++) voice.click(now + i * spb, i === 0);
    const t0 = now + COUNT_IN * spb;
    const state = { voice, generation: id, t0, spb, startBeat, endBeat, passes: 1, targetTimes: [] as number[], taps: [] as number[], range, loop: !!loop && mode === "listen", mode };
    for (let index = range[0]; index <= range[1]; index++) state.targetTimes.push(t0 + (targets[index].beat - startBeat) * spb);
    run.current = state;
    schedulePass(voice, state, 0);
    setPlaying(true);
    const tick = () => {
      const active = run.current;
      if (!active || active.generation !== generation.current) return;
      const heard = voice.context.currentTime - voice.outputLatency;
      if (heard < active.t0) { setCountIn(Math.min(COUNT_IN, Math.max(1, Math.floor((heard - (active.t0 - COUNT_IN * spb)) / spb) + 1))); }
      else setCountIn(0);
      const passLength = (active.endBeat - active.startBeat) * active.spb;
      let elapsed = heard - active.t0;
      if (active.loop) {
        // Queue the next lap a beat before this one ends so there is no gap.
        if (voice.context.currentTime > active.t0 + active.passes * passLength - active.spb) { schedulePass(voice, active, active.passes); active.passes++; }
        if (elapsed > 0) elapsed = elapsed % passLength;
      } else if (elapsed > passLength + .25) {
        if (active.mode === "tap") {
          const scored = scoreTaps(active.targetTimes, active.taps, Math.min(.25, (Number.isFinite(minGap) ? minGap : 1) * active.spb * .45));
          setResult(scored);
          practice.record(passLength);
          if (bestKey) { const previous = readBest(bestKey); const improved = previous === null || scored.score > previous; setNewBest(improved && previous !== null); if (improved) { writeBest(bestKey, scored.score); setBest(scored.score); } }
        }
        cancelAnimationFrame(frame.current); run.current = null; setPlaying(false); setPosition(null); setCurrent(-1);
        if (scroller.current) scroller.current.scrollLeft = 0;
        return;
      }
      const beat = active.startBeat + Math.max(0, elapsed) / active.spb;
      setPosition(heard < active.t0 ? active.startBeat : beat);
      let index = -1;
      for (let i = active.range[0]; i <= active.range[1]; i++) if (targets[i].beat <= beat + 1e-6) index = i;
      setCurrent(heard < active.t0 ? -1 : index);
      const box = scroller.current;
      if (box) { const x = xFor(beat); if (x < box.scrollLeft + 40 || x > box.scrollLeft + box.clientWidth * .6) box.scrollLeft = Math.max(0, x - box.clientWidth * .3); }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  async function tapNote(index: number) {
    if (marking) {
      if (marking === "a") { setLoop({ a: index, b: index }); setMarking("b"); }
      else { setLoop(previous => ({ a: previous?.a ?? index, b: index })); setMarking(null); }
      return;
    }
    if (playing) return;
    try { const voice = await get(); sound(voice, targets[index], voice.context.currentTime + .02); } catch {}
  }

  function tap() {
    const active = run.current;
    if (!active || active.mode !== "tap") return;
    // Read the audio clock at the moment of the tap, minus the output delay
    // the listener hears, so a tap on the heard click scores as on time.
    active.taps.push(active.voice.context.currentTime - active.voice.outputLatency);
    setFlash(true); window.setTimeout(() => setFlash(false), 90);
  }

  const inLoop = (index: number) => !loop || (index >= Math.min(loop.a, loop.b) && index <= Math.max(loop.a, loop.b));
  const markFor = (index: number) => loop && !marking && loop.a !== loop.b ? (index === Math.min(loop.a, loop.b) ? "A" : index === Math.max(loop.a, loop.b) ? "B" : undefined) : loop && marking === "b" && index === loop.a ? "A" : undefined;
  const resultFor = (index: number) => {
    if (!result) return undefined;
    const range = loop ? Math.min(loop.a, loop.b) : 0;
    return result.hits[index - range]?.rating;
  };

  return <section className={styles.panel} aria-label={title}>
    <div className={styles.head}>
      <div><p className={styles.eyebrow}>{rhythm ? "Rhythm" : "Tab"} player</p><h3>{title}</h3></div>
      {allowTap && <div className={styles.tabs} role="tablist" aria-label="Player mode">
        {(["listen", "tap"] as const).map(value => <button key={value} role="tab" type="button" aria-selected={mode === value} disabled={playing} onClick={() => { setMode(value); setResult(null); }}>{value === "listen" ? "Listen" : "Tap along"}</button>)}
      </div>}
    </div>

    <div className={styles.staffScroll} ref={scroller}>
      <div className={styles.staff} data-rhythm={rhythm} style={{ width }}>
        {!rhythm && [1, 2, 3, 4, 5, 6].map(string => <span key={string}><span className={styles.stringLine} style={{ top: yFor(string) }} /><span className={styles.stringName} style={{ top: yFor(string) }}>{STRING_NAMES[string - 1]}</span></span>)}
        {rhythm && <span className={styles.stringLine} style={{ top: 60 }} />}
        {Array.from({ length: totalBeats / beatsPerBar + 1 }, (_, bar) => <span key={bar}><span className={styles.barLine} style={{ left: LEFT + bar * beatsPerBar * pxPerBeat - 4 }} />{bar < totalBeats / beatsPerBar && <span className={styles.barNumber} style={{ left: LEFT + bar * beatsPerBar * pxPerBeat - 4 }}>{bar + 1}</span>}</span>)}
        {targets.map((target, index) => rhythm || target.guitarString == null
          ? <button key={target.id} type="button" className={styles.slash} style={{ left: xFor(target.beat), top: 60 }} data-now={index === current} data-inloop={inLoop(index)} data-mark={markFor(index)} data-result={resultFor(index)} onClick={() => void tapNote(index)} aria-label={`Hit ${index + 1}${target.cue ? `, ${target.cue}` : ""}`}><strong>{(target.cue ?? "").includes("↑") ? "↑" : "↓"}</strong><small>{(target.cue ?? "").replace(/\s*·\s*[↑↓]/, "").slice(0, 10)}</small></button>
          : <button key={target.id} type="button" className={styles.note} style={{ left: xFor(target.beat), top: yFor(target.guitarString) }} data-now={index === current} data-inloop={inLoop(index)} data-mark={markFor(index)} data-result={resultFor(index)} onClick={() => void tapNote(index)} aria-label={`Hear slot ${index + 1}, string ${target.guitarString}, fret ${target.fret ?? 0}${target.midi != null ? `, ${noteName(target.midi)}` : ""}${target.cue ? `, ${target.cue}` : ""}`}>{target.fret ?? 0}</button>)}
        {position !== null && <span className={styles.playhead} style={{ left: xFor(position) }} />}
        {countIn > 0 && <span className={styles.countIn} aria-live="assertive">{countIn}</span>}
      </div>
    </div>

    {mode === "tap" && <button type="button" className={styles.pad} data-flash={flash} disabled={!playing} onPointerDown={event => { event.preventDefault(); tap(); }} onKeyDown={event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); tap(); } }}>{playing ? (countIn ? `Get ready… ${countIn}` : "Tap here on every hit") : "Press Start, then tap here on every hit"}</button>}

    <div className={styles.row}>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void play()}>{playing ? "Stop" : mode === "tap" ? "Start tap-along" : loop ? "Play loop" : "Play it for me"}</button>
      <label className={styles.caption} style={{ display: "flex", alignItems: "center", gap: 6 }}>Speed
        <select className={styles.select} value={speed} disabled={playing} onChange={event => setSpeed(Number(event.target.value))} aria-label="Playback speed">{SPEEDS.map(value => <option key={value} value={value}>{value}% · {Math.round(timeline.bpm * value / 100)} BPM</option>)}</select>
      </label>
      {mode === "listen" && <button type="button" className={styles.button} aria-pressed={click} onClick={() => setClick(value => !value)} disabled={playing}>Click {click ? "on" : "off"}</button>}
      {mode === "listen" && <button type="button" className={styles.button} aria-pressed={marking !== null} disabled={playing} onClick={() => { if (loop || marking) { setLoop(null); setMarking(null); } else setMarking("a"); }}>{marking === "a" ? "Tap the first note…" : marking === "b" ? "Tap the last note…" : loop ? `Loop ${Math.min(loop.a, loop.b) + 1}–${Math.max(loop.a, loop.b) + 1} · clear` : "Loop a section"}</button>}
    </div>

    {result && <div aria-live="polite">
      <div className={styles.scoreBox}>
        <div><strong>{result.score}%</strong><span>Timing</span></div>
        <div><strong>{result.great}</strong><span>On the beat</span></div>
        <div><strong>{result.good}</strong><span>Close</span></div>
        <div><strong>{result.missed}</strong><span>Missed</span></div>
        <div><strong>{result.averageOffsetMs === null ? "–" : `${result.averageOffsetMs > 0 ? "+" : ""}${result.averageOffsetMs}`}</strong><span>ms average</span></div>
      </div>
      <p className={styles.best} style={{ marginTop: 10 }}><StarRating stars={starsForTapScore(result.score)} label="tap-along" />{best !== null && <span className={styles.caption}>{newBest ? "New personal best" : `Best ${best}%`}</span>}</p>
      <p className={styles.caption} style={{ marginTop: 6 }}>{tapAdvice(result)} Green is on the beat, light green is close, amber is early or late, dashed red is missed.</p>
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <p className={styles.caption}>{mode === "tap" ? "Headphones help: speakers add a little delay on some phones. Taps are scored on this device and never recorded." : `Tap any ${rhythm ? "hit" : "number"} to hear it. Four clicks count you in.`}</p>
  </section>;
}
