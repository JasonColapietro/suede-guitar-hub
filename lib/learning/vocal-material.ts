import source from "./data/voice-learning-material.json" with { type: "json" };

export type VocalNote = {
  midi: number;
  startBeat: number;
  durBeats: number;
  lyric: string;
  glideEndMidi?: number;
};

export type VocalStudy = {
  id: string;
  title: string;
  kind: "warmup" | "song";
  bpm: number;
  beatsPerBar: number;
  countInBeats: number;
  notes: VocalNote[];
  description: string;
  tip: string;
  provenance: string;
  form: "phrase" | "full";
};

export type VocalReading = { id: string; title: string; body: string };
export type VocalModuleMaterial = {
  moduleId: string;
  studies: VocalStudy[];
  readings: VocalReading[];
};
export type VocalLibraryMaterial = { studies: VocalStudy[]; readings: VocalReading[] };

type VocalMaterial = {
  schemaVersion: number;
  studies: VocalStudy[];
  readings: VocalReading[];
  modules: { id: string; studyIDs: string[]; readingIDs: string[] }[];
};

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateVocalMaterial(value: unknown): asserts value is VocalMaterial {
  if (!value || typeof value !== "object") throw new Error("Voice practice material is missing.");
  const data = value as Partial<VocalMaterial>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.studies) || !Array.isArray(data.readings) || !Array.isArray(data.modules)) throw new Error("Voice practice material has an unsupported format.");
  const studyIds = new Set<string>();
  for (const study of data.studies) {
    if (!nonempty(study?.id) || studyIds.has(study.id) || !nonempty(study.title) || !["warmup", "song"].includes(study.kind) || !["phrase", "full"].includes(study.form) || !Number.isFinite(study.bpm) || study.bpm <= 0 || !Number.isInteger(study.beatsPerBar) || study.beatsPerBar <= 0 || !Number.isInteger(study.countInBeats) || study.countInBeats < 0 || !Array.isArray(study.notes) || study.notes.length === 0) throw new Error(`Invalid vocal study: ${study?.id ?? "unknown"}.`);
    studyIds.add(study.id);
    let previousStart = -1;
    for (const note of study.notes) {
      if (!Number.isInteger(note.midi) || note.midi < 0 || note.midi > 127 || !Number.isFinite(note.startBeat) || note.startBeat < previousStart || !Number.isFinite(note.durBeats) || note.durBeats <= 0 || typeof note.lyric !== "string" || (note.glideEndMidi !== undefined && (!Number.isInteger(note.glideEndMidi) || note.glideEndMidi < 0 || note.glideEndMidi > 127))) throw new Error(`Invalid note in vocal study ${study.id}.`);
      previousStart = note.startBeat;
    }
  }
  const readingIds = new Set<string>();
  for (const reading of data.readings) {
    if (!nonempty(reading?.id) || readingIds.has(reading.id) || !nonempty(reading.title) || !nonempty(reading.body)) throw new Error(`Invalid vocal reading: ${reading?.id ?? "unknown"}.`);
    readingIds.add(reading.id);
  }
  const moduleIds = new Set<string>();
  for (const moduleMaterial of data.modules) {
    if (!nonempty(moduleMaterial?.id) || moduleIds.has(moduleMaterial.id) || !Array.isArray(moduleMaterial.studyIDs) || !Array.isArray(moduleMaterial.readingIDs) || moduleMaterial.studyIDs.some(id => !studyIds.has(id)) || moduleMaterial.readingIDs.some(id => !readingIds.has(id))) throw new Error(`Invalid vocal module material: ${moduleMaterial?.id ?? "unknown"}.`);
    moduleIds.add(moduleMaterial.id);
  }
}

let material: VocalMaterial | null = null;
function library(): VocalMaterial {
  if (!material) {
    validateVocalMaterial(source);
    material = source as VocalMaterial;
  }
  return material;
}

export function vocalMaterialForModule(moduleId: string): VocalModuleMaterial | undefined {
  const data = library();
  const moduleMaterial = data.modules.find(candidate => candidate.id === moduleId);
  if (!moduleMaterial) return undefined;
  const studies = moduleMaterial.studyIDs.map(id => data.studies.find(study => study.id === id)).filter((study): study is VocalStudy => !!study);
  const readings = moduleMaterial.readingIDs.map(id => data.readings.find(reading => reading.id === id)).filter((reading): reading is VocalReading => !!reading);
  return { moduleId, studies, readings };
}

export function vocalMaterialLibrary(): VocalLibraryMaterial {
  const data = library();
  return { studies: data.studies, readings: data.readings };
}

export function midiNoteName(midi: number) {
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

export function vocalStudyTimeline(study: VocalStudy, transpose: number, speed: number) {
  const safeTranspose = Math.min(12, Math.max(-24, Math.round(transpose)));
  const safeSpeed = [0.5, 0.75, 1].includes(speed) ? speed : 1;
  const beatSeconds = 60 / (study.bpm * safeSpeed);
  return study.notes.map((note, index) => ({
    index,
    midi: note.midi + safeTranspose,
    glideEndMidi: (note.glideEndMidi ?? note.midi) + safeTranspose,
    lyric: note.lyric,
    startSeconds: (study.countInBeats + note.startBeat) * beatSeconds,
    durationSeconds: note.durBeats * beatSeconds,
    restBeforeBeats: index === 0 ? note.startBeat : Math.max(0, note.startBeat - (study.notes[index - 1].startBeat + study.notes[index - 1].durBeats)),
  }));
}
