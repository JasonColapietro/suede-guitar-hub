#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const sourceRoot = process.argv.find(argument => argument.startsWith('--native='))?.slice('--native='.length);
if (!sourceRoot) throw new Error('Specify --native=/absolute/path/to/the/canonical/ios/checkout. Add --check for verification only.');
const check = process.argv.includes('--check');
const mappings = ['guitar', 'voice', 'song-guitar', 'beginner-guitar-instruction', 'song-guitar-instruction', 'advanced-guitar-instruction', 'voice-instruction'].map(name => [`GuitarHubCore/Sources/GuitarHubCore/Resources/${name}.json`, `lib/learning/data/${name}.json`]);
mappings.push(['contracts/learning.json', 'contracts/learning.json']);
for (const [source, destination] of mappings) {
  const bytes = await readFile(resolve(sourceRoot, source));
  if (check) assert.deepEqual(await readFile(destination), bytes, `${destination}: stale native bundle`);
  else await writeFile(destination, bytes);
  process.stdout.write(`${check ? 'Verified' : 'Synced'} ${destination}\n`);
}

// Client surfaces need readiness and quiz definitions, not 1.4 MB of lesson
// prose. Derive a small index from the same native instruction resources so the
// split cannot create a second authoring source.
const instructionNames = ['beginner-guitar-instruction', 'song-guitar-instruction', 'advanced-guitar-instruction', 'voice-instruction'];
const instructionLibraries = await Promise.all(instructionNames.map(async name => {
  const source = resolve(sourceRoot, `GuitarHubCore/Sources/GuitarHubCore/Resources/${name}.json`);
  return JSON.parse(await readFile(source, 'utf8'));
}));
const instructionLessons = instructionLibraries.flatMap(library => library.lessons);
const indexBytes = Buffer.from(`${JSON.stringify({
  schemaVersion: 1,
  lessons: instructionLessons.map(lesson => ({
    id: lesson.id,
    prerequisiteLessonIds: lesson.prerequisiteLessonIds,
    hasSelfCheckCriteria: lesson.selfAssessment.criteria.length > 0 && lesson.selfAssessment.criteria.every(criterion => criterion.trim().length > 0),
    ...(lesson.quiz ? { quiz: lesson.quiz } : {}),
  })),
}, null, 2)}\n`);
const indexDestination = 'lib/learning/data/instruction-index.json';
if (check) assert.deepEqual(await readFile(indexDestination), indexBytes, `${indexDestination}: stale native-derived index`);
else await writeFile(indexDestination, indexBytes);
process.stdout.write(`${check ? 'Verified' : 'Synced'} ${indexDestination}\n`);

// Practice UI needs authored visual and audio assets, but never lesson prose.
// Keep that browser payload separate and derive it from the same native source.
const assetBytes = Buffer.from(`${JSON.stringify({
  schemaVersion: 1,
  demoAssets: Object.assign({}, ...instructionLibraries.map(library => library.demoAssets)),
}, null, 2)}\n`);
const assetDestination = 'lib/learning/data/instruction-assets.json';
if (check) assert.deepEqual(await readFile(assetDestination), assetBytes, `${assetDestination}: stale native-derived assets`);
else await writeFile(assetDestination, assetBytes);
process.stdout.write(`${check ? 'Verified' : 'Synced'} ${assetDestination}\n`);
