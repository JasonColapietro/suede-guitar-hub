import type { DemoRiffStyle } from "./demo-riff.ts";

/**
 * The pedal lab's definitions and maths: which pedals exist, what their knobs
 * do, the presets the tone course links to, the conventional order, and the
 * curves and impulse responses the audio graph is built from.
 *
 * Pure on purpose. Nothing here touches a browser API, so node tests and
 * server components can import it. The Web Audio side is lib/tools/pedal-graph.ts.
 *
 * These are teaching approximations of each effect family. They are not
 * models of any product and are not tuned to match one.
 */

export type PedalType =
  | "gate" | "compressor" | "wah" | "eq"
  | "overdrive" | "distortion" | "fuzz"
  | "chorus" | "phaser" | "tremolo"
  | "delay" | "reverb";

export type PedalFamily = "dynamics" | "filter" | "gain" | "modulation" | "time";

export type KnobDef = {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Shown after the value: "ms", "s", "dB", "Hz" or "%". */
  unit?: "ms" | "s" | "dB" | "Hz" | "%";
  /** A switch rather than a dial: the value is an index into these labels. */
  choices?: readonly string[];
};

export type PedalDef = {
  type: PedalType;
  name: string;
  family: PedalFamily;
  /** One sentence on what it does to the sound. */
  summary: string;
  knobs: readonly KnobDef[];
};

export type PedalSettings = Record<string, number>;

export type Pedal = {
  /** Unique within a chain, e.g. "overdrive-1". */
  id: string;
  type: PedalType;
  on: boolean;
  settings: PedalSettings;
};

export type AmpSettings = {
  /** The amp's preamp and tone stack. Off passes the pedals straight to the cab. */
  on: boolean;
  /** The speaker cabinet simulation. Off lets you hear the raw, fizzy amp. */
  cab: boolean;
  gain: number;
  bass: number;
  mid: number;
  treble: number;
  master: number;
};

const dial = (id: string, label: string, def = 5): KnobDef => ({ id, label, min: 0, max: 10, step: .1, default: def });
const level = dial("level", "Level");
const tone = dial("tone", "Tone");
const mix = (def: number): KnobDef => dial("mix", "Mix", def);

export const PEDAL_DEFS: Readonly<Record<PedalType, PedalDef>> = {
  gate: {
    type: "gate", name: "Noise gate", family: "dynamics",
    summary: "Mutes the signal when it falls below the threshold, so hiss and hum stop between phrases.",
    knobs: [
      { id: "threshold", label: "Threshold", min: -70, max: -20, step: 1, default: -55, unit: "dB" },
      { id: "release", label: "Release", min: 20, max: 500, step: 5, default: 120, unit: "ms" },
    ],
  },
  compressor: {
    type: "compressor", name: "Compressor", family: "dynamics",
    summary: "Turns loud notes down and lets quiet ones through, so notes sustain and the level evens out.",
    knobs: [
      dial("sustain", "Sustain"),
      { id: "attack", label: "Attack", min: 1, max: 50, step: 1, default: 10, unit: "ms" },
      level,
    ],
  },
  wah: {
    type: "wah", name: "Wah", family: "filter",
    summary: "A narrow, sweepable peak in the mids. Park it for a nasal tone, or let it move by itself.",
    knobs: [
      dial("position", "Position", 6),
      { id: "mode", label: "Mode", min: 0, max: 2, step: 1, default: 0, choices: ["Fixed", "Auto (LFO)", "Auto (envelope)"] },
      { id: "rate", label: "Rate", min: .2, max: 6, step: .1, default: 1.5, unit: "Hz" },
      dial("range", "Range", 6),
    ],
  },
  eq: {
    type: "eq", name: "EQ", family: "filter",
    summary: "Boosts or cuts three bands, so you can shape the sound before or after the gain.",
    knobs: [
      { id: "bass", label: "100 Hz", min: -12, max: 12, step: .5, default: 0, unit: "dB" },
      { id: "mid", label: "800 Hz", min: -12, max: 12, step: .5, default: 0, unit: "dB" },
      { id: "treble", label: "3.2 kHz", min: -12, max: 12, step: .5, default: 0, unit: "dB" },
      level,
    ],
  },
  overdrive: {
    type: "overdrive", name: "Overdrive", family: "gain",
    summary: "Soft, asymmetric clipping with a mid hump, the sound of a pushed amp at lower gain.",
    knobs: [dial("drive", "Drive"), tone, level],
  },
  distortion: {
    type: "distortion", name: "Distortion", family: "gain",
    summary: "Harder, symmetric clipping: more gain, more compression and a flatter, buzzier edge.",
    knobs: [dial("drive", "Drive", 6), tone, level],
  },
  fuzz: {
    type: "fuzz", name: "Fuzz", family: "gain",
    summary: "Clips the wave almost to a square. More bias starves it, so notes sputter as they decay.",
    knobs: [dial("fuzz", "Fuzz", 7), dial("bias", "Bias", 3), tone, level],
  },
  chorus: {
    type: "chorus", name: "Chorus", family: "modulation",
    summary: "Mixes in a copy that wobbles slightly in pitch, which thickens and widens the sound.",
    knobs: [
      { id: "rate", label: "Rate", min: .1, max: 5, step: .05, default: .8, unit: "Hz" },
      dial("depth", "Depth"),
      mix(5),
    ],
  },
  phaser: {
    type: "phaser", name: "Phaser", family: "modulation",
    summary: "Sweeps notches through the spectrum with all-pass filters, for a swirling, hollow movement.",
    knobs: [
      { id: "rate", label: "Rate", min: .05, max: 5, step: .05, default: .5, unit: "Hz" },
      dial("depth", "Depth", 6),
      { id: "stages", label: "Stages", min: 0, max: 1, step: 1, default: 0, choices: ["4 stages", "6 stages"] },
    ],
  },
  tremolo: {
    type: "tremolo", name: "Tremolo", family: "modulation",
    summary: "Turns the volume up and down in a steady pulse.",
    knobs: [
      { id: "rate", label: "Rate", min: 1, max: 12, step: .1, default: 5, unit: "Hz" },
      dial("depth", "Depth"),
      { id: "shape", label: "Shape", min: 0, max: 1, step: 1, default: 0, choices: ["Sine", "Square"] },
    ],
  },
  delay: {
    type: "delay", name: "Delay", family: "time",
    summary: "Repeats what you play. Each repeat passes a low-pass filter, so it gets darker as it fades.",
    knobs: [
      { id: "time", label: "Time", min: 60, max: 1000, step: 5, default: 380, unit: "ms" },
      { id: "feedback", label: "Feedback", min: 0, max: 90, step: 1, default: 35, unit: "%" },
      mix(3),
      dial("tone", "Tone", 5),
    ],
  },
  reverb: {
    type: "reverb", name: "Reverb", family: "time",
    summary: "Adds the tail of a room: many reflections that decay together.",
    knobs: [
      { id: "decay", label: "Decay", min: .5, max: 6, step: .1, default: 2, unit: "s" },
      { id: "predelay", label: "Pre-delay", min: 0, max: 100, step: 1, default: 20, unit: "ms" },
      mix(3),
    ],
  },
};

/** The add-a-pedal menu order: roughly the conventional chain. */
export const PEDAL_TYPES: readonly PedalType[] = ["gate", "compressor", "wah", "eq", "overdrive", "distortion", "fuzz", "chorus", "phaser", "tremolo", "delay", "reverb"];

export const AMP_KNOBS: readonly KnobDef[] = [
  dial("gain", "Gain", 3),
  dial("bass", "Bass"),
  dial("mid", "Mid"),
  dial("treble", "Treble"),
  dial("master", "Master", 6),
];

export const DEFAULT_AMP: AmpSettings = { on: true, cab: true, gain: 3, bass: 5, mid: 5, treble: 5, master: 6 };

export function isPedalType(value: unknown): value is PedalType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PEDAL_DEFS, value);
}

export function clampKnob(knob: KnobDef, value: unknown): number {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return knob.default;
  const clamped = Math.min(knob.max, Math.max(knob.min, number));
  return knob.choices ? Math.round(clamped) : clamped;
}

/** Every knob of the pedal present, in range, with defaults filling gaps. Unknown keys are dropped. */
export function clampSettings(type: PedalType, settings: Partial<Record<string, unknown>> = {}): PedalSettings {
  const out: PedalSettings = {};
  for (const knob of PEDAL_DEFS[type].knobs) out[knob.id] = clampKnob(knob, settings[knob.id]);
  return out;
}

export function clampAmp(amp: Partial<Record<keyof AmpSettings, unknown>> = {}): AmpSettings {
  const out = { ...DEFAULT_AMP, on: amp.on !== false, cab: amp.cab !== false };
  for (const knob of AMP_KNOBS) (out as Record<string, unknown>)[knob.id] = clampKnob(knob, amp[knob.id as keyof AmpSettings]);
  return out;
}

export function defaultSettings(type: PedalType): PedalSettings { return clampSettings(type); }

/** The next free id for a new pedal of this type, e.g. "delay-2" when "delay-1" exists. */
export function nextPedalId(chain: readonly Pedal[], type: PedalType): string {
  const used = new Set(chain.map(pedal => pedal.id));
  let n = 1;
  while (used.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

export function createPedal(chain: readonly Pedal[], type: PedalType, settings?: Partial<PedalSettings>): Pedal {
  return { id: nextPedalId(chain, type), type, on: true, settings: clampSettings(type, settings) };
}

/** Move the pedal at `index` one place left (-1) or right (+1). Out-of-range moves return the same order. */
export function movePedal<T>(chain: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  const next = [...chain];
  if (index < 0 || index >= chain.length || target < 0 || target >= chain.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// ---------------------------------------------------------------------------
// Conventional order

/**
 * Where each pedal usually sits: the gate first, then dynamics and filters,
 * then gain, modulation, delay and the reverb last. A common starting point,
 * not a rule: fuzz in front of a wah and after it are both used on records.
 */
export const CONVENTIONAL_RANK: Readonly<Record<PedalType, number>> = {
  gate: 0, compressor: 1, wah: 2, eq: 2, overdrive: 3, distortion: 3, fuzz: 3,
  chorus: 4, phaser: 4, tremolo: 4, delay: 5, reverb: 6,
};

/** Sort into the conventional order. Stable, so pedals of one family keep their order. */
export function conventionalOrder<T extends { type: PedalType }>(chain: readonly T[]): T[] {
  return chain.map((pedal, index) => ({ pedal, index }))
    .sort((a, b) => CONVENTIONAL_RANK[a.pedal.type] - CONVENTIONAL_RANK[b.pedal.type] || a.index - b.index)
    .map(entry => entry.pedal);
}

export function isConventionalOrder(chain: readonly { type: PedalType }[]): boolean {
  return chain.every((pedal, index) => index === 0 || CONVENTIONAL_RANK[chain[index - 1].type] <= CONVENTIONAL_RANK[pedal.type]);
}

/** "Guitar → Compressor → Overdrive → Amp → Cab → Output", with switched-off blocks marked. */
export function chainLabels(chain: readonly Pedal[], amp: Pick<AmpSettings, "on" | "cab">): { label: string; on: boolean }[] {
  return [
    { label: "Guitar", on: true },
    ...chain.map(pedal => ({ label: PEDAL_DEFS[pedal.type].name, on: pedal.on })),
    { label: "Amp", on: amp.on },
    { label: "Cab", on: amp.cab },
    { label: "Output", on: true },
  ];
}
export function chainText(chain: readonly Pedal[], amp: Pick<AmpSettings, "on" | "cab">): string {
  return chainLabels(chain, amp).map(block => block.on ? block.label : `${block.label} (off)`).join(" → ");
}

// ---------------------------------------------------------------------------
// Presets

export type PedalPreset = {
  id: string;
  name: string;
  /** One sentence. */
  description: string;
  style: DemoRiffStyle;
  chain: readonly Pedal[];
  amp: AmpSettings;
};

const p = (id: string, type: PedalType, settings: Partial<PedalSettings>): Pedal => ({ id, type, on: true, settings: clampSettings(type, settings) });

export const PEDAL_PRESETS: readonly PedalPreset[] = [
  {
    id: "glassy-clean", name: "Glassy clean",
    description: "A clean amp with bright treble, a light compressor to even out the picking and a short room reverb.",
    style: "arpeggio",
    chain: [
      p("compressor-1", "compressor", { sustain: 3, attack: 20, level: 5.5 }),
      p("reverb-1", "reverb", { decay: 2.2, predelay: 20, mix: 3 }),
    ],
    amp: { on: true, cab: true, gain: 1.5, bass: 4, mid: 4, treble: 7, master: 6 },
  },
  {
    id: "edge-of-breakup", name: "Edge of breakup",
    description: "Amp gain set so soft playing stays clean and harder picking starts to break up, with a little reverb.",
    style: "chords",
    chain: [p("reverb-1", "reverb", { decay: 1.4, predelay: 12, mix: 2 })],
    amp: { on: true, cab: true, gain: 4.5, bass: 5, mid: 6, treble: 6, master: 6 },
  },
  {
    id: "classic-crunch", name: "Classic crunch",
    description: "A low-drive overdrive with its level up, pushing a mid-forward amp into a chunky crunch.",
    style: "chords",
    chain: [
      p("overdrive-1", "overdrive", { drive: 3, tone: 6, level: 7 }),
      p("reverb-1", "reverb", { decay: 1.2, predelay: 10, mix: 1.5 }),
    ],
    amp: { on: true, cab: true, gain: 5.5, bass: 5, mid: 7, treble: 6, master: 6 },
  },
  {
    id: "high-gain-rhythm", name: "High-gain rhythm",
    description: "A gate to stop the hiss, an overdrive used as a tight boost, and a high-gain amp with the mids pulled back.",
    style: "chords",
    chain: [
      p("gate-1", "gate", { threshold: -50, release: 80 }),
      p("overdrive-1", "overdrive", { drive: 1, tone: 6, level: 8 }),
    ],
    amp: { on: true, cab: true, gain: 8.5, bass: 6, mid: 3.5, treble: 6.5, master: 5 },
  },
  {
    id: "singing-lead", name: "Singing lead",
    description: "Compression and distortion for long sustain, a strong mid on the amp, then delay and reverb to give the notes a tail.",
    style: "single-notes",
    chain: [
      p("compressor-1", "compressor", { sustain: 5, attack: 12, level: 5 }),
      p("distortion-1", "distortion", { drive: 6, tone: 5, level: 6 }),
      p("delay-1", "delay", { time: 420, feedback: 35, mix: 3, tone: 5 }),
      p("reverb-1", "reverb", { decay: 2.5, predelay: 25, mix: 2.5 }),
    ],
    amp: { on: true, cab: true, gain: 6, bass: 5, mid: 7, treble: 5.5, master: 5.5 },
  },
  {
    id: "ambient-swell", name: "Ambient swell",
    description: "A slow chorus into long, dark repeats and a big reverb, so every note blurs into the next.",
    style: "arpeggio",
    chain: [
      p("chorus-1", "chorus", { rate: .4, depth: 4, mix: 4 }),
      p("delay-1", "delay", { time: 600, feedback: 60, mix: 4.5, tone: 3.5 }),
      p("reverb-1", "reverb", { decay: 5.5, predelay: 40, mix: 6 }),
    ],
    amp: { on: true, cab: true, gain: 2, bass: 5, mid: 5, treble: 6, master: 5.5 },
  },
  {
    id: "funk-clean", name: "Funk clean",
    description: "A squashed, bright clean with an envelope wah that opens on every stab.",
    style: "chords",
    chain: [
      p("compressor-1", "compressor", { sustain: 4, attack: 4, level: 6 }),
      p("wah-1", "wah", { position: 3, mode: 2, rate: 1.5, range: 6 }),
    ],
    amp: { on: true, cab: true, gain: 1, bass: 4, mid: 5, treble: 7, master: 6 },
  },
  {
    id: "vintage-fuzz", name: "Vintage fuzz",
    description: "A fuzz into a clean, loud amp, with a touch of bias starve so decaying notes break up.",
    style: "single-notes",
    chain: [
      p("fuzz-1", "fuzz", { fuzz: 7, bias: 3, tone: 5, level: 6 }),
      p("reverb-1", "reverb", { decay: 1.5, predelay: 10, mix: 2 }),
    ],
    amp: { on: true, cab: true, gain: 3, bass: 5, mid: 6, treble: 5, master: 6 },
  },
];

export const DEFAULT_PRESET_ID = "glassy-clean";

export function findPreset(id: string | null | undefined): PedalPreset | undefined {
  return id ? PEDAL_PRESETS.find(preset => preset.id === id) : undefined;
}

/** Problems with a preset, as sentences. An empty list means the preset is valid. */
export function presetProblems(preset: { id?: unknown; chain?: readonly { id?: unknown; type?: unknown; settings?: Record<string, unknown> }[]; amp?: Partial<Record<string, unknown>> }): string[] {
  const problems: string[] = [];
  if (typeof preset.id !== "string" || !/^[a-z0-9-]+$/.test(preset.id)) problems.push("The preset id is missing or not lowercase-hyphenated.");
  const seen = new Set<string>();
  for (const pedal of preset.chain ?? []) {
    const id = String(pedal.id);
    if (seen.has(id)) problems.push(`Duplicate pedal id ${id}.`);
    seen.add(id);
    if (!isPedalType(pedal.type)) { problems.push(`Unknown pedal type ${String(pedal.type)}.`); continue; }
    const knobs = PEDAL_DEFS[pedal.type].knobs;
    for (const [key, value] of Object.entries(pedal.settings ?? {})) {
      const knob = knobs.find(k => k.id === key);
      if (!knob) problems.push(`${id} has an unknown knob ${key}.`);
      else if (typeof value !== "number" || !Number.isFinite(value) || value < knob.min || value > knob.max) problems.push(`${id} ${key} is outside ${knob.min} to ${knob.max}.`);
    }
    for (const knob of knobs) if (!(knob.id in (pedal.settings ?? {}))) problems.push(`${id} is missing ${knob.id}.`);
  }
  for (const knob of AMP_KNOBS) {
    const value = preset.amp?.[knob.id];
    if (typeof value !== "number" || !Number.isFinite(value) || value < knob.min || value > knob.max) problems.push(`Amp ${knob.id} is missing or outside ${knob.min} to ${knob.max}.`);
  }
  return problems;
}

/** A fresh, editable copy of a preset's chain and amp. */
export function presetState(preset: PedalPreset): { chain: Pedal[]; amp: AmpSettings } {
  return { chain: preset.chain.map(pedal => ({ ...pedal, settings: { ...pedal.settings } })), amp: { ...preset.amp } };
}

// ---------------------------------------------------------------------------
// Knob to parameter maps. Shared by the graph and the tests.

export function dbToGain(db: number) { return Math.pow(10, db / 20); }

/** A 0–10 level knob: 5 is unity, each end is 12 dB away. */
export function levelGain(value: number) { return dbToGain((value - 5) * 2.4); }

/** A 0–10 dial mapped logarithmically between two frequencies. */
export function dialToHz(value: number, low: number, high: number) {
  const t = Math.min(1, Math.max(0, value / 10));
  return low * Math.pow(high / low, t);
}

/** Equal-power dry and wet gains for a 0–10 mix knob. */
export function mixGains(value: number) {
  const t = Math.min(1, Math.max(0, value / 10)) * Math.PI / 2;
  return { dry: Math.cos(t), wet: Math.sin(t) };
}

/** Delay feedback as a fraction, never at or above 0.95, so repeats always die away. */
export const MAX_FEEDBACK = .9;
export function delayFeedback(percent: number) {
  return Math.min(MAX_FEEDBACK, Math.max(0, (Number.isFinite(percent) ? percent : 0) / 100));
}

/** The compressor's sustain dial: a lower threshold, a higher ratio and a little make-up gain. */
export function compressorParams(sustain: number) {
  const s = Math.min(10, Math.max(0, sustain));
  return { threshold: -10 - s * 4, ratio: 2 + s * 1.4, knee: 10, makeupDb: s * 1.5 };
}

export function wahFrequency(position: number) { return dialToHz(position, 350, 2200); }

/**
 * The amp's tone stack as three shelving and peaking bands, in dB.
 *
 * A passive tone stack's controls interact: turning the bass up changes how
 * the mid and treble behave, and "all on 5" already has a mid dip. This
 * approximation keeps the bands independent and only mimics that dip.
 */
export function toneStackDb(amp: Pick<AmpSettings, "bass" | "mid" | "treble">) {
  return { bass: (amp.bass - 5) * 2.4, mid: -10 + amp.mid * 1.6, treble: (amp.treble - 5) * 2.4 };
}

/** The amp's master: a squared taper, silent at 0. */
export function masterGain(value: number) { const t = Math.min(1, Math.max(0, value / 10)); return t * t * 1.4; }

/** The output slider (0–100): a squared taper, so the low end has fine control. */
export function outputGain(percent: number) { const t = Math.min(1, Math.max(0, percent / 100)); return t * t; }
export const DEFAULT_OUTPUT = 40;

/** The input gain slider in dB. */
export const INPUT_GAIN = { min: -12, max: 24, step: 1, default: 0 } as const;

/** The fixed cabinet voicing. Filters only; not a measured speaker response. */
export const CABINET = {
  highPassHz: 80,
  lowPassHz: 5000,
  resonance: { hz: 110, db: 4, q: 1.4 },
  presenceDip: { hz: 1800, db: -4, q: 1.2 },
} as const;

// ---------------------------------------------------------------------------
// Waveshaper curves. Each maps x in [-1, 1], sampled at n points, to [-1, 1].

function sampleCurve(n: number, f: (x: number) => number): Float32Array<ArrayBuffer> {
  const size = Math.max(3, Math.floor(n) | 1);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) out[i] = f(-1 + 2 * i / (size - 1));
  return out;
}
/** Shift so f(0) is exactly 0 and scale so the largest magnitude is exactly 1. */
function normalise(curve: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
  const middle = curve[(curve.length - 1) / 2];
  let peak = 0;
  for (let i = 0; i < curve.length; i++) { curve[i] -= middle; peak = Math.max(peak, Math.abs(curve[i])); }
  if (peak > 0) for (let i = 0; i < curve.length; i++) curve[i] = Math.max(-1, Math.min(1, curve[i] / peak));
  return curve;
}
const dialFraction = (value: number) => Math.min(1, Math.max(0, (Number.isFinite(value) ? value : 0) / 10));

/**
 * Soft, asymmetric clipping for the overdrive. The negative half clips more
 * gently than the positive, which adds even harmonics. Not odd, on purpose.
 */
export function overdriveCurve(drive: number, n = 2049) {
  const k = 1 + dialFraction(drive) * 24;
  const kn = k * .6;
  return normalise(sampleCurve(n, x => x >= 0 ? Math.tanh(k * x) / Math.tanh(k) : Math.tanh(kn * x) / Math.tanh(kn)));
}

/** Harder, symmetric clipping for the distortion. Odd: f(-x) = -f(x). */
export function distortionCurve(drive: number, n = 2049) {
  const k = 2 + dialFraction(drive) * 60;
  const p = 4;
  return normalise(sampleCurve(n, x => k * x / Math.pow(1 + Math.pow(Math.abs(k * x), p), 1 / p)));
}

/**
 * Near-square clipping for the fuzz. Bias shifts the operating point, which
 * makes the clipping asymmetric, and opens a small dead zone round zero, so
 * quiet, decaying notes sputter and cut out: the "gated" feel.
 */
export function fuzzCurve(fuzz: number, bias = 0, n = 2049) {
  const k = 8 + dialFraction(fuzz) * 120;
  const b = dialFraction(bias);
  const offset = b * .8, dead = b * .03;
  return normalise(sampleCurve(n, x => {
    const u = Math.sign(x) * Math.max(0, Math.abs(x) - dead);
    return Math.tanh(k * u + offset);
  }));
}

/**
 * The amp's gain stage. Gain 0 is nearly linear, around 4–6 it rounds peaks
 * into crunch, and 10 is saturated high gain. Very slightly asymmetric.
 */
export function ampCurve(gain: number, n = 2049) {
  const k = Math.exp(dialFraction(gain) * 10 * .44);
  const a = .15;
  return normalise(sampleCurve(n, x => Math.tanh(k * x + a)));
}

/**
 * The noise gate's transfer from envelope level to gain: 0 below the
 * threshold, 1 from 6 dB above it, a smooth step between. Negative inputs are 0.
 */
export function gateCurve(thresholdDb: number, n = 16385) {
  const size = Math.max(3, Math.floor(n) | 1);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const x = -1 + 2 * i / (size - 1);
    if (x <= 0) { out[i] = 0; continue; }
    const t = Math.min(1, Math.max(0, (20 * Math.log10(x) - thresholdDb) / 6));
    out[i] = t * t * (3 - 2 * t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reverb impulse response

/** A seeded pseudo-random generator (mulberry32) returning values in [-1, 1). */
export function seededNoise(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

/**
 * A stereo reverb impulse: independent noise in each channel under an
 * exponential envelope that falls 60 dB over `seconds`, with a 5 ms fade-in.
 * Deterministic for a given seed. Seconds are clamped to 0.1–10.
 */
export function impulseResponse(sampleRate: number, seconds: number, seed = 1): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error("Unsupported sample rate.");
  const duration = Math.min(10, Math.max(.1, Number.isFinite(seconds) ? seconds : 2));
  const length = Math.max(1, Math.round(sampleRate * duration));
  const fade = Math.max(1, Math.round(sampleRate * .005));
  const decay = Math.log(1000) / duration;
  const channels: [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] = [new Float32Array(length), new Float32Array(length)];
  channels.forEach((channel, c) => {
    const noise = seededNoise(seed * 2 + c + 1);
    for (let i = 0; i < length; i++) {
      const envelope = Math.exp(-decay * i / sampleRate) * Math.min(1, i / fade);
      channel[i] = noise() * envelope;
    }
  });
  return channels;
}

// ---------------------------------------------------------------------------
// Live input

/** The live input's error message, worded like the tuner's. */
export function liveInputError(error: unknown) {
  const name = error instanceof Error || (typeof error === "object" && error !== null && "name" in error) ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError") return "Input access is unavailable. Check this site's microphone permission, or use the demo riff.";
  if (name === "NotFoundError") return "No input was found. Connect a microphone or audio interface and try again, or use the demo riff.";
  if (name === "NotReadableError") return "The input could not be opened. Check whether another app is using it, then try again, or use the demo riff.";
  return "The live input could not start. Check the input, try again, or use the demo riff.";
}

/** Format a knob value for its readout. */
export function formatKnob(knob: KnobDef, value: number): string {
  if (knob.choices) return knob.choices[Math.round(value)] ?? String(value);
  const digits = knob.step < 1 ? (knob.step < .1 ? 2 : 1) : 0;
  const text = value.toFixed(digits);
  if (!knob.unit) return text;
  if (knob.unit === "%") return `${text}%`;
  if (knob.unit === "dB" && value > 0) return `+${text} dB`;
  return `${text} ${knob.unit}`;
}
