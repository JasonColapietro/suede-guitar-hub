import test from "node:test";
import assert from "node:assert/strict";
import { createGuitarVoiceSession } from "../lib/audio/guitar-voice-session.ts";
import type { GuitarVoice } from "../lib/audio/pluck.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const requests: { result: ReturnType<typeof deferred<GuitarVoice>>; signal: AbortSignal; interrupt: () => void }[] = [];
  const errors: string[] = [];
  let interruptions = 0;
  const session = createGuitarVoiceSession(() => interruptions++, value => errors.push(value), (interrupt, signal) => {
    const result = deferred<GuitarVoice>();
    requests.push({ result, signal, interrupt });
    return result.promise;
  });
  return { session, requests, errors, interruptions: () => interruptions };
}
function voice() {
  let stops = 0;
  const value: GuitarVoice = {
    // No browser clock is read by the owner; the getter makes accidental use fail.
    get context(): AudioContext { throw new Error("Unexpected audio clock access"); },
    pluck() {},
    click() {},
    outputLatency: 0,
    stop() { stops++; },
  };
  return { value, stops: () => stops };
}

test("one pending voice is shared and a background interruption closes and notifies once", async () => {
  const f = fixture(), opened = voice();
  const first = f.session.get();
  assert.equal(f.session.get(), first);
  f.requests[0].result.resolve(opened.value);
  assert.equal(await first, opened.value);
  assert.equal(await f.session.get(), opened.value);
  f.session.interrupt();
  f.session.interrupt();
  assert.equal(f.requests[0].signal.aborted, true);
  assert.equal(opened.stops(), 1);
  assert.equal(f.interruptions(), 1);
});

test("a cancelled open resolving late cannot replace or stop the new voice", async () => {
  const f = fixture(), stale = voice(), fresh = voice();
  const old = f.session.get();
  const rejected = assert.rejects(old, /cancelled/);
  f.session.interrupt();
  const current = f.session.get();
  f.requests[1].result.resolve(fresh.value);
  await current;
  f.requests[0].result.resolve(stale.value);
  await rejected;
  assert.equal(stale.stops(), 1);
  assert.equal(fresh.stops(), 0);
  assert.equal(await f.session.get(), fresh.value);
  assert.deepEqual(f.errors, ["", ""]);
});

test("an old rejection and interruption cannot clear a replacement pending open", async () => {
  const f = fixture(), fresh = voice();
  const old = f.session.get();
  const rejected = assert.rejects(old, /old failure/);
  f.session.close();
  const current = f.session.get();
  f.requests[0].result.reject(new Error("old failure"));
  await rejected;
  f.requests[0].interrupt();
  assert.equal(f.session.get(), current);
  assert.equal(f.requests.length, 2);
  assert.equal(f.interruptions(), 0);
  f.requests[1].result.resolve(fresh.value);
  assert.equal(await current, fresh.value);
});

test("a current audio failure releases resources and allows a retry", async () => {
  const f = fixture(), fresh = voice();
  const first = f.session.get();
  const rejected = assert.rejects(first, /device/);
  f.requests[0].result.reject(new Error("device"));
  await rejected;
  assert.equal(f.requests[0].signal.aborted, true);
  assert.match(f.errors.at(-1)!, /Sound could not start/);
  const retry = f.session.get();
  f.requests[1].result.resolve(fresh.value);
  assert.equal(await retry, fresh.value);
  f.session.close();
  assert.equal(fresh.stops(), 1);
  assert.equal(f.interruptions(), 0, "user Stop and unmount do not report an external interruption");
});

test("another audio tool cancels an opening request and its eventual result", async () => {
  const f = fixture(), stale = voice();
  const first = f.session.get();
  const rejected = assert.rejects(first, /cancelled/);
  f.requests[0].interrupt();
  assert.equal(f.interruptions(), 1);
  assert.equal(f.requests[0].signal.aborted, true);
  f.requests[0].result.resolve(stale.value);
  await rejected;
  assert.equal(stale.stops(), 1);
});
