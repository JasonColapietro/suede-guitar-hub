import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePitch, frequencyForMIDI, noteForFrequency, OnsetDetector } from '../lib/audio/dsp.ts';
import { ActivePracticeClock, scorePractice, transportAt, type PracticeSpec } from '../lib/audio/practice.ts';
function sine(frequency: number, sampleRate = 48000) { return Float32Array.from({ length: 4096 }, (_, i) => .3 * Math.sin(2 * Math.PI * frequency * i / sampleRate)); }
test('active practice excludes permission wait, count-in and long pauses, then resumes normally', () => {
    const clock = new ActivePracticeClock();
    assert.equal(clock.elapsed(90), 0);
    clock.start(94);
    assert.equal(clock.elapsed(92), 0);
    clock.pause(104);
    assert.equal(clock.elapsed(500), 10);
    clock.start(504);
    assert.equal(clock.runElapsed(505), 1);
    assert.equal(clock.elapsed(505), 11);
    clock.pause(510);
    assert.equal(scorePractice(pitchSpec, [], clock.elapsed(1000)).practiceSeconds, 16);
    clock.reset();
    assert.equal(clock.elapsed(1000), 0);
});
test('YIN resolves all six open strings and A4 at actual input sample rates', () => {
    for (const sr of [44100, 48000])
        for (const midi of [40, 45, 50, 55, 59, 64, 69]) {
            const pitch = estimatePitch(sine(frequencyForMIDI(midi), sr), sr);
            assert.ok(pitch);
            assert.equal(pitch.midi, midi);
            assert.ok(Math.abs(pitch.cents) < 3);
            assert.ok(pitch.clarity > .9);
        }
});
test('silence, nonfinite input and invalid frequencies abstain', () => {
    assert.equal(estimatePitch(new Float32Array(4096), 48000), null);
    assert.equal(estimatePitch(new Float32Array(4096).fill(NaN), 48000), null);
    assert.equal(estimatePitch(sine(440), Infinity), null);
    for (const f of [0, NaN, Infinity, -10])
        assert.equal(noteForFrequency(f), null);
});
const pitchSpec: PracticeSpec = { mode: 'pitchSequence', bpm: 60, countInBeats: 0, toleranceCents: 35, passScore: 75, targets: [{ id: 'e', beat: 0, midi: 40 }, { id: 'a', beat: 1, midi: 45 }] };
test('pitch sequence preserves octave and order; confidence never fabricates a pass', () => {
    const result = scorePractice(pitchSpec, [{ time: 2, midi: 40, cents: 0, confidence: .95 }, { time: 8, midi: 45, cents: 10, confidence: .95 }]);
    assert.equal(result.score, 100);
    assert.equal(result.rhythmScore, null);
    assert.equal(scorePractice(pitchSpec, [{ time: 0, midi: 52, cents: 0, confidence: .95 }, { time: 1, midi: 57, cents: 0, confidence: .95 }]).score, 0);
    assert.equal(scorePractice(pitchSpec, []).score, null);
    assert.equal(scorePractice(pitchSpec, [{ time: 0, midi: 40, cents: 0, confidence: .2 }]).passed, null);
    assert.equal(scorePractice(pitchSpec, [{ time: 0, midi: 45, cents: 0, confidence: .95 }, { time: 1, midi: 40, cents: 0, confidence: .95 }]).score, 50);
});
test('one attack cannot satisfy several targets; late attacks lower timing independently', () => {
    const spec: PracticeSpec = { ...pitchSpec, mode: 'rhythm', bpm: 120 };
    assert.equal(scorePractice(spec, [{ time: 0, confidence: .95 }]).matchedTargets, 1);
    const late = scorePractice(spec, [{ time: .1, confidence: .95 }, { time: .6, confidence: .95 }]);
    assert.equal(late.noteScore, null);
    assert.equal(late.rhythmScore, 60);
});
test('count-in and pulse share an absolute clock at every speed', () => {
    assert.deepEqual(transportAt(10, 10, 120, 4), { beat: -4, countingIn: true, pulse: 0, remaining: 4 });
    assert.equal(transportAt(12, 10, 120, 4).beat, 0);
    assert.equal(transportAt(12.75, 10, 120, 4).beat, 1.5);
    assert.equal(transportAt(14, 10, 60, 4).beat, 0);
});
test('streaming onset detection is chunk invariant and rejects held sustain retriggers', () => {
    const sr = 48000, samples = Float32Array.from({ length: sr * 2 }, (_, i) => i < sr * .8 ? 0 : .3 * Math.sin(2 * Math.PI * 110 * i / sr));
    const all = new OnsetDetector(sr).process(samples), stream = new OnsetDetector(sr);
    const parts = [];
    for (let i = 0; i < samples.length; i += 997)
        parts.push(...stream.process(samples.slice(i, i + 997)));
    assert.deepEqual(parts, all);
    assert.equal(all.length, 1);
    assert.ok(all[0].time > .79 && all[0].time < .81);
});
test('timed missed targets preserve later correct notes and confident mistakes grade zero', () => {
    const later = scorePractice(pitchSpec, [{ time: 1.2, midi: 45, cents: 0, confidence: .95, targetID: 'a' }]);
    assert.equal(later.noteScore, 50);
    assert.equal(later.rhythmScore, null);
    const wrong = scorePractice(pitchSpec, [{ time: .2, midi: 43, cents: 0, confidence: .95, targetID: 'e' }, { time: 1.2, midi: 47, cents: 0, confidence: .95, targetID: 'a' }]);
    assert.equal(wrong.disposition, 'scored');
    assert.equal(wrong.score, 0);
    assert.equal(wrong.passed, false);
});
