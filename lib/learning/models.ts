export type TrackId = "guitar" | "voice";
export type LessonType = "concept" | "exercise" | "song" | "checkpoint";
export interface PracticeSpec {
  mode: "pitchSequence" | "rhythm";
  bpm: number;
  countInBeats: number;
  toleranceCents: number;
  passScore: number;
  targets: { id: string; beat: number; midi?: number; guitarString?: number; fret?: number }[];
}
export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  minutes: number;
  summary: string;
  practiceSpec?: PracticeSpec;
}
export interface LearningModule {
  id: string;
  name: string;
  promise: string;
  skill: string;
  proofMetric: string;
  lessonsTotal: number;
  sampleLessonsShown: number;
  lessons: Lesson[];
}
export interface LearningLevel {
  id: string;
  name: string;
  subtitle: string;
  access: "free" | "paid";
  moduleCount: number;
  lessonCount: number;
  stage: number;
  modules: LearningModule[];
}
export interface Curriculum { track: TrackId; version: number; levels: LearningLevel[] }

function record(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${context}`);
  return value as Record<string, unknown>;
}
function string(value: unknown, context: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${context}`);
}
function number(value: unknown, min: number, max: number, context: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${context}`);
}
function array(value: unknown, context: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`Invalid ${context}`);
}
export function validatePracticeSpec(value: unknown): asserts value is PracticeSpec {
  const spec = record(value, "practice specification");
  if (spec.mode !== "pitchSequence" && spec.mode !== "rhythm") throw new Error("Unknown practice mode");
  number(spec.bpm, 20, 300, "BPM");
  number(spec.countInBeats, 0, 16, "count-in");
  if (!Number.isInteger(spec.countInBeats)) throw new Error("Count-in must use whole beats");
  number(spec.toleranceCents, 1, 100, "pitch tolerance");
  number(spec.passScore, 0, 100, "pass score");
  array(spec.targets, "practice targets");
  const ids = new Set<string>();
  let previousBeat = -1;
  for (const entry of spec.targets) {
    const target = record(entry, "target");
    string(target.id, "target id");
    if (ids.has(target.id)) throw new Error("Duplicate target id");
    ids.add(target.id);
    number(target.beat, 0, 10_000, "target beat");
    if (target.beat < previousBeat) throw new Error("Targets must be chronological");
    previousBeat = target.beat;
    if (target.guitarString !== undefined) { number(target.guitarString, 1, 6, "guitar string"); if (!Number.isInteger(target.guitarString)) throw new Error("Invalid guitar string"); }
    if (target.fret !== undefined) { number(target.fret, 0, 24, "fret"); if (!Number.isInteger(target.fret)) throw new Error("Invalid fret"); }
    if (spec.mode === "pitchSequence" || target.midi !== undefined) {
      number(target.midi, 21, 108, "MIDI note");
      if (!Number.isInteger(target.midi)) throw new Error("MIDI notes must be whole numbers");
    }
  }
}

/** Validate authored content at build time; IDs are shared with the iOS app. */
export function validateCurriculum(value: unknown, track: TrackId): Curriculum {
  const root = record(value, "curriculum");
  if (root.track !== track) throw new Error("Curriculum track mismatch");
  number(root.version, 1, 1000, "curriculum version");
  array(root.levels, "levels");
  const ids = new Set<string>();
  const unique = (value: unknown) => {
    string(value, "id");
    if (!/^[gv]-l\d+(?:-m\d+(?:-\d+)?)?$/.test(value) || !value.startsWith(track[0]) || ids.has(value)) throw new Error(`Invalid or duplicate ID: ${value}`);
    ids.add(value);
  };
  for (const item of root.levels) {
    const level = record(item, "level");
    unique(level.id);
    string(level.name, "level name");
    string(level.subtitle, "level subtitle");
    if (level.access !== "free" && level.access !== "paid") throw new Error("Invalid access");
    number(level.stage, 1, 100, "stage");
    number(level.moduleCount, 1, 100, "module count");
    number(level.lessonCount, 1, 1000, "lesson count");
    array(level.modules, "modules");
    for (const entry of level.modules) {
      const learningModule = record(entry, "module");
      unique(learningModule.id);
      for (const key of ["name", "promise", "skill", "proofMetric"]) string(learningModule[key], key);
      number(learningModule.lessonsTotal, 1, 1000, "lesson total");
      number(learningModule.sampleLessonsShown, 1, 1000, "sample lessons");
      array(learningModule.lessons, "lessons");
      for (const lessonEntry of learningModule.lessons) {
        const lesson = record(lessonEntry, "lesson");
        unique(lesson.id);
        string(lesson.title, "lesson title");
        string(lesson.summary, "lesson summary");
        if (!["concept", "exercise", "song", "checkpoint"].includes(String(lesson.type))) throw new Error("Invalid lesson type");
        number(lesson.minutes, 1, 120, "lesson duration");
        if (lesson.practiceSpec !== undefined) validatePracticeSpec(lesson.practiceSpec);
      }
    }
  }
  return value as Curriculum;
}
