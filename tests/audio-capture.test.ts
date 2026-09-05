import test from 'node:test';
import assert from 'node:assert/strict';
import { startCapture } from '../lib/audio/capture.ts';

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
