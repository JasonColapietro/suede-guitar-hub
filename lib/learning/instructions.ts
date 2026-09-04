import source from "./data/beginner-guitar-instruction.json" with { type: "json" };
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
}
/** Keep the source document intact for subsequent diagram, reference-tone and quiz integration. */
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
  };
}
