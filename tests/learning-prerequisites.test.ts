import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    PREREQUISITE_POLICY, PREREQUISITE_RECORD_COUNT, crossTrackPrerequisites, danglingPrerequisites, dependentsOf, entryPoints,
    orphanedRecords, prerequisiteCycles, prerequisiteOrderViolations, prerequisitesFor,
} from '../lib/learning/prerequisites.ts';
import { allLessons } from '../lib/learning/curriculum.ts';
import { lessonPrerequisites } from '../lib/learning/instructions.ts';
import { canOpenModule, guestLearningAccess } from '../lib/learning/access.ts';
import voiceCurriculum from '../lib/learning/data/voice.json' with { type: 'json' };

test('the graph covers every instruction record', () => {
    assert.equal(PREREQUISITE_RECORD_COUNT, 237);
    const withoutField = lessonPrerequisites.filter(entry => !Array.isArray(entry.prerequisiteLessonIds));
    assert.deepEqual(withoutField, [], 'the field is authored on all 237 records, so it is required and not optional');
});

test('every prerequisite names a lesson that exists', () => {
    assert.deepEqual(danglingPrerequisites(), [], 'a prerequisite pointing at a lesson the catalog does not contain is advice a learner can never satisfy');
    assert.deepEqual(crossTrackPrerequisites(), [], 'a prerequisite cannot send a learner into the other track');
    assert.deepEqual(orphanedRecords(), [], 'an instruction record for a lesson the catalog dropped');
});

test('a cross-track prerequisite is rejected even when both lesson ids exist', () => {
    const crossed = lessonPrerequisites.map(entry => entry.id === 'v-l1-m1-02'
        ? { ...entry, prerequisiteLessonIds: ['g-l1-m1-01'] }
        : entry);
    assert.deepEqual(crossTrackPrerequisites(crossed), [
        { id: 'v-l1-m1-02', required: 'g-l1-m1-01', track: 'voice', requiredTrack: 'guitar' },
    ]);
});

test('the graph is acyclic', () => {
    assert.deepEqual(prerequisiteCycles(), [], 'a cycle is unreachable advice: no order satisfies it, so neither lesson is ever ready');
});

test('the catalog never places a lesson before its prerequisite', () => {
    // This is the job the graph actually does. `nextLessonId` advances through
    // lessons in catalog array order and ignores this graph, so the two are
    // independent statements of the same pedagogical order — and the authored one
    // checks the implicit one. A reordering that sends a learner somewhere they
    // are not ready for fails here.
    assert.deepEqual(prerequisiteOrderViolations(), [], 'the catalog order and the authored order disagree');
});

test('there is exactly one place to start per track', () => {
    assert.deepEqual(entryPoints(), ['g-l1-m1-01', 'v-l1-m1-01'], 'each track starts at its first lesson and nowhere else');
});

test('the graph is a chain with deliberate joins, not a flat list', () => {
    const multiple = lessonPrerequisites.filter(entry => entry.prerequisiteLessonIds.length > 1);
    assert.equal(multiple.length, 15, 'fifteen lessons require more than one predecessor; a change to that count is a pedagogical change worth seeing');
    // A checkpoint drawing on two earlier lessons is the shape that makes this
    // graph worth authoring rather than inferring from array order.
    assert.deepEqual(prerequisitesFor('g-l1-m3-04'), ['g-l1-m3-01', 'g-l1-m3-02']);
    assert.ok(dependentsOf('g-l1-m3-01').includes('g-l1-m3-04'));
    assert.deepEqual(prerequisitesFor('not-a-lesson'), [], 'an unknown lesson has no prerequisites rather than throwing');
});

test('a gate would close 235 of 237 lessons to a visitor with no progress', () => {
    // The decisive reason the graph is not an access gate. A guest on a deep
    // link, a crawler, or anyone who cleared site data arrives with nothing
    // completed, and under a gate only one lesson per track renders.
    const unsatisfied = lessonPrerequisites.filter(entry => entry.prerequisiteLessonIds.length > 0);
    assert.equal(unsatisfied.length, 235);
    assert.equal(PREREQUISITE_RECORD_COUNT - unsatisfied.length, 2, 'exactly one lesson per track would survive');

    // Twenty-two lessons are deliberately open to a guest. Almost all of them
    // would be open in name only, which is what makes the gate self-defeating
    // rather than merely strict.
    const moduleOf = new Map(allLessons('guitar').map(entry => [entry.lesson.id, entry.module.id]));
    const openToGuest = (lessonId: string) => {
        const moduleId = moduleOf.get(lessonId);
        return moduleId !== undefined && canOpenModule('guitar', moduleId, guestLearningAccess);
    };
    const open = lessonPrerequisites.filter(entry => openToGuest(entry.id));
    assert.ok(open.length > 1, 'the free tier is more than one lesson');
    assert.equal(open.filter(entry => entry.prerequisiteLessonIds.length === 0).length, 1, 'and only one of them needs nothing first');
});

test('the cross-level risk is latent, not present', () => {
    // The honest version of a claim the first draft of the policy note got
    // wrong. Gating would break a free lesson that depends on a closed one —
    // but none does today, and saying otherwise overstates the case. What is
    // true is that the graph does cross module and level boundaries inside paid
    // content, so the failure is one authored edge away.
    const moduleOf = new Map(allLessons('guitar').map(entry => [entry.lesson.id, entry.module.id]));
    const openToGuest = (lessonId: string) => {
        const moduleId = moduleOf.get(lessonId);
        return moduleId !== undefined && canOpenModule('guitar', moduleId, guestLearningAccess);
    };
    const openDependingOnClosed = lessonPrerequisites
        .filter(entry => openToGuest(entry.id) && entry.prerequisiteLessonIds.some(required => !openToGuest(required)))
        .map(entry => entry.id);
    assert.deepEqual(openDependingOnClosed, [], 'if this ever fails, a free lesson now depends on paid content and the dependency itself is the bug, gate or no gate');

    const crossModule = lessonPrerequisites.filter(entry =>
        entry.prerequisiteLessonIds.some(required => moduleOf.get(required) !== moduleOf.get(entry.id)));
    assert.ok(crossModule.length > 0, 'the graph does cross module boundaries, which is what makes the risk real rather than theoretical');
    assert.ok(prerequisitesFor('g-l5-m1-01').includes('g-l4-m5-07'), 'the cross-level edge the policy note names');
});

test('the policy says documentation, and the access gate stays the access gate', () => {
    assert.equal(PREREQUISITE_POLICY.isAccessGate, false);
    assert.equal(PREREQUISITE_POLICY.role, 'orderingDocumentation');
    // Teeth on the policy: if someone wires the graph into the code that decides
    // what opens, this fails and they have to change the policy on purpose.
    const gates = ['lib/learning/access.ts', 'lib/learning/curriculum.ts'];
    for (const file of gates)
        assert.ok(!/prerequisite/i.test(readFileSync(file, 'utf8')), `${file} decides what a learner may open and must not consult the prerequisite graph. If that is now intended, change PREREQUISITE_POLICY and say why.`);

    // And it must not have quietly become a gate anywhere else either.
    const offenders: string[] = [];
    const walk = (directory: string) => {
        for (const name of readdirSync(directory)) {
            if (name === 'node_modules' || name === '.next') continue;
            const path = join(directory, name);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (!/\.tsx?$/.test(name)) continue;
            const source = readFileSync(path, 'utf8');
            if (/from ['"][^'"]*prerequisites/.test(source) && /canOpen|accessible|entitle|paywall/i.test(source)) offenders.push(path);
        }
    };
    for (const root of ['app', 'components', 'lib']) walk(root);
    assert.deepEqual(offenders, [], 'a module that imports the graph and also talks about access is the thing this policy forbids');
});

test('voice safety copy recommends the health module without claiming an access gate', () => {
    const health = voiceCurriculum.levels.flatMap(level => level.modules)
        .find(module => module.id === 'v-l7-m1');
    assert.ok(health, 'the vocal-health module is missing');
    const checkpoint = health.lessons.find(lesson => lesson.id === 'v-l7-m1-08');
    assert.ok(checkpoint, 'the vocal-health checkpoint is missing');
    assert.match(checkpoint.summary, /review/i);
    assert.doesNotMatch(checkpoint.summary, /\bgate|lock(?:ed)?\b/i, 'prerequisites are advice, not access control');
});
