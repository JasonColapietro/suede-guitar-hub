"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { claimAudioSession, createAudioContext, hasWebAudio, watchAudioState } from "@/lib/audio/capture";
import { bindPracticeLifecycle } from "@/lib/audio/practice-tools";
import { DEMO_RIFF_STYLES, renderDemoRiff } from "@/lib/tools/demo-riff";
import {
  LEVELS,
  MIN_ANSWERS_FOR_BEST,
  PEAKING_Q,
  accuracy,
  bandAccuracy,
  bandDescription,
  bandsFor,
  emptyStats,
  feedbackLine,
  formatBand,
  levelById,
  makeQuestion,
  pinkNoise,
  preGainFor,
  recordAnswer,
  scoreAnswer,
  seededRandom,
  topConfusions,
  updateBest,
  type EqAnswer,
  type EqQuestion,
  type EqResult,
  type EqSource,
  type EqStats,
} from "@/lib/tools/eq-trainer";
import styles from "./Tools.module.css";
import eq from "./EqEarTrainer.module.css";

const BEST_KEY = "guitarhub:eq-trainer-best";
const SWITCH_SECONDS = .015;
const SOURCES: readonly { id: EqSource; label: string }[] = [...DEMO_RIFF_STYLES, { id: "pink-noise", label: "Pink noise" }];

type Engine = {
  context: AudioContext;
  setSource: (source: EqSource) => void;
  setEq: (on: boolean) => void;
  setFilter: (band: number, gainDb: number) => void;
  setPreGain: (gain: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
};

/**
 * One graph for the whole session, built once:
 *
 *   loop → input (pre-gain) ┬→ flat ────────────┬→ limiter → volume → out
 *                           └→ peaking EQ → wet ┘
 *
 * Flat and EQ are two parallel paths; switching between them only ramps the
 * two path gains, so A/B never rebuilds anything and never clicks. The
 * compressor is set as a fast, hard limiter under full scale.
 */
async function openEngine(source: EqSource, preGain: number, volume: number, onInterrupted: () => void, signal: AbortSignal): Promise<Engine> {
  if (signal.aborted) throw new Error("Playback was cancelled.");
  const context = createAudioContext({ latencyHint: "interactive" });
  let stopped = false, release = () => {}, unwatch = () => {};
  let current: AudioBufferSourceNode | null = null;
  const input = context.createGain(), flat = context.createGain(), wet = context.createGain(), master = context.createGain();
  const filter = context.createBiquadFilter(), limiter = context.createDynamicsCompressor();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    unwatch();
    try { current?.stop(); } catch {}
    current?.disconnect();
    current = null;
    for (const node of [input, flat, wet, filter, limiter, master]) node.disconnect();
    signal.removeEventListener("abort", stop);
    release();
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });
  release = claimAudioSession(() => { stop(); onInterrupted(); });
  try {
    await context.resume();
    if (stopped || signal.aborted) throw new Error("Playback was cancelled.");
    if ((context.state as string) !== "running") await context.resume().catch(() => {});
    if ((context.state as string) !== "running") throw new Error("Audio playback did not start.");
    unwatch = watchAudioState(context, () => { if (!stopped) { stop(); onInterrupted(); } });

    filter.type = "peaking";
    filter.Q.value = PEAKING_Q;
    filter.gain.value = 0;
    flat.gain.value = 0;
    wet.gain.value = 1;
    input.gain.value = 0;
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = .002;
    limiter.release.value = .15;
    master.gain.value = volume;
    input.connect(flat); input.connect(filter); filter.connect(wet);
    flat.connect(limiter); wet.connect(limiter); limiter.connect(master); master.connect(context.destination);

    const buffers = new Map<EqSource, AudioBuffer>();
    const bufferFor = (id: EqSource) => {
      let buffer = buffers.get(id);
      if (!buffer) {
        const samples = id === "pink-noise" ? pinkNoise(context.sampleRate * 4, seededRandom(1)) : renderDemoRiff(id, context.sampleRate);
        buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.getChannelData(0).set(samples);
        buffers.set(id, buffer);
      }
      return buffer;
    };
    let level = preGain;
    const setSource = (id: EqSource) => {
      if (stopped) return;
      const now = context.currentTime, at = now + .06;
      // Fade the input out, swap loops under silence, fade back in.
      input.gain.cancelScheduledValues(now);
      input.gain.setTargetAtTime(0, now, .012);
      const previous = current;
      if (previous) { try { previous.stop(at); } catch {} previous.onended = () => previous.disconnect(); }
      const next = context.createBufferSource();
      next.buffer = bufferFor(id);
      next.loop = true;
      next.connect(input);
      next.start(at);
      current = next;
      input.gain.setTargetAtTime(level, at, .012);
    };
    setSource(source);
    return {
      context,
      setSource,
      setEq: on => {
        const now = context.currentTime;
        flat.gain.setTargetAtTime(on ? 0 : 1, now, SWITCH_SECONDS);
        wet.gain.setTargetAtTime(on ? 1 : 0, now, SWITCH_SECONDS);
      },
      setFilter: (band, gainDb) => {
        const now = context.currentTime;
        filter.frequency.setTargetAtTime(band, now, .02);
        filter.gain.setTargetAtTime(gainDb, now, .02);
      },
      setPreGain: gain => { level = gain; input.gain.setTargetAtTime(gain, context.currentTime, .02); },
      setVolume: value => master.gain.setTargetAtTime(value, context.currentTime, .02),
      stop,
    };
  } catch (error) { stop(); throw error; }
}

function readBest(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch { return {}; }
}
function writeBest(best: Record<string, number>) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch {}
}

const percent = (value: number | null) => value === null ? "–" : `${Math.round(value * 100)}%`;

type Round = { question: EqQuestion; answer: EqAnswer | null; result: EqResult | null };

export function EqEarTrainer() {
  const [levelId, setLevelId] = useState(1);
  const [source, setSource] = useState<EqSource>("chords");
  const [volume, setVolume] = useState(.25);
  const [phase, setPhase] = useState<"idle" | "starting" | "playing">("idle");
  const [eqOn, setEqOn] = useState(true);
  const [round, setRound] = useState<Round | null>(null);
  const [direction, setDirection] = useState<boolean | null>(null);
  const [stats, setStats] = useState<EqStats>(emptyStats);
  const [best, setBest] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("Choose a level and a sound, then start. Nothing plays until you do.");
  const engine = useRef<Engine | null>(null);
  const pending = useRef<AbortController | null>(null);
  const level = levelById(levelId);
  const bands = bandsFor(level, source);

  useEffect(() => { setBest(readBest()); }, []);

  const stop = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    engine.current?.stop();
    engine.current = null;
    setPhase("idle");
  }, []);
  useEffect(() => bindPracticeLifecycle(stop), [stop]);

  const ensureEngine = async () => {
    if (engine.current) return engine.current;
    if (!hasWebAudio()) { setStatus("This browser does not support Web Audio, so the trainer cannot play."); return null; }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setPhase("starting");
    try {
      const opened = await openEngine(source, preGainFor(level), volume, () => {
        engine.current = null;
        setPhase("idle");
        setStatus("Playback stopped because the audio was interrupted or another tool started. Tap Play to carry on.");
      }, controller.signal);
      if (controller.signal.aborted) { opened.stop(); return null; }
      pending.current = null;
      engine.current = opened;
      setPhase("playing");
      return opened;
    } catch {
      if (!controller.signal.aborted) { setPhase("idle"); setStatus("Sound could not start. Check your volume and silent switch, then try again."); }
      return null;
    }
  };

  const listen = (on: boolean) => { setEqOn(on); engine.current?.setEq(on); };

  const newRound = async (previous: EqQuestion | null) => {
    const question = makeQuestion(level, Math.random, previous, source);
    setRound({ question, answer: null, result: null });
    setDirection(null);
    const opened = await ensureEngine();
    if (!opened) return;
    opened.setFilter(question.band, question.gainDb);
    listen(true);
    setStatus(level.cuts
      ? "Listen to EQ, then Flat. Choose boost or cut, then the band."
      : "Listen to EQ, then Flat. Which band is boosted?");
  };

  const play = async () => {
    const opened = await ensureEngine();
    if (!opened) return;
    if (round) opened.setFilter(round.question.band, round.question.gainDb);
    opened.setEq(eqOn);
    setStatus("Playing. Switch between Flat and EQ as often as you like.");
  };

  const answer = (band: number) => {
    if (!round || round.answer) return;
    if (level.cuts && direction === null) { setStatus("Choose boost or cut first, then the band."); return; }
    const given: EqAnswer = level.cuts ? { band, boost: direction! } : { band };
    const result = scoreAnswer(round.question, given, level);
    const next = recordAnswer(stats, round.question, given, result);
    setStats(next);
    setRound({ ...round, answer: given, result });
    const updated = updateBest(best[levelId] ?? null, next);
    if (updated !== null && updated !== (best[levelId] ?? null)) {
      const all = { ...best, [levelId]: updated };
      setBest(all); writeBest(all);
    }
    // Leave the right answer in place so the reveal can be auditioned straight away.
    engine.current?.setFilter(round.question.band, round.question.gainDb);
    setStatus(feedbackLine(round.question, given, result, level));
  };

  const audition = (band: number, gainDb: number, label: string) => {
    engine.current?.setFilter(band, gainDb);
    listen(true);
    setStatus(`Playing ${label}.`);
  };

  const changeLevel = (id: number) => {
    setLevelId(id);
    setStats(emptyStats());
    setRound(null);
    engine.current?.setPreGain(preGainFor(levelById(id)));
    engine.current?.setFilter(1000, 0);
    setStatus("New level. Tap Start round when you are ready.");
  };

  const changeSource = (id: EqSource) => {
    setSource(id);
    engine.current?.setSource(id);
    const available = bandsFor(level, id);
    if (round && !round.answer && !available.includes(round.question.band)) {
      setRound(null);
      engine.current?.setFilter(1000, 0);
      setStatus("That band is not in this sound, so the round was skipped. Tap Start round.");
    }
  };

  const changeVolume = (value: number) => { setVolume(value); engine.current?.setVolume(value); };

  const confusions = topConfusions(stats);
  const perBand = bandAccuracy(stats);
  const sessionAccuracy = accuracy(stats);
  const bestHere = best[levelId];

  const buttonState = (band: number) => {
    if (!round?.result || !round.answer) return undefined;
    if (band === round.question.band) return "right";
    if (band === round.answer.band) return round.result.nearMiss ? "near" : "wrong";
    return undefined;
  };

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="eq-setup">
      <h2 id="eq-setup">Set up</h2>
      <div className={styles.segmented} role="group" aria-label="Level">
        {LEVELS.map(entry => <button key={entry.id} type="button" aria-pressed={levelId === entry.id} onClick={() => changeLevel(entry.id)}>{entry.name}</button>)}
      </div>
      <p className={styles.caption}>{level.summary}. {bands.length} bands with this sound: {bands.map(formatBand).join(", ")}.</p>
      <div className={styles.fields}>
        <label className={styles.field}>Sound
          <select value={source} onChange={event => changeSource(event.target.value as EqSource)}>
            {SOURCES.map(entry => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </label>
        <label className={styles.field}>Volume <span className={styles.value}>{Math.round(volume * 100)}%</span>
          <input type="range" min={0} max={1} step={.01} value={volume} onChange={event => changeVolume(Number(event.target.value))} />
        </label>
      </div>
      <p className={styles.caption}>Use headphones or decent speakers: phone and laptop speakers reproduce little below about 200 Hz, so the low bands will be guesswork on them. Start quiet; a boost makes the loop louder. The guitar loops leave out bands they barely contain; pink noise has every band.</p>
    </section>

    <section className={styles.panel} aria-labelledby="eq-round">
      <h2 id="eq-round">{round ? "Which band?" : "Start a round"}</h2>
      <div className={styles.row}>
        {!round && <button type="button" className={`${styles.button} ${styles.primary}`} disabled={phase === "starting"} onClick={() => void newRound(null)}>Start round</button>}
        {round && phase !== "playing" && <button type="button" className={`${styles.button} ${styles.primary}`} disabled={phase === "starting"} onClick={() => void play()}>Play</button>}
        {phase !== "idle" && <button type="button" className={styles.button} onClick={() => { stop(); setStatus("Stopped. Tap Play to carry on."); }}>Stop</button>}
      </div>

      <div className={eq.ab} role="group" aria-label="Listen to">
        <button type="button" aria-pressed={!eqOn} disabled={!round} onClick={() => listen(false)}>A · Flat</button>
        <button type="button" aria-pressed={eqOn} disabled={!round} onClick={() => listen(true)}>B · EQ</button>
      </div>

      {level.cuts && <div className={styles.row}>
        <div className={styles.segmented} role="group" aria-label="Boost or cut">
          <button type="button" aria-pressed={direction === true} disabled={!round || !!round.answer} onClick={() => setDirection(true)}>Boost</button>
          <button type="button" aria-pressed={direction === false} disabled={!round || !!round.answer} onClick={() => setDirection(false)}>Cut</button>
        </div>
      </div>}

      <div className={eq.bands} role="group" aria-label="Frequency band">
        {bands.map(band => <button key={band} type="button" disabled={!round || !!round.answer} data-state={buttonState(band)} onClick={() => answer(band)}>{formatBand(band)}</button>)}
      </div>

      <p className={styles.status} role="status">{phase === "starting" ? "Starting sound…" : status}</p>

      {round?.result && round.answer && <div className={eq.feedback}>
        <p><strong>{feedbackLine(round.question, round.answer, round.result, level)}</strong></p>
        <p>{bandDescription(round.question.band)}</p>
        {!round.result.bandCorrect && <p>{bandDescription(round.answer.band)}</p>}
        <div className={styles.row}>
          <button type="button" className={styles.button} onClick={() => audition(round.question.band, round.question.gainDb, `the answer, ${formatBand(round.question.band)}`)}>Hear the answer</button>
          {!round.result.bandCorrect && <button type="button" className={styles.button} onClick={() => audition(round.answer!.band, round.question.gainDb, `your guess, ${formatBand(round.answer!.band)}, with the same ${round.question.gainDb > 0 ? "boost" : "cut"}`)}>Hear your guess</button>}
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void newRound(round.question)}>Next round</button>
        </div>
      </div>}
    </section>

    <section className={styles.panel} aria-labelledby="eq-stats">
      <h2 id="eq-stats">This session</h2>
      <div className={styles.split}>
        <div className={styles.readout}><strong>{percent(sessionAccuracy)}</strong><span>{stats.correct} of {stats.answered} right · {stats.nearMisses} one octave off</span></div>
        <div className={styles.readout}><strong>{bestHere === undefined ? "–" : percent(bestHere)}</strong><span>Best on {level.name.toLowerCase()} (sessions of {MIN_ANSWERS_FOR_BEST}+ answers)</span></div>
      </div>
      {perBand.length > 0 && <>
        <h3>Accuracy by band</h3>
        <ul className={eq.bandStats}>
          {perBand.map(entry => <li key={entry.band}>
            <span>{formatBand(entry.band)}</span>
            <span className={styles.bar} role="img" aria-label={`${Math.round(entry.accuracy * 100)} percent`}><span style={{ width: `${entry.accuracy * 100}%` }} /></span>
            <span>{entry.correct}/{entry.asked}</span>
          </li>)}
        </ul>
      </>}
      {confusions.length > 0 && <>
        <h3>Most often mixed up</h3>
        <ul className={eq.confusions}>
          {confusions.map(entry => <li key={`${entry.actual}>${entry.guess}`}>{formatBand(entry.actual)} heard as {formatBand(entry.guess)} ({entry.count}×)</li>)}
        </ul>
      </>}
      {stats.answered === 0 && <p className={styles.caption}>Your accuracy per band and the bands you confuse show up here as you answer. They reset when you change level.</p>}
    </section>
  </div>;
}
