import test from 'node:test';
import assert from 'node:assert/strict';
import source from '../lib/learning/data/beginner-guitar-instruction.json' with { type: 'json' };
import songs from '../lib/learning/data/song-guitar-instruction.json' with { type: 'json' };
import { getInstructionAsset } from '../lib/learning/instructions.ts';
import { chordFretRange, practiceSelection, rhythmCueAt } from '../lib/audio/practice-selection.ts';
import type { PracticeSpec } from '../lib/audio/practice.ts';

const offbeat: PracticeSpec = { mode: 'rhythm', bpm: 60, countInBeats: 4, toleranceCents: 35, passScore: 75, targets: [{id:'one',beat:0,cue:'D · ↓'}, {id:'and',beat:.5,cue:'D · ↑'}, {id:'after-rest',beat:2,cue:'A · ↓'}] };
test('rhythm cues highlight offbeats for the same window as native and stay quiet in rests', () => {
  assert.equal(rhythmCueAt(offbeat, -.01), null, 'count-in is outside the music');
  assert.equal(rhythmCueAt(offbeat, 0)?.active, true);
  assert.equal(rhythmCueAt(offbeat, .199)?.active, true);
  assert.equal(rhythmCueAt(offbeat, .2)?.active, false);
  assert.equal(rhythmCueAt(offbeat, .499)?.active, false);
  assert.equal(rhythmCueAt(offbeat, .5)?.target.id, 'and');
  assert.equal(rhythmCueAt(offbeat, .5)?.active, true);
  assert.equal(rhythmCueAt(offbeat, .71)?.active, false);
  assert.equal(rhythmCueAt(offbeat, 1)?.beatsUntilNext, 1);
  assert.equal(rhythmCueAt(offbeat, 1.999)?.active, false);
  assert.equal(rhythmCueAt(offbeat, 2)?.target.id, 'after-rest');
  assert.equal(rhythmCueAt(offbeat, 3), null, 'music end is exclusive');
});
test('a selected offbeat phrase starts from its first target and retains the authored gap', () => {
  const selected = practiceSelection(offbeat, 'practice', true, 1, 2);
  assert.deepEqual(selected.targets.map(target => target.beat), [0, 1.5]);
  assert.equal(rhythmCueAt(selected, 0)?.target.id, 'and');
  assert.equal(rhythmCueAt(selected, .5)?.active, false);
  assert.equal(rhythmCueAt(selected, .5)?.beatsUntilNext, 1);
  assert.equal(rhythmCueAt(practiceSelection(offbeat, 'play', true, 1, 2), 0)?.target.id, 'one');
});
test('all native chord diagrams retain exact string pitches and every fretted dot stays in view', () => {
  const assets = { ...source.demoAssets, ...songs.demoAssets };
  let chordCount = 0;
  for (const [id, raw] of Object.entries(assets)) {
    if (raw.kind !== 'chord_diagram_and_reference_tones') continue;
    chordCount++;
    const asset = getInstructionAsset(id);
    assert.equal(asset.kind, 'chord');
    if (asset.kind !== 'chord') continue;
    assert.deepEqual(asset.frets.flatMap((fret, index) => fret === null ? [] : [[40,45,50,55,59,64][index] + fret]), asset.soundingMidi, `${id}: written pitch`);
    const range = chordFretRange(asset.frets);
    asset.frets.forEach((fret, index) => {
      if (fret === null || fret === 0) assert.ok(asset.fingers[index] === null || asset.fingers[index] === 0, `${id}: open/muted finger`);
      else { assert.ok(fret >= range.first && fret <= range.last, `${id}: fret out of view`); assert.ok(asset.fingers[index]! >= 1 && asset.fingers[index]! <= 4, `${id}: invalid finger`); }
    });
  }
  assert.equal(chordCount, 74, 'nonempty full reference inventory');
});
test('the riff references match the physical string and written frets in every slot', () => {
  const riff = getInstructionAsset('stage2-first-riff');
  assert.equal(riff.kind, 'riff');
  if (riff.kind !== 'riff') return;
  const openMidi = [64,59,55,50,45,40][riff.stringNumber - 1];
  assert.deepEqual(riff.midi, riff.frets.map(fret => openMidi + fret));
  assert.equal(riff.midi.length, 8);
});
