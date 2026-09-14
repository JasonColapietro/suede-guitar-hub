import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ADJUDICATIONS, ADJUDICATION_COUNT, OBSERVED_VALUE_COUNT, readContractValue, type Adjudication, type SurfaceValue } from '../contracts/adjudications.ts';
import { DEFAULT_PITCH_BAND, MINIMUM_CLARITY, asciiNoteName, noteName, DISPLAY_SHARP, COMPARISON_SHARP } from '../lib/audio/dsp.ts';
import { TEMPO_ADVANCE_SCORE, TEMPO_EVIDENCE_MINIMUM, TEMPO_FLOOR_SCORE } from '../lib/audio/practice-tempo.ts';

/** Every live value in the register, keyed by the `source` it names. The
 * register restates these numbers deliberately; this table is what makes the
 * restatement checkable rather than decorative. */
const LIVE: Record<string, number | string | readonly number[]> = {
    'lib/audio/dsp.ts noteName': DISPLAY_SHARP,
    'lib/audio/dsp.ts MINIMUM_CLARITY': MINIMUM_CLARITY,
    'lib/audio/dsp.ts DEFAULT_PITCH_BAND': [DEFAULT_PITCH_BAND.minimumFrequency, DEFAULT_PITCH_BAND.maximumFrequency],
    'lib/audio/practice-tempo.ts TEMPO_ADVANCE_SCORE': TEMPO_ADVANCE_SCORE,
    'lib/audio/practice-tempo.ts TEMPO_EVIDENCE_MINIMUM': TEMPO_EVIDENCE_MINIMUM,
    'lib/audio/practice-tempo.ts TEMPO_FLOOR_SCORE': TEMPO_FLOOR_SCORE,
};

/** Entries whose claim is not a single JSON key, so the generic path check
 * cannot reach it and a named test below must. Listing them here rather than
 * skipping silently means a new pathless entry fails until someone writes its
 * test. */
const ASSERTED_BY_NAME = new Set(['pitchToleranceCents/guitarHubWeb', 'hissTargetVersusSustainLadder/guitarHubWeb', 'classifiableVoiceTypes/sing']);

const byId = (id: string): Adjudication => {
    const found = ADJUDICATIONS.find(entry => entry.id === id);
    assert.ok(found, `no adjudication ${id}`);
    return found;
};
const onSurface = (id: string, surface: string): SurfaceValue => {
    const found = byId(id).surfaces.find(value => value.surface === surface);
    assert.ok(found, `${id} records nothing for ${surface}`);
    return found;
};

test('the register is the fifteen the spec says it is, with unique sorted ids', () => {
    assert.equal(ADJUDICATIONS.length, ADJUDICATION_COUNT);
    const ids = ADJUDICATIONS.map(entry => entry.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate adjudication id');
    assert.deepEqual(ids, [...ids].sort(), 'keep ids sorted so an addition is visible in review');
});

test('the decision tally is the one the spec prints', () => {
    // docs/vocal-integration-spec.md states these counts in prose. A decision
    // that quietly changes kind would make the document wrong with nothing to
    // say so.
    const tally: Record<string, number> = {};
    for (const entry of ADJUDICATIONS) tally[entry.decision] = (tally[entry.decision] ?? 0) + 1;
    assert.deepEqual(tally, { divergent: 5, unify: 5, recordedUpstream: 3, featureGap: 1, notComparable: 1 });
    const assigned = ADJUDICATIONS.filter(entry => entry.pendingOn && entry.pendingOn !== 'guitarHubWeb');
    assert.equal(assigned.length, 4, 'the spec says four unify decisions wait on another surface');
    assert.equal(assigned.filter(entry => entry.pendingOn === 'sing').length, 3, 'three on sing');
    assert.equal(assigned.filter(entry => entry.pendingOn === 'guitarHubNative').length, 1, 'one on native');
});

test('every decision is shaped like a decision', () => {
    for (const entry of ADJUDICATIONS) {
        assert.ok(entry.surfaces.length >= 2, `${entry.id}: an adjudication needs at least two surfaces to disagree`);
        assert.ok(entry.reason.length > 120, `${entry.id}: a one-line reason is a restatement, not a decision`);
        if (entry.decision === 'unify')
            assert.ok(entry.pendingOn, `${entry.id}: unify without pendingOn is a decision with no owner`);
        else
            assert.equal(entry.pendingOn, undefined, `${entry.id}: only a unify decision has a surface that must move`);
    }
});

test('every live value still equals the constant it restates', () => {
    const live = ADJUDICATIONS.flatMap(entry => entry.surfaces.filter(value => value.binding === 'live').map(value => [entry, value] as const));
    assert.ok(live.length > 0);
    for (const [entry, value] of live) {
        if (!(value.source in LIVE)) {
            // A free-text live value (a rule, not a number) cannot be bound to a
            // constant; it must be named in a test of its own instead.
            assert.equal(typeof value.value, 'string', `${entry.id}: live value from ${value.source} is not in LIVE and is not prose`);
            continue;
        }
        assert.deepEqual(value.value, LIVE[value.source], `${entry.id}: ${value.source} has moved and the register has not`);
    }
});

test('every contract value still equals the path it names', () => {
    for (const entry of ADJUDICATIONS) {
        for (const value of entry.surfaces) {
            if (value.binding !== 'contract') continue;
            if (value.path === undefined) {
                assert.ok(ASSERTED_BY_NAME.has(`${entry.id}/${value.surface}`), `${entry.id}/${value.surface}: no path and no named test`);
                continue;
            }
            const file = value.source.split(' ')[0];
            if (typeof value.path === 'string') {
                assert.deepEqual(readContractValue(file, value.path), value.value, `${entry.id}: ${file} ${value.path} has moved`);
                continue;
            }
            const expected = value.value;
            assert.ok(Array.isArray(expected), `${entry.id}: one path per element needs an array value`);
            assert.equal(value.path.length, expected.length, `${entry.id}: paths and values must line up`);
            value.path.forEach((path, index) => {
                assert.deepEqual(readContractValue(file, path), expected[index], `${entry.id}: ${file} ${path} has moved`);
            });
        }
    }
});

test('a recordedUpstream decision is really recorded upstream', () => {
    const divergences = JSON.parse(readFileSync('contracts/suede-vocal.json', 'utf8')).knownDivergences as Record<string, { reason: string }>;
    for (const entry of ADJUDICATIONS) {
        if (entry.decision !== 'recordedUpstream') continue;
        assert.ok(entry.id in divergences, `${entry.id} claims to be adjudicated in the vocal contract and is not. Either it moved there under another name, or this entry is claiming a decision nobody made.`);
        assert.ok(divergences[entry.id].reason.length > 40, `${entry.id}: the upstream record has no reason, so pointing at it settles nothing`);
    }
});

test('the observed half is counted, not waved at', () => {
    const observed = ADJUDICATIONS.filter(entry => entry.surfaces.some(value => value.binding === 'observed'));
    assert.equal(observed.length, OBSERVED_VALUE_COUNT, 'an entry gained or lost an unverifiable value; move the pin deliberately and say which');
    for (const entry of observed)
        assert.ok(entry.surfaces.some(value => value.binding !== 'observed'), `${entry.id}: every value observed means nothing here can fail when either side moves`);
});

test('nothing outside the test directory imports the register', () => {
    // The register restates contract numbers, which docs/practice-tools.md
    // forbids doing in a configuration. The distinction holds only while no
    // runtime code reads it.
    const offenders: string[] = [];
    const walk = (directory: string) => {
        for (const name of readdirSync(directory)) {
            if (name === 'node_modules' || name === '.next' || name === '.git') continue;
            const path = join(directory, name);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (!/\.(ts|tsx|mjs|js)$/.test(name)) continue;
            if (path.startsWith('tests/')) continue;
            // An import, not a mention: lib/audio/dsp.ts points at the register in
            // a comment, which is the cross-reference working as intended.
            if (/(?:from|require\s*\(|import\s*\()\s*['"][^'"]*adjudications/.test(readFileSync(path, 'utf8'))) offenders.push(path);
        }
    };
    for (const root of ['app', 'components', 'lib', 'contracts', 'scripts']) walk(root);
    assert.deepEqual(offenders, [], 'the register is a decision record read by its test, not a configuration');
});

test('pitch tolerance is 35 on every authored spec, which is the value W2 must not copy', () => {
    const specs: { toleranceCents: number }[] = [];
    const walk = (node: unknown) => {
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (!node || typeof node !== 'object') return;
        const record = node as Record<string, unknown>;
        if ('toleranceCents' in record && 'targets' in record) specs.push(record as unknown as { toleranceCents: number });
        Object.values(record).forEach(walk);
    };
    walk(JSON.parse(readFileSync('contracts/learning.json', 'utf8')));
    assert.equal(specs.length, 39, 'the spec count moved; the register says "every authored spec" and the W2 answer depends on which these are');
    assert.deepEqual([...new Set(specs.map(spec => spec.toleranceCents))], [35]);
    assert.equal(onSurface('pitchToleranceCents', 'guitarHubWeb').value, 35);

    const answer = byId('pitchToleranceCents').resolves?.find(item => item.item === 'W2');
    assert.ok(answer, 'W2 reads its tolerance off this entry');
    const sung = readContractValue('contracts/suede-vocal.json', 'pitch.sungToleranceCents') as number;
    assert.ok(answer.answer.includes(String(sung)), `the W2 answer must name the sung tolerance the contract publishes (${sung})`);
    assert.ok(sung >= 1 && sung <= 100, 'the answer claims no schema change is needed, so it has to fit the validated range');
});

test('the twelve-second hiss keeps naming the ladder rung it clears', () => {
    const voice = readFileSync('lib/learning/data/voice.json', 'utf8');
    const voiceData = JSON.parse(voice) as unknown;
    const found: { id: string; promise: string; lessons: { summary: string }[] }[] = [];
    const walk = (node: unknown) => {
        if (Array.isArray(node)) { node.forEach(walk); return; }
        if (!node || typeof node !== 'object') return;
        const record = node as Record<string, unknown>;
        if (record.id === 'v-l1-m3') found.push(record as never);
        Object.values(record).forEach(walk);
    };
    walk(voiceData);
    assert.equal(found.length, 1, 'v-l1-m3 is the module this adjudication is about');
    assert.match(found[0].promise, /twelve-second/, 'the register records twelve; the promise has to still say it');

    const ladder = byId('hissTargetVersusSustainLadder').surfaces.find(value => value.surface === 'sing')!.value as readonly number[];
    const [first] = ladder;
    const target = onSurface('hissTargetVersusSustainLadder', 'guitarHubWeb').value as number;
    assert.ok(target > first && target < ladder[1], `twelve has to sit between the first two rungs (${first}, ${ladder[1]}) for the reframing to be true`);
    // The prose spells the rung as a word, so the number and the word are
    // asserted separately: if the ladder's first rung moves off ten, the first
    // assertion fails and the sentence has to be rewritten.
    assert.equal(first, 10, 'the checkpoint sentence names ten; a different first rung makes that sentence false');
    assert.ok(
        found[0].lessons.some(lesson => lesson.summary.includes('first mark at ten')),
        'the checkpoint must keep naming the rung twelve seconds clears; without that sentence this entry is an unreconciled difference, not a recorded one',
    );
});

test('the accidental unification is done, not merely decided', () => {
    const entry = byId('accidentalGlyph');
    assert.equal(entry.pendingOn, 'guitarHubWeb', 'this is the one whose losing surface is here');
    const glyph = readContractValue('contracts/suede-vocal.json', 'pitch.accidentalGlyph') as string;
    assert.equal(glyph, COMPARISON_SHARP);
    assert.equal(noteName(61), `C${DISPLAY_SHARP}4`, 'display keeps the typographic sharp');
    assert.equal(asciiNoteName(61), `C${glyph}4`, 'comparison uses the spelling the vocal contract publishes');
    for (const midi of [0, 13, 61, 70, 127])
        assert.equal(asciiNoteName(midi), noteName(midi).replaceAll(DISPLAY_SHARP, glyph));
    assert.ok(!asciiNoteName(61).includes(DISPLAY_SHARP));
    // The gap the entry admits: no flat spelling exists to unify yet.
    assert.ok(!noteName(61).includes('♭') && !asciiNoteName(61).includes('b'), 'if a flat spelling appears, this adjudication needs a second half');
});

test('W13 reads its staleness answer off the register', () => {
    const entry = byId('frameStaleness');
    const answer = entry.resolves?.find(item => item.item === 'W13');
    assert.ok(answer, 'W17 gates W13; the gate has to be answered here');
    const pinned = onSurface('frameStaleness', 'guitarHubNative').value as number;
    const target = onSurface('frameStaleness', 'sing').value as number;
    assert.ok(target < pinned, 'the decision is to tighten, so the target has to be the smaller number');
    assert.ok(answer.answer.includes(String(pinned)), 'the answer names the figure W13 must not treat as a latency budget');
});

test('the voice taxonomy gap is six of eight, and both unreachable labels can still be routed', () => {
    // This entry is the only one whose two values sit on the same surface for a
    // reason other than starScales': the disagreement is between sing's
    // classifier and sing's own published taxonomy, and this repository is
    // downstream of both. Neither value is a single JSON key, so it is asserted
    // here by name rather than by a dotted path.
    const contract = JSON.parse(readFileSync('contracts/suede-vocal.json', 'utf8')) as {
        taxonomy: {
            voiceKinds: string[];
            classifiableVoiceTypes: { id: string; label: string }[];
            referenceBands: Record<string, { low: number; high: number }>;
            passaggio: { zones: Record<string, { low: number; high: number }> };
        };
        knownDivergences: { classifiableVoiceTypes: { surfaces: { web: string[]; editorial: string[] } } };
    };
    const { voiceKinds, classifiableVoiceTypes, referenceBands, passaggio } = contract.taxonomy;
    const reachable = classifiableVoiceTypes.map(type => type.label);
    const unreachable = voiceKinds.filter(kind => !reachable.includes(kind));
    assert.equal(reachable.length, 6, 'the register records six reachable labels');
    assert.equal(voiceKinds.length, 8, 'and eight published categories');
    assert.deepEqual(unreachable, ['Bass-baritone', 'Countertenor'], 'the register names these two by hand; a third would make its reason wrong');

    // The half that makes the gap safe rather than merely recorded: a label the
    // classifier cannot produce is still a label this repository can route on,
    // because the published data covers all eight.
    for (const kind of voiceKinds) {
        assert.ok(referenceBands[kind], `${kind} has no reference band to route to`);
        assert.ok(passaggio.zones[kind], `${kind} has no passaggio zone`);
    }

    const surfaces = contract.knownDivergences.classifiableVoiceTypes.surfaces;
    assert.equal(surfaces.web.length, reachable.length, 'the upstream record and the taxonomy have to agree about how many are reachable');
    assert.deepEqual(surfaces.editorial, voiceKinds, 'and about which eight are published');
    assert.deepEqual(surfaces.web, classifiableVoiceTypes.map(type => type.id));

    // The register's own prose is the decision, so it has to keep naming the
    // labels and the overlap the tradeoff turns on.
    const entry = byId('classifiableVoiceTypes');
    const recorded = entry.surfaces.map(value => String(value.value)).join(' ');
    for (const label of [...unreachable, ...classifiableVoiceTypes.map(type => type.id)])
        assert.ok(recorded.includes(label), `the recorded values must name ${label}`);
    const bass = referenceBands['Bass'], baritone = referenceBands['Baritone'], bassBaritone = referenceBands['Bass-baritone'];
    assert.ok(bassBaritone.low > bass.low && bassBaritone.low < baritone.low && bassBaritone.high > bass.high && bassBaritone.high < baritone.high,
        'the reason argues that a bass-baritone band overlaps both neighbours rather than filling a gap; if the bands move, that argument has to be rewritten');
    for (const figure of [bass.low, bass.high, baritone.low, baritone.high, bassBaritone.low, bassBaritone.high])
        assert.ok(entry.reason.includes(String(figure)), `the reason cites the band figures; ${figure} has moved`);

    const answer = entry.resolves?.find(item => item.item === 'W23');
    assert.ok(answer, 'W23 reads its taxonomy answer off the register');
    assert.ok(/repository owner/.test(answer.answer), 'the decision must retain its product authority');
    assert.ok(/bass-baritone/i.test(answer.answer), 'the decision must name the reference-only category');
    assert.equal(entry.pendingOn, undefined, 'the owner is a person, not a surface that has to move a value');
});
