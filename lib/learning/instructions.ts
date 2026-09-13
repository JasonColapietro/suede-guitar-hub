import source from "./data/beginner-guitar-instruction.json" with { type: "json" };
import songSource from "./data/song-guitar-instruction.json" with { type: "json" };
import advancedSource from "./data/advanced-guitar-instruction.json" with { type: "json" };
import voiceSource from "./data/voice-instruction.json" with { type: "json" };
import { getInstructionAsset, type InstructionAsset } from "./instruction-assets.ts";
import { lessonPrerequisites } from "./instruction-index.ts";
import { validateInstructionQuiz, type InstructionQuiz } from "./reading-quiz.ts";
export { answerReadingQuestion, parseReadingQuizAttempt, readingQuizResult } from "./reading-quiz.ts";
export type { InstructionQuiz, InstructionQuizItem, ReadingQuizAnswer, ReadingQuizAttempt, ReadingQuizResult } from "./reading-quiz.ts";
export { getInstructionAsset, lessonPrerequisites };
export type { InstructionAsset } from "./instruction-assets.ts";
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
const sourceLessons = [...source.lessons, ...songSource.lessons, ...advancedSource.lessons, ...voiceSource.lessons];
/** Source JSON stays intact; the runtime receives the authored assets and quiz. */
export function getLessonInstructions(lessonId: string): LessonInstructions | undefined {
  const lesson = sourceLessons.find(item => item.id === lessonId);
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
    quiz: "quiz" in lesson && lesson.quiz ? validateInstructionQuiz(lesson.quiz as InstructionQuiz, getInstructionAsset) : undefined,
  };
}
