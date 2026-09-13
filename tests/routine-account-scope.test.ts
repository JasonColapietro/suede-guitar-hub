import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { accountHistoryKey, guestLearningAccess, type LearningAccess } from "../lib/learning/access.ts";
import { emptyRoutineState, newRoutineAttempt, newRoutineSession, parseRoutineState, routineStorageKey, type RoutineState } from "../lib/learning/routine.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { routineHistoryForAccount, routineContentForAccount, RoutineLessonLink } = await import("../components/learning/PracticeRoutine.tsx");
const { LearningAccessProvider } = await import("../components/learning/LearningAccessProvider.tsx");
const Provider = LearningAccessProvider as (props: { access: LearningAccess; children?: React.ReactNode }) => React.ReactNode;
const accountA = "a1111111-1111-4111-8111-111111111111";
const accountB = "b2222222-2222-4222-8222-222222222222";
const now = "2026-09-08T12:00:00.000Z";

function storage() {
  const bytes = new Map<string, string>();
  return { bytes, getItem: (key: string) => bytes.get(key) ?? null, setItem: (key: string, value: string) => { bytes.set(key, value); } };
}
function savedRoutine(id: string, tuneSeconds: number): RoutineState {
  const state = newRoutineSession(emptyRoutineState(), id, now);
  state.durations.tune = tuneSeconds;
  state.preparation["d-chord"] = { source: "selfReported", confirmedAt: now };
  return state;
}

test("routine guest bytes survive sign-in and each account starts with its own empty history", () => {
  const disk = storage();
  const guestBytes = JSON.stringify(savedRoutine("guest-session", 90));
  disk.setItem(routineStorageKey, guestBytes);
  const guest = routineHistoryForAccount(null, () => disk);
  const a = routineHistoryForAccount(accountA, () => disk);
  const b = routineHistoryForAccount(accountB, () => disk);
  for (const history of [guest, a, b]) history.invalidate();
  assert.equal(guest.key, routineStorageKey);
  assert.equal(guest.read(), guestBytes);
  assert.deepEqual(parseRoutineState(a.read()), emptyRoutineState());
  assert.deepEqual(parseRoutineState(b.read()), emptyRoutineState());
  assert.equal(disk.bytes.size, 1, "reading an account never migrates or copies guest history");

  a.write(() => savedRoutine("account-a-session", 120));
  b.write(() => savedRoutine("account-b-session", 180));
  assert.equal(parseRoutineState(a.read()).currentSessionId, "account-a-session");
  assert.equal(parseRoutineState(b.read()).currentSessionId, "account-b-session");
  assert.equal(guest.read(), guestBytes);
  assert.equal(disk.getItem(routineStorageKey), guestBytes);
  assert.equal(disk.bytes.size, 3);

  for (const [accountId, id, duration] of [[null, "guest-session", 90], [accountA, "account-a-session", 120], [accountB, "account-b-session", 180]] as const) {
    const reloaded = routineHistoryForAccount(accountId, () => disk);
    reloaded.invalidate();
    const state = parseRoutineState(reloaded.read());
    assert.equal(state.currentSessionId, id);
    assert.equal(state.durations.tune, duration);
  }
});

test("late timer cleanup keeps its captured account and cannot change B or guest history", () => {
  const disk = storage();
  const a = routineHistoryForAccount(accountA, () => disk);
  const b = routineHistoryForAccount(accountB, () => disk);
  const guest = routineHistoryForAccount(null, () => disk);
  for (const history of [a, b, guest]) history.invalidate();
  a.write(() => savedRoutine("a-running", 60));
  b.write(() => savedRoutine("b-session", 180));
  guest.write(() => savedRoutine("guest-session", 90));
  const bBytes = b.read();
  const guestBytes = guest.read();
  const pendingCleanup = () => a.write(state => ({ ...state, sessions: state.sessions.map(session => ({ ...session, blocks: session.blocks.map((block, index) => index === 0 ? { ...block, attempts: [{ ...newRoutineAttempt("a-attempt", now, 60), elapsedMs: 1250, status: "paused" as const, interrupted: true }] } : block) })) }));

  // React unmount cleanup may finish after the replacement account subtree was created.
  routineContentForAccount(accountB);
  pendingCleanup();
  assert.equal(b.read(), bBytes);
  assert.equal(guest.read(), guestBytes);
  assert.equal(disk.getItem(b.key), bBytes);
  assert.equal(disk.getItem(guest.key), guestBytes);
  const attempt = parseRoutineState(a.read()).sessions[0].blocks[0].attempts[0];
  assert.equal(attempt.elapsedMs, 1250);
  assert.equal(attempt.status, "paused");
  assert.equal(attempt.interrupted, true);
});

test("storage failure keeps in-memory routine fallback isolated by account", () => {
  const unavailable = () => { throw new Error("storage denied"); };
  const a = routineHistoryForAccount(accountA, unavailable);
  const b = routineHistoryForAccount(accountB, unavailable);
  const guest = routineHistoryForAccount(null, unavailable);
  for (const history of [a, b, guest]) history.invalidate();
  assert.equal(a.write(() => savedRoutine("a-unsaved", 120)).persisted, false);
  assert.equal(parseRoutineState(a.read()).currentSessionId, "a-unsaved");
  assert.deepEqual(parseRoutineState(b.read()), emptyRoutineState());
  assert.deepEqual(parseRoutineState(guest.read()), emptyRoutineState());
  b.write(() => savedRoutine("b-unsaved", 240));
  assert.equal(parseRoutineState(a.read()).currentSessionId, "a-unsaved");
  assert.equal(parseRoutineState(b.read()).currentSessionId, "b-unsaved");
  for (const history of [a, b, guest]) history.invalidate();
});

test("an external storage invalidation refreshes only its account history", () => {
  const disk = storage();
  const a = routineHistoryForAccount(accountA, () => disk);
  const b = routineHistoryForAccount(accountB, () => disk);
  a.invalidate(); b.invalidate();
  a.write(() => savedRoutine("a-first", 60));
  b.write(() => savedRoutine("b-first", 120));
  const bBytes = b.read();
  disk.setItem(a.key, JSON.stringify(savedRoutine("a-another-tab", 240)));
  a.invalidate();
  assert.equal(parseRoutineState(a.read()).currentSessionId, "a-another-tab");
  assert.equal(b.read(), bBytes);
});

test("the real routine subtree has stable per-account React keys that replace transient controls on identity changes", () => {
  const guest = routineContentForAccount(null);
  const a = routineContentForAccount(accountA);
  const b = routineContentForAccount(accountB);
  assert.equal(guest.key, routineStorageKey);
  assert.equal(a.key, accountHistoryKey(routineStorageKey, accountA));
  assert.equal(b.key, accountHistoryKey(routineStorageKey, accountB));
  assert.equal(new Set([guest.key, a.key, b.key]).size, 3);
  assert.equal(a.key, routineContentForAccount(accountA).key);
  assert.equal(a.props.accountId, accountA);
  assert.equal(b.props.accountId, accountB);
  assert.equal(guest.props.accountId, null);
});

function lessonLink(access: LearningAccess, id = "g-l2-m1-01") {
  return renderToStaticMarkup(createElement(Provider, { access }, createElement(RoutineLessonLink, { id, pause: () => {} })));
}
const paid: LearningAccess = { enabled: true, accountId: accountA, tracks: ["guitar"], status: "verified" };
test("real routine links recognize verified guitar access and preserve the lesson destination", () => {
  const markup = lessonLink(paid);
  assert.match(markup, /Review GuitarHub instruction/);
  assert.match(markup, /href="\/learn\/guitar\/g-l2-m1-01"/);
  assert.match(markup, /target="_blank"/);
  assert.match(markup, /rel="noopener noreferrer"/);
});

test("guest, voice-only, disabled and unavailable account routine links remain previews", () => {
  // A lesson in a PAID level. This used to default to g-l2-m1-01, which the
  // catalog marks free — it only read as a preview because `canOpenModule`
  // ignored `LearningLevel.access`. Now that the gate honours the data, the
  // unentitled case has to be tested against a genuinely paid lesson.
  const paidGuided = "g-l5-m1-01";
  for (const access of [guestLearningAccess, { ...paid, tracks: ["voice"] }, { ...paid, enabled: false }, { ...paid, status: "unavailable" }, { ...paid, status: "signedOut", accountId: null }] as LearningAccess[]) {
    const markup = lessonLink(access, paidGuided);
    assert.match(markup, /GuitarHub curriculum preview/);
    assert.doesNotMatch(markup, /Review GuitarHub instruction/);
  }
  assert.match(lessonLink(guestLearningAccess, "g-l1-m1-01"), /Review GuitarHub instruction/, "free guided sampler remains available");
  // The routine's own A/D lesson sits in g-l2, which is declared free, so a
  // guest following the routine now reaches the instruction instead of a wall.
  assert.match(lessonLink(guestLearningAccess, "g-l2-m1-01"), /Review GuitarHub instruction/, "declared-free level is open to a guest");
});

test("a paid track cannot label an unimplemented advanced outline as instruction", () => {
  assert.match(lessonLink(paid, "g-l5-m1-01"), /Review GuitarHub instruction/,
    "the newly authored barre lesson is now guided");
  const markup = lessonLink(paid, "g-l7-m1-01");
  assert.match(markup, /GuitarHub curriculum preview/);
  assert.doesNotMatch(markup, /Review GuitarHub instruction/);
  assert.equal(lessonLink(paid, "not-a-lesson"), "");
});
