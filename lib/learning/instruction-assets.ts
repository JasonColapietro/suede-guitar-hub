import source from "./data/instruction-assets.json" with { type: "json" };
import { decodeStageTwoAsset, type StageTwoAsset } from "./stage-two.ts";

export interface ReferenceString { string: number; name: string; note: string; midi: number; fret: number }
export type InstructionAsset =
  | StageTwoAsset
  | { id: string; kind: "strings"; referenceAHz: number; strings: ReferenceString[] }
  | { id: string; kind: "pitchComparison"; baseMidi: number; examples: { label: string; centsOffset: number }[] }
  | { id: string; kind: "chord"; name: string; frets: (number | null)[]; fingers: (number | null)[]; soundingMidi: number[] }
  | { id: string; kind: "rhythm"; bpm: number; meter: { numerator: number; denominator: number }; countInBeats: number; eventBeats: number[] }
  | { id: string; kind: "riff"; title: string; provenance: string; stringNumber: number; frets: number[]; midi: number[]; tabText: string; instruction: string }
  | { id: string; kind: "diagram"; description: string; textAlternative?: string };

const sourceAssets = source.demoAssets as Record<string, unknown>;

function numericList(value: unknown): value is number[] { return Array.isArray(value) && value.every(item => typeof item === "number" && Number.isFinite(item)); }
function stringPositions(value: unknown): value is (number | null)[] { return Array.isArray(value) && value.length === 6 && value.every(item => item === null || (Number.isInteger(item) && item >= 0 && item <= 24)); }

export function getInstructionAsset(id: string): InstructionAsset {
  const asset = sourceAssets[id] as Record<string, unknown> | undefined;
  if (!asset) throw new Error(`Missing instruction asset: ${id}`);
  if (asset.kind === "string_diagram_and_reference_tones" && Array.isArray(asset.strings) && typeof asset.referenceAHz === "number") {
    const strings = asset.strings as ReferenceString[];
    if (strings.length !== 6 || new Set(strings.map(item => item.string)).size !== 6 || strings.some(item => !Number.isInteger(item.string) || item.string < 1 || item.string > 6 || !Number.isInteger(item.midi) || typeof item.name !== "string" || typeof item.note !== "string" || item.fret !== 0)) throw new Error(`Invalid strings in ${id}`);
    return { id, kind: "strings", referenceAHz: asset.referenceAHz, strings };
  }
  if (asset.kind === "reference_tones" && typeof asset.baseMidi === "number" && Array.isArray(asset.examples)) {
    const examples = asset.examples as { label: string; centsOffset: number }[];
    if (examples.some(item => typeof item.label !== "string" || !Number.isFinite(item.centsOffset))) throw new Error(`Invalid comparison in ${id}`);
    return { id, kind: "pitchComparison", baseMidi: asset.baseMidi, examples };
  }
  if (asset.kind === "chord_diagram_and_reference_tones" && typeof asset.name === "string" && stringPositions(asset.fretsString6To1) && stringPositions(asset.fingersString6To1) && numericList(asset.soundingMidiLowToHigh)) {
    return { id, kind: "chord", name: asset.name, frets: asset.fretsString6To1, fingers: asset.fingersString6To1, soundingMidi: asset.soundingMidiLowToHigh };
  }
  if (asset.kind === "rhythm_demo" && typeof asset.bpm === "number" && typeof asset.countInBeats === "number" && numericList(asset.eventBeats)) {
    const meter = asset.meter as { numerator: number; denominator: number };
    if (!meter || !Number.isInteger(meter.numerator) || !Number.isInteger(meter.denominator)) throw new Error(`Invalid meter in ${id}`);
    return { id, kind: "rhythm", bpm: asset.bpm, meter, countInBeats: asset.countInBeats, eventBeats: asset.eventBeats };
  }
  if (asset.kind === "diagram" && typeof asset.description === "string") return { id, kind: "diagram", description: asset.description, textAlternative: typeof asset.textAlternative === "string" ? asset.textAlternative : undefined };
  if (asset.kind === "single_string_riff" && typeof asset.title === "string" && typeof asset.provenance === "string" && typeof asset.stringNumber === "number" && numericList(asset.frets) && numericList(asset.midi) && asset.frets.length === asset.midi.length && asset.frets.length > 0 && typeof asset.tabText === "string" && typeof asset.instruction === "string") {
    return { id, kind: "riff", title: asset.title, provenance: asset.provenance, stringNumber: asset.stringNumber, frets: asset.frets, midi: asset.midi, tabText: asset.tabText, instruction: asset.instruction };
  }
  const stageTwo = decodeStageTwoAsset(id, asset);
  if (stageTwo) return stageTwo;
  throw new Error(`Unsupported instruction asset: ${id}`);
}
