import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getInstructionAsset } from '../lib/learning/instructions.ts';
import { getLesson } from '../lib/learning/curriculum.ts';
register('./component-render-hooks.mjs', import.meta.url);
const { ChordDiagram, LessonInstructionAssets } = await import('../components/learning/LessonInstructionAssets.tsx');
const { PracticeCoach } = await import('../components/practice/PracticeCoach.tsx');
const { LessonLibrary } = await import('../components/learning/LessonLibrary.tsx');

test('real upper-fret chord component renders fret4 inside its SVG and hides names for reading', () => {
  const asset = getInstructionAsset('song-guitar-shape-bm');
  assert.ok(asset.kind === 'chord');
  const markup = renderToStaticMarkup(createElement(ChordDiagram, { asset }));
  assert.match(markup, /viewBox="0 0 300 258"/);
  assert.match(markup, /cy="205"/);
  assert.match(markup, /String 4: fret 4, finger 3/);
  const hidden = renderToStaticMarkup(createElement(ChordDiagram, { asset, hideName: true }));
  assert.doesNotMatch(hidden, /Bm chord/);
});
test('real riff component renders every authored reference button and accessible physical position', () => {
  const asset = getInstructionAsset('stage2-first-riff');
  const markup = renderToStaticMarkup(createElement(LessonInstructionAssets, { assets: [asset] }));
  assert.equal((markup.match(/aria-label="Hear slot/g) ?? []).length, 8);
  assert.match(markup, /Hear slot 7, string 6, fret 5, A2/);
  assert.match(markup, /Original GuitarHub exercise/);
});
test('real coach renders every offbeat target with authored cues and no result before playing', () => {
  const spec = getLesson('guitar', 'g-l3-m3-02')?.lesson.practiceSpec;
  // Resolve the actual offbeat lesson by source data instead of a hand-authored UI fixture.
  assert.ok(spec, 'authored offbeat practice specification');
  const markup = renderToStaticMarkup(createElement(PracticeCoach, { spec, track: 'guitar' }));
  assert.match(markup, /Practice · no score/);
  assert.match(markup, /Play · full check/);
  assert.match(markup, /Loop a section/);
  assert.match(markup, /beat 1\.5/);
  assert.match(markup, /Muted · ↑/);
  assert.match(markup, /attack when the cue lights up/);
  assert.doesNotMatch(markup, /Save checked result/);
});
test('real library exposes native filter names, search label and honest preview/access labels', () => {
  const markup = renderToStaticMarkup(createElement(LessonLibrary, { track: 'guitar' }));
  assert.match(markup, /Song, artist, chord or skill/);
  assert.match(markup, /Mic exercises/);
  assert.match(markup, /All topics/);
  assert.match(markup, /81 results/);
  assert.match(markup, /Lesson preview/);
  assert.equal((markup.match(/>Available<\/span>/g) ?? []).length, 3, "guest sampler only");
  assert.match(markup, /Available/);
  assert.match(markup, /Wonderwall/);
});
