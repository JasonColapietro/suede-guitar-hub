// Playback helpers consume the authorized material passed by the server.
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
