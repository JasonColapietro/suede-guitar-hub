import test from 'node:test';
import assert from 'node:assert/strict';
import { FreshPitchGate, GuitarRearticulationGate, RhythmObservationWindow, guitarCountIn, guitarPractice, rhythmClickPlan } from '../lib/audio/guitar-practice.ts';
import { scorePractice, type PracticeSpec } from '../lib/audio/practice.ts';
import { estimatePitch, frequencyForMIDI, OnsetDetector } from '../lib/audio/dsp.ts';

test('guitar holds need distinct recent buffers across real dwell time', () => {
    const gate = new FreshPitchGate();
    assert.equal(gate.accepts(1, 10, 10, true), false);
    assert.equal(gate.accepts(1, 10, 10.2, true), false);
    assert.equal(gate.accepts(2, 10.1, 10.1, true), false);
    assert.equal(gate.accepts(3, 10.2, 10.2, true), true);
    gate.reset();
    assert.equal(gate.accepts(4, 11, 11, true), false);
    assert.equal(gate.accepts(5, 11.3, 11.3, true), false, 'a gap cannot complete the previous hold');
    assert.equal(gate.accepts(6, 11.4, 11.4, true), false);
    assert.equal(gate.accepts(7, 11.51, 11.51, true), true);
    assert.equal(gate.accepts(8, 11.6, 12.1, true), false, 'old observations cannot complete a hold');
    assert.equal(gate.accepts(9, 12.2, 12.1, true), false, 'future observations cannot complete a hold');
});

test('wrong or reordered observations break stable guitar evidence', () => {
    const gate = new FreshPitchGate();
    gate.accepts(1, 10, 10, true); gate.accepts(2, 10.1, 10.1, true);
    assert.equal(gate.accepts(3, 10.2, 10.2, false), false);
    assert.equal(gate.accepts(4, 10.3, 10.3, true), false);
    assert.equal(gate.accepts(5, 10.2, 10.3, true), false);
    assert.equal(gate.accepts(6, 10.31, 10.31, true), false);
});

test('ringing and one quiet buffer cannot manufacture a repeated note', () => {
    const gate = new GuitarRearticulationGate();
    gate.accepted(40, 1);
    gate.observe(false, 1.2, 1.2);
    assert.equal(gate.permits(40), false);
    assert.equal(gate.permits(45), true);
    gate.observe(true, 1.3, 1.3); gate.observe(true, 1.3, 1.5);
    assert.equal(gate.permits(40), false);
    gate.observe(true, 1.34, 1.34);
    assert.equal(gate.permits(40), false);
    gate.observe(true, 1.38, 1.38);
    assert.equal(gate.permits(40), true);
    gate.accepted(40, 1.6);
    assert.equal(gate.permits(40), false, 'one release cannot be reused');
});

test('quiet buffers separated by delay or stale delivery do not imply a mute', () => {
    for (const stale of [false, true]) {
        const gate = new GuitarRearticulationGate(); gate.accepted(40, 1);
        gate.observe(true, 1.1, 1.1);
        gate.observe(true, stale ? 1.2 : 2, 2);
        assert.equal(gate.permits(40), false);
    }
});

test('a fresh deliberate repluck releases a repeated pitch without muting', () => {
    const gate = new GuitarRearticulationGate(); gate.accepted(40, 1);
    for (const [at, confidence, now] of [[1.05, .9, 1.1], [1.2, .59, 1.2], [1.2, .9, 2], [2.2, .9, 2.1]]) {
        gate.observeOnset(at, confidence, now);
        assert.equal(gate.permits(40), false);
    }
    gate.observeOnset(2.2, .6, 2.25);
    assert.equal(gate.permits(40), true);
    gate.accepted(40, 2.3); gate.observeOnset(2.2, .9, 2.35);
    assert.equal(gate.permits(40), false);
});

test('authored untimed entry stays immediate; timed guitar Play gets a bar lead-in', () => {
    assert.equal(guitarCountIn(0, false), 0);
    assert.equal(guitarCountIn(0, true), 4);
    assert.equal(guitarCountIn(8, true), 8);
});

test('rhythm rehearsal schedules every beat through the final bar before playback', () => {
    const clicks = rhythmClickPlan(80, 4, 48);
    assert.equal(clicks.length, 68);
    assert.deepEqual(clicks[0], { time: 0, accent: true });
    assert.deepEqual(clicks[4], { time: 3, accent: true });
    assert.deepEqual(clicks.at(-1), { time: 50.25, accent: false });
    assert.equal(rhythmClickPlan(20, 4, 192).length, 68);
    for (let speed = 25; speed <= 125; speed += 5) {
        const bpm = 80 * speed / 100;
        assert.equal(rhythmClickPlan(bpm, 4, 64 * 60 / bpm).length, 68);
    }
    assert.throws(() => rhythmClickPlan(0, 4, 48));
});

test('long slow rhythm preserves early beat evidence beyond 128 total attacks', () => {
    const duration = 192, window = new RhythmObservationWindow(duration);
    const spec: PracticeSpec = { mode: 'rhythm', bpm: 20, countInBeats: 4, toleranceCents: 35, passScore: 75,
        targets: Array.from({ length: 64 }, (_, i) => ({ id: `beat-${i}`, beat: i })) };
    window.append({ time: -1, confidence: 1 });
    for (let beat = 0; beat < 64; beat++) {
        window.append({ time: beat * 3, confidence: .9 });
        window.append({ time: beat * 3 + 1, confidence: .7 });
        window.append({ time: beat * 3 + 2, confidence: .7 });
        window.append({ time: beat * 3 + 2.5, confidence: .2 });
    }
    window.append({ time: duration, confidence: 1 });
    assert.equal(window.observations.length, 192);
    assert.equal(window.observations[0].time, 0);
    assert.equal(window.overflowed, false);
    assert.equal(scorePractice(spec, window.observations).score, 100);
});

test('capture overflow is explicit and never evicts early evidence', () => {
    const window = new RhythmObservationWindow(1);
    for (let i = 0; i <= window.capacity; i++) window.append({ time: i / (window.capacity + 1), confidence: .9 });
    assert.equal(window.overflowed, true);
    assert.equal(window.observations.length, window.capacity);
    assert.equal(window.observations[0].time, 0);
    for (const invalid of [0, NaN, Infinity, 86401]) assert.throws(() => new RhythmObservationWindow(invalid));
});

test('guitar band includes upper fretted notes and preserves octave errors', () => {
    for (const sampleRate of [44100, 48000]) for (const midi of [40, 64, 76, 88]) {
        const samples = Float32Array.from({ length: 4096 }, (_, i) => .3 * Math.sin(2 * Math.PI * frequencyForMIDI(midi) * i / sampleRate));
        const note = estimatePitch(samples, sampleRate);
        assert.equal(note?.midi, midi);
        assert.ok(note!.clarity >= guitarPractice.minimumClarity);
    }
});

test('the same stream detects a fresh attack but not sustained ringing', () => {
    const sampleRate = 48000, detector = new OnsetDetector(sampleRate);
    const gate = new GuitarRearticulationGate();
    const stream = Float32Array.from({ length: sampleRate * 3 }, (_, i) => {
        const t = i / sampleRate;
        const amplitude = t < .7 ? .001 : t < 2 ? .08 : .3;
        return amplitude * Math.sin(2 * Math.PI * 110 * t);
    });
    gate.accepted(45, 1.1);
    let releasedBeforeRepluck = false;
    for (let start = 0; start < stream.length; start += 4096) {
        const samples = stream.slice(start, start + 4096), now = (start + samples.length) / sampleRate;
        for (const event of detector.process(samples)) gate.observeOnset(event.time, event.confidence, now);
        if (now < 2) releasedBeforeRepluck ||= gate.permits(45);
    }
    assert.equal(releasedBeforeRepluck, false);
    assert.equal(gate.permits(45), true);
});
