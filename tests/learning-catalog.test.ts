import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { buildLearningCatalog, buildLessonSearchIndex } from "../lib/learning/catalog-build.ts";
import { catalogLesson, catalogLessons, stageEvidenceAsset } from "../lib/learning/catalog.ts";
import { allLessons, getLesson } from "../lib/learning/curriculum.ts";
import { getInstructionAsset } from "../lib/learning/instruction-assets.ts";
import { getInstructionQuiz, getInstructionStageEvidenceAssetIds, guidedLessonIds, hasInstructionQuiz, hasInstructionSelfCheck, isGuidedLesson } from "../lib/learning/instruction-index.ts";
import fullIndex from "../lib/learning/data/instruction-index.json" with { type: "json" };
import { lessonPrerequisites } from "../lib/learning/instructions.ts";
import { browseLessons, lessonFilters, type LessonFilter } from "../lib/learning/library.ts";
import { searchGuitarLessons } from "../lib/learning/lesson-search.ts";
import { learningPathOutline } from "../lib/learning/path-outline.ts";
import { routineChordAssets } from "../lib/learning/routine-assets.ts";
import { routineTemplate } from "../lib/learning/routine.ts";

test("the committed browser catalog and search index match the curriculum they derive from", () => {
  for (const [path, value] of [["lib/learning/data/catalog.json", buildLearningCatalog()], ["lib/learning/data/lesson-search-guitar.json", buildLessonSearchIndex()]] as const) {
    assert.equal(readFileSync(path, "utf8"), `${JSON.stringify(value)}\n`, `${path} is stale: run npm run learning:catalog`);
  }
});

test("the catalog answers every question the browser asks exactly as the full curriculum does", () => {
  for (const track of ["guitar", "voice"] as const) {
    const full = allLessons(track);
    const slim = catalogLessons(track);
    assert.deepEqual(slim.map(entry => [entry.level.id, entry.module.id, entry.lesson.id]), full.map(entry => [entry.level.id, entry.module.id, entry.lesson.id]));
    for (const { lesson, level } of full) {
      const entry = catalogLesson(track, lesson.id);
      assert.ok(entry);
      assert.equal(entry.lesson.type, lesson.type);
      assert.equal(entry.lesson.minutes, lesson.minutes);
      assert.equal(entry.level.access, level.access);
      assert.equal(entry.level.stage, level.stage);
      const spec = lesson.practiceSpec;
      assert.equal(!!entry.lesson.practice, !!spec, lesson.id);
      if (spec && entry.lesson.practice) {
        assert.equal(entry.lesson.practice.targetCount, spec.targets.length);
        assert.equal(entry.lesson.practice.lastBeat, spec.targets.at(-1)?.beat ?? 0);
        assert.equal(entry.lesson.practice.passScore, spec.passScore);
        assert.equal(entry.lesson.practice.revision, spec.revision);
        assert.equal(entry.lesson.practice.completionMinimumBPM, spec.completionMinimumBPM);
      }
    }
  }
  assert.equal(catalogLesson("guitar", "no-such-lesson"), undefined);
  for (const id of guidedLessonIds) for (const assetId of getInstructionStageEvidenceAssetIds(id)) {
    assert.deepEqual(stageEvidenceAsset(assetId), getInstructionAsset(assetId), assetId);
  }
  assert.throws(() => stageEvidenceAsset("missing-asset"), /Missing stage evidence asset/);
});

test("the browser's guided index says what the authored instruction index says", () => {
  assert.deepEqual(guidedLessonIds, fullIndex.lessons.map(lesson => lesson.id));
  for (const lesson of fullIndex.lessons) {
    assert.equal(isGuidedLesson(lesson.id), true);
    assert.equal(hasInstructionSelfCheck(lesson.id), lesson.hasSelfCheckCriteria === true, lesson.id);
    assert.equal(hasInstructionQuiz(lesson.id), "quiz" in lesson && !!lesson.quiz, lesson.id);
    if ("quiz" in lesson && lesson.quiz) assert.deepEqual(getInstructionQuiz(lesson.id), lesson.quiz);
    assert.deepEqual(getInstructionStageEvidenceAssetIds(lesson.id), "stageEvidenceAssetIds" in lesson ? lesson.stageEvidenceAssetIds : []);
  }
  assert.equal(isGuidedLesson("not-a-lesson"), false);
  assert.deepEqual(lessonPrerequisites.map(entry => entry.id), guidedLessonIds, "prerequisites still come from the full index, on the server");
});

test("the on-demand guitar search returns what the server-side library returns", () => {
  for (const filter of Object.keys(lessonFilters) as LessonFilter[]) {
    for (const query of ["", "oasis", "chord changes", "pentatonic", "Ünïcödé"]) {
      assert.deepEqual(searchGuitarLessons(filter, query).map(entry => entry.id), browseLessons("guitar", filter, query).map(entry => entry.lesson.id), `${filter} / ${query}`);
    }
  }
});

test("the learning path outline carries titles and flags, not lesson bodies", () => {
  const outline = learningPathOutline("guitar");
  const lessons = outline.levels.flatMap(level => level.modules.flatMap(module => module.lessons));
  assert.deepEqual(lessons.map(lesson => lesson.id), allLessons("guitar").map(entry => entry.lesson.id));
  for (const lesson of lessons) {
    const full = getLesson("guitar", lesson.id)!.lesson;
    assert.equal(lesson.title, full.title);
    assert.equal(lesson.mic, !!full.practiceSpec);
    assert.deepEqual(Object.keys(lesson).sort(), ["id", "mic", "minutes", "quiz", "title", "type"]);
  }
  assert.ok(outline.levels.some(level => level.extras.length > 0), "stage drills are resolved on the server");
  assert.equal(outline.stageCount, outline.levels.filter(level => level.stage).length);
});

test("the routine's chord diagrams are resolved on the server", () => {
  const assets = routineChordAssets();
  const ids = new Set(routineTemplate.blocks.flatMap(block => block.assetIds));
  assert.ok(Object.keys(assets).length > 0);
  for (const id of ids) assert.equal(assets[id]?.kind, "chord", id);
});

/**
 * The bundle rule, checked on the import graph rather than on build output:
 * nothing a client component reaches statically may import the full
 * curriculum, the lesson bodies, the demo-asset library or the voice prose.
 * Type-only imports are erased and do not count.
 */
test("no client component statically reaches the full curriculum or demo assets", () => {
  const root = process.cwd();
  const forbidden = [
    "lib/learning/curriculum.ts", "lib/learning/instructions.ts", "lib/learning/instruction-assets.ts", "lib/learning/library.ts",
    "lib/learning/catalog-build.ts", "lib/learning/path-outline.ts", "lib/learning/routine-assets.ts", "lib/learning/voice-proof.ts",
    "lib/learning/vocal-material.ts", "lib/learning/prerequisite-lists.ts", "lib/voice-redirects.ts",
  ];
  const allowedData = new Set(["lib/learning/data/catalog.json"]);
  const resolveImport = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? join(root, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
    if (!base) return null;
    for (const suffix of ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"]) if (existsSync(base + suffix) && statSync(base + suffix).isFile()) return base + suffix;
    return null;
  };
  const staticImports = (file: string) => [...readFileSync(file, "utf8").matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/gm)].map(match => match[1]);
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path, out); else if (/\.tsx?$/.test(name)) out.push(path);
    }
    return out;
  };
  const clientRoots = [...walk(join(root, "components")), ...walk(join(root, "app"))].filter(file => /^\s*["']use client["']/.test(readFileSync(file, "utf8")));
  assert.ok(clientRoots.length > 10);
  const offenders: string[] = [];
  for (const start of clientRoots) {
    const seen = new Set<string>(); const stack: [string, string[]][] = [[start, []]];
    while (stack.length) {
      const [file, chain] = stack.pop()!;
      if (seen.has(file)) continue; seen.add(file);
      const rel = relative(root, file);
      if (forbidden.includes(rel) || (rel.startsWith("lib/learning/data/") && !allowedData.has(rel))) { offenders.push([...chain, rel].join(" -> ")); continue; }
      if (file.endsWith(".json")) continue;
      for (const spec of staticImports(file)) { const next = resolveImport(file, spec); if (next) stack.push([next, [...chain, rel]]); }
    }
  }
  assert.deepEqual(offenders, []);
});
