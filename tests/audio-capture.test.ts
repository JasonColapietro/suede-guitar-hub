import test from 'node:test';
import assert from 'node:assert/strict';
import { claimAudioSession, playReference, startCapture, watchAudioState } from '../lib/audio/capture.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test('capture cancels pending setup, closes late streams, and permits only one audio input', async () => {
  let requests = 0;
  let getStream: () => Promise<unknown>;
  const contexts: FakeContext[] = [];
  class FakeContext {
    state = 'running';
    sampleRate = 48000;
    destination = {};
    onstatechange: (() => void) | null = null;
    modules: string[] = [];
    audioWorklet = { addModule: async (path: string) => { this.modules.push(path); } };
    constructor() { contexts.push(this); }
    async resume() {}
    async close() { this.state = 'closed'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  }
  class FakeWorklet {
    port = { onmessage: null };
    connect() {}
    disconnect() {}
  }
  function stream() {
    const track = { stopped: false, onended: null, stop() { this.stopped = true; } };
    return { track, getTracks: () => [track], getAudioTracks: () => [track] };
  }
  const originals = new Map(['window', 'navigator', 'AudioContext', 'AudioWorkletNode'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext: FakeContext } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext });
  Object.defineProperty(globalThis, 'AudioWorkletNode', { configurable: true, value: FakeWorklet });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => { requests++; return getStream(); } } } });
  const controllers: AbortController[] = [];
  const controller = () => { const c = new AbortController(); controllers.push(c); return c; };
  try {
    const preCancelled = controller(); preCancelled.abort();
    await assert.rejects(startCapture(() => {}, () => {}, preCancelled.signal), /cancelled/);
    assert.equal(requests, 0);

    const pending = deferred<unknown>(), late = stream(), cancelled = controller();
    getStream = () => pending.promise;
    const opening = startCapture(() => {}, () => {}, cancelled.signal);
    await Promise.resolve();
    cancelled.abort(); pending.resolve(late);
    await assert.rejects(opening, /cancelled/);
    assert.equal(late.track.stopped, true);
    assert.equal(contexts[0].state, 'closed');

    const first = stream(), second = stream();
    let interrupted = 0;
    getStream = async () => first;
    const a = await startCapture(() => {}, () => { interrupted++; }, controller().signal);
    getStream = async () => second;
    const b = await startCapture(() => {}, () => {}, controller().signal);
    assert.equal(first.track.stopped, true);
    assert.equal(interrupted, 1);
    assert.deepEqual(contexts.at(-1)?.modules, ['/audio/guitarhub-capture.worklet.js']);
    a.stop();
    assert.equal(second.track.stopped, false, 'closing an old owner must not stop the new owner');
    b.stop();
    assert.equal(second.track.stopped, true);
    assert.equal(contexts.every(context => context.state === 'closed'), true);
  } finally {
    controllers.forEach(c => c.abort());
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

test('reference playback reports cancellation separately from a completed fade interval', async () => {
  const contexts: ReferenceContext[] = [];
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  class ReferenceContext {
    currentTime = 0; destination = {}; closed = false;
    oscillator = { frequency: { value: 0 }, type: 'sine', onended: null as (() => void) | null, connect() {}, disconnect() {}, start() {}, stop() {} };
    gain = { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    constructor() { contexts.push(this); }
    async resume() {}
    async close() { this.closed = true; }
    createOscillator() { return this.oscillator; }
    createGain() { return this.gain; }
  }
  const originals = new Map(['AudioContext', 'setTimeout', 'clearTimeout'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: ReferenceContext });
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: (callback: () => void, delay: number) => { const timer = { callback, delay, cancelled: false }; timers.push(timer); return timer; } });
  Object.defineProperty(globalThis, 'clearTimeout', { configurable: true, value: (timer: typeof timers[number]) => { timer.cancelled = true; } });
  const controllers: AbortController[] = [];
  try {
    const cancelled = new AbortController(); controllers.push(cancelled);
    const interrupted = playReference(110, cancelled.signal);
    await Promise.resolve();
    const release = claimAudioSession(() => {});
    assert.equal(await interrupted, false, 'another tool interrupting reference requires a new quiet interval');
    assert.equal(contexts[0].closed, true);
    release();

    const controller = new AbortController(); controllers.push(controller);
    let resolved = false;
    const complete = playReference(110, controller.signal).then(value => { resolved = true; return value; });
    await Promise.resolve();
    contexts[1].oscillator.onended?.();
    await Promise.resolve();
    assert.equal(timers.at(-1)?.delay, 1000);
    assert.equal(resolved, false, 'reference is not complete until the authored silent decay elapses');
    timers.at(-1)?.callback();
    assert.equal(await complete, true);
    assert.equal(contexts[1].closed, true);

    const fading = new AbortController(); controllers.push(fading);
    const fadingPlayback = playReference(110, fading.signal);
    await Promise.resolve(); contexts[2].oscillator.onended?.(); await Promise.resolve();
    const pendingFade = timers.at(-1)!;
    fading.abort();
    assert.equal(await fadingPlayback, false);
    assert.equal(pendingFade.cancelled, true);
  } finally {
    controllers.forEach(controller => controller.abort());
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
});

test('a brief iOS interruption resumes instead of stopping, while a lasting one or a closed context stops', async () => {
  const make = () => ({ state: 'running' as string, resumed: 0, onstatechange: null as (() => void) | null, async resume() { this.resumed++; } });
  const brief = make(); let briefLost = 0;
  watchAudioState(brief as unknown as AudioContext, () => briefLost++, 20);
  brief.state = 'interrupted'; brief.onstatechange?.();
  assert.equal(brief.resumed, 1, 'an interruption asks the context to resume');
  brief.state = 'running'; brief.onstatechange?.();
  await new Promise(done => setTimeout(done, 40));
  assert.equal(briefLost, 0, 'recovering inside the grace period is not a loss');
  const lasting = make(); let lastingLost = 0;
  watchAudioState(lasting as unknown as AudioContext, () => lastingLost++, 20);
  lasting.state = 'suspended'; lasting.onstatechange?.();
  await new Promise(done => setTimeout(done, 40));
  assert.equal(lastingLost, 1);
  const closed = make(); let closedLost = 0;
  watchAudioState(closed as unknown as AudioContext, () => closedLost++, 20);
  closed.state = 'closed'; closed.onstatechange?.();
  assert.equal(closedLost, 1);
});
