/**
 * The Pedal Lab's vocabulary: what each pedal is, its knobs, the order most
 * boards settle on, and the recipes the Tone course links into. Pure data and
 * pure functions, so the ordering advice is testable without Web Audio.
 */

export type PedalKind = "comp" | "fuzz" | "drive" | "chorus" | "delay" | "reverb";

export type Knob = { id: string; label: string; min: number; max: number; step: number; unit?: string };

export type PedalSpec = {
  kind: PedalKind;
  name: string;
  family: "Dynamics" | "Gain" | "Modulation" | "Time";
  /** Plain-language job description shown on the pedal. */
  job: string;
  color: string;
  knobs: readonly Knob[];
  defaults: Readonly<Record<string, number>>;
};

const pct = (id: string, label: string): Knob => ({ id, label, min: 0, max: 100, step: 1, unit: "%" });

export const PEDALS: Readonly<Record<PedalKind, PedalSpec>> = {
  comp: { kind: "comp", name: "Compressor", family: "Dynamics", color: "#2f6f8f",
    job: "Evens out loud and quiet notes and adds sustain.",
    knobs: [pct("sustain", "Sustain"), pct("level", "Level")], defaults: { sustain: 55, level: 60 } },
  fuzz: { kind: "fuzz", name: "Fuzz", family: "Gain", color: "#b4462b",
    job: "Squares the waveform off. Thick, woolly, and loud.",
    knobs: [pct("fuzz", "Fuzz"), pct("tone", "Tone"), pct("level", "Level")], defaults: { fuzz: 70, tone: 45, level: 45 } },
  drive: { kind: "drive", name: "Overdrive", family: "Gain", color: "#3f8f4a",
    job: "Pushes the signal into soft clipping, like a cranked amp.",
    knobs: [pct("drive", "Drive"), pct("tone", "Tone"), pct("level", "Level")], defaults: { drive: 45, tone: 55, level: 55 } },
  chorus: { kind: "chorus", name: "Chorus", family: "Modulation", color: "#4a64c4",
    job: "A wobbling copy of your signal, so one guitar sounds like two.",
    knobs: [pct("rate", "Rate"), pct("depth", "Depth"), pct("mix", "Mix")], defaults: { rate: 30, depth: 45, mix: 50 } },
  delay: { kind: "delay", name: "Delay", family: "Time", color: "#7a3fb4",
    job: "Repeats what you played, a moment later.",
    knobs: [{ id: "time", label: "Time", min: 60, max: 900, step: 10, unit: "ms" }, pct("feedback", "Repeats"), pct("mix", "Mix")],
    defaults: { time: 380, feedback: 35, mix: 30 } },
  reverb: { kind: "reverb", name: "Reverb", family: "Time", color: "#a0578a",
    job: "Puts the guitar in a room, a hall, or a cave.",
    knobs: [pct("decay", "Decay"), pct("mix", "Mix")], defaults: { decay: 45, mix: 30 } },
};

export type AmpSettings = { gain: number; bass: number; mid: number; treble: number; volume: number; cab: boolean };
export const AMP_KNOBS: readonly Knob[] = [
  { id: "gain", label: "Gain", min: 0, max: 10, step: .5 },
  { id: "bass", label: "Bass", min: 0, max: 10, step: .5 },
  { id: "mid", label: "Mid", min: 0, max: 10, step: .5 },
  { id: "treble", label: "Treble", min: 0, max: 10, step: .5 },
  { id: "volume", label: "Volume", min: 0, max: 10, step: .5 },
];
export const DEFAULT_AMP: AmpSettings = { gain: 3, bass: 5, mid: 5, treble: 5, volume: 6, cab: true };

export type PedalSlot = { kind: PedalKind; on: boolean; values: Record<string, number> };

/** The order most players settle on, and the reason for each position. */
export const CONVENTIONAL_ORDER: readonly PedalKind[] = ["comp", "fuzz", "drive", "chorus", "delay", "reverb"];

export function defaultBoard(): PedalSlot[] {
  return CONVENTIONAL_ORDER.map(kind => ({ kind, on: false, values: { ...PEDALS[kind].defaults } }));
}

const RANK: Readonly<Record<PedalKind, number>> = { comp: 0, fuzz: 1, drive: 2, chorus: 3, delay: 4, reverb: 5 };

/**
 * Notes on the current order. Only pedals that are switched on count, because
 * a bypassed pedal changes nothing you can hear. Unusual orders are described,
 * not forbidden: several are famous sounds.
 */
export function orderNotes(board: readonly PedalSlot[]): string[] {
  const on = board.filter(slot => slot.on).map(slot => slot.kind);
  const at = (kind: PedalKind) => on.indexOf(kind);
  const before = (a: PedalKind, b: PedalKind) => at(a) >= 0 && at(b) >= 0 && at(a) < at(b);
  const notes: string[] = [];
  if (before("reverb", "drive") || before("reverb", "fuzz"))
    notes.push("Reverb is feeding a gain pedal, so the room gets distorted along with the note. Expect a wash that gets muddy fast. Shoegaze players do this on purpose.");
  if (before("delay", "drive") || before("delay", "fuzz"))
    notes.push("The repeats are being distorted, so they pile up and fight the next note. Move delay after gain for repeats that sit clearly behind you.");
  if (before("drive", "comp") || before("fuzz", "comp"))
    notes.push("The compressor is after the gain. Distortion is already compressed, so this mostly raises the noise floor. Put compression first to shape your pick attack.");
  if (before("drive", "fuzz"))
    notes.push("Fuzz is after overdrive. Many vintage fuzz circuits want to see the guitar pickup directly and sound thin behind another pedal. Try fuzz first.");
  if (before("reverb", "delay"))
    notes.push("Reverb before delay means every repeat carries its own tail. It is a valid ambient sound, but conventional boards put delay first so the repeats land in the room.");
  if (before("chorus", "drive") || before("chorus", "fuzz"))
    notes.push("Modulation before gain gets its swirl squashed by the clipping. After gain it stays wide and obvious.");
  if (notes.length === 0 && on.length > 1) {
    const sorted = [...on].sort((a, b) => RANK[a] - RANK[b]);
    if (sorted.every((kind, i) => kind === on[i])) notes.push("This is the conventional order: dynamics, then gain, then modulation, then time. Every pedal hands the next one a signal it expects.");
  }
  return notes;
}

export type ToneRecipe = {
  id: string;
  name: string;
  vibe: string;
  riff: string;
  amp: AmpSettings;
  pedals: readonly { kind: PedalKind; values?: Record<string, number> }[];
};

export const RECIPES: readonly ToneRecipe[] = [
  { id: "glass-clean", name: "Glassy clean", vibe: "Bright, open, a little shimmer. Arpeggios and chord melodies.", riff: "arpeggio",
    amp: { gain: 2, bass: 4, mid: 5, treble: 7, volume: 6, cab: true },
    pedals: [{ kind: "comp", values: { sustain: 40, level: 60 } }, { kind: "chorus", values: { rate: 25, depth: 35, mix: 35 } }, { kind: "reverb", values: { decay: 50, mix: 30 } }] },
  { id: "edge-of-breakup", name: "Edge of breakup", vibe: "Clean when you play soft, gritty when you dig in. Blues and roots.", riff: "lead",
    amp: { gain: 4.5, bass: 5, mid: 6, treble: 6, volume: 6, cab: true },
    pedals: [{ kind: "drive", values: { drive: 25, tone: 55, level: 65 } }, { kind: "reverb", values: { decay: 35, mix: 22 } }] },
  { id: "classic-crunch", name: "Classic rock crunch", vibe: "Mid-forward chords that cut through a band.", riff: "power",
    amp: { gain: 6, bass: 5, mid: 7, treble: 6, volume: 6, cab: true },
    pedals: [{ kind: "drive", values: { drive: 45, tone: 50, level: 60 } }] },
  { id: "modern-high-gain", name: "Tight high gain", vibe: "Saturated but tight. Bass trimmed before the gain so the chug stays articulate.", riff: "power",
    amp: { gain: 8, bass: 4, mid: 5, treble: 6, volume: 5.5, cab: true },
    pedals: [{ kind: "drive", values: { drive: 10, tone: 60, level: 80 } }] },
  { id: "fuzz-90s", name: "Wall of fuzz", vibe: "Thick, compressed, sustaining. Big simple chords.", riff: "power",
    amp: { gain: 3, bass: 6, mid: 4, treble: 5, volume: 6, cab: true },
    pedals: [{ kind: "fuzz", values: { fuzz: 80, tone: 45, level: 45 } }, { kind: "reverb", values: { decay: 30, mix: 18 } }] },
  { id: "ambient-lead", name: "Ambient lead", vibe: "Singing notes that trail into space.", riff: "lead",
    amp: { gain: 4, bass: 4, mid: 6, treble: 5, volume: 6, cab: true },
    pedals: [{ kind: "comp", values: { sustain: 60, level: 55 } }, { kind: "drive", values: { drive: 35, tone: 45, level: 55 } }, { kind: "delay", values: { time: 480, feedback: 50, mix: 38 } }, { kind: "reverb", values: { decay: 85, mix: 45 } }] },
];

export function recipeBoard(recipe: ToneRecipe): PedalSlot[] {
  const board = defaultBoard();
  for (const pedal of recipe.pedals) {
    const slot = board.find(item => item.kind === pedal.kind);
    if (slot) { slot.on = true; slot.values = { ...slot.values, ...pedal.values }; }
  }
  return board;
}
