import test from "node:test";
import assert from "node:assert/strict";
import contract from "../contracts/practice-tools.json" with { type: "json" };
import { DEFAULT_METRONOME_PATTERN, METRONOME_GAP_BARS, METRONOME_LATE_TOLERANCE_SECONDS, METRONOME_LOOKAHEAD_SECONDS, METRONOME_TIMER_MS, bindPracticeLifecycle, isMutedBar, metronomePattern, metronomeVoice, type MetronomeBeatInfo, confirmTuningPreparation, estimateTuningPitch, metronomeBPM, metronomeConfiguration as configuration, metronomeInterval, nextMetronomeBeat, scheduleMetronomeWindow, startMetronome, tunerInputError, tuningReading } from "../lib/audio/practice-tools.ts";
import { METRONOME_MAX_BPM, METRONOME_MIN_BPM } from "../lib/audio/metronome-range.ts";
import { DEFAULT_METRONOME_SETTINGS, METRONOME_STORAGE_KEY, metronomePatternMessage, metronomeSettingsStore, patternForSettings, restoreMetronomeSettings } from "../lib/audio/metronome-settings.ts";
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
/**
 * A virtual clock shared by the timers and the AudioContext.
 *
 * `advance` fires due timers in order, each optionally late by `lateness()`
 * milliseconds, moving `context.currentTime` with them — which is how a busy
 * main thread looks to the scheduler. `stall` moves the clock without firing
 * anything: a main thread blocked outright.
 */
function harness(context = new ContextStub()) {
  const timers = new Map<number, { callback: () => void; dueAt: number }>(); let id = 0, clockMs = 0;
  const setClock = (ms: number) => { clockMs = ms; context.currentTime = ms / 1000; };
  return {
    context, timers,
    environment: { createContext: () => context as unknown as AudioContext, schedule: (callback: () => void, delayMs: number) => { const key = ++id; timers.set(key, { callback, dueAt: clockMs + Math.max(0, delayMs) }); return () => { timers.delete(key); }; } },
    advance(ms: number, lateness: () => number = () => 0) {
      const until = clockMs + ms;
      for (;;) {
        let next: [number, { callback: () => void; dueAt: number }] | undefined;
        for (const entry of timers) if (!next || entry[1].dueAt < next[1].dueAt) next = entry;
        if (!next || next[1].dueAt > until) break;
        timers.delete(next[0]);
        setClock(Math.max(clockMs, next[1].dueAt + lateness()));
        next[1].callback();
      }
      if (clockMs < until) setClock(until);
    },
    stall(ms: number) { setClock(clockMs + ms); },
    clicks() { return context.sources.map(source => source.startedAt ?? NaN); },
  };
}

/** Deterministic jitter in [0, max) ms, so a failure reproduces. */
function jitter(max: number) { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * max; }; }

/**
 * Beat delays are now derived from the audio clock — `(nextBeatAt - currentTime)
 * * 1000` — rather than being a restated constant, so they carry the ordinary
 * floating-point error of accumulating an interval like 0.666... Compared with a
 * tolerance well below anything audible; a real drift shows up as milliseconds,
 * not as the last bit of a double.
 */
function assertDelay(actual: number | undefined, expected: number, message?: string) {
  assert.ok(actual !== undefined, message ?? "a beat is scheduled");
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? "delay"}: ${actual} !== ${expected}`);
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
/**
 * The web metronome plays 30 to 240 BPM, wider than the native 40 to 208 (see
 * lib/audio/metronome-range.ts and the metronomeRange adjudication). Inside the
 * native span every fixture still matches the native clamp and interval
 * exactly; outside it the web clamps to its own span.
 */
for (const fixture of contract.tempoFixtures) test(`native tempo ${fixture.bpm} uses its actual clamp and beat interval`, () => {
  const webClamp = Math.min(METRONOME_MAX_BPM, Math.max(METRONOME_MIN_BPM, fixture.bpm));
  assert.equal(metronomeBPM(fixture.bpm), webClamp);
  assert.equal(metronomeInterval(fixture.bpm), 60 / webClamp);
  if (fixture.bpm >= contract.metronome.minimumBPM && fixture.bpm <= contract.metronome.maximumBPM) {
    assert.equal(metronomeBPM(fixture.bpm), fixture.clampedBPM);
    assert.equal(metronomeInterval(fixture.bpm), fixture.intervalSeconds);
  }
});
test("the web metronome spans 30 to 240 BPM and keeps every other native setting", () => {
  assert.equal(configuration.minimumBPM, 30);
  assert.equal(configuration.maximumBPM, 240);
  assert.equal(metronomeBPM(20), 30);
  assert.equal(metronomeBPM(300), 240);
  assert.deepEqual({ ...configuration, minimumBPM: 0, maximumBPM: 0 }, { ...contract.metronome, minimumBPM: 0, maximumBPM: 0 });
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
  assert.equal(h.context.sources[0].startedAt, 0);
  const original = metronomeInterval(configuration.defaultBPM);
  // Move the slider before the second click is committed: that click keeps its
  // time on the old grid, and the gap after it uses the new tempo.
  h.advance(original * 1000 - 200);
  for (let bpm = 100; bpm <= 120; bpm++) audio.setTempo(bpm);
  h.advance(4000);
  const clicks = h.clicks();
  assertDelay(clicks[1] * 1000, original * 1000, "the pending beat keeps its time");
  assertDelay((clicks[2] - clicks[1]) * 1000, 500, "tempo is adopted after the next beat");
  assertDelay((clicks[3] - clicks[2]) * 1000, 500);
  assert.deepEqual(beats.slice(0, 9), [0, 1, 2, 3, 0, 1, 2, 3, 0]);
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
  assert.equal(h.timers.size, 0, "stop cancels the scheduler and any pending beat display");
  assert.equal(h.context.closed, 1);
  assert.ok(h.context.sources.every(source => source.stopped && source.disconnected));
  const restarted = harness(); const restartedAudio = await startMetronome(90, beat => assert.equal(beat, 0), () => {}, new AbortController().signal, restarted.environment);
  restartedAudio.stop();
});

/**
 * The jitter regression.
 *
 * Each click used to be started at "now" by a timer, so a timer firing 0-50 ms
 * late made the click 0-50 ms late. With lookahead the clicks are committed to
 * the audio clock ahead of time, and timer lateness under the lookahead margin
 * moves nothing.
 */
test("main-thread jitter does not move any click off the grid", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => assert.fail("not interrupted"), new AbortController().signal, h.environment);
  try {
    h.advance(10_000, jitter(50));
    const clicks = h.clicks();
    assert.ok(clicks.length >= 20);
    for (const [index, time] of clicks.entries()) {
      assert.ok(Math.abs(time - index * 0.5) < 1e-9, `click ${index} at ${time}s is off the 0.5s grid`);
    }
  } finally { audio.stop(); }
});

test("clicks are committed ahead of the audio clock, within the lookahead window", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => {}, new AbortController().signal, h.environment);
  try {
    // Every click committed so far lies no further ahead than one timer period
    // plus the lookahead window.
    h.advance(2_440);
    const now = h.context.currentTime;
    const ahead = Math.max(...h.clicks()) - now;
    assert.ok(ahead > 0, "the next click is already committed before it is due");
    assert.ok(ahead <= METRONOME_LOOKAHEAD_SECONDS + METRONOME_TIMER_MS / 1000 + 1e-9, `${ahead}s ahead`);
    // The scheduler is one repeating timer, not a timer per beat.
    const schedulerTimers = [...h.timers.values()].filter(timer => timer.dueAt - now * 1000 <= METRONOME_TIMER_MS + 1e-6);
    assert.ok(schedulerTimers.length >= 1 && h.timers.size <= 3);
  } finally { audio.stop(); }
});

test("the visible beat follows each click's scheduled time, not the timer that queued it", async () => {
  const h = harness(); const shown: [number, number][] = [];
  const audio = await startMetronome(120, beat => shown.push([beat, h.context.currentTime]), () => {}, new AbortController().signal, h.environment);
  try {
    h.advance(2_100);
    assert.deepEqual(shown.map(([beat]) => beat), [0, 1, 2, 3, 0]);
    for (const [index, [, at]] of shown.entries()) assert.ok(Math.abs(at - index * 0.5) < 1e-9, `beat ${index} shown at ${at}`);
  } finally { audio.stop(); }
});

/**
 * The stall regression: a 700 ms block of the main thread used to produce one
 * 1.58 s beat. Now the missed clicks are dropped, no burst follows, and the
 * click resumes on the same grid.
 */
test("a 700 ms stall resyncs to the grid instead of stretching a beat or bursting", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => assert.fail("not interrupted"), new AbortController().signal, h.environment);
  try {
    h.advance(1_010);
    h.stall(700);
    h.advance(3_000);
    const clicks = h.clicks();
    for (let index = 1; index < clicks.length; index++) {
      const gap = clicks[index] - clicks[index - 1];
      assert.ok(gap >= 0.5 - 1e-9, `no burst: gap ${gap}s`);
      assert.ok(gap <= 1 + 1e-9, `at most one click is lost: gap ${gap}s`);
    }
    for (const time of clicks) assert.ok(Math.abs(time / 0.5 - Math.round(time / 0.5)) < 1e-6, `${time}s stays on the 0.5s grid`);
  } finally { audio.stop(); }
});

test("a long suspension resyncs instead of firing a burst of catch-up clicks", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => assert.fail("not interrupted"), new AbortController().signal, h.environment);
  try {
    h.stall(30_000);
    const before = h.context.sources.length;
    h.advance(METRONOME_TIMER_MS);
    assert.ok(h.context.sources.length - before <= 1, "at most the next grid click is committed, not sixty");
  } finally { audio.stop(); }
});

test("scheduleMetronomeWindow keeps bar position across a skipped stretch", () => {
  const interval = metronomeInterval(120);
  const late = scheduleMetronomeWindow({ nextBeatAt: 1, beat: 2 }, 1 + METRONOME_LATE_TOLERANCE_SECONDS / 2, 120);
  assert.equal(late.skipped, 0, "a click inside the tolerance still sounds");
  assert.equal(late.clicks[0].beat, 2);
  assert.equal(late.clicks[0].time, 1 + METRONOME_LATE_TOLERANCE_SECONDS / 2);

  const stalled = scheduleMetronomeWindow({ nextBeatAt: 1, beat: 2 }, 1 + 3 * interval - 0.01, 120);
  assert.equal(stalled.skipped, 3);
  assert.deepEqual(stalled.clicks.map(click => click.beat), [1]);
  assert.ok(Math.abs(stalled.clicks[0].time - (1 + 3 * interval)) < 1e-9);

  assert.deepEqual(scheduleMetronomeWindow({ nextBeatAt: NaN, beat: 0 }, 0, 120).clicks, []);
});

/** Click times (s) and which buffer each used: the accent is buffers[0], the tick buffers[1]. */
function voices(h: ReturnType<typeof harness>) {
  return h.context.sources.map(source => ({ time: source.startedAt ?? NaN, voice: source.buffer === h.context.buffers[0] ? "accent" : "tick" }));
}
const onGrid = (time: number, interval: number) => Math.abs(time / interval - Math.round(time / interval)) < 1e-6;

test("metronomeVoice: every beat, backbeat and beat-one-only patterns", () => {
  const every = [0, 1, 2, 3].map(beat => metronomeVoice(beat, 0, { mode: "everyBeat", gap: null }));
  assert.deepEqual(every, ["accent", "tick", "tick", "tick"]);
  const backbeat = [0, 1, 2, 3].map(beat => metronomeVoice(beat, 0, { mode: "backbeat", gap: null }));
  assert.deepEqual(backbeat, [null, "tick", null, "tick"], "beats 2 and 4 only");
  const downbeat = [0, 1, 2, 3].map(beat => metronomeVoice(beat, 0, { mode: "downbeat", gap: null }));
  assert.deepEqual(downbeat, ["accent", null, null, null], "one click per bar");
  const gap = { mode: "everyBeat" as const, gap: { playBars: 2, muteBars: 2 } };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(bar => isMutedBar(bar, gap)), [false, false, true, true, false, false, true, true]);
  assert.equal(metronomeVoice(0, 2, gap), null, "a muted bar silences even the accent");
  assert.equal(isMutedBar(0, gap, 1), false, "bars before a new gap cycle's origin keep sounding");
  assert.deepEqual([1, 2, 3, 4].map(bar => isMutedBar(bar, gap, 1)), [false, false, true, true]);
});

test("scheduleMetronomeWindow counts bars and labels each grid position with its voice", () => {
  const pattern = { mode: "downbeat" as const, gap: { playBars: 1, muteBars: 1 } };
  let cursor = { nextBeatAt: 0, beat: 0, bar: 0 };
  const all: { beat: number; bar: number; voice: string | null }[] = [];
  for (let now = 0; now < 4; now += 0.025) {
    const planned = scheduleMetronomeWindow(cursor, now, 120, pattern);
    cursor = planned.cursor as typeof cursor;
    all.push(...planned.clicks.map(({ beat, bar, voice }) => ({ beat, bar, voice })));
  }
  assert.deepEqual(all.slice(0, 9).map(click => click.bar), [0, 0, 0, 0, 1, 1, 1, 1, 2]);
  assert.deepEqual(all.filter(click => click.voice).map(click => [click.bar, click.beat, click.voice]), [[0, 0, "accent"], [2, 0, "accent"]]);
  // A stall that skips across a bar line moves the bar count with it, so the
  // gap cycle stays in step with the bars the player kept counting.
  const stalled = scheduleMetronomeWindow({ nextBeatAt: 1, beat: 2, bar: 5 }, 1 + 3 * 0.5 - 0.01, 120, pattern);
  assert.equal(stalled.skipped, 3);
  assert.deepEqual(stalled.clicks.map(({ beat, bar }) => [beat, bar]), [[1, 6]]);
  // Cursors from before bars were counted still schedule.
  assert.equal(scheduleMetronomeWindow({ nextBeatAt: 0, beat: 0 }, 0, 120).clicks[0].bar, 0);
});

test("backbeat mode clicks beats 2 and 4 on the audio grid and still shows every beat", async () => {
  const h = harness(); const shown: [number, MetronomeBeatInfo][] = [];
  const audio = await startMetronome(120, (beat, info) => shown.push([beat, info]), () => assert.fail("not interrupted"), new AbortController().signal, h.environment, { mode: "backbeat", gap: null });
  try {
    h.advance(4_000, jitter(40));
    const clicks = voices(h);
    assert.equal(clicks.length, 4, "two clicks a bar for two bars");
    for (const click of clicks) {
      assert.equal(click.voice, "tick");
      assert.ok(onGrid(click.time - 0.5, 1), `${click.time}s is beat 2 or 4 of a 0.5s grid`);
    }
    assert.deepEqual(shown.slice(0, 8).map(([beat]) => beat), [0, 1, 2, 3, 0, 1, 2, 3], "the beat display keeps all four");
    assert.deepEqual(shown.slice(0, 4).map(([, info]) => info.sounding), [false, true, false, true]);
  } finally { audio.stop(); }
});

test("beat-one-only mode plays one accented click per bar", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => assert.fail("not interrupted"), new AbortController().signal, h.environment, { mode: "downbeat", gap: null });
  try {
    h.advance(8_100, jitter(40));
    const clicks = voices(h);
    assert.deepEqual(clicks.map(click => click.voice), ["accent", "accent", "accent", "accent", "accent"]);
    for (const [index, click] of clicks.entries()) assert.ok(Math.abs(click.time - index * 2) < 1e-9, `bar ${index} starts at ${click.time}s`);
  } finally { audio.stop(); }
});

test("the gap trainer plays two bars, silences two, and returns exactly on the grid", async () => {
  const h = harness(); const muted: boolean[] = [];
  const audio = await startMetronome(120, (beat, info) => { if (beat === 0) muted.push(info.muted); }, () => assert.fail("not interrupted"), new AbortController().signal, h.environment, { mode: "everyBeat", gap: { playBars: 2, muteBars: 2 } });
  try {
    h.advance(16_100, jitter(40));
    const times = voices(h).map(click => click.time);
    // Bars are 2s at 120 BPM: clicks in 0-4s and 8-12s, silence in 4-8s and 12-16s.
    assert.equal(times.length, 17);
    for (const time of times) {
      const bar = Math.floor(time / 2 + 1e-9);
      assert.ok(bar % 4 < 2 || time >= 16 - 1e-9, `no click in silent bar ${bar} (${time}s)`);
      assert.ok(onGrid(time, 0.5), `${time}s is on the grid`);
    }
    assert.ok(times.includes(8), "the click returns on beat one of bar five");
    assert.deepEqual(muted.slice(0, 8), [false, false, true, true, false, false, true, true]);
  } finally { audio.stop(); }
});

test("pattern changes apply from the next uncommitted click and a new gap starts on the next bar", async () => {
  const h = harness();
  const audio = await startMetronome(120, () => {}, () => {}, new AbortController().signal, h.environment);
  try {
    h.advance(2_700); // inside bar 1 (2-4s)
    const before = h.context.sources.length;
    audio.setPattern({ mode: "everyBeat", gap: { playBars: 1, muteBars: 1 } });
    h.advance(6_000);
    const later = voices(h).slice(before).map(click => click.time);
    // The rest of bar 1 keeps sounding; bar 2 (4-6s) is the new cycle's click
    // bar, bar 3 (6-8s) its silent bar.
    assert.ok(later.some(time => time >= 3 && time < 4), "the current bar finishes");
    assert.ok(later.some(time => time >= 4 && time < 6), "the new cycle opens with a click bar");
    assert.ok(!later.some(time => time >= 6 - 1e-9 && time < 8 - 1e-9), "then a silent bar");
    audio.setPattern({ mode: "downbeat", gap: null });
    const switched = h.context.sources.length;
    h.advance(4_000);
    assert.ok(voices(h).slice(switched).every(click => click.voice === "accent"), "beat-one-only after the switch");
  } finally { audio.stop(); }
});

test("patterns and stored settings decode defensively", () => {
  assert.deepEqual(metronomePattern(null), DEFAULT_METRONOME_PATTERN);
  assert.deepEqual(metronomePattern({ mode: "offbeat", gap: { playBars: 0, muteBars: 99 } }), { mode: "everyBeat", gap: { playBars: METRONOME_GAP_BARS.defaultPlay, muteBars: METRONOME_GAP_BARS.defaultMute } });
  assert.deepEqual(restoreMetronomeSettings({ bpm: 12, mode: "backbeat", gapEnabled: true, playBars: 4, muteBars: 1 }), { bpm: METRONOME_MIN_BPM, mode: "backbeat", gapEnabled: true, playBars: 4, muteBars: 1 });
  assert.deepEqual(restoreMetronomeSettings({ bpm: "fast", mode: 3, gapEnabled: "yes", playBars: 2.5 }), DEFAULT_METRONOME_SETTINGS);
  assert.equal(restoreMetronomeSettings([]), null);
  assert.deepEqual(patternForSettings({ ...DEFAULT_METRONOME_SETTINGS, mode: "downbeat", gapEnabled: false, playBars: 3 }), { mode: "downbeat", gap: null });
  assert.deepEqual(patternForSettings({ ...DEFAULT_METRONOME_SETTINGS, gapEnabled: true, playBars: 3, muteBars: 1 }).gap, { playBars: 3, muteBars: 1 });
  assert.match(metronomePatternMessage({ ...DEFAULT_METRONOME_SETTINGS, gapEnabled: true, playBars: 2, muteBars: 1 }), /2 bars with the click, then 1 bar silent/);
});

test("the chosen tempo and pattern persist under their own key", () => {
  const data = new Map<string, string>();
  const area = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const store = metronomeSettingsStore(() => area);
  const chosen = { bpm: 60, mode: "downbeat" as const, gapEnabled: true, playBars: 2, muteBars: 2 };
  assert.equal(store.write(chosen), true);
  assert.ok(data.has(METRONOME_STORAGE_KEY));
  assert.deepEqual(metronomeSettingsStore(() => area).read(), { available: true, value: chosen });
  const blocked = metronomeSettingsStore(() => { throw new Error("blocked"); });
  assert.deepEqual(blocked.read(), { available: false });
  assert.equal(blocked.write(chosen), false);
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
  // A lost (closed) output stops at once; brief iOS interruptions are covered by watchAudioState's own test.
  running.context.state = "closed"; running.context.onstatechange?.();
  assert.equal(interrupted, 1); assert.equal(running.timers.size, 0); assert.equal(running.context.closed, 1);
  audio.stop();
  const lost = harness(); let outputLost = 0;
  const lostAudio = await startMetronome(90, () => {}, () => outputLost++, new AbortController().signal, lost.environment);
  lost.context.failSource = true;
  assert.doesNotThrow(() => lost.advance(1_000), "later output failures must not escape the timer callback");
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

test("the actual tuning confirmation action waits after reference stop or interruption before reporting readiness", () => {
  const ready: string[] = [];
  const confirm = () => ready.push("ready");
  // A learner can recheck the boxes while the reference is playing.
  const state = { allChecked: true, referenceActive: true, quietUntil: 0, now: 1000 };
  assert.equal(confirmTuningPreparation(state, confirm), "waitingForFade");
  // Both explicit Stop and arbiter interruption become idle before their one-second fade expires.
  for (const stoppedBy of ["stop", "interruption"]) {
    state.referenceActive = false; state.now = 1000; state.quietUntil = 2000;
    const previous = ready.length;
    assert.equal(confirmTuningPreparation(state, confirm), "waitingForFade", stoppedBy);
    state.now = 1999;
    assert.equal(confirmTuningPreparation(state, confirm), "waitingForFade", stoppedBy);
    assert.equal(ready.length, previous, "early confirmation must not invoke the readiness callback");
    state.now = 2000;
    assert.equal(confirmTuningPreparation(state, confirm), "confirmed", stoppedBy);
    assert.equal(ready.length, previous + 1);
  }
  state.allChecked = false;
  assert.equal(confirmTuningPreparation(state, confirm), "incomplete");
  assert.equal(ready.length, 2, "fade expiry cannot replace a complete learner checklist");
  assert.equal(confirmTuningPreparation({ ...state, allChecked: true, now: NaN }, confirm), "waitingForFade");
  assert.equal(ready.length, 2);
});
