import type { Drill } from "./drills.ts";

/**
 * Tempo presets for an Advanced Lab drill, measured against the drill's goal.
 *
 * 100% always means the goal tempo: the tempo the drill clears at, the tempo
 * the tab player opens on and the tempo the practice coach's slider calls
 * 100%. Each rung below the goal sits one ~10% step under the next, the same
 * proportional step the tempo ladder tool (/tempo) caps a climb at, and one
 * stretch rung sits ~10% over the goal so the goal itself feels settled.
 */
export type TempoPresetId = "learn" | "build" | "push" | "goal" | "stretch";

export type TempoPreset = {
  id: TempoPresetId;
  /** Short purpose label shown on the speed control. */
  label: string;
  bpm: number;
  /** Share of the goal tempo, rounded to a whole percent. */
  percent: number;
};

/** The step between neighboring rungs, as a ratio of the slower rung. */
export const PRESET_STEP_RATIO = 1.1;

const RUNGS: readonly { id: TempoPresetId; label: string; stepsFromGoal: number }[] = [
  { id: "learn", label: "Learn", stepsFromGoal: -3 },
  { id: "build", label: "Build", stepsFromGoal: -2 },
  { id: "push", label: "Push", stepsFromGoal: -1 },
  { id: "goal", label: "Goal", stepsFromGoal: 0 },
  { id: "stretch", label: "Stretch", stepsFromGoal: 1 },
];

/** The tempo a drill clears at. */
export function drillGoalBpm(drill: Pick<Drill, "spec">): number {
  return drill.spec.completionMinimumBPM ?? drill.spec.bpm;
}

/** Five purpose-labelled rungs from Learn to Stretch, slowest first. */
export function drillTempoPresets(drill: Pick<Drill, "spec">): TempoPreset[] {
  const goal = drillGoalBpm(drill);
  return RUNGS.map(({ id, label, stepsFromGoal }) => {
    const bpm = Math.round(goal * PRESET_STEP_RATIO ** stepsFromGoal);
    return { id, label, bpm, percent: Math.round((bpm / goal) * 100) };
  });
}

/** One preset, for copy that names a rung. */
export function drillTempoPreset(drill: Pick<Drill, "spec">, id: TempoPresetId): TempoPreset {
  return drillTempoPresets(drill).find((preset) => preset.id === id)!;
}
