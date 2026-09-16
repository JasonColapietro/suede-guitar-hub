/**
 * Holds the session-to-lesson mapping to the two things it claims about.
 *
 * The mapping is a set of assertions about another repository's record and about
 * this one's curriculum, and both move. A table of lesson identifiers in a
 * comment would have gone stale the first time a lesson was renumbered and
 * nothing would have noticed, which is the same class of unverifiable claim this
 * change-set has been removing everywhere else.
 *
 * So: every activity type sing publishes has exactly one entry here, every
 * lesson identifier named resolves against the live voice curriculum, every
 * claim of ambiguity is checked to still have more than one candidate, and the
 * outcome counts are proved to account for every session handed in.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import contract from '../contracts/suede-progress.json' with { type: 'json' };
import {
    SING_SESSION_MAPPING,
    SING_SESSION_OUTCOMES,
    importSingSessions,
    type SingRangeTest,
    type SingSession,
    type SingSessionOutcome,
} from '../lib/learning-sync/sing-sessions.ts';
import { getLesson } from '../lib/learning/curriculum.ts';
import type { LearningTrack } from '../lib/learning-account/contracts.ts';

const VOICE_LESSONS = new Map<string, LearningTrack>(
    Object.values(SING_SESSION_MAPPING)
        .flatMap((mapping) => (mapping.verdict === 'mapped' ? [mapping.lessonId] : mapping.verdict === 'ambiguous' ? [...mapping.candidates] : []))
        .map((lessonId) => [lessonId, 'voice' as LearningTrack]),
);

const RANGE_TEST: SingRangeTest = { lowMidi: 48, highMidi: 72, testedAt: '2026-01-04T09:00:00.000Z' };

function session(over: Partial<SingSession> & { type: string }): SingSession {
    return { id: `sing-${over.type}-1`, date: '2026-01-04T09:00:00.000Z', day: '2026-01-04', durationSec: 300, ...over };
}

/** One session of every activity type sing publishes, so a count is a count of
 * the real vocabulary rather than of whichever types a test author remembered. */
function oneOfEach(): SingSession[] {
    return contract.session.activityTypes.map((type, index) => session({ type, id: `sing-${type}-${index}` }));
}

function run(sessions: readonly SingSession[], over: Partial<Parameters<typeof importSingSessions>[0]> = {}) {
    return importSingSessions({
        sessions,
        rangeTests: [RANGE_TEST],
        attemptIds: new Map(sessions.map((item, index) => [item.id, `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`])),
        allowedLessons: VOICE_LESSONS,
        ...over,
    });
}

test('every activity type sing publishes has exactly one verdict here', () => {
    // The list comes from the vendored contract, not from this repository, so
    // sing adding a tenth activity type fails this test on the next re-sync
    // instead of being silently mapped to nothing.
    assert.deepEqual(Object.keys(SING_SESSION_MAPPING).sort(), [...contract.session.activityTypes].sort());
});

test('every lesson identifier the mapping names is one the curriculum authored', () => {
    for (const [activity, mapping] of Object.entries(SING_SESSION_MAPPING)) {
        const named = mapping.verdict === 'mapped' ? [mapping.lessonId] : mapping.verdict === 'ambiguous' ? mapping.candidates : [];
        for (const lessonId of named) {
            assert.ok(getLesson('voice', lessonId), `${activity} names ${lessonId}, which the voice curriculum does not contain`);
        }
    }
});

test('a claim of ambiguity still has something to be ambiguous between', () => {
    // If the curriculum is ever reorganised so that only one candidate survives,
    // the ambiguity is resolvable and this mapping should become a `mapped` entry
    // rather than keep refusing on a reason that has stopped being true.
    for (const [activity, mapping] of Object.entries(SING_SESSION_MAPPING)) {
        if (mapping.verdict !== 'ambiguous') continue;
        assert.ok(mapping.candidates.length > 1, `${activity} claims ambiguity but names ${mapping.candidates.length} candidate(s); the reason no longer holds`);
        assert.equal(new Set(mapping.candidates).size, mapping.candidates.length, `${activity} lists a candidate twice`);
    }
});

test('every verdict states its reasoning, because an unreasoned refusal gets overturned', () => {
    for (const [activity, mapping] of Object.entries(SING_SESSION_MAPPING)) {
        assert.ok(mapping.because.length > 80, `${activity} needs a stated reason, not a label`);
        if (mapping.verdict === 'mapped') assert.ok(mapping.establishes.length > 80, `${activity} must say what a mapped record does and does not establish`);
    }
});

test('one of nine maps, and the other eight are counted rather than dropped', () => {
    const result = run(oneOfEach());
    assert.equal(result.total, contract.session.activityTypes.length);
    assert.equal(result.attempts.length, 1);
    assert.deepEqual(result.counts, {
        ambiguousEvidence: 0,
        ambiguousLesson: 4,
        evidenceMissing: 0,
        identityUnassigned: 0,
        imported: 1,
        lessonNotAllowed: 0,
        noCorrespondingLesson: 4,
        unreadable: 0,
    } satisfies Record<SingSessionOutcome, number>);
});

test('the counts account for every session handed in, whatever is wrong with them', () => {
    const sessions = [
        ...oneOfEach(),
        session({ type: 'meditation', id: 'unknown-type' }),
        session({ type: 'range', id: 'bad-date', date: 'not a date' }),
        session({ type: 'range', id: 'too-long', durationSec: 90_000 }),
        session({ type: 'range', id: 'no-range-test', day: '2026-02-01', date: '2026-02-01T09:00:00.000Z' }),
    ];
    const result = run(sessions);
    const total = SING_SESSION_OUTCOMES.reduce((sum, outcome) => sum + result.counts[outcome], 0);
    assert.equal(total, sessions.length, 'a session that matched no outcome is a session this module dropped silently');
    assert.equal(result.counts.unreadable, 3);
    assert.equal(result.counts.evidenceMissing, 1);
});

test('a session with no persisted attempt id is counted, never given an invented one', () => {
    // Sing ids are epoch-plus-random, which accountUUID rejects. Minting a UUID
    // per run would make the same practice arrive again on every import, and the
    // ledger is append-only, so there would be no correction afterwards.
    const sessions = [session({ type: 'range' })];
    const result = run(sessions, { attemptIds: new Map() });
    assert.equal(result.attempts.length, 0);
    assert.equal(result.counts.identityUnassigned, 1);
});

test('a lesson outside the caller allowance is counted, not thrown', () => {
    const result = run(oneOfEach(), { allowedLessons: new Map() });
    assert.equal(result.attempts.length, 0);
    assert.equal(result.counts.lessonNotAllowed, 1, 'one import being outside the allowance must not fail the other eight classifications');
    assert.equal(result.counts.noCorrespondingLesson, 4);
});

test('an imported attempt can never mark a lesson ready', () => {
    // The decided policy is history-only. The transport forces every legacy
    // attempt to "repeat", so a singer's history
    // arriving here cannot complete a single authored lesson no matter how it is
    // described on the way in.
    const [attempt] = run([session({ type: 'range' })]).attempts;
    assert.equal(attempt.assessment, 'repeat');
    assert.equal(attempt.source, 'legacy');
    assert.equal(attempt.disposition, 'imported');
    assert.equal(attempt.score, null);
});

test('no XP, streak or achievement crosses the boundary', () => {
    // The vendored contract marks all three unimportable, and the streak is a
    // decision rather than a missing field: this repository argues in published
    // copy that a streak measures attendance, and a field arriving in an
    // attempt's free-form details would be found and rendered eventually.
    assert.equal(contract.portability.xp.importable, false);
    assert.equal(contract.portability.streak.importable, false);
    assert.equal(contract.portability.achievements.importable, false);

    const banned = ['xp', 'streak', 'achievements', 'current', 'best', 'lastDay'];
    const keysOf = (value: unknown): string[] =>
        Array.isArray(value) ? value.flatMap(keysOf)
            : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, entry]) => [key, ...keysOf(entry)])
                : [];
    const sessions = [{ ...session({ type: 'range' }), xp: 40, streak: { current: 9, best: 12, lastDay: '2026-01-04' } } as SingSession];
    for (const attempt of run(sessions).attempts) {
        for (const key of keysOf(attempt.details)) {
            assert.ok(!banned.includes(key), `an imported attempt carries ${key}, which the contract refuses`);
        }
    }
});

test('the vendored copy is the published contract, not the placeholder', () => {
    // This asserted `provisional: true` while sing had not published the shape
    // yet, with a note to invert it on the first real sync. That sync has
    // happened: the marker is gone, so the byte comparison in
    // scripts/sync-sing-progress.mjs is now a real comparison rather than a
    // tolerated 404. Keeping the old assertion would have meant a green test
    // insisting the contract was still a guess.
    assert.equal((contract as { provisional?: boolean }).provisional, undefined, 'the published contract carries no provisional marker');
    assert.equal(contract.contract, 'suede-progress-shape');
    assert.equal(contract.version, 1);
});

test('two scans near one session are counted, not silently resolved to the first', () => {
    // The join took the first range test sharing a calendar day, so a singer who
    // scanned twice in a day had the first scan's range attached to both sessions
    // — a wrong measurement stored as provenance, with nothing to say so.
    const first: SingRangeTest = { lowMidi: 48, highMidi: 72, testedAt: '2026-01-04T08:00:00.000Z' };
    const second: SingRangeTest = { lowMidi: 45, highMidi: 79, testedAt: '2026-01-04T10:00:00.000Z' };
    const result = run([session({ type: 'range' })], { rangeTests: [first, second] });
    assert.equal(result.counts.ambiguousEvidence, 1);
    assert.equal(result.counts.imported, 0);
    assert.deepEqual(result.attempts, []);
});

test('a scan the far side of midnight still joins its session', () => {
    // `session.day` is a local calendar date and an ISO prefix is a UTC one, so
    // comparing the two strings missed a real pair either side of midnight.
    // Comparing instants leaves no date string to disagree about.
    const test: SingRangeTest = { lowMidi: 48, highMidi: 72, testedAt: '2026-01-05T01:30:00.000Z' };
    const result = run([session({ type: 'range', day: '2026-01-04', date: '2026-01-04T23:30:00.000Z' })], { rangeTests: [test] });
    assert.equal(result.counts.imported, 1);
    assert.equal(result.counts.evidenceMissing, 0);
});

test('a scan far from every session is absent evidence rather than a loose join', () => {
    const test: SingRangeTest = { lowMidi: 48, highMidi: 72, testedAt: '2026-01-04T09:00:00.000Z' };
    const result = run([session({ type: 'range', date: '2026-01-06T09:00:00.000Z', day: '2026-01-06' })], { rangeTests: [test] });
    assert.equal(result.counts.evidenceMissing, 1);
    assert.equal(result.counts.imported, 0);
});

test('a corrupt range measurement is unreadable, never stored as provenance', () => {
    // parseLearningAttempt bounds `details` as JSON and does not look inside it,
    // so without validation a tampered export could land lowMidi -999 in the
    // ledger as an imported measurement.
    for (const bad of [
        { lowMidi: -999, highMidi: 999, testedAt: '2026-01-04T09:00:00.000Z' },
        { lowMidi: 72, highMidi: 48, testedAt: '2026-01-04T09:00:00.000Z' },
        { lowMidi: 48.5, highMidi: 72, testedAt: '2026-01-04T09:00:00.000Z' },
        { lowMidi: 48, highMidi: 72, testedAt: 'not a timestamp' },
    ] as SingRangeTest[]) {
        const result = run([session({ type: 'range' })], { rangeTests: [bad] });
        assert.equal(result.counts.imported, 0, `${JSON.stringify(bad)} must not import`);
        assert.equal(result.attempts.length, 0);
        // Absent rather than wrong: an unusable measurement is not evidence, so it
        // reads as evidence missing rather than as a readable record.
        assert.equal(result.counts.evidenceMissing, 1);
    }
    // And the good one still works, so the guard is not rejecting everything.
    assert.equal(run([session({ type: 'range' })], { rangeTests: [RANGE_TEST] }).counts.imported, 1);
});
