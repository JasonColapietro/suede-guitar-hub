export interface InstructionQuizItem {
  id: string;
  kind: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  demoAssetId?: string;
  hideAssetName?: boolean;
}

export interface InstructionQuiz {
  scoring: string;
  passingCorrectCount: number;
  items: InstructionQuizItem[];
}

export interface ReadingQuizAnswer {
  optionIndex: number;
  answeredAt: string;
}

export interface ReadingQuizAttempt {
  id: string;
  lessonId: string;
  createdAt: string;
  answers: Record<string, ReadingQuizAnswer>;
}

export interface ReadingQuizResult {
  correctCount: number;
  total: number;
  passed: boolean;
  missedKinds: string[];
}

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

export function validateInstructionQuiz(quiz: InstructionQuiz, validateAsset?: (id: string) => unknown): InstructionQuiz {
  if (!Number.isInteger(quiz.passingCorrectCount) || quiz.passingCorrectCount < 1 || quiz.passingCorrectCount > quiz.items.length || new Set(quiz.items.map(item => item.id)).size !== quiz.items.length) throw new Error("Invalid reading quiz");
  for (const item of quiz.items) {
    if (!item.id || !item.prompt || !item.explanation || item.options.length < 2 || !Number.isInteger(item.correctOptionIndex) || item.correctOptionIndex < 0 || item.correctOptionIndex >= item.options.length) throw new Error(`Invalid reading question: ${item.id}`);
    if (item.demoAssetId) validateAsset?.(item.demoAssetId);
  }
  return quiz;
}
