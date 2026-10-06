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
const owner: LearningAccess = { enabled: true, accountId: 'b52d7c76-cacb-4af7-891c-d056ba8f48aa', tracks: ['guitar'], status: 'verified' };

test('server lesson route denies every unverified state before serializing session props', async () => {
  assert.equal(dynamic, 'force-dynamic');
  for (const lessonId of ['g-l1-m1-01', 'g-l2-m1-01', 'g-l7-m3-01']) {
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
