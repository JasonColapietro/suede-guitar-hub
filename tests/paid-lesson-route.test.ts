import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { guestLearningAccess, type LearningAccess } from '../lib/learning/access.ts';
import { getLessonInstructions } from '../lib/learning/instructions.ts';
register('./component-render-hooks.mjs', import.meta.url);
register('./lesson-gate-hooks.mjs', import.meta.url);
const { default: LessonPage, dynamic } = await import('../app/learn/[track]/[lessonId]/page.tsx');
const globals = globalThis as typeof globalThis & { __lessonGateAccess: LearningAccess };
const owner: LearningAccess = { enabled: true, accountId: 'b52d7c76-cacb-4af7-891c-d056ba8f48aa', tracks: ['guitar'], status: 'verified', freeModuleId: null, purchaseSource: null };

test('server lesson route denies every unverified state before serializing session props', async () => {
  assert.equal(dynamic, 'force-dynamic');
  // Lessons outside the three candidate free modules; tests below cover the candidates.
  for (const lessonId of ['g-l1-m1-01', 'g-l2-m3-01', 'g-l7-m3-01']) {
    for (const access of [guestLearningAccess, { ...owner, status: 'signedOut' }, { ...owner, status: 'unavailable' }, { ...owner, tracks: [] }, { ...owner, tracks: ['voice'] }] as LearningAccess[]) {
      globals.__lessonGateAccess = access;
      const page = await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId }) });
      // A gate receives public identification only, never the paid instruction payload.
      assert.equal(page.type.name, 'PaidLessonGate');
      assert.equal(page.props.instructions, undefined);
      assert.equal(page.props.vocalMaterial, undefined);
      const markup = renderToStaticMarkup(page);
      assert.match(markup, /Lifetime access required/);
      assert.doesNotMatch(markup, /Try a free .* lesson|Mark lesson|Practice and play/);
      assert.ok(!markup.includes(getLessonInstructions(lessonId)!.steps[0].body));
    }
  }
});

test('a guest reaching a candidate free module gets the lesson behind the client chooser; every other lesson stays server-locked', async () => {
  globals.__lessonGateAccess = guestLearningAccess;
  const free = await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId: 'g-l2-m1-01' }) });
  assert.equal(free.type.name, 'FreeModuleLesson'); assert.equal(free.props.locked.type.name, 'PaidLessonGate');
  assert.equal(free.props.moduleId, 'g-l2-m1');
  for (const lessonId of ['g-l1-m1-01', 'g-l2-m3-01', 'g-l7-m3-01'])
    assert.equal((await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId }) })).type.name, 'PaidLessonGate');
  globals.__lessonGateAccess = { ...owner, tracks: [], freeModuleId: 'g-l4-m1' };   // signed in, chose Box One
  assert.equal((await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId: 'g-l2-m1-01' }) })).type.name, 'PaidLessonGate');
  const chosen = await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId: 'g-l4-m1-01' }) });
  assert.notEqual(chosen.type.name, 'PaidLessonGate');
  const chosenChildren = chosen.props.children as { type?: { name?: string }; props?: Record<string, unknown> }[];
  assert.equal(chosenChildren.find(child => child?.type?.name === 'FreeModuleEnd')?.props?.moduleId, 'g-l4-m1');
});

test('a purchaser never sees the free-module chooser or its module end', async () => {
  for (const access of [owner, { ...owner, freeModuleId: 'g-l2-m1' }]) {
    globals.__lessonGateAccess = access;
    const page = await LessonPage({ params: Promise.resolve({ track: 'guitar', lessonId: 'g-l2-m1-01' }) });
    assert.notEqual(page.type.name, 'FreeModuleLesson');
    const children = page.props.children as { type?: { name?: string } }[];
    assert.ok(children.some(child => child?.type?.name === 'LessonSession'));
    assert.ok(!children.some(child => child?.type?.name === 'FreeModuleEnd'));
  }
});

test('verified purchase opens former samplers; loss of entitlement relocks the same route', async () => {
  const params = Promise.resolve({ track: 'guitar', lessonId: 'g-l1-m1-01' });
  globals.__lessonGateAccess = owner;
  const page = await LessonPage({ params });
  const children = page.props.children as { type?: { name?: string }; props?: Record<string, unknown> }[];
  const session = children.find(child => child?.type?.name === 'LessonSession');
  assert.ok(session?.props?.instructions, 'purchaser receives the real authored lesson');
  globals.__lessonGateAccess = { ...owner, tracks: [] };
  const revoked = await LessonPage({ params });
  assert.equal(revoked.type.name, 'PaidLessonGate');
});
