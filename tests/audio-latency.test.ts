import test from 'node:test';
import assert from 'node:assert/strict';
import { MAXIMUM_SCORE_LAG_SEC, ONSET_REPORT_TOLERANCE_SEC, captureLagSec, outputLagSec, practiceScoreLagSec } from '../lib/audio/latency.ts';
import { RHYTHM_WINDOW_BEATS, scorePractice, type Observation, type PracticeSpec } from '../lib/audio/practice.ts';
import { guitarPractice } from '../lib/audio/guitar-practice.ts';
import { OnsetDetector } from '../lib/audio/dsp.ts';

/**
 * Every number here is synthetic. These tests establish that the scorer's
 * arithmetic is biased late when it is handed a delayed timeline and unbiased
 * when it is told the delay, and they bound the onset detector's own timestamp
 * error for a signal whose attacks are exactly known. They establish nothing
 * about real-device output latency, microphone accuracy, or timing on physical
 * hardware: no measurement in this repository has ever touched a guitar.
 */

/** Times compared against a clock carry ordinary floating-point error. A tenth
 * of a millisecond is far below anything audible and far above the last bit of a
 * double, which is the level a previous metronome fix tripped over. */
const TIME_TOLERANCE = 1e-4;
function assertSeconds(actual: number, expected: number, message: string) {
    assert.ok(Math.abs(actual - expected) < TIME_TOLERANCE, `${message}: ${actual} !== ${expected}`);
}

const bpm = 100, beatSeconds = 60 / bpm;
const strummed: PracticeSpec = { mode: 'rhythm', bpm, countInBeats: 4, toleranceCents: 35, passScore: 80,
    targets: Array.from({ length: 8 }, (_, beat) => ({ id: `stroke-${beat}`, beat })) };

/** A performance that is perfect and then delayed by the path, which is what a
 * learner in time with the guide actually hands the scorer. */
function delayedPerformance(lagSeconds: number, playedLateSeconds = 0): Observation[] {
    return strummed.targets.map(target => ({ time: target.beat * beatSeconds + playedLateSeconds + lagSeconds, confidence: .95 }));
}

test('an uncompensated timeline scores a perfect performance as late, in proportion to the delay', () => {
    // The window is half a beat, credit falls off linearly across it, so a delay
    // of `lag` costs every single target `lag / (window * beatSeconds)` of its
    // credit. This is the bias: it is the same sign on every target, so it does
    // not average out over an exercise the way jitter would.
    for (const lag of [.02, .05, .08, .12]) {
        const windowSeconds = RHYTHM_WINDOW_BEATS * beatSeconds;
        const expected = Math.round((1 - lag / windowSeconds) * 100);
        assert.equal(scorePractice(strummed, delayedPerformance(lag)).score, expected,
            `a ${lag * 1000} ms path must cost exactly the fraction of the window it occupies`);
        assert.equal(scorePractice(strummed, delayedPerformance(lag), 0, lag).score, 100,
            `telling the scorer about the ${lag * 1000} ms path must restore the performance`);
    }
});

test('the bias is the difference between passing and failing a checkpoint', () => {
    // 80 milliseconds is an unremarkable laptop path: a reported output latency
    // of 40 to 60 ms plus input buffering is ordinary, and Bluetooth is far
    // worse. At this tempo it is enough to fail a learner who played in time.
    const lag = .08, perfect = delayedPerformance(lag);
    const uncompensated = scorePractice(strummed, perfect);
    assert.equal(uncompensated.passed, false, 'the unfixed scorer fails a performance that was in time');
    assert.equal(uncompensated.matchedTargets, 8, 'and it is not failing for want of matched attacks');
    assert.ok(uncompensated.score !== null && uncompensated.score < strummed.passScore);
    const compensated = scorePractice(strummed, perfect, 0, lag);
    assert.equal(compensated.passed, true);
    assert.equal(compensated.score, 100);
});

test('compensation corrects a bias and does not forgive a performance that was actually late', () => {
    // The learner is 80 ms behind the beat on top of a 50 ms path. Removing the
    // path must leave the 80 ms visible, or the correction has stopped measuring
    // anything.
    const lag = .05, sloppy = delayedPerformance(lag, .08);
    const windowSeconds = RHYTHM_WINDOW_BEATS * beatSeconds;
    assert.equal(scorePractice(strummed, sloppy, 0, lag).score, Math.round((1 - .08 / windowSeconds) * 100));
    // An attack half a beat past its target is outside the window either way;
    // compensation cannot invent a match that the grid never had.
    const missed = strummed.targets.map(target => ({ time: target.beat * beatSeconds + windowSeconds + .01 + lag, confidence: .95 }));
    assert.ok((scorePractice(missed.length ? strummed : strummed, missed, 0, lag).score ?? 100) < 50);
});

test('a nonsense or hostile reported delay costs a learner nothing', () => {
    const onGrid = delayedPerformance(0);
    for (const lag of [0, -1, NaN, Infinity, -Infinity]) {
        assert.equal(scorePractice(strummed, onGrid, 0, lag).score, 100, `a ${lag} delay must be treated as no delay`);
    }
    // A platform claiming five seconds of latency cannot be allowed to rewind the
    // timeline out of the exercise; the clamp bounds what it can move.
    const absurd = scorePractice(strummed, delayedPerformance(MAXIMUM_SCORE_LAG_SEC), 0, 5);
    assert.equal(absurd.score, 100, 'the clamp still admits a delay exactly at the ceiling');
    assert.equal(scorePractice(strummed, onGrid, 0, 5).score,
        Math.round((1 - MAXIMUM_SCORE_LAG_SEC / (RHYTHM_WINDOW_BEATS * beatSeconds)) * 100),
        'and beyond the ceiling the timeline moves by the ceiling rather than by what was claimed');
});

test('reported platform delays add, never cancel, and are bounded', () => {
    assertSeconds(practiceScoreLagSec({ guideLagSeconds: .04, captureLagSeconds: .01 }), .05, 'the two paths add');
    assertSeconds(practiceScoreLagSec({ guideLagSeconds: .04 }), .04, 'a missing term is zero, not a guess');
    assertSeconds(practiceScoreLagSec({}), 0, 'nothing reported is no compensation');
    for (const hostile of [-5, NaN, Infinity]) {
        assertSeconds(practiceScoreLagSec({ guideLagSeconds: hostile, captureLagSeconds: .01 }), .01, `${hostile} is not a delay`);
    }
    assertSeconds(practiceScoreLagSec({ guideLagSeconds: 3, captureLagSeconds: 3 }), MAXIMUM_SCORE_LAG_SEC, 'the sum is clamped');
});

test('the audio path is read from what the platform reports about itself', () => {
    const context = (values: { outputLatency?: number; baseLatency: number }) => values as unknown as AudioContext;
    assertSeconds(outputLagSec(context({ outputLatency: .18, baseLatency: .01 })), .18, 'outputLatency is the whole path');
    assertSeconds(outputLagSec(context({ baseLatency: .012 })), .012, 'without it the graph buffer is the floor');
    for (const broken of [0, -1, NaN, Infinity]) {
        assertSeconds(outputLagSec(context({ outputLatency: broken, baseLatency: .012 })), .012, `${broken} is not a latency`);
        assertSeconds(outputLagSec(context({ outputLatency: broken, baseLatency: broken })), 0, 'and an unusable pair reports nothing');
    }
    const track = (latency?: number) => ({ getSettings: () => (latency === undefined ? {} : { latency }) }) as unknown as MediaStreamTrack;
    assertSeconds(captureLagSec(context({ baseLatency: .01 }), track(.03)), .03, 'the input track knows its own path');
    assertSeconds(captureLagSec(context({ baseLatency: .01 }), track()), .01, 'a track that does not say falls back to the graph');
    assertSeconds(captureLagSec(context({ baseLatency: .01 }), null), .01, 'and so does no track at all');
});

test('the onset detector timestamps an attack early, by less than its published tolerance', () => {
    // Synthesized plucks at known times, fed in blocks the way the worklet
    // delivers them. The detector names the centre of the frame whose energy
    // rose, which lands one to two 128-sample hops *before* the attack — the
    // opposite sign from the platform path, which is why it is bounded here
    // rather than compensated for.
    for (const sampleRate of [44100, 48000]) {
        const attacks = Array.from({ length: 8 }, (_, i) => 1 + i * .6);
        const samples = new Float32Array(Math.round((attacks.at(-1)! + 1) * sampleRate));
        for (const attack of attacks) {
            const start = Math.round(attack * sampleRate);
            for (let i = 0; i < sampleRate * .45 && start + i < samples.length; i++) {
                const t = i / sampleRate;
                samples[start + i] += .5 * Math.exp(-t * 6) * Math.sin(2 * Math.PI * 110 * t);
            }
        }
        const detector = new OnsetDetector(sampleRate), events: { time: number; confidence: number }[] = [];
        for (let i = 0; i < samples.length; i += 512) events.push(...detector.process(samples.slice(i, i + 512)));
        assert.equal(events.length, attacks.length, `every pluck is detected at ${sampleRate} Hz`);
        for (const [index, attack] of attacks.entries()) {
            const error = events[index].time - attack;
            assert.ok(error <= 0, `the detector must not report an attack late: ${error} s at ${sampleRate} Hz`);
            assert.ok(-error < ONSET_REPORT_TOLERANCE_SEC,
                `the detector's own lead must stay inside its published tolerance: ${-error} s at ${sampleRate} Hz`);
        }
    }
});

test('compensating the scoring window is not licence to widen the staleness gate', () => {
    // `contracts/adjudications.ts`, `frameStaleness`: the maximum reading age may
    // be tightened and must never be widened, and it is not a budget to spend on
    // analyser lag. It is left exactly where native set it, and the compensation
    // ceiling is well under it so that nobody can read one as the other.
    assert.equal(guitarPractice.maximumAge, .45, 'the staleness gate is native-owned and unchanged here');
    assert.ok(MAXIMUM_SCORE_LAG_SEC < guitarPractice.maximumAge, 'the two numbers are separate and must not meet');
});
