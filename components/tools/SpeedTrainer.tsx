"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { claimAudioSession, createAudioContext, watchAudioState } from "@/lib/audio/capture";
import { bindPracticeLifecycle, metronomeConfiguration as click } from "@/lib/audio/practice-tools";
import {
  BARS_PER_STEP_MAX, BARS_PER_STEP_MIN, BEATS_MAX, BEATS_MIN, BPM_MAX, BPM_MIN, BURST_BARS_MAX, BURST_BARS_MIN,
  BURST_BPM_MAX, BURST_BPM_MIN, DEFAULT_SPEED_CONFIG, HOLD_MAX, STEP_MAX, STEP_MIN, SUBDIVISIONS,
  buildRampPlan, clickSamples, describePosition, endBehavior, estimatedSeconds, formatDuration, normalizeSpeedConfig,
  parseSpeedConfig, scheduleClicks, totalBars,
  type ClickEvent, type ClickLevel, type Cursor, type SpeedConfig, type SpeedMode, type Subdivision,
} from "@/lib/tools/speed-trainer";
import styles from "./Tools.module.css";
import own from "./SpeedTrainer.module.css";

const STORAGE_KEY = "guitarhub.speed-trainer.v1";
/** The standard lookahead pattern: wake every 25 ms, schedule anything due in the next 100 ms. */
const TIMER_MS = 25;
const LOOKAHEAD_SECONDS = 0.1;
/** Subdivision clicks play at this share of the beat click's level. */
const SUB_LEVEL = 0.35;

type Display = { bpm: number; beat: number | null; label: string; progress: number; stageIndex: number | null };
type EndReason = "complete" | "interrupted" | "claimed";
type Session = {
  pause: () => void;
  resume: () => Promise<void>;
  /** Silence and release everything; returns the fastest tempo heard, or null before the first bar. */
  stop: () => number | null;
};

/**
 * One speed-trainer session: an AudioContext, a lookahead scheduler on its
 * clock, and an animation loop that reports each click once the audio clock
 * reaches it. Kept outside React so the timers and nodes are plain objects.
 */
async function startSession(input: SpeedConfig, onDisplay: (display: Display) => void, onEnd: (reason: EndReason, reached: number | null) => void, signal: AbortSignal): Promise<Session> {
  if (signal.aborted) throw new Error("Start was cancelled.");
  const config = normalizeSpeedConfig(input);
  const plan = buildRampPlan(config);
  const total = totalBars(plan);
  const context = createAudioContext({ latencyHint: "interactive" });
  const makeBuffer = (frequency: number, amplitude: number) => {
    const samples = clickSamples(frequency, context.sampleRate, click.clickSeconds, click.envelopeDecay, amplitude);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    return buffer;
  };
  const buffers: Record<ClickLevel, AudioBuffer> = {
    accent: makeBuffer(click.accentFrequencyHz, click.amplitude),
    beat: makeBuffer(click.tickFrequencyHz, click.amplitude),
    sub: makeBuffer(click.tickFrequencyHz, click.amplitude * SUB_LEVEL),
  };
  let cursor: Cursor = { time: 0, bar: config.countIn ? -1 : 0, beat: 0, sub: 0 };
  let queue: ClickEvent[] = [];
  const sources = new Set<{ source: AudioBufferSourceNode; time: number }>();
  let timer = 0, frame = 0, paused = false, stopped = false;
  let finishedAt: number | null = null, heardBar: number | null = null, reached: number | null = null;
  let release = () => {}, unwatch = () => {};

  const silence = (from: number) => {
    for (const item of sources) {
      if (item.time < from) continue;
      item.source.onended = null;
      try { item.source.stop(); } catch {}
      item.source.disconnect();
      sources.delete(item);
    }
  };
  const stop = () => {
    if (!stopped) {
      stopped = true;
      window.clearTimeout(timer); cancelAnimationFrame(frame);
      unwatch(); silence(-Infinity); release();
      signal.removeEventListener("abort", stop);
      void context.close().catch(() => {});
    }
    return reached;
  };
  const end = (reason: EndReason) => { if (!stopped) { stop(); onEnd(reason, reached); } };
  const claim = () => { release = claimAudioSession(() => end("claimed")); };

  const schedule = () => {
    if (stopped || paused) return;
    const now = context.currentTime;
    // A long stall (a blocked main thread) would otherwise fire a burst of catch-up clicks. Skip the lost time instead.
    if (cursor.time < now - LOOKAHEAD_SECONDS) cursor = { ...cursor, time: now + 0.02 };
    const result = scheduleClicks(cursor, now + LOOKAHEAD_SECONDS, plan, config);
    for (const event of result.events) {
      const source = context.createBufferSource();
      source.buffer = buffers[event.level];
      source.connect(context.destination);
      const item = { source, time: event.time };
      source.onended = () => { sources.delete(item); source.disconnect(); };
      sources.add(item);
      source.start(Math.max(event.time, context.currentTime));
      queue.push(event);
    }
    cursor = result.cursor;
    if (result.finished) { finishedAt = result.cursor.time; return; }
    timer = window.setTimeout(schedule, TIMER_MS);
  };

  // Beat lights follow the audio clock: a click is shown once context time reaches it, not when it was scheduled.
  const animate = () => {
    if (stopped || paused) return;
    const now = context.currentTime;
    let latest: ClickEvent | null = null;
    while (queue.length > 0 && queue[0].time <= now) latest = queue.shift() ?? null;
    if (latest && latest.sub === 0) {
      const { position } = latest;
      heardBar = latest.bar;
      if (!position.countIn) reached = Math.max(reached ?? 0, latest.bpm);
      const progress = position.countIn ? 0 : position.holding ? 1 : Math.min(1, (position.barInCycle + (latest.beat + 1) / config.beatsPerBar) / total);
      onDisplay({ bpm: latest.bpm, beat: latest.beat, label: describePosition(plan, position), progress, stageIndex: position.countIn ? null : position.stageIndex });
    }
    if (finishedAt !== null && now >= finishedAt) { end("complete"); return; }
    frame = requestAnimationFrame(animate);
  };

  const run = (lead: number) => {
    cursor = { ...cursor, time: context.currentTime + lead };
    schedule();
    frame = requestAnimationFrame(animate);
  };

  signal.addEventListener("abort", stop, { once: true });
  claim();
  try {
    await context.resume();
    if (stopped || signal.aborted) throw new Error("Start was cancelled.");
    if ((context.state as string) !== "running") await context.resume().catch(() => {});
    if ((context.state as string) !== "running") throw new Error("Audio playback did not start.");
    unwatch = watchAudioState(context, () => end("interrupted"));
    run(0.05);
  } catch (error) { stop(); throw error; }

  return {
    stop,
    pause: () => {
      if (stopped || paused) return;
      paused = true;
      window.clearTimeout(timer); cancelAnimationFrame(frame);
      silence(context.currentTime);
      // Resume from the start of the bar you were in, so you come back in on beat one.
      cursor = { time: 0, bar: heardBar ?? cursor.bar, beat: 0, sub: 0 };
      queue = []; finishedAt = null;
      release(); release = () => {};
    },
    resume: async () => {
      if (stopped || !paused) return;
      claim();
      await context.resume().catch(() => {});
      if (stopped) return;
      paused = false;
      run(0.1);
    },
  };
}

function NumberField({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const commit = (raw: string) => {
    const number = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(number)) onCommit(Math.min(max, Math.max(min, Math.round(number))));
  };
  return <label className={styles.field}>{label}
    <input type="number" inputMode="numeric" min={min} max={max} step={1} value={editing ? text : String(value)}
      onFocus={() => { setText(String(value)); setEditing(true); }}
      onChange={event => {
        setText(event.target.value);
        const number = Number(event.target.value);
        if (event.target.value !== "" && number >= min && number <= max) onCommit(Math.round(number));
      }}
      onBlur={event => { commit(event.target.value); setEditing(false); }}
      onKeyDown={event => { if (event.key === "Enter") commit(event.currentTarget.value); }} />
  </label>;
}

export function SpeedTrainer() {
  const [config, setConfig] = useState<SpeedConfig>(DEFAULT_SPEED_CONFIG);
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "paused">("idle");
  const [display, setDisplay] = useState<Display>({ bpm: DEFAULT_SPEED_CONFIG.startBpm, beat: null, label: "", progress: 0, stageIndex: null });
  const [message, setMessage] = useState("Set your plan, then press Start. The click begins only when you press it.");
  const sessionRef = useRef<Session | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const restored = useRef(false);

  const plan = useMemo(() => buildRampPlan(config), [config]);
  const bars = totalBars(plan);
  const seconds = estimatedSeconds(plan, config.beatsPerBar, config.countIn ? 1 : 0);
  const behavior = endBehavior(config);

  useEffect(() => {
    let saved = DEFAULT_SPEED_CONFIG;
    try { saved = parseSpeedConfig(window.localStorage.getItem(STORAGE_KEY)); } catch {}
    setConfig(saved);
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
  }, [config]);
  // While idle, the big number previews the tempo the session starts at.
  useEffect(() => { if (phase === "idle") setDisplay(shown => ({ ...shown, bpm: plan[0].bpm })); }, [phase, plan]);

  const update = (patch: Partial<SpeedConfig>) => setConfig(current => normalizeSpeedConfig({ ...current, ...patch }));

  const report = useCallback((reason: string, reached: number | null) => {
    setPhase("idle");
    setDisplay(current => ({ ...current, beat: null }));
    setMessage(reached === null ? `${reason} Stopped before the first bar.` : `${reason} You reached ${reached} BPM.`);
  }, []);

  /** Stop any session or pending start, then report. */
  const finish = useCallback((reason: string) => {
    const pending = requestRef.current !== null;
    requestRef.current?.abort(); requestRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) report(reason, session.stop());
    else if (pending) { setPhase("idle"); setMessage("Start cancelled."); }
  }, [report]);

  useEffect(() => bindPracticeLifecycle(() => finish("Stopped because the page was hidden.")), [finish]);

  async function start() {
    finish("Stopped.");
    if (document.hidden) { setMessage("Return to this page before starting."); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    setPhase("starting"); setMessage("Starting audio playback…");
    try {
      const session = await startSession(config, setDisplay, (reason, reached) => {
        if (sessionRef.current === null) return;
        sessionRef.current = null;
        report(reason === "complete" ? "Plan complete." : reason === "claimed" ? "Stopped because another audio tool on this page started." : "Stopped because audio was interrupted.", reached);
      }, controller.signal);
      if (controller.signal.aborted || requestRef.current !== controller) { session.stop(); return; }
      requestRef.current = null;
      sessionRef.current = session;
      setPhase("running");
      setMessage(config.countIn ? "One bar of count-in, then the plan starts." : "Playing. Beat one has the brighter click.");
    } catch {
      if (controller.signal.aborted || requestRef.current !== controller) return;
      requestRef.current = null;
      setPhase("idle");
      setMessage("Audio playback could not start. Check your browser’s sound settings and output device, then try again.");
    }
  }

  function pause() {
    if (!sessionRef.current) return;
    sessionRef.current.pause();
    setPhase("paused");
    setDisplay(current => ({ ...current, beat: null }));
    setMessage("Paused. Resume starts again from the beginning of this bar.");
  }

  async function resume() {
    const session = sessionRef.current;
    if (!session) return;
    setPhase("running"); setMessage("Playing.");
    await session.resume();
  }

  function stop() { finish("Stopped."); }

  const active = phase !== "idle";
  const burst = config.mode === "burst";
  const modes: readonly { id: SpeedMode; label: string }[] = [{ id: "climb", label: "Climb" }, { id: "climb-reset", label: "Climb and reset" }, { id: "burst", label: "Burst" }];
  const ending = burst ? `Alternates ${config.burstBars} bar${config.burstBars === 1 ? "" : "s"} at ${plan[0].bpm} BPM and ${config.burstBars} at ${plan[1]?.bpm} BPM until you stop.`
    : behavior === "hold-open" ? "After the last step the click stays at the target until you stop it."
      : behavior === "stop" ? `Plays ${config.holdBars} extra bar${config.holdBars === 1 ? "" : "s"} at the target, then stops.`
        : `Plays ${config.holdBars} extra bar${config.holdBars === 1 ? "" : "s"} at the target, then drops back to ${config.startBpm} BPM and climbs again until you stop.`;

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="speed-play">
      <h2 id="speed-play">Session</h2>
      <div className={styles.readout}><strong>{display.bpm}</strong><span>BPM{phase === "idle" ? " at the start" : ""}</span></div>
      <div className={own.beats} aria-hidden="true">
        {Array.from({ length: config.beatsPerBar }, (_, index) => <span key={index} data-accent={index === 0} data-active={display.beat === index && phase === "running"}>{index + 1}</span>)}
      </div>
      <p className={own.position}>{active ? display.label : `${plan.length} step${plan.length === 1 ? "" : "s"}, ${bars} bars, about ${formatDuration(seconds)} per pass`}</p>
      <span className={styles.bar} role="progressbar" aria-label="Progress through the plan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(display.progress * 100)}>
        <span style={{ width: `${Math.round((active ? display.progress : 0) * 1000) / 10}%` }} />
      </span>
      <div className={styles.row}>
        {phase === "idle" && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void start()}>Start</button>}
        {phase === "starting" && <button type="button" className={styles.button} onClick={stop}>Cancel start</button>}
        {phase === "running" && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={pause}>Pause</button>}
        {phase === "paused" && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void resume()}>Resume</button>}
        {(phase === "running" || phase === "paused") && <button type="button" className={styles.button} onClick={stop}>Stop</button>}
      </div>
      <p role="status" className={styles.status}>{message}</p>
    </section>

    <section className={styles.panel} aria-labelledby="speed-plan">
      <h2 id="speed-plan">Plan</h2>
      {active && <p className={styles.caption}>Stop the session to change the plan.</p>}
      <fieldset className={own.fieldset} disabled={active}>
        <legend className={styles.caption}>Mode</legend>
        <div className={styles.segmented} role="group" aria-label="Mode">
          {modes.map(mode => <button key={mode.id} type="button" aria-pressed={config.mode === mode.id} onClick={() => update({ mode: mode.id })}>{mode.label}</button>)}
        </div>
        <div className={styles.fields}>
          <NumberField label={burst ? `Working tempo (${BPM_MIN}–${BPM_MAX} BPM)` : `Start (${BPM_MIN}–${BPM_MAX} BPM)`} value={config.startBpm} min={BPM_MIN} max={BPM_MAX} onCommit={value => update({ startBpm: value })} />
          {!burst && <>
            <NumberField label={`Target (${BPM_MIN}–${BPM_MAX} BPM)`} value={config.targetBpm} min={BPM_MIN} max={BPM_MAX} onCommit={value => update({ targetBpm: value })} />
            <NumberField label={`Step (${STEP_MIN}–${STEP_MAX} BPM)`} value={config.stepBpm} min={STEP_MIN} max={STEP_MAX} onCommit={value => update({ stepBpm: value })} />
            <NumberField label={`Bars per step (${BARS_PER_STEP_MIN}–${BARS_PER_STEP_MAX})`} value={config.barsPerStep} min={BARS_PER_STEP_MIN} max={BARS_PER_STEP_MAX} onCommit={value => update({ barsPerStep: value })} />
            <NumberField label={`Hold at target (0–${HOLD_MAX} bars)`} value={config.holdBars} min={0} max={HOLD_MAX} onCommit={value => update({ holdBars: value })} />
          </>}
          {burst && <>
            <NumberField label={`Burst adds (${BURST_BPM_MIN}–${BURST_BPM_MAX} BPM)`} value={config.burstBpm} min={BURST_BPM_MIN} max={BURST_BPM_MAX} onCommit={value => update({ burstBpm: value })} />
            <NumberField label={`Bars at each tempo (${BURST_BARS_MIN}–${BURST_BARS_MAX})`} value={config.burstBars} min={BURST_BARS_MIN} max={BURST_BARS_MAX} onCommit={value => update({ burstBars: value })} />
          </>}
          <NumberField label={`Beats per bar (${BEATS_MIN}–${BEATS_MAX})`} value={config.beatsPerBar} min={BEATS_MIN} max={BEATS_MAX} onCommit={value => update({ beatsPerBar: value })} />
          <label className={styles.field}>Subdivision
            <select value={config.subdivision} onChange={event => update({ subdivision: event.target.value as Subdivision })}>
              {SUBDIVISIONS.map(entry => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            </select>
          </label>
        </div>
        <label className={own.check}><input type="checkbox" checked={config.countIn} onChange={event => update({ countIn: event.target.checked })} />One-bar count-in before the plan</label>
      </fieldset>
      <p className={styles.caption}>{ending} {burst ? "Burst mode ignores target and step: it trains short spurts above a tempo you can already play, then lets you settle back." : "Tempo changes land on bar lines. Set the start above the target for a descending ramp."} Subdivision clicks are quieter than the beat; beat one has the brighter click.</p>
      <div className={styles.scroller}>
        <ol className={own.stages} aria-label="Tempo of each step">
          {plan.map((stage, index) => <li key={index} data-current={active && display.stageIndex === index}>{stage.bpm} BPM, {stage.bars} bar{stage.bars === 1 ? "" : "s"}</li>)}
        </ol>
      </div>
    </section>
  </div>;
}
