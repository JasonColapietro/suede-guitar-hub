import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROOF_METRICS, PROOF_METRIC_KIND, claimsMeasurement, isProofMetric, proofMetricKind, type ProofMetric } from '../lib/learning/proof-metrics.ts';
import { validateCurriculum } from '../lib/learning/models.ts';
import { VOICE_MODULE_PROOF } from '../lib/learning/voice-proof.ts';

const DATA = 'lib/learning/data';

interface Found { file: string; id: string; metric: string; hasLessons: boolean }

/** Every place a `proofMetric` appears in tracked learning data, wherever it is
 * nested. The field is web-only — `contracts/learning.json` does not carry it —
 * which is part of why it was able to rot unnoticed. */
function everyProofMetric(): Found[] {
    const found: Found[] = [];
    for (const file of [...readdirSync(DATA).filter(name => name.endsWith('.json')).map(name => join(DATA, name)), 'contracts/learning.json']) {
        const walk = (node: unknown) => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== 'object') return;
            const record = node as Record<string, unknown>;
            if (typeof record.proofMetric === 'string')
                found.push({ file, id: String(record.id ?? record.name ?? '(unnamed)'), metric: record.proofMetric, hasLessons: Array.isArray(record.lessons) });
            Object.values(record).forEach(walk);
        };
        walk(JSON.parse(readFileSync(file, 'utf8')));
    }
    return found;
}

test('every authored proofMetric is in the union', () => {
    const unknown = everyProofMetric().filter(entry => !isProofMetric(entry.metric));
    assert.deepEqual(unknown, [], 'a value in the data is not in lib/learning/proof-metrics.ts. Add it there deliberately, with its kind, or fix the data.');
});

test('no union member is dead', () => {
    const used = new Set(everyProofMetric().map(entry => entry.metric));
    const dead = PROOF_METRICS.filter(metric => !used.has(metric));
    assert.deepEqual(dead, [], 'the union lists a value nothing uses; a vocabulary that outlives its data drifts back into being a free string');
    assert.equal(PROOF_METRICS.length, 21);
});

test('validateCurriculum rejects an unknown metric and accepts a known one', () => {
    const curriculum = (metric: string) => ({
        track: 'guitar', version: 1,
        levels: [{ id: 'g-l1', name: 'Level', subtitle: 'Sub', modules: [{ id: 'g-l1-m1', name: 'Module', promise: 'Do a thing', proofMetric: metric, lessons: [{ id: 'g-l1-m1-01', title: 'Lesson', type: 'concept', minutes: 3, summary: 'A summary' }] }] }],
    });
    assert.throws(() => validateCurriculum(curriculum('rate_hz'), 'guitar'), /Unknown proofMetric: "rate_hz"/, 'the vibrato rate nothing measures must not validate');
    assert.throws(() => validateCurriculum(curriculum('flag_clear'), 'guitar'), /Unknown proofMetric/, 'nor the strain check nothing performs');
    assert.throws(() => validateCurriculum(curriculum('tempo_bmp'), 'guitar'), /Unknown proofMetric/, 'nor a typo of a real one');
    assert.doesNotThrow(() => validateCurriculum(curriculum('tempo_bpm'), 'guitar'));
    // The whole catalog is validated at import, so an unknown value does not
    // merely fail a test: the app stops booting.
    assert.doesNotThrow(() => validateCurriculum(JSON.parse(readFileSync(`${DATA}/voice.json`, 'utf8')), 'voice'));
});

test('a module never carries a measured metric over a self-reported basis', () => {
    const voice = JSON.parse(readFileSync(`${DATA}/voice.json`, 'utf8')) as unknown;
    const metrics = new Map<string, ProofMetric>();
    const walk = (node: unknown) => {
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (!node || typeof node !== 'object') return;
        const record = node as Record<string, unknown>;
        if (typeof record.proofMetric === 'string' && isProofMetric(record.proofMetric)) metrics.set(String(record.id), record.proofMetric);
        Object.values(record).forEach(walk);
    };
    walk(voice);

    assert.equal(metrics.size, Object.keys(VOICE_MODULE_PROOF).length, 'every voice module with a recorded proof basis has a metric and the reverse');
    for (const [id, metric] of metrics) {
        const proof = VOICE_MODULE_PROOF[id];
        assert.ok(proof, `${id} carries ${metric} with no recorded proof basis`);
        if (proof.basis.kind === 'measured')
            assert.ok(claimsMeasurement(metric), `${id} rests on the measurement ${proof.basis.measurement} but its metric ${metric} is ${proofMetricKind(metric)}`);
        else
            assert.ok(!claimsMeasurement(metric), `${id} is self-reported because ${proof.basis.missing} does not exist, but ${metric} claims a measurement. This is the exact shape of the defect the contract work found: a checkpoint telling a singer something was measured when it was not.`);
    }
});

test('the tracks carry a metric; the song catalogue does not', () => {
    const modules = everyProofMetric().filter(entry => entry.hasLessons);
    const byFile = new Map<string, number>();
    for (const entry of modules) byFile.set(entry.file, (byFile.get(entry.file) ?? 0) + 1);
    assert.equal(byFile.get(`${DATA}/guitar.json`), 35);
    assert.equal(byFile.get(`${DATA}/voice.json`), 34);
    // `proofMetric` stays optional for exactly this reason, and the reason is
    // pinned rather than assumed: a song module's proof is playing the song.
    const songs = JSON.parse(readFileSync(`${DATA}/song-guitar.json`, 'utf8')) as { levels: { modules: { id: string; proofMetric?: string }[] }[] };
    const songModules = songs.levels.flatMap(level => level.modules);
    assert.equal(songModules.length, 6);
    assert.deepEqual(songModules.filter(entry => entry.proofMetric !== undefined), []);
});

test('the two values that name no measurable quantity are the two recorded as such', () => {
    const unspecified = PROOF_METRICS.filter(metric => proofMetricKind(metric) === 'unspecified');
    assert.deepEqual(unspecified, ['composite'], 'if a second unnamed quantity appears, the scope note in proof-metrics.ts is no longer true');
    const carriers = everyProofMetric().filter(entry => entry.metric === 'composite');
    assert.deepEqual(carriers.map(entry => entry.id), ['g-l7-m6'], 'composite sits on the three-song set in stage seven, which has no lesson bodies yet (W19) and can be given a real metric when it is authored');
    assert.ok(PROOF_METRICS.includes('three_pass_pitch_slots_at_90_bpm'), 'the other flagged value: a tempo inside a metric name, which belongs in the practice specification');
});

test('the kinds partition the vocabulary the way the registry says', () => {
    const tally: Record<string, number> = {};
    for (const metric of PROOF_METRICS) tally[proofMetricKind(metric)] = (tally[proofMetricKind(metric)] ?? 0) + 1;
    assert.deepEqual(tally, { measured: 15, selfReported: 3, mixed: 2, unspecified: 1 });
    // `mixed` asserts a measurement for its measured half, which is why it is not
    // a third category for the purposes of the honesty check above.
    assert.equal(claimsMeasurement('attack_timing_score_and_manual_study'), true);
    assert.equal(claimsMeasurement('self_reported'), false);
    assert.equal(Object.keys(PROOF_METRIC_KIND).length, PROOF_METRICS.length);
    assert.deepEqual(PROOF_METRICS, [...PROOF_METRICS].sort(), 'keep the registry sorted so an addition is visible in review');
});

test('the native authoring recommendations still disagree with the catalog, and only there', () => {
    // beginner-guitar-instruction.json carries recommendedModuleMetadata with a
    // proofMetric per module. Nothing in lib/ or tests/ read integrationNote
    // before this test, so three recommendations have sat unapplied and
    // uncontradicted. Recorded, not resolved: adopting them changes what a
    // module promises, which is a native authoring decision, not a typing one.
    const instruction = JSON.parse(readFileSync(`${DATA}/beginner-guitar-instruction.json`, 'utf8')) as {
        integrationNote: { recommendedModuleMetadata: { id: string; proofMetric: string }[] };
    };
    const catalog = new Map(everyProofMetric().filter(entry => entry.file === `${DATA}/guitar.json`).map(entry => [entry.id, entry.metric]));
    const disagreements = instruction.integrationNote.recommendedModuleMetadata
        .filter(entry => catalog.has(entry.id) && catalog.get(entry.id) !== entry.proofMetric)
        .map(entry => `${entry.id}: catalog ${catalog.get(entry.id)}, recommended ${entry.proofMetric}`);
    assert.deepEqual(disagreements, [
        'g-l1-m1: catalog count_in_window, recommended open_string_pitch_and_self_check',
        'g-l1-m2: catalog duration_sec, recommended six_string_tuning_check',
        'g-l1-m3: catalog recall_pct, recommended reading_quiz_first_attempt',
    ], 'a fourth disagreement, or one of these resolving, is a change worth seeing in review');
    for (const entry of instruction.integrationNote.recommendedModuleMetadata)
        assert.ok(isProofMetric(entry.proofMetric), `${entry.id} recommends ${entry.proofMetric}, which is outside the shared vocabulary`);
});

test('the tracks share two metrics and the rest are their own', () => {
    const forFile = (file: string) => new Set(everyProofMetric().filter(entry => entry.file === `${DATA}/${file}` && entry.hasLessons).map(entry => entry.metric));
    const guitar = forFile('guitar.json'), voice = forFile('voice.json');
    const shared = [...guitar].filter(metric => voice.has(metric)).sort();
    assert.deepEqual(shared, ['accuracy_pct', 'cents_deviation'], 'the two quantities both an instrument and a voice can be judged on');
    // The spec said the guitar track uses five values the voice track does not.
    // It uses ten. Counted here so the document cannot drift back.
    assert.equal([...guitar].filter(metric => !voice.has(metric)).length, 10);
    assert.equal([...voice].filter(metric => !guitar.has(metric)).length, 6);
});
