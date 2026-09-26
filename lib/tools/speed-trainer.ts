/**
 * Pure logic for the speed trainer at /tools/speed-trainer: a metronome that
 * changes tempo by itself within one session.
 *
 * Invalid input is clamped, never thrown: every numeric field is rounded and
 * pulled into its range, and anything that is not a number takes its
 * default. `normalizeSpeedConfig` is the single place that happens, and
 * `buildRampPlan` always runs it first, so a plan can always be built.
 *
 * Modes:
 * - "climb": start → target in steps, then hold. With `holdBars` 0 the click
 *   stays at the target until you stop it; with `holdBars` N it plays N extra
 *   bars at the target and stops.
 * - "climb-reset": start → target, `holdBars` extra bars at the target, then
 *   back to the start for another cycle, until you stop it.
 * - "burst": no ramp. `burstBars` bars at the start tempo (the working tempo),
 *   then `burstBars` bars at start + `burstBpm`, repeated until you stop it.
 *   Target and step are ignored in this mode.
 */

export const BPM_MIN = 30;
export const BPM_MAX = 300;
export const STEP_MIN = 1;
export const STEP_MAX = 20;
export const BARS_PER_STEP_MIN = 1;
export const BARS_PER_STEP_MAX = 16;
export const BEATS_MIN = 2;
export const BEATS_MAX = 7;
export const HOLD_MAX = 32;
export const BURST_BPM_MIN = 1;
export const BURST_BPM_MAX = 60;
export const BURST_BARS_MIN = 1;
export const BURST_BARS_MAX = 8;

export type Subdivision = "quarter" | "eighth" | "triplet" | "sixteenth";
export const SUBDIVISIONS: readonly { id: Subdivision; label: string; clicks: number }[] = [
  { id: "quarter", label: "Quarter notes", clicks: 1 },
  { id: "eighth", label: "Eighth notes", clicks: 2 },
  { id: "triplet", label: "Triplets", clicks: 3 },
  { id: "sixteenth", label: "Sixteenth notes", clicks: 4 },
];
export type SpeedMode = "climb" | "climb-reset" | "burst";

export type SpeedConfig = {
  startBpm: number;
  targetBpm: number;
  stepBpm: number;
  barsPerStep: number;
  beatsPerBar: number;
  subdivision: Subdivision;
  countIn: boolean;
  mode: SpeedMode;
  /** Extra bars at the target before stopping (climb) or resetting (climb-reset). */
  holdBars: number;
  /** Burst mode: how many bars at each tempo. */
  burstBars: number;
  /** Burst mode: how much faster the burst bars are. */
  burstBpm: number;
};

export const DEFAULT_SPEED_CONFIG: SpeedConfig = {
  startBpm: 80, targetBpm: 120, stepBpm: 5, barsPerStep: 4, beatsPerBar: 4,
  subdivision: "quarter", countIn: true, mode: "climb", holdBars: 0, burstBars: 2, burstBpm: 20,
};

export type StageKind = "ramp" | "target" | "work" | "burst";
export type Stage = { bpm: number; bars: number; kind: StageKind };

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Clamp every field into range; see the module comment. Accepts partial or untrusted input. */
export function normalizeSpeedConfig(input: Partial<Record<keyof SpeedConfig, unknown>>): SpeedConfig {
  const d = DEFAULT_SPEED_CONFIG;
  const subdivision = SUBDIVISIONS.some(entry => entry.id === input.subdivision) ? input.subdivision as Subdivision : d.subdivision;
  const mode = input.mode === "climb" || input.mode === "climb-reset" || input.mode === "burst" ? input.mode : d.mode;
  return {
    startBpm: clampInt(input.startBpm, BPM_MIN, BPM_MAX, d.startBpm),
    targetBpm: clampInt(input.targetBpm, BPM_MIN, BPM_MAX, d.targetBpm),
    stepBpm: clampInt(input.stepBpm, STEP_MIN, STEP_MAX, d.stepBpm),
    barsPerStep: clampInt(input.barsPerStep, BARS_PER_STEP_MIN, BARS_PER_STEP_MAX, d.barsPerStep),
    beatsPerBar: clampInt(input.beatsPerBar, BEATS_MIN, BEATS_MAX, d.beatsPerBar),
    subdivision,
    countIn: typeof input.countIn === "boolean" ? input.countIn : d.countIn,
    mode,
    holdBars: clampInt(input.holdBars, 0, HOLD_MAX, d.holdBars),
    burstBars: clampInt(input.burstBars, BURST_BARS_MIN, BURST_BARS_MAX, d.burstBars),
    burstBpm: clampInt(input.burstBpm, BURST_BPM_MIN, BURST_BPM_MAX, d.burstBpm),
  };
}

/**
 * One cycle of the session as ordered stages.
 *
 * Ramp modes step from start toward target by `stepBpm`, `barsPerStep` bars
 * each. The last stage is exactly the target and never overshoots it: a step
 * larger than the remaining gap lands on the target. Descending ramps
 * (start above target) step down the same way. The target stage also carries
 * the `holdBars`. When start equals target the plan is the single target stage.
 */
export function buildRampPlan(input: Partial<Record<keyof SpeedConfig, unknown>>): Stage[] {
  const config = normalizeSpeedConfig(input);
  if (config.mode === "burst") {
    return [
      { bpm: config.startBpm, bars: config.burstBars, kind: "work" },
      { bpm: Math.min(BPM_MAX, config.startBpm + config.burstBpm), bars: config.burstBars, kind: "burst" },
    ];
  }
  const { startBpm: start, targetBpm: target, stepBpm: step, barsPerStep: bars } = config;
  const direction = target >= start ? 1 : -1;
  const stages: Stage[] = [];
  for (let bpm = start; direction * (target - bpm) > 0; bpm += direction * step) {
    stages.push({ bpm, bars, kind: "ramp" });
  }
  stages.push({ bpm: target, bars: bars + config.holdBars, kind: "target" });
  return stages;
}

export function totalBars(plan: readonly Stage[]): number {
  return plan.reduce((sum, stage) => sum + stage.bars, 0);
}

/** Seconds for one pass through the plan, plus an optional count-in at the first stage's tempo. */
export function estimatedSeconds(plan: readonly Stage[], beatsPerBar: number, countInBars = 0): number {
  const beats = clampInt(beatsPerBar, BEATS_MIN, BEATS_MAX, DEFAULT_SPEED_CONFIG.beatsPerBar);
  const body = plan.reduce((sum, stage) => sum + stage.bars * beats * 60 / stage.bpm, 0);
  const lead = plan.length > 0 ? Math.max(0, countInBars) * beats * 60 / plan[0].bpm : 0;
  return body + lead;
}

/** "3 min 20 s", "45 s". */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(whole / 60), rest = whole % 60;
  return minutes > 0 ? `${minutes} min${rest ? ` ${rest} s` : ""}` : `${rest} s`;
}

/** What happens when one pass through the plan is over. */
export type EndBehavior = "hold-open" | "stop" | "repeat";
export function endBehavior(config: SpeedConfig): EndBehavior {
  if (config.mode === "climb") return config.holdBars > 0 ? "stop" : "hold-open";
  return "repeat";
}

export type BarPosition = {
  /** True for count-in bars, which come before bar 0. */
  countIn: boolean;
  /** True past the end of a "hold-open" plan: the click stays at the target. */
  holding: boolean;
  /** True once a "stop" plan has run out: nothing more to play. */
  done: boolean;
  stageIndex: number;
  /** 0-based bar inside the stage. */
  barInStage: number;
  /** Bars into the current cycle, for the whole-plan progress bar. */
  barInCycle: number;
  cycle: number;
  bpm: number;
};

/**
 * Where an absolute bar number falls in the plan. Bar 0 is the first bar
 * after the count-in; negative bars are count-in bars at the first stage's
 * tempo. Past the end, "hold-open" stays on the last bar of the target
 * stage, "repeat" starts the next cycle, and "stop" reports done.
 */
export function locateBar(plan: readonly Stage[], bar: number, behavior: EndBehavior): BarPosition {
  const first = plan[0] ?? { bpm: DEFAULT_SPEED_CONFIG.startBpm, bars: 1, kind: "ramp" as const };
  if (bar < 0) return { countIn: true, holding: false, done: false, stageIndex: 0, barInStage: 0, barInCycle: 0, cycle: 0, bpm: first.bpm };
  const total = totalBars(plan);
  if (total === 0) return { countIn: false, holding: false, done: true, stageIndex: 0, barInStage: 0, barInCycle: 0, cycle: 0, bpm: first.bpm };
  let cycle = 0, offset = bar;
  if (bar >= total) {
    if (behavior === "stop") {
      const last = plan[plan.length - 1];
      return { countIn: false, holding: false, done: true, stageIndex: plan.length - 1, barInStage: last.bars - 1, barInCycle: total - 1, cycle: 0, bpm: last.bpm };
    }
    if (behavior === "hold-open") {
      const last = plan[plan.length - 1];
      return { countIn: false, holding: true, done: false, stageIndex: plan.length - 1, barInStage: last.bars - 1, barInCycle: total - 1, cycle: 0, bpm: last.bpm };
    }
    cycle = Math.floor(bar / total);
    offset = bar % total;
  }
  let remaining = offset;
  for (let index = 0; index < plan.length; index++) {
    if (remaining < plan[index].bars) return { countIn: false, holding: false, done: false, stageIndex: index, barInStage: remaining, barInCycle: offset, cycle, bpm: plan[index].bpm };
    remaining -= plan[index].bars;
  }
  const last = plan[plan.length - 1];
  return { countIn: false, holding: false, done: false, stageIndex: plan.length - 1, barInStage: last.bars - 1, barInCycle: total - 1, cycle, bpm: last.bpm };
}

export function subdivisionClicks(subdivision: Subdivision): number {
  return SUBDIVISIONS.find(entry => entry.id === subdivision)?.clicks ?? 1;
}

export type ClickLevel = "accent" | "beat" | "sub";
export type ClickEvent = { time: number; bar: number; beat: number; sub: number; level: ClickLevel; bpm: number; position: BarPosition };
/** The next click to schedule. `time` is on the AudioContext clock. */
export type Cursor = { time: number; bar: number; beat: number; sub: number };

/**
 * The lookahead scheduler's pure core: every click from `cursor` up to (but
 * not including) `horizon`, and the cursor after them.
 *
 * Times advance by exact tick lengths from the cursor, never from when the
 * timer ran, so a late timer call only schedules more clicks at once; the
 * grid itself does not move. Each tick's length comes from the tempo of the
 * bar it belongs to, so tempo changes land on bar lines. Returns
 * `finished: true` once a "stop" plan runs out.
 */
export function scheduleClicks(cursor: Cursor, horizon: number, plan: readonly Stage[], config: SpeedConfig): { events: ClickEvent[]; cursor: Cursor; finished: boolean } {
  const behavior = endBehavior(config);
  const clicks = subdivisionClicks(config.subdivision);
  const events: ClickEvent[] = [];
  let { time, bar, beat, sub } = cursor;
  // A hard cap keeps a bad horizon from ever spinning: no call needs more than a few seconds of clicks.
  for (let guard = 0; time < horizon && guard < 4096; guard++) {
    const position = locateBar(plan, bar, behavior);
    if (position.done) return { events, cursor: { time, bar, beat, sub }, finished: true };
    const level: ClickLevel = sub > 0 ? "sub" : beat === 0 ? "accent" : "beat";
    events.push({ time, bar, beat, sub, level, bpm: position.bpm, position });
    time += 60 / position.bpm / clicks;
    sub++;
    if (sub >= clicks) { sub = 0; beat++; }
    if (beat >= config.beatsPerBar) { beat = 0; bar++; }
  }
  return { events, cursor: { time, bar, beat, sub }, finished: false };
}

/** "Step 3 of 9, bar 2 of 4", "Count-in", "Burst, bar 1 of 2". */
export function describePosition(plan: readonly Stage[], position: BarPosition): string {
  if (position.countIn) return "Count-in";
  if (position.holding) return "Holding at the target";
  const stage = plan[position.stageIndex];
  if (!stage) return "";
  const bar = `bar ${position.barInStage + 1} of ${stage.bars}`;
  if (stage.kind === "work") return `Working tempo, ${bar}`;
  if (stage.kind === "burst") return `Burst, ${bar}`;
  const cycle = position.cycle > 0 ? `Cycle ${position.cycle + 1}, s` : "S";
  return `${cycle}tep ${position.stageIndex + 1} of ${plan.length}, ${bar}`;
}

/** One click: a short decaying sine burst, like the practice-room metronome. */
export function clickSamples(frequency: number, sampleRate: number, seconds: number, decay: number, amplitude: number): Float32Array {
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const time = index / sampleRate;
    samples[index] = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * decay) * amplitude;
  }
  return samples;
}

/** Read a saved config, clamping it like any other input. */
export function parseSpeedConfig(raw: string | null): SpeedConfig {
  if (!raw) return { ...DEFAULT_SPEED_CONFIG };
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? normalizeSpeedConfig(value as Record<string, unknown>) : { ...DEFAULT_SPEED_CONFIG };
  } catch { return { ...DEFAULT_SPEED_CONFIG }; }
}
