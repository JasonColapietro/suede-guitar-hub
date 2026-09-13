import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildContract, serializeContract, CONTRACT_KEYS, CONTRACT_NAME, CONTRACT_VERSION } from '../contracts/web-practice.ts';
import { estimatePitch, DEFAULT_PITCH_BAND, MINIMUM_CLARITY, SILENCE_RMS, YIN_THRESHOLD } from '../lib/audio/dsp.ts';
import { recommendPracticeTempo, TEMPO_MAXIMUM_RATIO, TEMPO_MINIMUM_RATIO, TEMPO_INCREMENT_RATIO } from '../lib/audio/practice-tempo.ts';
import type { PracticeSpec } from '../lib/audio/practice.ts';

const FILE = 'contracts/web-practice.json';

/** The sing repository's builder serialized `undefined` for two constants that
 * were never exported. `JSON.stringify` dropped both keys, every equality
 * assertion still passed, and the contract quietly described less than it
 * claimed to. An equality check cannot catch that; a walk can. */
function undefinedLeaves(value: unknown, path = '$'): string[] {
    if (value === undefined) return [path];
    if (Array.isArray(value)) return value.flatMap((entry, index) => undefinedLeaves(entry, `${path}[${index}]`));
    if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, entry]) => undefinedLeaves(entry, `${path}.${key}`));
    return [];
}

test('the built contract has no undefined leaves', () => {
    assert.deepEqual(undefinedLeaves(buildContract()), []);
});

test('every promised key is present and the list is sorted', () => {
    assert.deepEqual([...CONTRACT_KEYS], [...CONTRACT_KEYS].sort(), 'CONTRACT_KEYS is the review surface; keep it sorted so additions are visible');
    assert.deepEqual(Object.keys(buildContract()).sort(), [...CONTRACT_KEYS], 'a new top-level key has to be added to CONTRACT_KEYS in the same commit');
});

test(`${FILE} matches the live constants`, () => {
    const generated = serializeContract();
    if (process.env.CONTRACT_WRITE === '1') {
        writeFileSync(FILE, generated);
        return;
    }
    let vendored: string;
    try {
        vendored = readFileSync(FILE, 'utf8');
    } catch {
        assert.fail(`${FILE} is missing. Regenerate with: CONTRACT_WRITE=1 npm test`);
    }
    assert.equal(
        vendored,
        generated,
        `${FILE} no longer describes the live detector and tempo constants. If the change ` +
        `was intended, regenerate with CONTRACT_WRITE=1 npm test and read the diff — a changed ` +
        `value here is a changed promise to somebody practising.`,
    );
});

test('the serialized values are the live ones, not a restatement of them', () => {
    const contract = buildContract();
    assert.equal(contract.contract, CONTRACT_NAME);
    assert.equal(contract.version, CONTRACT_VERSION);
    assert.equal(contract.detector.minHz, DEFAULT_PITCH_BAND.minimumFrequency);
    assert.equal(contract.detector.maxHz, DEFAULT_PITCH_BAND.maximumFrequency);
    assert.equal(contract.detector.yinThreshold, YIN_THRESHOLD);
    assert.equal(contract.detector.silenceRms, SILENCE_RMS);
    assert.equal(contract.detector.minimumClarity, MINIMUM_CLARITY);
    assert.equal(contract.adaptiveTempo.minimumRatio, TEMPO_MINIMUM_RATIO);
    assert.equal(contract.adaptiveTempo.maximumRatio, TEMPO_MAXIMUM_RATIO);
    assert.equal(contract.adaptiveTempo.incrementRatio, TEMPO_INCREMENT_RATIO);
});

test('the published audible range is one the detector will actually report', () => {
    const { lowestAudibleMidi, highestAudibleMidi } = buildContract().detector;
    const sampleRate = 48000;
    const heard = (midi: number) => {
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        const samples = new Float32Array(Math.ceil(sampleRate / (DEFAULT_PITCH_BAND.minimumFrequency * 0.9)) * 2 + 512);
        for (let i = 0; i < samples.length; i++)
            samples[i] = 0.4 * Math.sin((2 * Math.PI * frequency * i) / sampleRate) + 0.12 * Math.sin((4 * Math.PI * frequency * i) / sampleRate);
        return estimatePitch(samples, sampleRate)?.midi;
    };
    assert.equal(heard(lowestAudibleMidi), lowestAudibleMidi, 'the published floor must be a note the detector names correctly');
    assert.equal(heard(highestAudibleMidi - 12), highestAudibleMidi - 12, 'a note an octave under the published ceiling must be named correctly');
    // Below the floor there is no candidate period inside the lag search, so the
    // detector either reports nothing or reports something else. Either is fine;
    // what matters is that it never confirms the note, which is exactly why the
    // published floor is the boundary a lesson has to respect.
    assert.notEqual(heard(lowestAudibleMidi - 2), lowestAudibleMidi - 2, 'the detector must not confirm a note under the published floor');
});

test('a lesson asking for the low open E stays inside the published band', () => {
    const { lowestAudibleMidi, highestAudibleMidi } = buildContract().detector;
    // Standard tuning, low E through the twelfth fret of the high E.
    assert.ok(lowestAudibleMidi <= 40, `low open E is MIDI 40, published floor is ${lowestAudibleMidi}`);
    assert.ok(highestAudibleMidi >= 76, `twelfth fret of the high E is MIDI 76, published ceiling is ${highestAudibleMidi}`);
});

test('the grid the contract publishes is the grid the recommender lands on', () => {
    const { gridPercent } = buildContract().adaptiveTempo;
    const spec = { bpm: 100, passScore: 70, revision: 1 } as unknown as PracticeSpec;
    const allowed = new Set(gridPercent);
    assert.ok(allowed.has(25) && allowed.has(125) && allowed.size === 21, 'twenty-five to a hundred and twenty-five in fives');

    // Walk the grid upward on perfect scores and downward on failures; every
    // recommendation has to be a percentage the contract published.
    for (const direction of ['up', 'down'] as const) {
        let bpm = direction === 'up' ? 25 : 125;
        for (let step = 0; step < 30; step++) {
            const score = direction === 'up' ? 100 : 10;
            const attempts = [1, 2, 3].map(() => ({ bpm, score, disposition: 'scored' as const, passed: direction === 'up', specRevision: 1 }));
            const next = recommendPracticeTempo(spec, bpm, attempts).bpm;
            assert.ok(allowed.has(Math.round((next / spec.bpm) * 100)), `${next} BPM is ${(next / spec.bpm) * 100} per cent, which the contract does not publish`);
            if (next === bpm) break;
            bpm = next;
        }
        assert.equal(bpm, direction === 'up' ? 125 : 25, `walking ${direction} must settle on the published ${direction === 'up' ? 'ceiling' : 'floor'}`);
    }
});

test('the tempo ceiling agrees with the vocal contract it shares a learner with', () => {
    // The full vocal practice grid lives in the sing repository's
    // `practice-parity` contract, which this repository does not vendor, so the
    // ceiling is the part of the agreement that is checkable here. Someone
    // practising guitar and voice in the same week should not find one app
    // willing to push to 125 per cent and the other stopping somewhere else.
    const vocal = JSON.parse(readFileSync('contracts/suede-vocal.json', 'utf8')) as { warmups: { tempos: number[] } };
    assert.equal(Math.max(...vocal.warmups.tempos), TEMPO_MAXIMUM_RATIO);
});
