import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import voice from '../lib/learning/data/voice.json' with { type: 'json' };
import vocal from '../contracts/suede-vocal.json' with { type: 'json' };
import { ADJUDICATIONS } from '../contracts/adjudications.ts';
import { CROSS_DOMAIN_PROPOSAL } from '../lib/query-ownership.ts';
import * as sessions from '../lib/learning-sync/sing-sessions.ts';
import nextConfig from '../next.config.ts';

const file = 'contracts/suede-voice-curriculum.json';
function contract() {
    assert.ok(existsSync(file), 'Sing-owned curriculum contract must be vendored');
    return JSON.parse(readFileSync(file, 'utf8'));
}

test('the Sing catalog carries every lesson GuitarHub used to render, under the same IDs', () => {
    const data = contract();
    assert.equal(data.contract, 'suede-voice-curriculum');
    assert.equal(data.version, 1);
    assert.equal(data.ownership.catalogRepository, 'JasonColapietro/sing');
    // Titles and access diverge on purpose: Sing retitled the unmeasured
    // checkpoints as self-checks and made every stage free. voice.json stays as
    // the native learning contract's copy, so only the identities must agree.
    const ids = (curriculum: typeof voice) => curriculum.levels.map(level => [level.id, level.modules.map(module => [module.id, module.lessons.map(lesson => lesson.id)])]);
    assert.deepEqual(ids(data.curriculum), ids(voice));
    assert.equal(voice.levels.length, 7);
    assert.equal(voice.levels.reduce((count, level) => count + level.modules.length, 0), 34);
    const lessons = voice.levels.flatMap(level => level.modules.flatMap(module => module.lessons));
    assert.equal(lessons.length, 102);
    assert.equal(new Set(lessons.map(lesson => lesson.id)).size, 102);
});

test('the decided classifier policy agrees with reachable outputs and retains bass-baritone reference routing', () => {
    const data = contract();
    assert.deepEqual(vocal.taxonomy.classifiableVoiceTypes.map(type => type.id), data.policies.classifierLabels);
    assert.ok(vocal.taxonomy.referenceBands['Bass-baritone']);
    assert.ok(vocal.taxonomy.passaggio.zones['Bass-baritone']);
    const decision = ADJUDICATIONS.find(entry => entry.id === 'classifiableVoiceTypes');
    assert.ok(decision);
    assert.equal(Reflect.get(decision, 'decidedBy'), data.ownership.decidedBy);
    assert.equal(Reflect.get(decision, 'decisionDate'), data.ownership.decisionDate);
});

test('history-only policy preserves a valid scan without accepting its asserted pass or rewards', () => {
    assert.equal(Reflect.get(sessions, 'SING_IMPORT_COMPLETION_POLICY'), contract().policies.importedSessionCompletion);
    const date = '2026-09-14T12:00:00.000Z';
    const result = sessions.importSingSessions({
        sessions: [{ id: 'scan', type: 'range', day: '2026-09-14', date, durationSec: 40,
            assessment: 'ready', score: 100, xp: 1000, achievements: ['complete'], streak: { current: 99 } } as sessions.SingSession],
        rangeTests: [{ lowMidi: 45, highMidi: 69, testedAt: date }],
        attemptIds: new Map([['scan', '00000000-0000-4000-8000-000000000001']]),
        allowedLessons: new Map([['v-l1-m2-04', 'voice']]),
    });
    assert.equal(result.counts.imported, 1);
    const [attempt] = result.attempts;
    assert.equal(attempt.assessment, 'repeat');
    assert.equal(attempt.score, null);
    assert.equal(attempt.practiceSeconds, 40);
    assert.equal(attempt.source, 'legacy');
    assert.deepEqual(attempt.details.singRangeTest, { lowMidi: 45, highMidi: 69, testedAt: date });
    for (const field of ['xp', 'achievements', 'streak']) {
        assert.equal(Object.hasOwn(attempt, field), false);
        assert.equal(Object.hasOwn(attempt.details, field), false);
        assert.equal(Object.hasOwn(attempt.details.singSession as object, field), false);
    }
});

test('every voice lesson URL redirects permanently to its twin on Sing, and no open evidence is claimed done', async () => {
    const data = contract();
    const urls = JSON.parse(readFileSync('contracts/suede-voice-lesson-urls.json', 'utf8'));
    assert.equal(CROSS_DOMAIN_PROPOSAL.decidedBy, data.ownership.decidedBy);
    assert.equal(Reflect.get(CROSS_DOMAIN_PROPOSAL, 'phase'), 'hosted');
    assert.equal(data.migration.phase, 'hosted');
    assert.equal(data.migration.redirectsEnabled, true);
    assert.equal(data.ownership.lessonBaseUrl, `${urls.origin}${urls.course}`);
    assert.deepEqual(Reflect.get(CROSS_DOMAIN_PROPOSAL, 'requiredEvidence'), data.migration.requiredEvidence);
    assert.match(data.migration.resolution.vocalReview, /^Open\./);
    assert.match(data.migration.resolution.deviceAudio, /^Open\./);

    const redirects = (await nextConfig.redirects!()) ?? [];
    const bySource = new Map(redirects.map(redirect => [redirect.source, redirect]));
    const lessons = voice.levels.flatMap(level => level.modules.flatMap(module => module.lessons));
    for (const lesson of lessons) {
        const redirect = bySource.get(`/learn/voice/${lesson.id}`);
        assert.ok(redirect, `${lesson.id} has no redirect`);
        assert.equal(redirect.destination, `${urls.origin}${urls.lessons[lesson.id]}`);
        assert.equal(redirect.permanent, true);
    }
    for (const source of ['/learn/voice', '/learn/voice/materials', '/learn/voice/:rest*']) {
        assert.equal(bySource.get(source)?.destination, `${urls.origin}${urls.course}`, source);
    }
    // The catch-all comes after every lesson, or it would swallow them.
    const sources = redirects.map(redirect => redirect.source);
    assert.equal(sources.indexOf('/learn/voice/:rest*'), sources.length - 1);
    assert.ok(!redirects.some(redirect => redirect.source.startsWith('/learn/guitar')), 'the guitar path stays here');
});


test('curriculum vendor command compares bytes, rejects stale or absent references, and never tolerates a 404', () => {
    const script = resolve('scripts/sync-sing-curriculum.mjs');
    assert.ok(existsSync(script), 'strict curriculum vendor entry point must exist');
    const root = mkdtempSync(join(tmpdir(), 'voice-curriculum-vendor-'));
    try {
        const consumer = join(root, 'consumer');
        const publisher = join(root, 'publisher');
        mkdirSync(join(consumer, 'contracts'), { recursive: true });
        mkdirSync(join(publisher, 'contracts'), { recursive: true });
        writeFileSync(join(consumer, file), '{"version":1}\n');
        writeFileSync(join(publisher, file), '{"version":1}\n');
        const run = (...args: string[]) => spawnSync(process.execPath, [script, '--check', ...args], { cwd: consumer, encoding: 'utf8' });
        const equal = run(`--sing=${publisher}`);
        assert.equal(equal.status, 0, equal.stderr);
        assert.match(equal.stdout, /Verified/);
        writeFileSync(join(publisher, file), '{"version":2}\n');
        const stale = run(`--sing=${publisher}`);
        assert.notEqual(stale.status, 0);
        assert.match(stale.stderr, /stale vendored contract/);
        assert.equal(readFileSync(join(consumer, file), 'utf8'), '{"version":1}\n', 'check must never write');
        assert.notEqual(run(`--sing=${join(root, 'missing')}`).status, 0);
        // Intercept only the HTTP boundary; execute the real vendor CLI and error policy.
        const hook = 'data:text/javascript,' + encodeURIComponent("globalThis.fetch = async () => new Response('', {status:404});");
        const missing = spawnSync(process.execPath, ['--import', hook, script, '--check'], { cwd: consumer, encoding: 'utf8' });
        assert.notEqual(missing.status, 0);
        assert.match(missing.stderr, /does not publish/);
        assert.doesNotMatch(missing.stdout, /Verified|Provisional/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
