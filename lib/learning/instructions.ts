import source from "./data/beginner-guitar-instruction.json" with { type: "json" };
import { decodeStageTwoAsset, type StageTwoAsset } from "./stage-two.ts";
export interface ReferenceString { string: number; name: string; note: string; midi: number; fret: number }
export type InstructionAsset =
  | StageTwoAsset
  | { id: string; kind: "strings"; referenceAHz: number; strings: ReferenceString[] }
  | { id: string; kind: "pitchComparison"; baseMidi: number; examples: { label: string; centsOffset: number }[] }
  | { id: string; kind: "chord"; name: string; frets: (number | null)[]; fingers: (number | null)[]; soundingMidi: number[] }
  | { id: string; kind: "rhythm"; bpm: number; meter: { numerator: number; denominator: number }; countInBeats: number; eventBeats: number[] }
  | { id: string; kind: "diagram"; description: string; textAlternative?: string };
export interface InstructionQuizItem {
  id: string; kind: string; prompt: string; options: string[]; correctOptionIndex: number;
  explanation: string; demoAssetId?: string; hideAssetName?: boolean;
}
export interface InstructionQuiz { scoring: string; passingCorrectCount: number; items: InstructionQuizItem[] }
export interface ReadingQuizAnswer { optionIndex: number; answeredAt: string }
export interface ReadingQuizAttempt {
  id: string; lessonId: string; createdAt: string; answers: Record<string, ReadingQuizAnswer>;
}
export interface ReadingQuizResult { correctCount: number; total: number; passed: boolean; missedKinds: string[] }

/** Decode answer evidence without accepting precomputed client scores. */
export function parseReadingQuizAttempt(value: unknown, lessonId: string, quiz: InstructionQuiz): ReadingQuizAttempt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const attempt = value as Record<string, unknown>;
  if (attempt.lessonId !== lessonId || typeof attempt.id !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(attempt.id) || typeof attempt.createdAt !== "string" || !Number.isFinite(Date.parse(attempt.createdAt)) || !attempt.answers || typeof attempt.answers !== "object" || Array.isArray(attempt.answers)) return null;
  const answers: ReadingQuizAttempt["answers"] = {};
  for (const question of quiz.items) {
    const answer = (attempt.answers as Record<string, unknown>)[question.id];
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) continue;
    const item = answer as Record<string, unknown>;
    if (typeof item.optionIndex !== "number" || !Number.isInteger(item.optionIndex) || item.optionIndex < 0 || item.optionIndex >= question.options.length || typeof item.answeredAt !== "string" || !Number.isFinite(Date.parse(item.answeredAt))) continue;
    answers[question.id] = { optionIndex: item.optionIndex, answeredAt: new Date(item.answeredAt).toISOString() };
  }
  return { id: attempt.id, lessonId, createdAt: new Date(attempt.createdAt).toISOString(), answers };
}

/** A question's first submitted answer is immutable within one attempt. */
export function answerReadingQuestion(quiz: InstructionQuiz, attempt: ReadingQuizAttempt, questionId: string, optionIndex: number, answeredAt: string): ReadingQuizAttempt {
  const question = quiz.items.find(item => item.id === questionId);
  if (!question || Object.hasOwn(attempt.answers, questionId) || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length || !Number.isFinite(Date.parse(answeredAt))) return attempt;
  return { ...attempt, answers: { ...attempt.answers, [questionId]: { optionIndex, answeredAt: new Date(answeredAt).toISOString() } } };
}
/** Derived from authored answers, never from persisted scores or elapsed time. */
export function readingQuizResult(quiz: InstructionQuiz, attempt: ReadingQuizAttempt): ReadingQuizResult | null {
  if (quiz.items.length === 0 || quiz.items.some(item => {
    const answer = attempt.answers[item.id];
    return !answer || !Number.isInteger(answer.optionIndex) || answer.optionIndex < 0 || answer.optionIndex >= item.options.length;
  })) return null;
  const missed = quiz.items.filter(item => attempt.answers[item.id].optionIndex !== item.correctOptionIndex);
  const correctCount = quiz.items.length - missed.length;
  return { correctCount, total: quiz.items.length, passed: correctCount >= quiz.passingCorrectCount, missedKinds: [...new Set(missed.map(item => item.kind))] };
}

export interface LessonInstructions {
  setup: string[];
  steps: { title: string; body: string; lookCheck: string; listenCheck: string }[];
  commonFixes: string[];
  criteria: string[];
  practiceSegments: { seconds: number; instruction: string }[];
  completion: string;
  ifNotReady: string;
  evidence: string;
  limitation: string;
  assets: InstructionAsset[];
  quiz?: InstructionQuiz;
}
const sourceAssets: Record<string, unknown> = source.demoAssets;
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
  const stageTwo = decodeStageTwoAsset(id, asset);
  if (stageTwo) return stageTwo;
  throw new Error(`Unsupported instruction asset: ${id}`);
}
function validatedQuiz(quiz: InstructionQuiz): InstructionQuiz {
  if (!Number.isInteger(quiz.passingCorrectCount) || quiz.passingCorrectCount < 1 || quiz.passingCorrectCount > quiz.items.length || new Set(quiz.items.map(item => item.id)).size !== quiz.items.length) throw new Error("Invalid reading quiz");
  for (const item of quiz.items) {
    if (!item.id || !item.prompt || !item.explanation || item.options.length < 2 || !Number.isInteger(item.correctOptionIndex) || item.correctOptionIndex < 0 || item.correctOptionIndex >= item.options.length) throw new Error(`Invalid reading question: ${item.id}`);
    if (item.demoAssetId) getInstructionAsset(item.demoAssetId);
  }
  return quiz;
}
/** Source JSON stays intact; the runtime receives the authored assets and quiz. */
export function getLessonInstructions(lessonId: string): LessonInstructions | undefined {
  const lesson = source.lessons.find(item => item.id === lessonId);
  if (!lesson) return undefined;
  return {
    setup: [lesson.objective],
    steps: lesson.steps.map(step => ({ title: step.title, body: step.action, lookCheck: step.lookCheck, listenCheck: step.listenCheck })),
    commonFixes: lesson.mistakeRecovery.map(item => `${item.observation} ${item.recovery}`),
    criteria: lesson.selfAssessment.criteria,
    practiceSegments: lesson.practiceSegments,
    completion: lesson.selfAssessment.readyWhen,
    ifNotReady: lesson.selfAssessment.ifNotReady,
    evidence: lesson.selfAssessment.proves,
    limitation: lesson.selfAssessment.doesNotProve,
    assets: lesson.demoAssetIds.map(getInstructionAsset),
    quiz: "quiz" in lesson ? validatedQuiz(lesson.quiz as InstructionQuiz) : undefined,
  };
}
