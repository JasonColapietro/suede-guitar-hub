/**
 * Derives the browser's slim learning catalog from the full curriculum.
 *
 * Server only: this imports every curriculum JSON file. It runs from
 * `npm run learning:catalog` (which writes lib/learning/data/catalog.json and
 * lesson-search-guitar.json) and from tests/learning-catalog.test.ts, which
 * fails when the committed files no longer match the curriculum they come from.
 * The browser imports lib/learning/catalog.ts instead.
 */
import assets from "./data/instruction-assets.json" with { type: "json" };
import { allLessons, curricula, type TrackId } from "./curriculum.ts";
import index from "./data/instruction-index.json" with { type: "json" };
import type { CatalogLevel, LearningCatalog, LessonSearchIndex } from "./catalog.ts";

const TRACKS: readonly TrackId[] = ["guitar", "voice"];

function catalogLevels(track: TrackId): CatalogLevel[] {
  return curricula[track].levels.map(level => ({
    id: level.id,
    ...(level.stage !== undefined ? { stage: level.stage } : {}),
    ...(level.access !== undefined ? { access: level.access } : {}),
    modules: level.modules.map(module => ({
      id: module.id,
      lessons: module.lessons.map(lesson => {
        const spec = lesson.practiceSpec;
        return {
          id: lesson.id,
          type: lesson.type,
          minutes: lesson.minutes,
          ...(spec ? {
            practice: {
              passScore: spec.passScore,
              targetCount: spec.targets.length,
              lastBeat: spec.targets.at(-1)?.beat ?? 0,
              ...(spec.revision !== undefined ? { revision: spec.revision } : {}),
              ...(spec.completionMinimumBPM !== undefined ? { completionMinimumBPM: spec.completionMinimumBPM } : {}),
            },
          } : {}),
        };
      }),
    })),
  }));
}

export function buildLearningCatalog(): LearningCatalog {
  const sourceAssets = assets.demoAssets as Record<string, unknown>;
  const stageEvidenceAssets: Record<string, unknown> = {};
  const guided = index.lessons.map(lesson => ({
    id: lesson.id,
    ...(lesson.hasSelfCheckCriteria === true ? { selfCheck: true as const } : {}),
    ...("quiz" in lesson && lesson.quiz ? { quiz: lesson.quiz } : {}),
    ...("stageEvidenceAssetIds" in lesson && lesson.stageEvidenceAssetIds ? { stageEvidenceAssetIds: lesson.stageEvidenceAssetIds as string[] } : {}),
  }));
  for (const lesson of guided) {
    for (const assetId of lesson.stageEvidenceAssetIds ?? []) {
      if (!(assetId in sourceAssets)) throw new Error(`Missing stage evidence asset: ${assetId}`);
      stageEvidenceAssets[assetId] = sourceAssets[assetId];
    }
  }
  return {
    schemaVersion: 1,
    tracks: Object.fromEntries(TRACKS.map(track => [track, catalogLevels(track)])) as Record<TrackId, CatalogLevel[]>,
    guided,
    stageEvidenceAssets: Object.fromEntries(Object.keys(stageEvidenceAssets).sort().map(id => [id, stageEvidenceAssets[id]])),
  };
}

/** What the guitar lesson search reads: titles, summaries and the names it matches against. */
export function buildLessonSearchIndex(): LessonSearchIndex {
  return {
    schemaVersion: 1,
    lessons: allLessons("guitar").map(({ lesson, module, level }) => ({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      type: lesson.type,
      minutes: lesson.minutes,
      mic: !!lesson.practiceSpec,
      moduleId: module.id,
      moduleName: module.name,
      levelName: level.name,
    })),
  };
}
