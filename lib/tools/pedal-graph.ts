import { claimAudioSession, createAudioContext, hasWebAudio, watchAudioState } from "../audio/capture.ts";
import { renderDemoRiff, type DemoRiffStyle } from "./demo-riff.ts";
import {
  CABINET, ampCurve, clampAmp, clampSettings, compressorParams, dbToGain, delayFeedback, dialToHz, distortionCurve,
  fuzzCurve, gateCurve, impulseResponse, levelGain, masterGain, mixGains, outputGain, overdriveCurve, toneStackDb,
  wahFrequency, type AmpSettings, type Pedal, type PedalSettings, type PedalType,
} from "./pedal-lab.ts";

/**
 * The pedal lab's Web Audio graph:
 *
 *   source → input gain → pedals in order → amp → cab → limiter → output volume → mute → speakers
 *
 * Every pedal is a unit with an input and an output. Bypass crossfades between
 * the effect and a dry path inside the unit, so a footswitch never clicks.
 * Reordering ramps the mute gain down, rewires the units, and ramps it back up.
 * Knob changes use setTargetAtTime, so a dragged slider glides rather than steps.
 *
 * Nothing here starts on import. `startPedalLab` is only called from a tap.
 */

/** Seconds for knob smoothing (time constant). */
const SMOOTH = .02;
/** The rewire fade: time constant and how long to wait before rewiring. */
const FADE = .008, FADE_WAIT_MS = 45;

type Ctx = BaseAudioContext;

function glide(context: Ctx, param: AudioParam, value: number, timeConstant = SMOOTH) {
  if (!Number.isFinite(value)) return;
  param.setTargetAtTime(value, context.currentTime, timeConstant);
}
function gainNode(context: Ctx, value = 1) { const node = context.createGain(); node.gain.value = value; return node; }
function biquad(context: Ctx, type: BiquadFilterType, frequency: number, q?: number, gain?: number) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  if (q !== undefined) node.Q.value = q;
  if (gain !== undefined) node.gain.value = gain;
  return node;
}
function shaper(context: Ctx, curve: Float32Array<ArrayBuffer>) {
  const node = context.createWaveShaper();
  node.curve = curve;
  node.oversample = "4x";
  return node;
}
/** Full-wave rectifier: |x|, exactly, from a three-point curve. */
function rectifier(context: Ctx) {
  const node = context.createWaveShaper();
  node.curve = new Float32Array([1, 0, 1]);
  return node;
}
function series(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes;
}

/** One block in the chain. `set` receives already-clamped settings. */
export interface Unit {
  input: GainNode;
  output: GainNode;
  set: (settings: PedalSettings) => void;
  setBypass: (on: boolean) => void;
  dispose: () => void;
}

/**
 * A unit shell: input → dry → output, and input → (effect) → wet → output.
 * `build` wires the effect from `input` into `wet` and returns its updater and
 * any sources it started.
 */
function makeUnit(context: Ctx, on: boolean, build: (input: GainNode, wet: GainNode, track: (...nodes: AudioNode[]) => void) => (settings: PedalSettings) => void, settings: PedalSettings): Unit {
  const input = gainNode(context), output = gainNode(context);
  const wet = gainNode(context, on ? 1 : 0), dry = gainNode(context, on ? 0 : 1);
  const nodes: AudioNode[] = [input, output, wet, dry];
  const track = (...more: AudioNode[]) => { nodes.push(...more); };
  input.connect(dry); dry.connect(output); wet.connect(output);
  const update = build(input, wet, track);
  update(settings);
  return {
    input, output,
    set: update,
    setBypass: value => { glide(context, wet.gain, value ? 1 : 0, .01); glide(context, dry.gain, value ? 0 : 1, .01); },
    dispose: () => {
      for (const node of nodes) {
        if ("stop" in node && typeof (node as OscillatorNode).stop === "function") { try { (node as OscillatorNode).stop(); } catch { /* already stopped */ } }
        try { node.disconnect(); } catch { /* not connected */ }
      }
    },
  };
}

function lfo(context: Ctx, frequency: number, track: (...nodes: AudioNode[]) => void, type: OscillatorType = "sine") {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.start();
  track(oscillator);
  return oscillator;
}

/** A square wave with its harmonics tapered, so the tremolo chops without clicking. */
function softSquare(context: Ctx) {
  const harmonics = 16;
  const real = new Float32Array(harmonics), imag = new Float32Array(harmonics);
  for (let h = 1; h < harmonics; h += 2) {
    const sigma = Math.sin(Math.PI * h / harmonics) / (Math.PI * h / harmonics);
    imag[h] = 4 / (Math.PI * h) * sigma;
  }
  return context.createPeriodicWave(real, imag);
}

type Builder = (context: Ctx, input: GainNode, wet: GainNode, track: (...nodes: AudioNode[]) => void) => (s: PedalSettings) => void;

const builders: Record<PedalType, Builder> = {
  gate(context, input, wet, track) {
    // An envelope follower drives the gain of a VCA: rectify, smooth, then map
    // level to gain through the gate curve.
    const vca = gainNode(context, 0), rect = rectifier(context), smooth = biquad(context, "lowpass", 5, -3);
    const map = context.createWaveShaper();
    track(vca, rect, smooth, map);
    series(input, rect, smooth, map);
    map.connect(vca.gain);
    input.connect(vca); vca.connect(wet);
    let threshold = NaN;
    return s => {
      if (s.threshold !== threshold) { threshold = s.threshold; map.curve = gateCurve(threshold); }
      glide(context, smooth.frequency, 1 / (2 * Math.PI * s.release / 1000) * 2);
    };
  },
  compressor(context, input, wet, track) {
    const comp = context.createDynamicsCompressor(), makeup = gainNode(context);
    comp.release.value = .25;
    track(comp, makeup);
    series(input, comp, makeup, wet);
    return s => {
      const params = compressorParams(s.sustain);
      glide(context, comp.threshold, params.threshold);
      glide(context, comp.ratio, params.ratio);
      comp.knee.value = params.knee;
      glide(context, comp.attack, s.attack / 1000);
      glide(context, makeup.gain, dbToGain(params.makeupDb) * levelGain(s.level));
    };
  },
  wah(context, input, wet, track) {
    const filter = biquad(context, "bandpass", 1000, 4), boost = gainNode(context, 3);
    const low = gainNode(context, .15);
    const oscillator = lfo(context, 1.5, track), lfoDepth = gainNode(context, 0);
    const rect = rectifier(context), follower = biquad(context, "lowpass", 12, -3), envDepth = gainNode(context, 0);
    track(filter, boost, low, lfoDepth, rect, follower, envDepth);
    series(input, filter, boost, wet);
    input.connect(low); low.connect(wet);
    oscillator.connect(lfoDepth); lfoDepth.connect(filter.frequency);
    series(input, rect, follower, envDepth); envDepth.connect(filter.frequency);
    return s => {
      const base = wahFrequency(s.position), range = s.range / 10;
      glide(context, oscillator.frequency, s.rate);
      if (s.mode === 1) {
        // Swing round the parked position, never below 250 Hz.
        const depth = Math.min(base - 250, base * .7) * range;
        glide(context, filter.frequency, base); glide(context, lfoDepth.gain, Math.max(0, depth)); glide(context, envDepth.gain, 0);
      } else if (s.mode === 2) {
        // Start low and let the pick attack open it.
        glide(context, filter.frequency, Math.min(base, 500)); glide(context, lfoDepth.gain, 0); glide(context, envDepth.gain, range * 8000);
      } else {
        glide(context, filter.frequency, base); glide(context, lfoDepth.gain, 0); glide(context, envDepth.gain, 0);
      }
    };
  },
  eq(context, input, wet, track) {
    const bass = biquad(context, "peaking", 100, .9, 0), mid = biquad(context, "peaking", 800, .9, 0), treble = biquad(context, "peaking", 3200, .9, 0);
    const out = gainNode(context);
    track(bass, mid, treble, out);
    series(input, bass, mid, treble, out, wet);
    return s => {
      glide(context, bass.gain, s.bass); glide(context, mid.gain, s.mid); glide(context, treble.gain, s.treble);
      glide(context, out.gain, levelGain(s.level));
    };
  },
  overdrive(context, input, wet, track) {
    // Pre-emphasis: trim the lows and add a mid hump before the clipper, so the
    // lows stay tight and the mids clip first. Then a low-pass tone control.
    const low = biquad(context, "highpass", 180, 0), hump = biquad(context, "peaking", 720, .8, 6);
    const clip = shaper(context, overdriveCurve(5)), dc = biquad(context, "highpass", 20, 0);
    const toneFilter = biquad(context, "lowpass", 3000, 0), out = gainNode(context);
    track(low, hump, clip, dc, toneFilter, out);
    series(input, low, hump, clip, dc, toneFilter, out, wet);
    let drive = NaN;
    return s => {
      if (s.drive !== drive) { drive = s.drive; clip.curve = overdriveCurve(drive); }
      glide(context, toneFilter.frequency, dialToHz(s.tone, 800, 6000));
      glide(context, out.gain, levelGain(s.level) * .5);
    };
  },
  distortion(context, input, wet, track) {
    const low = biquad(context, "highpass", 120, 0), clip = shaper(context, distortionCurve(6)), dc = biquad(context, "highpass", 20, 0);
    const toneFilter = biquad(context, "lowpass", 3000, 0), out = gainNode(context);
    track(low, clip, dc, toneFilter, out);
    series(input, low, clip, dc, toneFilter, out, wet);
    let drive = NaN;
    return s => {
      if (s.drive !== drive) { drive = s.drive; clip.curve = distortionCurve(drive); }
      glide(context, toneFilter.frequency, dialToHz(s.tone, 1000, 8000));
      glide(context, out.gain, levelGain(s.level) * .4);
    };
  },
  fuzz(context, input, wet, track) {
    const clip = shaper(context, fuzzCurve(7, 3)), dc = biquad(context, "highpass", 25, 0);
    const toneFilter = biquad(context, "lowpass", 2500, 0), out = gainNode(context);
    track(clip, dc, toneFilter, out);
    series(input, clip, dc, toneFilter, out, wet);
    let key = "";
    return s => {
      const next = `${s.fuzz}/${s.bias}`;
      if (next !== key) { key = next; clip.curve = fuzzCurve(s.fuzz, s.bias); }
      glide(context, toneFilter.frequency, dialToHz(s.tone, 600, 6000));
      glide(context, out.gain, levelGain(s.level) * .35);
    };
  },
  chorus(context, input, wet, track) {
    const delay = context.createDelay(.05), depth = gainNode(context, 0), dry = gainNode(context), mixed = gainNode(context);
    delay.delayTime.value = .012;
    const oscillator = lfo(context, .8, track);
    track(delay, depth, dry, mixed);
    oscillator.connect(depth); depth.connect(delay.delayTime);
    input.connect(dry); dry.connect(wet);
    series(input, delay, mixed, wet);
    return s => {
      glide(context, oscillator.frequency, s.rate);
      glide(context, depth.gain, s.depth / 10 * .005);
      const gains = mixGains(s.mix);
      glide(context, dry.gain, gains.dry); glide(context, mixed.gain, gains.wet);
    };
  },
  phaser(context, input, wet, track) {
    const stages = Array.from({ length: 6 }, (_, i) => biquad(context, "allpass", 600 + i * 150, .7));
    const oscillator = lfo(context, .5, track), depth = gainNode(context, 0);
    const tap4 = gainNode(context, .5), tap6 = gainNode(context, 0), dry = gainNode(context, .5);
    track(...stages, depth, tap4, tap6, dry);
    series(input, ...stages);
    stages[3].connect(tap4); stages[5].connect(tap6);
    tap4.connect(wet); tap6.connect(wet);
    input.connect(dry); dry.connect(wet);
    oscillator.connect(depth);
    for (const stage of stages) depth.connect(stage.frequency);
    return s => {
      glide(context, oscillator.frequency, s.rate);
      glide(context, depth.gain, s.depth / 10 * 500);
      glide(context, tap4.gain, s.stages === 1 ? 0 : .5); glide(context, tap6.gain, s.stages === 1 ? .5 : 0);
    };
  },
  tremolo(context, input, wet, track) {
    const vca = gainNode(context, 1), depth = gainNode(context, 0);
    const oscillator = lfo(context, 5, track);
    const square = softSquare(context);
    track(vca, depth);
    oscillator.connect(depth); depth.connect(vca.gain);
    series(input, vca, wet);
    let shape = -1;
    return s => {
      if (s.shape !== shape) { shape = s.shape; if (shape === 1) oscillator.setPeriodicWave(square); else oscillator.type = "sine"; }
      const d = s.depth / 10;
      glide(context, oscillator.frequency, s.rate);
      glide(context, vca.gain, 1 - d / 2); glide(context, depth.gain, d / 2);
    };
  },
  delay(context, input, wet, track) {
    const line = context.createDelay(2), dark = biquad(context, "lowpass", 3000, 0), feedback = gainNode(context, .35);
    const dry = gainNode(context), repeats = gainNode(context);
    track(line, dark, feedback, dry, repeats);
    input.connect(dry); dry.connect(wet);
    series(input, line, dark, repeats, wet);
    dark.connect(feedback); feedback.connect(line);
    return s => {
      glide(context, line.delayTime, s.time / 1000, .05);
      glide(context, feedback.gain, delayFeedback(s.feedback));
      glide(context, dark.frequency, dialToHz(s.tone, 1200, 8000));
      const gains = mixGains(s.mix);
      glide(context, dry.gain, gains.dry); glide(context, repeats.gain, gains.wet);
    };
  },
  reverb(context, input, wet, track) {
    // Two convolvers, so a new decay crossfades instead of clicking.
    const pre = context.createDelay(.2), dry = gainNode(context), tail = gainNode(context);
    const convolvers = [context.createConvolver(), context.createConvolver()];
    const faders = [gainNode(context, 1), gainNode(context, 0)];
    track(pre, dry, tail, ...convolvers, ...faders);
    input.connect(dry); dry.connect(wet);
    input.connect(pre);
    convolvers.forEach((convolver, i) => { pre.connect(convolver); convolver.connect(faders[i]); faders[i].connect(tail); });
    tail.connect(wet);
    let decay = NaN, active = 1, seed = 1, timer: ReturnType<typeof setTimeout> | null = null;
    const load = (seconds: number) => {
      const [left, right] = impulseResponse(context.sampleRate, seconds, seed++);
      const buffer = context.createBuffer(2, left.length, context.sampleRate);
      buffer.copyToChannel(left, 0); buffer.copyToChannel(right, 1);
      const next = 1 - active;
      convolvers[next].buffer = buffer;
      glide(context, faders[next].gain, 1, .03); glide(context, faders[active].gain, 0, .03);
      active = next;
    };
    return s => {
      glide(context, pre.delayTime, s.predelay / 1000);
      const gains = mixGains(s.mix);
      glide(context, dry.gain, gains.dry); glide(context, tail.gain, gains.wet * 1.6);
      if (s.decay !== decay) {
        const first = Number.isNaN(decay);
        decay = s.decay;
        if (timer !== null) clearTimeout(timer);
        if (first) load(decay);
        else timer = setTimeout(() => { timer = null; load(decay); }, 120);
      }
    };
  },
};

export function createPedalUnit(context: Ctx, pedal: Pedal): Unit {
  const settings = clampSettings(pedal.type, pedal.settings);
  return makeUnit(context, pedal.on, (input, wet, track) => builders[pedal.type](context, input, wet, track), settings);
}

/** The amp (gain stage, tone stack, master) and the cab, each bypassable. */
function createAmp(context: Ctx, amp: AmpSettings) {
  const input = gainNode(context), output = gainNode(context);
  const ampWet = gainNode(context, amp.on ? 1 : 0), ampDry = gainNode(context, amp.on ? 0 : 1), ampOut = gainNode(context);
  const clip = shaper(context, ampCurve(amp.gain)), dc = biquad(context, "highpass", 25, 0);
  const bass = biquad(context, "lowshelf", 120, undefined, 0), mid = biquad(context, "peaking", 650, .8, 0), treble = biquad(context, "highshelf", 2800, undefined, 0);
  const master = gainNode(context);
  series(input, clip, dc, bass, mid, treble, master, ampWet, ampOut);
  input.connect(ampDry); ampDry.connect(ampOut);

  const cabWet = gainNode(context, amp.cab ? 1 : 0), cabDry = gainNode(context, amp.cab ? 0 : 1);
  const high = biquad(context, "highpass", CABINET.highPassHz, 0);
  const bump = biquad(context, "peaking", CABINET.resonance.hz, CABINET.resonance.q, CABINET.resonance.db);
  const dip = biquad(context, "peaking", CABINET.presenceDip.hz, CABINET.presenceDip.q, CABINET.presenceDip.db);
  const lowA = biquad(context, "lowpass", CABINET.lowPassHz, 0), lowB = biquad(context, "lowpass", CABINET.lowPassHz * 1.2, 0);
  series(ampOut, high, bump, dip, lowA, lowB, cabWet, output);
  ampOut.connect(cabDry); cabDry.connect(output);
  const nodes: AudioNode[] = [input, output, ampWet, ampDry, ampOut, clip, dc, bass, mid, treble, master, cabWet, cabDry, high, bump, dip, lowA, lowB];

  let gain = amp.gain;
  const set = (next: AmpSettings) => {
    if (next.gain !== gain) { gain = next.gain; clip.curve = ampCurve(gain); }
    const tone = toneStackDb(next);
    glide(context, bass.gain, tone.bass); glide(context, mid.gain, tone.mid); glide(context, treble.gain, tone.treble);
    glide(context, master.gain, masterGain(next.master));
    glide(context, ampWet.gain, next.on ? 1 : 0, .01); glide(context, ampDry.gain, next.on ? 0 : 1, .01);
    glide(context, cabWet.gain, next.cab ? 1 : 0, .01); glide(context, cabDry.gain, next.cab ? 0 : 1, .01);
  };
  set(amp);
  return { input, output, set, dispose: () => { for (const node of nodes) { try { node.disconnect(); } catch { /* not connected */ } } } };
}

export interface PedalGraph {
  /** Feed the source here. */
  input: GainNode;
  setParam: (pedalId: string, knob: string, value: number) => void;
  setBypass: (pedalId: string, on: boolean) => void;
  /** Rewire into a new order, with a short fade so it does not click. */
  reorder: (ids: readonly string[]) => void;
  /** Add, remove and reorder in one step: the graph follows the chain exactly. */
  setChain: (chain: readonly Pedal[]) => void;
  setAmp: (amp: AmpSettings) => void;
  setInputGain: (db: number) => void;
  setVolume: (percent: number) => void;
  /** The current order, for tests. */
  order: () => string[];
  dispose: () => void;
}

/** Build the graph on a context and connect it to `destination`. Starts no sources. */
export function buildPedalGraph(context: Ctx, chain: readonly Pedal[], amp: AmpSettings, options: { volume: number; inputGainDb: number; destination: AudioNode; schedule?: (callback: () => void, ms: number) => () => void }): PedalGraph {
  const schedule = options.schedule ?? ((callback, ms) => { const timer = setTimeout(callback, ms); return () => clearTimeout(timer); });
  const input = gainNode(context, dbToGain(options.inputGainDb));
  const ampBlock = createAmp(context, clampAmp(amp));
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .1;
  const volume = gainNode(context, outputGain(options.volume)), mute = gainNode(context, 1);
  series(ampBlock.output, limiter, volume, mute, options.destination);

  const units = new Map<string, { pedal: Pedal; unit: Unit }>();
  let order: string[] = [];
  let disposed = false, cancelRewire: (() => void) | null = null;
  let pending: (() => void) | null = null;

  const wire = () => {
    input.disconnect();
    for (const { unit } of units.values()) unit.output.disconnect();
    let previous: AudioNode = input;
    for (const id of order) { const entry = units.get(id); if (!entry) continue; previous.connect(entry.unit.input); previous = entry.unit.output; }
    previous.connect(ampBlock.input);
  };
  /** Fade out, run `change` and rewire, fade back in. Changes during a fade are batched. */
  const rewire = (change: () => void) => {
    if (disposed) return;
    const previous = pending;
    pending = previous ? () => { previous(); change(); } : change;
    if (cancelRewire) return;
    glide(context, mute.gain, 0, FADE);
    cancelRewire = schedule(() => {
      cancelRewire = null;
      if (disposed) return;
      const run = pending; pending = null;
      run?.();
      wire();
      glide(context, mute.gain, 1, FADE);
    }, FADE_WAIT_MS);
  };

  const applyChain = (chain: readonly Pedal[]) => {
    const wanted = new Set(chain.map(pedal => pedal.id));
    for (const [id, entry] of units) if (!wanted.has(id)) { entry.unit.dispose(); units.delete(id); }
    for (const pedal of chain) {
      const existing = units.get(pedal.id);
      if (existing && existing.pedal.type === pedal.type) {
        existing.unit.set(clampSettings(pedal.type, pedal.settings)); existing.unit.setBypass(pedal.on);
        existing.pedal = { ...pedal, settings: clampSettings(pedal.type, pedal.settings) };
      } else {
        existing?.unit.dispose();
        units.set(pedal.id, { pedal: { ...pedal, settings: clampSettings(pedal.type, pedal.settings) }, unit: createPedalUnit(context, pedal) });
      }
    }
    order = chain.map(pedal => pedal.id);
  };

  applyChain(chain);
  wire();

  return {
    input,
    setParam(pedalId, knob, value) {
      const entry = units.get(pedalId);
      if (!entry) return;
      entry.pedal = { ...entry.pedal, settings: clampSettings(entry.pedal.type, { ...entry.pedal.settings, [knob]: value }) };
      entry.unit.set(entry.pedal.settings);
    },
    setBypass(pedalId, on) {
      const entry = units.get(pedalId);
      if (!entry) return;
      entry.pedal = { ...entry.pedal, on };
      entry.unit.setBypass(on);
    },
    reorder(ids) {
      const next = ids.filter(id => units.has(id));
      if (next.length === order.length && next.every((id, i) => id === order[i])) return;
      rewire(() => { order = next.filter(id => units.has(id)); });
    },
    setChain(chain) {
      const sameOrder = chain.length === order.length && chain.every((pedal, i) => pedal.id === order[i] && units.get(pedal.id)?.pedal.type === pedal.type);
      if (sameOrder) { applyChain(chain); return; }
      const snapshot = chain.map(pedal => ({ ...pedal, settings: { ...pedal.settings } }));
      rewire(() => applyChain(snapshot));
    },
    setAmp(next) { ampBlock.set(clampAmp(next)); },
    setInputGain(db) { glide(context, input.gain, dbToGain(db)); },
    setVolume(percent) { glide(context, volume.gain, outputGain(percent), .03); },
    order: () => [...order],
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelRewire?.(); cancelRewire = null; pending = null;
      for (const { unit } of units.values()) unit.dispose();
      units.clear();
      ampBlock.dispose();
      for (const node of [input, limiter, volume, mute]) { try { node.disconnect(); } catch { /* not connected */ } }
    },
  };
}

// ---------------------------------------------------------------------------
// A playing session: context, source and graph.

export type PedalLabSource = { kind: "demo"; style: DemoRiffStyle } | { kind: "live" };

export interface PedalLabSession extends Omit<PedalGraph, "input" | "dispose"> {
  context: AudioContext;
  /** Swap the demo riff (demo source only). */
  setStyle: (style: DemoRiffStyle) => void;
  stop: () => void;
}

/**
 * Start the lab from a tap. Creates the context, claims the page's audio
 * session, opens the source, and builds the graph. `onInterrupted` runs when
 * another tool takes the audio, the context is lost, or the input ends.
 */
export async function startPedalLab(options: {
  source: PedalLabSource;
  chain: readonly Pedal[];
  amp: AmpSettings;
  volume: number;
  inputGainDb: number;
  signal: AbortSignal;
  onInterrupted: () => void;
}): Promise<PedalLabSession> {
  const { signal } = options;
  if (signal.aborted) throw new Error("Start was cancelled.");
  if (!hasWebAudio()) throw new Error("This browser does not support Web Audio.");
  if (options.source.kind === "live" && !navigator.mediaDevices?.getUserMedia) throw new Error("Live input needs a secure page and a browser with microphone support.");
  // The default sample rate; the gain stages oversample 4x on their own.
  const context = createAudioContext({ latencyHint: "interactive" });
  let stopped = false, graph: PedalGraph | null = null, stream: MediaStream | null = null;
  let source: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  let releaseSession = () => {}, unwatch = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    unwatch();
    signal.removeEventListener("abort", stop);
    if (source && "loop" in source) { try { source.stop(); } catch { /* not started */ } }
    try { source?.disconnect(); } catch { /* not connected */ }
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    graph?.dispose();
    context.onstatechange = null;
    void context.close().catch(() => {});
    releaseSession();
  };
  signal.addEventListener("abort", stop, { once: true });
  releaseSession = claimAudioSession(() => { const was = stopped; stop(); if (!was) options.onInterrupted(); });
  try {
    // Resume and ask for the input inside the same tap, as capture.ts does for iOS.
    const resuming = context.resume().catch(() => {});
    const requesting = options.source.kind === "live"
      ? navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      : null;
    await resuming;
    if (requesting) stream = await requesting;
    if (signal.aborted || stopped) throw new Error("Start was cancelled.");
    if ((context.state as string) !== "running") await context.resume().catch(() => {});
    if (signal.aborted || stopped) throw new Error("Start was cancelled.");

    graph = buildPedalGraph(context, options.chain, options.amp, { volume: options.volume, inputGainDb: options.inputGainDb, destination: context.destination });
    const g = graph;

    /** Loop a demo riff through its own fader, so a style change crossfades. */
    let fader: GainNode | null = null;
    const playDemo = (style: DemoRiffStyle, fade: boolean) => {
      const samples = renderDemoRiff(style, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.getChannelData(0).set(samples);
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      const gain = gainNode(context, fade ? 0 : 1);
      node.connect(gain); gain.connect(g.input);
      node.start();
      if (fade) glide(context, gain.gain, 1, .03);
      fader = gain;
      return node;
    };
    if (options.source.kind === "demo") source = playDemo(options.source.style, false);
    else if (stream) {
      source = context.createMediaStreamSource(stream);
      source.connect(g.input);
      stream.getAudioTracks().forEach(track => { track.onended = () => { if (!stopped) { stop(); options.onInterrupted(); } }; });
    }
    unwatch = watchAudioState(context, () => { if (!stopped) { stop(); options.onInterrupted(); } });

    return {
      context,
      setParam: g.setParam, setBypass: g.setBypass, reorder: g.reorder, setChain: g.setChain, setAmp: g.setAmp,
      setInputGain: g.setInputGain, setVolume: g.setVolume, order: g.order,
      setStyle(style) {
        if (stopped || !source || !("loop" in source)) return;
        const old = source, oldFader = fader;
        if (oldFader) glide(context, oldFader.gain, 0, .03);
        source = playDemo(style, true);
        old.onended = () => { try { old.disconnect(); oldFader?.disconnect(); } catch { /* gone */ } };
        try { old.stop(context.currentTime + .2); } catch { /* already stopped */ }
      },
      stop,
    };
  } catch (error) {
    stop();
    throw error;
  }
}
