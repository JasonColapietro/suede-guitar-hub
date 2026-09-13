import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { register } from 'node:module';
import { createElement, type FunctionComponent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { allLessons, curricula } from '../lib/learning/curriculum.ts';
import { accessibleLessonIds, guestLearningAccess, isLessonReady } from '../lib/learning/access.ts';
import { browseLessons } from '../lib/learning/library.ts';
import { getInstructionAsset, getLessonInstructions } from '../lib/learning/instructions.ts';
import { isStageTwoAsset } from '../lib/learning/stage-two.ts';

register('./component-render-hooks.mjs', import.meta.url);
const { LearningPath } = await import('../components/learning/LearningPath.tsx');
const { LessonLibrary } = await import('../components/learning/LessonLibrary.tsx');
const { StageTwoPractice, PANEL_HEADING, ANCHOR_HEADING } = await import('../components/learning/StageTwoPractice.tsx');
const { default: LearnPage } = await import('../app/learn/page.tsx');

/**
 * Three surfaces tell a visitor that the voice track is curriculum outlines, and
 * all three statements are true today. They stop being true the moment W1 lands
 * `lib/learning/data/voice-instruction.json`, because authoring one record flips
 * `isLessonReady` for that lesson. Deleting the copy now would ship a promise
 * this repository cannot keep; leaving it unguarded means shipping a lie the day
 * the data arrives, with nothing to notice.
 *
 * So this file ties the copy to the fact it claims. Every assertion below is an
 * equality between what a surface renders and what `isLessonReady` actually
 * reports, never a match against the wording on its own: a sentence that drifts
 * fails, and a sentence that survives its own premise fails too.
 *
 * The survey behind it matters, because it changed what the work is. Of the nine
 * places in `app` and `components` that say "outline" or "preview", eight derive
 * the word from readiness per lesson or per level and therefore retire
 * themselves. Exactly one is an unconditional claim about the whole track —
 * `LearningPath`'s "Voice currently contains curriculum outlines." — and it is
 * the only sentence someone has to go and rewrite. The tests for the derived
 * eight are not padding: they are what makes it safe to leave those surfaces
 * alone, and they fail if a later edit replaces a derivation with a hardcoded
 * word.
 */
const VOICE_LESSONS = allLessons('voice');
const READY_VOICE_LESSONS = VOICE_LESSONS.filter(entry => isLessonReady('voice', entry.lesson.id)).map(entry => entry.lesson.id);
const VOICE_IS_OUTLINES_ONLY = READY_VOICE_LESSONS.length === 0;

/** The one unconditional claim. Kept as a constant so the assertion is an
 * equality with readiness rather than a grep that passes when the sentence is
 * quietly reworded. */
const TRACK_WIDE_CLAIM = 'Voice currently contains curriculum outlines.';
const LIBRARY_CLAIM = 'Voice currently has curriculum previews. Choose Previews to explore the planned topics.';
const LEARN_PAGE_CLAIM = 'Written lessons and curriculum outlines give each session a focus.';

const render = <P extends object>(component: FunctionComponent<P>, props: P) => renderToStaticMarkup(createElement(component, props));

test('the premise the outline copy rests on is still the catalog', () => {
    assert.equal(VOICE_LESSONS.length, 102, 'the voice catalog changed size; the claims below are about all of it');
    assert.deepEqual(READY_VOICE_LESSONS, [], 'a voice lesson is ready: W1 has landed and the outline copy is now false');
    // Readiness on this track is instruction alone. No voice lesson carries a
    // practiceSpec, so "ready" and "guided" are the same fact here, which is why
    // the library's own filter is a sound proxy for it further down.
    assert.deepEqual(VOICE_LESSONS.filter(entry => entry.lesson.practiceSpec).map(entry => entry.lesson.id), []);
    assert.deepEqual(VOICE_LESSONS.filter(entry => getLessonInstructions(entry.lesson.id)).map(entry => entry.lesson.id), []);
});

test('the track-wide voice outline claim is rendered exactly while voice is outlines-only', () => {
    const voice = render(LearningPath, { track: 'voice' });
    assert.equal(
        voice.includes(TRACK_WIDE_CLAIM),
        VOICE_IS_OUTLINES_ONLY,
        VOICE_IS_OUTLINES_ONLY
            ? `LearningPath no longer states "${TRACK_WIDE_CLAIM}" while every voice lesson is still an outline. A visitor is now told nothing about a track of 102 topics with no lesson bodies.`
            : `LearningPath still states "${TRACK_WIDE_CLAIM}" and ${READY_VOICE_LESSONS.length} voice lessons are ready: ${READY_VOICE_LESSONS.slice(0, 3).join(', ')}. Rewrite the sentence in components/learning/LearningPath.tsx to say what the track now offers.`,
    );
    // The sentence is voice-only, so guitar must never carry it whatever its
    // readiness is. Without this the assertion above would pass on a component
    // that printed the claim unconditionally.
    assert.ok(!render(LearningPath, { track: 'guitar' }).includes(TRACK_WIDE_CLAIM));
});

test('the stage badges on the learning path read their word off readiness rather than the track', () => {
    const outlineStages = (track: 'guitar' | 'voice') => curricula[track].levels.filter(
        level => !level.modules.some(module => module.lessons.some(lesson => isLessonReady(track, lesson.id))),
    ).length;
    const badges = (markup: string) => (markup.match(/Curriculum outlines/g) ?? []).length;
    assert.equal(badges(render(LearningPath, { track: 'voice' })), outlineStages('voice'), 'the voice badge has to follow readiness');
    assert.equal(outlineStages('voice'), curricula.voice.levels.length, 'every voice stage is an outline today');
    assert.equal(badges(render(LearningPath, { track: 'guitar' })), outlineStages('guitar'), 'and so does the guitar badge');
    // Guitar carries stages of both kinds, so this badge cannot be passing by
    // printing the same word everywhere or by never printing it.
    assert.ok(outlineStages('guitar') > 0 && outlineStages('guitar') < curricula.guitar.levels.length);
});

test('the lesson library retires its own voice sentence when a guided voice lesson appears', () => {
    const voice = render(LessonLibrary, { track: 'voice' });
    assert.equal(
        voice.includes(LIBRARY_CLAIM),
        browseLessons('voice', 'guided').length === 0,
        'the library sentence is shown only when the guided filter is empty; that guard is what makes it self-retiring',
    );
    assert.equal(browseLessons('voice', 'guided').length === 0, VOICE_IS_OUTLINES_ONLY, 'guided and ready are the same fact on this track');
    // Guitar has guided lessons, so the empty-state branch is not reachable
    // there. Both branches of the condition are therefore exercised.
    assert.ok(browseLessons('guitar', 'guided').length > 0);
    assert.ok(!render(LessonLibrary, { track: 'guitar' }).includes(LIBRARY_CLAIM));
});

test('the learn index counts what a guest can open instead of asserting a number', () => {
    const markup = render(LearnPage, {});
    const free = accessibleLessonIds('voice', guestLearningAccess).length;
    assert.ok(markup.includes(`${free} free guided lessons`), 'the voice card states the count it computes');
    assert.equal(free, 0, 'no voice lesson is openable, which is what makes the outline wording true');
    // This sentence is about both tracks and stays true while any lesson
    // anywhere is an outline, so it is tied to that and not to voice alone.
    // Guitar stage seven has no lesson bodies either (W19).
    const everythingWritten = (['guitar', 'voice'] as const).every(track => allLessons(track).every(entry => isLessonReady(track, entry.lesson.id)));
    assert.equal(markup.includes(LEARN_PAGE_CLAIM), !everythingWritten, 'the sentence promises outlines exist; it has to go when none do');
    assert.equal(everythingWritten, false);
});

test('no surface makes a track-wide claim about voice except the one that is meant to', () => {
    // A fourth surface acquiring its own hardcoded sentence is how this work
    // would quietly come undone, so the set of files that talk about the track
    // as a whole is pinned rather than the wording.
    const found: string[] = [];
    const walk = (directory: string) => {
        for (const name of readdirSync(directory)) {
            const path = join(directory, name);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (!name.endsWith('.tsx')) continue;
            if (/Voice currently/.test(readFileSync(path, 'utf8'))) found.push(path);
        }
    };
    walk('components/learning');
    walk('app/learn');
    assert.deepEqual(
        found.sort(),
        ['components/learning/LearningPath.tsx', 'components/learning/LessonLibrary.tsx'],
        'a new surface states what the voice track currently is. Either derive the word from isLessonReady like the other eight places do, or add it to this list and to the assertions above.',
    );
});

/**
 * The two headings in `StageTwoPractice` that were hardcoded to guitar. Both
 * asset kinds are authorable on a voice lesson, where a chord and an index
 * finger do not exist, and both were wrong for guitar too: seventeen of the
 * nineteen authored panel assets carry their own `name` and every one of them
 * rendered under "A chord accuracy cycle" instead.
 */
const panelAssets = ['stage2-accuracy-cycle', 'advanced-f-entry-check', 'advanced-switchyard-map', 'advanced-a-blues-form', 'l6-crossings-piece', 'l6-g-major-five-views', 'l6-after-the-line-piece'];

test('a panel heading is the one its author wrote, and the fallback names no instrument', () => {
    const headings = (ids: string[]) => {
        const assets = ids.map(id => {
            const asset = getInstructionAsset(id);
            if (!isStageTwoAsset(asset)) throw new Error(`${id} is not rendered by StageTwoPractice`);
            return asset;
        });
        const markup = render(StageTwoPractice, {
            lessonId: 'g-l2-m1-01', assets, checkpoint: false,
            onManualEvidenceChange: () => {}, onStudyEvidenceChange: () => {},
        });
        return (markup.match(/<h3>([^<]*)<\/h3>/g) ?? []).map(tag => tag.slice(4, -5));
    };
    const rendered = headings(panelAssets);
    assert.equal(rendered.length, panelAssets.length);
    panelAssets.forEach((id, index) => {
        const asset = getInstructionAsset(id);
        assert.ok(asset.kind === 'panels', id);
        assert.equal(rendered[index], asset.title ?? PANEL_HEADING, `${id}: heading must be the authored name or the neutral fallback`);
    });
    assert.ok(rendered.includes('One twelve-bar A blues form'), 'an authored name reaches the page');
    assert.ok(rendered.includes(PANEL_HEADING), 'the fallback is still reachable, so the check below is not vacuous');
    assert.ok(!rendered.includes('A chord accuracy cycle'), 'the old heading named a chord on every panel asset in the catalogue');

    const anchor = headings(['stage2-silent-anchor']);
    const silent = getInstructionAsset('stage2-silent-anchor');
    assert.ok(silent.kind === 'anchor');
    assert.equal(silent.title, undefined, 'this asset carries no authored name, which is why the fallback has to be sound');
    assert.deepEqual(anchor, [ANCHOR_HEADING]);

    // The fallbacks are what a voice lesson would get, so they may not name a
    // part of a guitar or a thing only a guitarist does.
    for (const heading of [PANEL_HEADING, ANCHOR_HEADING])
        assert.doesNotMatch(heading, /chord|strum|fret|finger|string|barre|pick|capo/i, `${heading} reads wrongly on a voice lesson`);
});
