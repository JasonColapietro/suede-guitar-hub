import test from "node:test";
import assert from "node:assert/strict";
import {
  AMP_KNOBS, CONVENTIONAL_RANK, DEFAULT_AMP, MAX_FEEDBACK, PEDAL_DEFS, PEDAL_PRESETS, PEDAL_TYPES,
  ampCurve, chainText, clampAmp, clampSettings, conventionalOrder, createPedal, delayFeedback, distortionCurve,
  findPreset, formatKnob, fuzzCurve, gateCurve, impulseResponse, isConventionalOrder, levelGain, liveInputError,
  mixGains, movePedal, nextPedalId, overdriveCurve, presetProblems, presetState, type Pedal, type PedalType,
} from "../lib/tools/pedal-lab.ts";
import { buildPedalGraph } from "../lib/tools/pedal-graph.ts";
import { DEMO_RIFF_STYLES } from "../lib/tools/demo-riff.ts";

const RECIPE_IDS = ["glassy-clean", "edge-of-breakup", "classic-crunch", "high-gain-rhythm", "singing-lead", "ambient-swell", "funk-clean", "vintage-fuzz"];

test("presets: exactly the eight recipe ids, in the tone course's order", () => {
  assert.deepEqual(PEDAL_PRESETS.map(preset => preset.id), RECIPE_IDS);
  for (const id of RECIPE_IDS) assert.equal(findPreset(id)?.id, id);
  assert.equal(findPreset("nope"), undefined);
  assert.equal(findPreset(null), undefined);
});

test("presets: every one is valid, complete and described in one sentence", () => {
  const styles = DEMO_RIFF_STYLES.map(style => style.id);
  for (const preset of PEDAL_PRESETS) {
    assert.deepEqual(presetProblems(preset), [], preset.id);
    assert.ok(preset.name.length > 0);
    assert.match(preset.description, /^[A-Z][^.!?]*\.$/, `${preset.id} description should be one sentence`);
    assert.ok(!/!/.test(preset.description));
    assert.ok(styles.includes(preset.style), `${preset.id} style`);
    assert.ok(preset.chain.length > 0 && preset.chain.length <= 6);
    const ids = preset.chain.map(pedal => pedal.id);
    assert.equal(new Set(ids).size, ids.length, `${preset.id} has duplicate pedal ids`);
    for (const pedal of preset.chain) {
      assert.ok(PEDAL_TYPES.includes(pedal.type));
      assert.deepEqual(pedal.settings, clampSettings(pedal.type, pedal.settings), `${preset.id}/${pedal.id} is out of range`);
    }
    assert.deepEqual(clampAmp(preset.amp), preset.amp, `${preset.id} amp is out of range`);
    // The presets are written in the conventional order.
    assert.ok(isConventionalOrder(preset.chain), `${preset.id} order`);
  }
});

test("presets: each sounds like its name", () => {
  const types = (id: string) => findPreset(id)!.chain.map(pedal => pedal.type);
  const amp = (id: string) => findPreset(id)!.amp;
  assert.ok(amp("glassy-clean").gain <= 2 && amp("glassy-clean").treble >= 6);
  assert.ok(!types("glassy-clean").some(type => ["overdrive", "distortion", "fuzz"].includes(type)));
  assert.ok(amp("edge-of-breakup").gain > amp("glassy-clean").gain && amp("edge-of-breakup").gain < amp("classic-crunch").gain);
  assert.ok(types("classic-crunch").includes("overdrive"));
  assert.ok(amp("high-gain-rhythm").gain >= 8 && types("high-gain-rhythm")[0] === "gate");
  assert.ok(types("singing-lead").includes("delay") && types("singing-lead").some(type => type === "distortion" || type === "overdrive"));
  assert.equal(findPreset("singing-lead")!.style, "single-notes");
  assert.ok(types("ambient-swell").includes("reverb") && types("ambient-swell").includes("delay"));
  assert.ok(findPreset("ambient-swell")!.chain.find(pedal => pedal.type === "reverb")!.settings.decay >= 4);
  assert.ok(types("funk-clean").includes("compressor") && types("funk-clean").includes("wah") && amp("funk-clean").gain <= 2);
  assert.ok(types("vintage-fuzz").includes("fuzz"));
});

test("presetProblems catches bad presets", () => {
  const good = PEDAL_PRESETS[0];
  assert.ok(presetProblems({ ...good, chain: [...good.chain, good.chain[0]] }).some(text => /Duplicate/.test(text)));
  assert.ok(presetProblems({ ...good, chain: [{ id: "x", type: "flanger", settings: {} }] }).some(text => /Unknown pedal type/.test(text)));
  assert.ok(presetProblems({ ...good, chain: [{ id: "d", type: "delay", settings: { ...clampSettings("delay"), feedback: 99 } }] }).some(text => /outside/.test(text)));
  assert.ok(presetProblems({ ...good, chain: [{ id: "d", type: "delay", settings: { time: 300 } }] }).some(text => /missing/.test(text)));
  assert.ok(presetProblems({ ...good, amp: { ...good.amp, gain: 11 } }).some(text => /Amp gain/.test(text)));
  assert.ok(presetProblems({ ...good, id: "Bad Id" }).length > 0);
});

test("presetState is a copy the UI can change", () => {
  const preset = findPreset("singing-lead")!;
  const state = presetState(preset);
  state.chain[0].settings.sustain = 1;
  state.amp.gain = 1;
  assert.notEqual(preset.chain[0].settings.sustain, 1);
  assert.notEqual(preset.amp.gain, 1);
});

test("pedal definitions: sensible knobs and defaults", () => {
  assert.deepEqual([...PEDAL_TYPES].sort(), Object.keys(PEDAL_DEFS).sort());
  for (const type of PEDAL_TYPES) {
    const def = PEDAL_DEFS[type];
    assert.equal(def.type, type);
    assert.ok(def.knobs.length >= 2 && def.knobs.length <= 4, `${type} knob count`);
    assert.equal(new Set(def.knobs.map(knob => knob.id)).size, def.knobs.length);
    for (const knob of def.knobs) {
      assert.ok(knob.min < knob.max && knob.step > 0);
      assert.ok(knob.default >= knob.min && knob.default <= knob.max, `${type}.${knob.id} default`);
      if (knob.choices) assert.equal(knob.choices.length, knob.max - knob.min + 1);
    }
    // No product or brand names: every pedal is a generic family name.
    assert.match(def.name, /^(Noise gate|Compressor|Wah|EQ|Overdrive|Distortion|Fuzz|Chorus|Phaser|Tremolo|Delay|Reverb)$/);
  }
  assert.equal(PEDAL_DEFS.delay.knobs.find(knob => knob.id === "feedback")!.max / 100 < .95, true);
  const reverb = PEDAL_DEFS.reverb.knobs.find(knob => knob.id === "decay")!;
  assert.equal(reverb.min, .5); assert.equal(reverb.max, 6);
  for (const knob of AMP_KNOBS) assert.equal(DEFAULT_AMP[knob.id as keyof typeof DEFAULT_AMP], knob.default);
});

test("clampSettings fills, clamps, rounds switches and drops unknown keys", () => {
  assert.deepEqual(clampSettings("overdrive"), { drive: 5, tone: 5, level: 5 });
  assert.deepEqual(clampSettings("overdrive", { drive: 42, tone: -3, level: Number.NaN, extra: 1 }), { drive: 10, tone: 0, level: 5 });
  assert.equal(clampSettings("tremolo", { shape: .7 }).shape, 1);
  assert.equal(clampSettings("tremolo", { shape: 9 }).shape, 1);
  assert.equal(clampSettings("delay", { time: "250" }).time, 250);
  assert.equal(clampSettings("delay", { feedback: 500 }).feedback, 90);
  const amp = clampAmp({ gain: 20, on: false });
  assert.equal(amp.gain, 10); assert.equal(amp.on, false); assert.equal(amp.cab, true); assert.equal(amp.bass, 5);
});

test("chain editing: ids, moves and labels", () => {
  let chain: Pedal[] = [];
  chain = [...chain, createPedal(chain, "delay")];
  chain = [...chain, createPedal(chain, "delay")];
  assert.deepEqual(chain.map(pedal => pedal.id), ["delay-1", "delay-2"]);
  assert.equal(nextPedalId(chain.slice(1), "delay"), "delay-1");
  chain = [createPedal(chain, "fuzz"), ...chain];
  assert.deepEqual(movePedal(chain, 0, 1).map(pedal => pedal.id), ["delay-1", "fuzz-1", "delay-2"]);
  assert.deepEqual(movePedal(chain, 0, -1).map(pedal => pedal.id), chain.map(pedal => pedal.id));
  assert.deepEqual(movePedal(chain, 2, 1).map(pedal => pedal.id), chain.map(pedal => pedal.id));
  chain[1] = { ...chain[1], on: false };
  assert.equal(chainText(chain, { on: true, cab: false }), "Guitar → Fuzz → Delay (off) → Delay → Amp → Cab (off) → Output");
});

test("conventionalOrder: gate first, reverb last, families in order, stable", () => {
  const types: PedalType[] = ["reverb", "delay", "chorus", "fuzz", "wah", "compressor", "gate", "overdrive", "tremolo", "eq"];
  let chain: Pedal[] = [];
  for (const type of types) chain = [...chain, createPedal(chain, type)];
  const sorted = conventionalOrder(chain);
  assert.equal(sorted[0].type, "gate");
  assert.equal(sorted.at(-1)!.type, "reverb");
  assert.deepEqual(sorted.map(pedal => pedal.type), ["gate", "compressor", "wah", "eq", "fuzz", "overdrive", "chorus", "tremolo", "delay", "reverb"]);
  assert.ok(isConventionalOrder(sorted));
  assert.ok(!isConventionalOrder(chain));
  for (let i = 1; i < sorted.length; i++) assert.ok(CONVENTIONAL_RANK[sorted[i - 1].type] <= CONVENTIONAL_RANK[sorted[i].type]);
  assert.deepEqual(conventionalOrder([]), []);
  assert.equal(chain[0].type, "reverb", "the input is not mutated");
});

function assertCurve(curve: Float32Array, name: string) {
  assert.equal(curve.length % 2, 1, `${name} has a centre sample`);
  assert.ok(Math.abs(curve[(curve.length - 1) / 2]) < 1e-6, `${name}(0) = 0`);
  let peak = 0;
  for (let i = 0; i < curve.length; i++) {
    assert.ok(Number.isFinite(curve[i]) && curve[i] >= -1 && curve[i] <= 1, `${name} bounded`);
    if (i > 0) assert.ok(curve[i] >= curve[i - 1] - 1e-7, `${name} monotonic at ${i}`);
    peak = Math.max(peak, Math.abs(curve[i]));
  }
  assert.ok(Math.abs(peak - 1) < 1e-6, `${name} reaches full scale`);
}
const slopeAtZero = (curve: Float32Array) => { const m = (curve.length - 1) / 2; return (curve[m + 1] - curve[m - 1]) * (curve.length - 1) / 4; };
const oddError = (curve: Float32Array) => { let worst = 0; for (let i = 0; i < curve.length; i++) worst = Math.max(worst, Math.abs(curve[i] + curve[curve.length - 1 - i])); return worst; };

test("waveshaper curves: monotonic, bounded, zero at zero, more drive means more gain", () => {
  for (const drive of [0, 2.5, 5, 7.5, 10]) {
    assertCurve(overdriveCurve(drive, 1025), `overdrive ${drive}`);
    assertCurve(distortionCurve(drive, 1025), `distortion ${drive}`);
    assertCurve(fuzzCurve(drive, 0, 1025), `fuzz ${drive}`);
    assertCurve(fuzzCurve(drive, 10, 1025), `fuzz ${drive} biased`);
    assertCurve(ampCurve(drive, 1025), `amp ${drive}`);
  }
  assert.ok(slopeAtZero(overdriveCurve(8)) > slopeAtZero(overdriveCurve(2)));
  assert.ok(slopeAtZero(distortionCurve(8)) > slopeAtZero(distortionCurve(2)));
  assert.ok(slopeAtZero(ampCurve(10)) > slopeAtZero(ampCurve(5)) && slopeAtZero(ampCurve(5)) > slopeAtZero(ampCurve(0)));
  // Distortion clips harder than overdrive at the same setting.
  assert.ok(slopeAtZero(distortionCurve(5)) > slopeAtZero(overdriveCurve(5)));
  assert.equal(overdriveCurve(5, 100).length, 101, "an even size is rounded up to odd");
});

test("waveshaper curves: odd where intended, asymmetric where intended", () => {
  assert.ok(oddError(distortionCurve(6)) < 1e-6, "distortion is odd");
  assert.ok(oddError(fuzzCurve(7, 0)) < 1e-6, "unbiased fuzz is odd");
  assert.ok(oddError(overdriveCurve(5)) > .01, "overdrive is asymmetric");
  assert.ok(oddError(fuzzCurve(7, 5)) > .01, "biased fuzz is asymmetric");
  assert.ok(oddError(ampCurve(5)) < .3, "the amp is only slightly asymmetric");
  // Fuzz is close to square: most of the curve is near the rails.
  const fuzz = fuzzCurve(10, 0, 1025);
  const nearRails = Array.from(fuzz).filter(y => Math.abs(y) > .9).length / fuzz.length;
  assert.ok(nearRails > .8);
  // Bias opens a dead zone: small inputs produce nothing.
  const gated = fuzzCurve(7, 10, 2001);
  assert.equal(gated[1000 + 5], 0);
  // The amp at gain 0 is close to linear for a normal input level.
  const clean = ampCurve(0, 2001);
  assert.ok(Math.abs(clean[1000 + 350] / clean[1000 + 700] - .5) < .08);
});

test("gate curve: closed below threshold, open above", () => {
  const curve = gateCurve(-40, 16385);
  const at = (x: number) => curve[Math.round((x + 1) / 2 * (curve.length - 1))];
  assert.equal(at(-.5), 0);
  assert.equal(at(0), 0);
  assert.equal(at(.001), 0);
  assert.equal(at(.1), 1);
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i] >= curve[i - 1] || i <= (curve.length - 1) / 2);
});

test("impulseResponse: deterministic, stereo, decaying", () => {
  const [left, right] = impulseResponse(8000, 2, 7);
  assert.equal(left.length, 16000);
  assert.equal(right.length, 16000);
  const [again] = impulseResponse(8000, 2, 7);
  assert.deepEqual(again, left);
  const [other] = impulseResponse(8000, 2, 8);
  assert.notDeepEqual(other, left);
  assert.notDeepEqual(left, right);
  const rms = (samples: Float32Array, from: number, to: number) => { let sum = 0; for (let i = from; i < to; i++) sum += samples[i] ** 2; return Math.sqrt(sum / (to - from)); };
  const quarters = [0, 1, 2, 3].map(q => rms(left, q * 4000, (q + 1) * 4000));
  for (let q = 1; q < 4; q++) assert.ok(quarters[q] < quarters[q - 1] * .5, `quarter ${q} decays`);
  // Down about 60 dB by the end.
  assert.ok(rms(left, 15800, 16000) < rms(left, 100, 300) * .003);
  for (const x of left) assert.ok(Math.abs(x) <= 1);
  assert.equal(Math.abs(left[0]), 0, "fades in from silence");
  assert.equal(impulseResponse(1000, 99)[0].length, 10000, "seconds are clamped");
  assert.throws(() => impulseResponse(0, 1));
});

test("parameter maps", () => {
  assert.equal(levelGain(5), 1);
  assert.ok(levelGain(10) > 3.9 && levelGain(0) < .26);
  assert.equal(delayFeedback(90), .9);
  assert.equal(delayFeedback(500), MAX_FEEDBACK);
  assert.ok(MAX_FEEDBACK < .95);
  assert.equal(delayFeedback(Number.NaN), 0);
  const half = mixGains(5);
  assert.ok(Math.abs(half.dry ** 2 + half.wet ** 2 - 1) < 1e-9);
  assert.deepEqual(mixGains(0), { dry: 1, wet: 0 });
  assert.equal(formatKnob(PEDAL_DEFS.tremolo.knobs[2], 1), "Square");
  assert.equal(formatKnob(PEDAL_DEFS.delay.knobs[0], 380), "380 ms");
  assert.equal(formatKnob(PEDAL_DEFS.eq.knobs[0], 3), "+3.0 dB");
  assert.equal(formatKnob(PEDAL_DEFS.delay.knobs[1], 35), "35%");
});

test("liveInputError words each failure", () => {
  const named = (name: string) => Object.assign(new Error("x"), { name });
  assert.match(liveInputError(named("NotAllowedError")), /permission/);
  assert.match(liveInputError(named("NotFoundError")), /No input/);
  assert.match(liveInputError(named("NotReadableError")), /another app/);
  assert.match(liveInputError("weird"), /could not start/);
});

// ---------------------------------------------------------------------------
// A minimal fake Web Audio context, enough to build and rewire the graph.

type FakeNode = { kind: string; edges: Set<unknown>; connect: (to: unknown) => void; disconnect: () => void; [key: string]: unknown };
function fakeContext() {
  const nodes: FakeNode[] = [];
  const param = (value = 0) => ({ value, setTargetAtTime(v: number) { this.value = v; } });
  const node = (kind: string, extra: Record<string, unknown> = {}): FakeNode => {
    const n: FakeNode = { kind, edges: new Set(), connect(to: unknown) { n.edges.add(to); }, disconnect() { n.edges.clear(); }, ...extra };
    nodes.push(n);
    return n;
  };
  const context = {
    currentTime: 0, sampleRate: 8000, nodes,
    destination: node("destination"),
    createGain: () => node("gain", { gain: param(1) }),
    createBiquadFilter: () => node("biquad", { type: "lowpass", frequency: param(350), Q: param(1), gain: param(0) }),
    createWaveShaper: () => node("shaper", { curve: null, oversample: "none" }),
    createDynamicsCompressor: () => node("compressor", { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createDelay: () => node("delay", { delayTime: param() }),
    createConvolver: () => node("convolver", { buffer: null }),
    createOscillator: () => node("oscillator", { type: "sine", frequency: param(440), started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; }, setPeriodicWave() { this.type = "custom"; } }),
    createPeriodicWave: () => ({}),
    createBuffer: (channels: number, length: number) => { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: (c: number) => data[c], copyToChannel: (samples: Float32Array, c: number) => data[c].set(samples) }; },
  };
  return context;
}

test("pedal graph: builds every pedal, sets every knob, reorders with a fade, disposes", () => {
  const context = fakeContext();
  let chain: Pedal[] = [];
  for (const type of PEDAL_TYPES) chain = [...chain, createPedal(chain, type)];
  const scheduled: (() => void)[] = [];
  const graph = buildPedalGraph(context as unknown as BaseAudioContext, chain, DEFAULT_AMP, {
    volume: 35, inputGainDb: 0, destination: context.destination as unknown as AudioNode,
    schedule: callback => { scheduled.push(callback); return () => {}; },
  });
  assert.deepEqual(graph.order(), chain.map(pedal => pedal.id));
  // Every gain stage oversamples 4x.
  const shapers = context.nodes.filter(n => n.kind === "shaper" && n.oversample === "4x");
  assert.ok(shapers.length >= 4);
  assert.ok(context.nodes.filter(n => n.kind === "oscillator").every(n => n.started));

  for (const pedal of chain) for (const knob of PEDAL_DEFS[pedal.type].knobs) {
    graph.setParam(pedal.id, knob.id, knob.max);
    graph.setParam(pedal.id, knob.id, knob.min);
  }
  graph.setBypass(chain[3].id, false);
  graph.setAmp({ ...DEFAULT_AMP, gain: 9, cab: false });
  graph.setVolume(10);
  graph.setInputGain(6);

  const reversed = [...graph.order()].reverse();
  graph.reorder(reversed);
  assert.deepEqual(graph.order(), chain.map(pedal => pedal.id), "the order changes only after the fade");
  assert.equal(scheduled.length, 1);
  graph.reorder(chain.map(pedal => pedal.id).slice(0, 3)); // batched into the same fade
  assert.equal(scheduled.length, 1);
  scheduled.shift()!();
  assert.deepEqual(graph.order(), chain.map(pedal => pedal.id).slice(0, 3));
  assert.equal((graph.input as unknown as FakeNode).edges.size, 1, "input feeds exactly one block");

  graph.setChain([createPedal([], "fuzz")]);
  scheduled.shift()!();
  assert.deepEqual(graph.order(), ["fuzz-1"]);

  graph.dispose();
  assert.ok(context.nodes.filter(n => n.kind === "oscillator").every(n => n.stopped));
});
