import test from "node:test";
import assert from "node:assert/strict";
import contract from "../contracts/practice-tools.json" with { type: "json" };
import { bindPracticeLifecycle, estimateTuningPitch, metronomeBPM, metronomeConfiguration as configuration, metronomeInterval, nextMetronomeBeat, startMetronome, tunerInputError, tuningReading } from "../lib/audio/practice-tools.ts";
import { claimAudioSession, startCapture } from "../lib/audio/capture.ts";
import { estimatePitch } from "../lib/audio/dsp.ts";

function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
class AudioBufferStub {
  samples: Float32Array;
  constructor(length: number) { this.samples = new Float32Array(length); }
  getChannelData() { return this.samples; }
}
class SourceStub {
  buffer: AudioBufferStub | null = null;
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  stopped = false; disconnected = false;
  connect() {}
  disconnect() { this.disconnected = true; }
  start(time: number) { this.startedAt = time; }
  stop() { this.stopped = true; }
}
class ContextStub {
  state = "running"; sampleRate = 48000; currentTime = 0; destination = {};
  onstatechange: (() => void) | null = null;
  buffers: AudioBufferStub[] = []; sources: SourceStub[] = [];
  resumed = 0; closed = 0; resumeWait: Promise<void> | undefined;
  failSource = false;
  audioWorklet = { addModule: async () => {} };
  async resume() { this.resumed++; await this.resumeWait; }
  async close() { this.closed++; this.state = "closed"; }
  createBuffer(channels: number, length: number) { assert.equal(channels, 1); const buffer = new AudioBufferStub(length); this.buffers.push(buffer); return buffer; }
  createBufferSource() { if (this.failSource) throw new Error("output lost"); const source = new SourceStub(); this.sources.push(source); return source; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
}
function harness(context = new ContextStub()) {
  const timers = new Map<number, { callback: () => void; delayMs: number }>(); let id = 0;
  return {
    context, timers,
    environment: { createContext: () => context as unknown as AudioContext, schedule: (callback: () => void, delayMs: number) => { const key = ++id; timers.set(key, { callback, delayMs }); return () => { timers.delete(key); }; } },
    tick() { const next = timers.entries().next().value; assert.ok(next, "a beat is scheduled"); const [key, timer] = next; timers.delete(key); context.currentTime += timer.delayMs / 1000; timer.callback(); },
    nextDelay() { return timers.values().next().value?.delayMs; },
  };
}

test("native practice-tools contract is present, exercised and has no untracked divergences", () => {
  assert.equal(contract.version, 1);
  assert.match(contract.reference, /Native/);
  assert.ok(contract.tempoFixtures.length >= 9);
  assert.ok(contract.beatFixtures.length >= 8);
  assert.equal(contract.tuning.targets.length, 6);
  assert.equal(contract.tuningFixtures.length, 78);
  assert.equal(contract.clickFixtures.length, 14);
  assert.deepEqual(contract.knownDivergences, []);
});
for (const fixture of contract.tempoFixtures) test(`native tempo ${fixture.bpm} uses its actual clamp and beat interval`, () => {
  assert.equal(metronomeBPM(fixture.bpm), fixture.clampedBPM);
  assert.equal(metronomeInterval(fixture.bpm), fixture.intervalSeconds);
});
for (const fixture of contract.beatFixtures) test(`native beat ${fixture.beat} advances to ${fixture.nextBeat}`, () => {
  assert.equal(nextMetronomeBeat(fixture.beat), fixture.nextBeat);
});
for (const fixture of contract.tuningFixtures) test(`native tuner string ${fixture.targetString}: ${fixture.case}`, () => {
  const reading = tuningReading({ frequency: fixture.frequency, clarity: fixture.clarity }, fixture.capturedAt, fixture.now, fixture.targetString);
  if (fixture.expected === null) { assert.equal(reading, null); return; }
  assert.ok(reading);
  assert.equal(reading.midi, fixture.expected.midi);
  assert.equal(reading.direction, fixture.expected.direction);
  assert.ok(Math.abs(reading.centsFromTarget - fixture.expected.centsFromTarget) < 1e-8);
});

test("real click buffers match native Float waveform samples including their duration boundary", async () => {
  const h = harness(); h.context.sampleRate = contract.clickFixtures[0].sampleRate;
  const audio = await startMetronome(configuration.defaultBPM, () => {}, () => {}, new AbortController().signal, h.environment);
  try {
    for (const fixture of contract.clickFixtures) {
      assert.equal(fixture.sampleRate, h.context.sampleRate);
      const buffer = h.context.buffers[fixture.accent ? 0 : 1];
      assert.ok(Math.abs((buffer.samples[fixture.frame] ?? 0) - fixture.sample) < 1e-7, `${fixture.accent ? "accent" : "tick"} sample ${fixture.frame}`);
    }
  } finally { audio.stop(); }
});
test("invalid tempo falls back safely while the authored slider remains integral", () => {
  for (const value of [NaN, Infinity, -Infinity]) assert.equal(metronomeBPM(value), configuration.defaultBPM);
  assert.equal(metronomeBPM(configuration.minimumBPM - configuration.buttonStepBPM), configuration.minimumBPM);
  assert.equal(metronomeBPM(configuration.maximumBPM + configuration.buttonStepBPM), configuration.maximumBPM);
  assert.equal(configuration.sliderStepBPM, 1);
});

test("metronome plays beat one immediately, accents each bar, and adopts continuous slider changes after the next beat", async () => {
  const h = harness(); const controller = new AbortController(); const beats: number[] = [];
  const audio = await startMetronome(configuration.defaultBPM, beat => beats.push(beat), () => assert.fail("not interrupted"), controller.signal, h.environment);
  assert.deepEqual(beats, [0]);
  const originalDelay = h.nextDelay();
  assert.equal(originalDelay, metronomeInterval(configuration.defaultBPM) * 1000);
  for (let bpm = 100; bpm <= 120; bpm++) audio.setTempo(bpm);
  assert.equal(h.timers.size, 1, "slider motion must not restart or add timers");
  assert.equal(h.nextDelay(), originalDelay);
  h.tick();
  assert.equal(h.nextDelay(), 500);
  for (let index = 0; index < 7; index++) h.tick();
  assert.deepEqual(beats, [0, 1, 2, 3, 0, 1, 2, 3, 0]);
  assert.equal(h.context.sources[0].startedAt, 0);
  assert.equal(h.context.sources[0].buffer, h.context.sources[4].buffer);
  assert.notEqual(h.context.sources[0].buffer, h.context.sources[1].buffer);
  assert.equal(h.context.sources[1].buffer, h.context.sources[2].buffer);
  for (const buffer of h.context.buffers) {
    assert.equal(buffer.samples.length, Math.floor(h.context.sampleRate * configuration.clickSeconds));
    assert.equal(buffer.samples[0], 0);
    assert.ok(buffer.samples.some(value => value !== 0));
    assert.ok(buffer.samples.every(value => Math.abs(value) <= configuration.amplitude));
  }
  audio.stop(); audio.stop();
  assert.equal(h.timers.size, 0);
  assert.equal(h.context.closed, 1);
  assert.ok(h.context.sources.every(source => source.stopped && source.disconnected));
  const restarted = harness(); const restartedAudio = await startMetronome(90, beat => assert.equal(beat, 0), () => {}, new AbortController().signal, restarted.environment);
  restartedAudio.stop();
});

test("cancel during pending audio activation closes the late context without a beat", async () => {
  const wait = deferred(), h = harness(); h.context.resumeWait = wait.promise;
  const controller = new AbortController(); let beats = 0;
  const pending = startMetronome(90, () => beats++, () => {}, controller.signal, h.environment);
  controller.abort(); wait.resolve();
  await assert.rejects(pending, /cancelled/);
  assert.equal(beats, 0); assert.equal(h.timers.size, 0); assert.equal(h.context.closed, 1);
  const already = new AbortController(); already.abort();
  await assert.rejects(startMetronome(90, () => {}, () => {}, already.signal, h.environment), /cancelled/);
  assert.equal(h.context.resumed, 1);
});

test("failed audio start cannot report a beat and interruptions stop sources and timers", async () => {
  const failed = harness(); failed.context.state = "suspended";
  await assert.rejects(startMetronome(90, () => assert.fail("no beat on failed playback"), () => {}, new AbortController().signal, failed.environment), /did not start/);
  assert.equal(failed.context.closed, 1);
  const running = harness(); let interrupted = 0;
  const audio = await startMetronome(90, () => {}, () => interrupted++, new AbortController().signal, running.environment);
  running.context.state = "suspended"; running.context.onstatechange?.();
  assert.equal(interrupted, 1); assert.equal(running.timers.size, 0); assert.equal(running.context.closed, 1);
  audio.stop();
  const lost = harness(); let outputLost = 0;
  const lostAudio = await startMetronome(90, () => {}, () => outputLost++, new AbortController().signal, lost.environment);
  lost.context.failSource = true;
  assert.doesNotThrow(() => lost.tick(), "later output failures must not escape the timer callback");
  assert.equal(outputLost, 1); assert.equal(lost.timers.size, 0); assert.equal(lost.context.closed, 1);
  lostAudio.stop();
});

test("another audio owner cancels pending metronome activation and an old owner cannot stop its replacement", async () => {
  const wait = deferred(), h = harness(); h.context.resumeWait = wait.promise;
  let interrupted = 0;
  const pending = startMetronome(90, () => assert.fail("superseded start has no beat"), () => interrupted++, new AbortController().signal, h.environment);
  let replacementInterrupted = 0;
  const release = claimAudioSession(() => replacementInterrupted++);
  wait.resolve(); await assert.rejects(pending, /cancelled/);
  assert.equal(interrupted, 1); assert.equal(replacementInterrupted, 0);
  release();
});

test("real microphone capture and metronome stop each other through the shared audio arbiter", async () => {
  const contexts: ContextStub[] = []; let streamCount = 0;
  const tracks: { stopped: boolean; onended: (() => void) | null; stop: () => void }[] = [];
  class BrowserContext extends ContextStub { constructor() { super(); contexts.push(this); } }
  class Worklet { port = { onmessage: null }; connect() {} disconnect() {} }
  const originals = new Map(["window", "navigator", "AudioContext", "AudioWorkletNode"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: BrowserContext } });
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: BrowserContext });
  Object.defineProperty(globalThis, "AudioWorkletNode", { configurable: true, value: Worklet });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia: async () => { streamCount++; const track = { stopped: false, onended: null, stop() { this.stopped = true; } }; tracks.push(track); return { getTracks: () => [track], getAudioTracks: () => [track] }; } } } });
  const captures: { stop: () => void }[] = [];
  try {
    let micInterrupted = 0, clickInterrupted = 0;
    const capture = await startCapture(() => {}, () => micInterrupted++, new AbortController().signal); captures.push(capture);
    const h = harness(); const click = await startMetronome(90, () => {}, () => clickInterrupted++, new AbortController().signal, h.environment); captures.push(click);
    assert.equal(streamCount, 1, "metronome never requests a microphone");
    assert.equal(tracks[0].stopped, true); assert.equal(micInterrupted, 1);
    captures.push(await startCapture(() => {}, () => {}, new AbortController().signal));
    assert.equal(clickInterrupted, 1); assert.equal(h.timers.size, 0); assert.equal(h.context.closed, 1);
    click.stop(); capture.stop();
    assert.equal(tracks[1].stopped, false, "old tool cleanup cannot stop a new microphone owner");
  } finally {
    captures.forEach(capture => capture.stop());
    for (const [name, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
  assert.ok(contexts.every(context => context.closed === 1));
});

test("background, pagehide and disposal stop pending or running audio without auto-resume", async () => {
  class Page extends EventTarget { hidden = false; }
  const page = new Page(), surface = new EventTarget(), wait = deferred(), h = harness();
  h.context.resumeWait = wait.promise;
  const controller = new AbortController();
  let stops = 0;
  const cleanup = bindPracticeLifecycle(() => { stops++; controller.abort(); }, page, surface);
  const pending = startMetronome(90, () => assert.fail("hidden startup cannot click"), () => {}, controller.signal, h.environment);
  page.dispatchEvent(new Event("visibilitychange")); assert.equal(stops, 0);
  page.hidden = true; page.dispatchEvent(new Event("visibilitychange"));
  wait.resolve(); await assert.rejects(pending, /cancelled/);
  page.hidden = false; page.dispatchEvent(new Event("visibilitychange")); assert.equal(stops, 1);
  surface.dispatchEvent(new Event("pagehide")); assert.equal(stops, 2);
  cleanup(); assert.equal(stops, 3);
  surface.dispatchEvent(new Event("pagehide")); page.hidden = true; page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(stops, 3, "disposal removes both listeners");
  assert.equal(h.timers.size, 0);
});

function sine(frequency: number, sampleRate: number) { return Float32Array.from({ length: 4096 }, (_, index) => .2 * Math.sin(2 * Math.PI * frequency * index / sampleRate)); }
test("the real tuner detects the native low band and all six standard targets without changing lesson defaults", () => {
  for (const sampleRate of [44100, 48000]) {
    for (const frequency of [contract.tuning.minimumFrequencyHz, ...contract.tuning.targets.map(target => target.frequencyHz), contract.tuning.maximumFrequencyHz]) {
      const estimate = estimateTuningPitch(sine(frequency, sampleRate), sampleRate);
      assert.ok(estimate, `${frequency}Hz at ${sampleRate}Hz`);
      assert.ok(Math.abs(1200 * Math.log2(estimate.frequency / frequency)) < 5, `${frequency}Hz pitch estimate remains within tuner display tolerance`);
    }
  }
  assert.equal(estimateTuningPitch(new Float32Array(4096), 48000), null);
  assert.equal(estimatePitch(sine(440, 48000), 48000, { minimumFrequency: 0, maximumFrequency: 1000 }), null);
  assert.equal(estimatePitch(sine(440, 48000), 48000, { minimumFrequency: 1000, maximumFrequency: 55 }), null);
  assert.ok(estimatePitch(sine(1200, 48000), 48000), "scored lesson detector retains its existing high band");
});

test("tuner freshness, clarity, note and cents guidance never create a completion field", () => {
  for (const target of contract.tuning.targets) {
    const reading = tuningReading({ frequency: target.frequencyHz, clarity: 1 }, 10, 10, target.string);
    assert.ok(reading); assert.equal(reading.direction, "nearTarget"); assert.equal(reading.midi, target.midi);
    assert.equal(reading.centsFromTarget, 0); assert.equal("completed" in reading, false);
    assert.equal(tuningReading({ frequency: target.frequencyHz, clarity: contract.tuning.minimumClarity - .001 }, 10, 10, target.string), null);
    assert.equal(tuningReading({ frequency: target.frequencyHz, clarity: 1 }, 10, 10 + contract.tuning.maximumReadingAgeSeconds + .001, target.string), null);
    assert.equal(tuningReading({ frequency: target.frequencyHz, clarity: 1 }, 11, 10, target.string), null);
  }
  assert.equal(tuningReading(null, 0, 0, 6), null);
  assert.equal(tuningReading({ frequency: Infinity, clarity: 1 }, 0, 0, 6), null);
  assert.equal(tuningReading({ frequency: 440, clarity: 1.1 }, 0, 0, 6), null);
});

test("microphone failures explain permission, missing input and busy input separately", () => {
  assert.match(tunerInputError(new DOMException("denied", "NotAllowedError")), /permission/);
  assert.match(tunerInputError(new DOMException("missing", "NotFoundError")), /No microphone was found/);
  assert.match(tunerInputError(new DOMException("busy", "NotReadableError")), /another app/);
  assert.match(tunerInputError(new Error("unexpected")), /try again/);
});
