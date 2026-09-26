"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RIFFS, driveCurve, openRig, roomImpulse, type Rig } from "@/lib/tone/rig";
import {
  AMP_KNOBS, DEFAULT_AMP, PEDALS, RECIPES, defaultBoard, orderNotes, recipeBoard,
  type AmpSettings, type PedalKind, type PedalSlot,
} from "@/lib/tone/pedals";
import styles from "./Tone.module.css";

type Stage = { input: AudioNode; output: AudioNode; set: (values: Record<string, number>) => void; dispose: () => void };

const at = (param: AudioParam, value: number, context: BaseAudioContext) => param.setTargetAtTime(value, context.currentTime, .02);

function buildPedal(context: AudioContext, kind: PedalKind, values: Record<string, number>): Stage {
  const input = context.createGain(), output = context.createGain();
  const nodes: AudioNode[] = [input, output];
  const keep = <T extends AudioNode>(node: T) => { nodes.push(node); return node; };
  let set: Stage["set"] = () => {};
  if (kind === "comp") {
    const comp = keep(context.createDynamicsCompressor()), makeup = keep(context.createGain());
    comp.attack.value = .01; comp.release.value = .2; comp.knee.value = 12;
    input.connect(comp); comp.connect(makeup); makeup.connect(output);
    set = v => { at(comp.threshold, -8 - v.sustain * .4, context); at(comp.ratio, 2 + v.sustain / 8, context); at(makeup.gain, .4 + v.level / 50, context); };
  } else if (kind === "fuzz" || kind === "drive") {
    const hard = kind === "fuzz";
    const low = keep(context.createBiquadFilter()), pre = keep(context.createGain()), shaper = keep(context.createWaveShaper()), tone = keep(context.createBiquadFilter()), level = keep(context.createGain());
    low.type = "highpass"; low.frequency.value = hard ? 60 : 180;
    shaper.oversample = "4x"; tone.type = "lowpass";
    input.connect(low); low.connect(pre); pre.connect(shaper); shaper.connect(tone); tone.connect(level); level.connect(output);
    let last = -1;
    set = v => {
      const amount = (hard ? v.fuzz : v.drive) / 100;
      if (amount !== last) { shaper.curve = driveCurve(amount, hard); last = amount; }
      at(pre.gain, 1 + amount * (hard ? 12 : 6), context);
      at(tone.frequency, 900 + (v.tone / 100) ** 2 * 7000, context);
      at(level.gain, (v.level / 100) * (hard ? .9 : 1.1), context);
    };
  } else if (kind === "chorus") {
    const delay = keep(context.createDelay(.05)), lfo = keep(context.createOscillator()), depth = keep(context.createGain()), wet = keep(context.createGain()), dry = keep(context.createGain());
    delay.delayTime.value = .018; lfo.connect(depth); depth.connect(delay.delayTime); lfo.start();
    input.connect(dry); dry.connect(output); input.connect(delay); delay.connect(wet); wet.connect(output);
    set = v => { at(lfo.frequency, .15 + (v.rate / 100) * 4, context); at(depth.gain, (v.depth / 100) * .006, context); at(wet.gain, v.mix / 100, context); at(dry.gain, 1 - v.mix / 250, context); };
    const dispose = () => { try { lfo.stop(); } catch {} for (const node of nodes) node.disconnect(); };
    set(values);
    return { input, output, set, dispose };
  } else if (kind === "delay") {
    const delay = keep(context.createDelay(1.5)), feedback = keep(context.createGain()), damp = keep(context.createBiquadFilter()), wet = keep(context.createGain());
    damp.type = "lowpass"; damp.frequency.value = 3200;
    input.connect(output); input.connect(delay); delay.connect(damp); damp.connect(feedback); feedback.connect(delay); damp.connect(wet); wet.connect(output);
    set = v => { at(delay.delayTime, v.time / 1000, context); at(feedback.gain, Math.min(.85, v.feedback / 100), context); at(wet.gain, v.mix / 100, context); };
  } else {
    const convolver = keep(context.createConvolver()), wet = keep(context.createGain()), dry = keep(context.createGain());
    input.connect(dry); dry.connect(output); input.connect(convolver); convolver.connect(wet); wet.connect(output);
    let last = -1;
    set = v => {
      if (v.decay !== last) { convolver.buffer = roomImpulse(context, .5 + (v.decay / 100) * 4.5); last = v.decay; }
      at(wet.gain, (v.mix / 100) * 1.4, context); at(dry.gain, 1 - v.mix / 300, context);
    };
  }
  set(values);
  return { input, output, set, dispose: () => { for (const node of nodes) node.disconnect(); } };
}

function buildAmp(context: AudioContext, amp: AmpSettings) {
  const pre = context.createGain(), shaper = context.createWaveShaper(), bass = context.createBiquadFilter(), mid = context.createBiquadFilter(), treble = context.createBiquadFilter();
  const cabLow = context.createBiquadFilter(), cabHigh = context.createBiquadFilter(), cabPeak = context.createBiquadFilter(), volume = context.createGain(), bypass = context.createGain(), cabbed = context.createGain();
  shaper.oversample = "4x";
  bass.type = "lowshelf"; bass.frequency.value = 130;
  mid.type = "peaking"; mid.frequency.value = 750; mid.Q.value = .8;
  treble.type = "highshelf"; treble.frequency.value = 2800;
  cabHigh.type = "highpass"; cabHigh.frequency.value = 85;
  cabPeak.type = "peaking"; cabPeak.frequency.value = 2300; cabPeak.Q.value = 1.2; cabPeak.gain.value = 3;
  cabLow.type = "lowpass"; cabLow.frequency.value = 4800; cabLow.Q.value = .8;
  pre.connect(shaper); shaper.connect(bass); bass.connect(mid); mid.connect(treble);
  treble.connect(cabHigh); cabHigh.connect(cabPeak); cabPeak.connect(cabLow); cabLow.connect(cabbed); cabbed.connect(volume);
  treble.connect(bypass); bypass.connect(volume);
  let lastGain = -1;
  const set = (a: AmpSettings) => {
    if (a.gain !== lastGain) { shaper.curve = driveCurve(a.gain / 10 * .7); lastGain = a.gain; }
    at(pre.gain, 1 + a.gain * .8, context);
    at(bass.gain, (a.bass - 5) * 2.6, context); at(mid.gain, (a.mid - 5) * 2.6, context); at(treble.gain, (a.treble - 5) * 2.6, context);
    at(cabbed.gain, a.cab ? 1 : 0, context); at(bypass.gain, a.cab ? 0 : .6, context);
    at(volume.gain, (a.volume / 10) * .75 / (1 + a.gain * .06), context);
  };
  set(amp);
  const nodes = [pre, shaper, bass, mid, treble, cabLow, cabHigh, cabPeak, volume, bypass, cabbed];
  return { input: pre, output: volume, set, dispose: () => { for (const node of nodes) node.disconnect(); } };
}

function Dial({ label, value, min, max, step, unit, onChange, inputId }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void; inputId: string }) {
  const turn = -135 + ((value - min) / (max - min)) * 270;
  return (
    <label className={styles.dial} htmlFor={inputId}>
      <span className={styles.dialFace} aria-hidden style={{ ["--turn" as string]: `${turn}deg` }} />
      <span className={styles.dialLabel}>{label}</span>
      <input id={inputId} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-valuetext={`${value}${unit ?? ""}`} />
      <span className={styles.dialValue}>{value}{unit === "%" ? "" : unit ? ` ${unit}` : ""}</span>
    </label>
  );
}

export default function PedalLab() {
  const [board, setBoard] = useState<PedalSlot[]>(defaultBoard);
  const [amp, setAmp] = useState<AmpSettings>(DEFAULT_AMP);
  const [riffId, setRiffId] = useState(RIFFS[0].id);
  const [recipeId, setRecipeId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const rig = useRef<Rig | null>(null);
  const stages = useRef<Map<PedalKind, Stage>>(new Map());
  const ampStage = useRef<ReturnType<typeof buildAmp> | null>(null);

  const applyRecipe = useCallback((id: string) => {
    const recipe = RECIPES.find(item => item.id === id);
    if (!recipe) return;
    setRecipeId(id); setBoard(recipeBoard(recipe)); setAmp(recipe.amp); setRiffId(recipe.riff);
  }, []);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("recipe");
    if (wanted) applyRecipe(wanted);
  }, [applyRecipe]);

  const signature = board.map(slot => `${slot.kind}:${slot.on ? 1 : 0}`).join(",");

  // Rewire only when the order or the on/off state changes; knob moves update
  // parameters in place so the riff never drops out while you turn a knob.
  useEffect(() => {
    const current = rig.current;
    if (!current || !playing) return;
    const { context } = current;
    current.input.disconnect();
    for (const stage of stages.current.values()) stage.dispose();
    stages.current.clear();
    ampStage.current?.dispose();
    const ampNode = buildAmp(context, amp);
    ampStage.current = ampNode;
    let tail: AudioNode = current.input;
    for (const slot of board) {
      if (!slot.on) continue;
      const stage = buildPedal(context, slot.kind, slot.values);
      stages.current.set(slot.kind, stage);
      tail.connect(stage.input); tail = stage.output;
    }
    tail.connect(ampNode.input); ampNode.output.connect(current.output);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, playing]);

  useEffect(() => { for (const slot of board) if (slot.on) stages.current.get(slot.kind)?.set(slot.values); }, [board]);
  useEffect(() => { ampStage.current?.set(amp); }, [amp]);
  useEffect(() => { if (playing) rig.current?.playRiff(RIFFS.find(r => r.id === riffId) ?? RIFFS[0]); }, [riffId, playing]);

  const stop = useCallback(() => {
    rig.current?.stop(); rig.current = null;
    for (const stage of stages.current.values()) stage.dispose();
    stages.current.clear(); ampStage.current?.dispose(); ampStage.current = null;
    setPlaying(false);
  }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stop(); };
  }, [stop]);

  const start = async () => {
    setError("");
    try { rig.current = await openRig(() => { rig.current = null; setPlaying(false); }); setPlaying(true); }
    catch { setError("Sound could not start. Check your volume and silent switch, then tap again."); }
  };

  const move = (index: number, by: -1 | 1) => setBoard(prev => {
    const next = [...prev], target = index + by;
    if (target < 0 || target >= next.length) return prev;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const update = (index: number, patch: Partial<PedalSlot>) => { setRecipeId(""); setBoard(prev => prev.map((slot, i) => i === index ? { ...slot, ...patch } : slot)); };
  const notes = useMemo(() => orderNotes(board), [board]);
  const activeCount = board.filter(slot => slot.on).length;

  return (
    <div className={styles.lab}>
      <div className={styles.transport}>
        <button type="button" className={styles.play} onClick={playing ? stop : start} aria-pressed={playing}>
          {playing ? "■ Stop" : "▶ Play the riff"}
        </button>
        <label className={styles.select}>Riff
          <select value={riffId} onChange={e => setRiffId(e.target.value)}>{RIFFS.map(riff => <option key={riff.id} value={riff.id}>{riff.name}</option>)}</select>
        </label>
        <label className={styles.select}>Tone recipe
          <select value={recipeId} onChange={e => e.target.value ? applyRecipe(e.target.value) : setRecipeId("")}>
            <option value="">Custom</option>
            {RECIPES.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}
          </select>
        </label>
        <button type="button" className={styles.ghost} onClick={() => { setBoard(defaultBoard()); setAmp(DEFAULT_AMP); setRecipeId(""); }}>Reset board</button>
      </div>
      {recipeId && <p className={styles.vibe}>{RECIPES.find(r => r.id === recipeId)?.vibe}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}

      <ol className={styles.chain} aria-label="Signal chain, from guitar to amp">
        <li className={styles.chainEnd}><span aria-hidden>🎸</span> Guitar</li>
        {board.map((slot, index) => {
          const spec = PEDALS[slot.kind];
          return (
            <li key={slot.kind} className={styles.pedal} data-on={slot.on} style={{ ["--pedal" as string]: spec.color }}>
              <div className={styles.pedalTop}>
                <span className={styles.family}>{spec.family}</span>
                <span className={styles.led} aria-hidden />
              </div>
              <h3 className={styles.pedalName}>{spec.name}</h3>
              <p className={styles.pedalJob}>{spec.job}</p>
              <div className={styles.dials}>
                {spec.knobs.map(knob => (
                  <Dial key={knob.id} inputId={`${slot.kind}-${knob.id}`} {...knob} value={slot.values[knob.id]}
                    onChange={value => update(index, { values: { ...slot.values, [knob.id]: value } })} />
                ))}
              </div>
              <button type="button" className={styles.footswitch} aria-pressed={slot.on} onClick={() => update(index, { on: !slot.on })}>
                {slot.on ? "On" : "Bypassed"}<span className="sr-only"> {spec.name}</span>
              </button>
              <div className={styles.mover}>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${spec.name} earlier in the chain`}>←</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === board.length - 1} aria-label={`Move ${spec.name} later in the chain`}>→</button>
              </div>
            </li>
          );
        })}
        <li className={styles.amp}>
          <div className={styles.ampGrille} aria-hidden />
          <h3 className={styles.pedalName}>Amp</h3>
          <div className={styles.dials}>
            {AMP_KNOBS.map(knob => (
              <Dial key={knob.id} inputId={`amp-${knob.id}`} {...knob} value={amp[knob.id as keyof Omit<AmpSettings, "cab">]}
                onChange={value => { setRecipeId(""); setAmp(prev => ({ ...prev, [knob.id]: value })); }} />
            ))}
          </div>
          <button type="button" className={styles.footswitch} aria-pressed={amp.cab} onClick={() => setAmp(prev => ({ ...prev, cab: !prev.cab }))}>
            {amp.cab ? "Speaker cab on" : "No cab (direct)"}
          </button>
        </li>
      </ol>

      <section className={styles.notes} aria-live="polite">
        <h3>What your order is doing</h3>
        {activeCount === 0 && <p>Every pedal is bypassed, so you are hearing guitar straight into the amp. Switch a few on, then use the arrows to change their order and listen to what changes.</p>}
        {activeCount === 1 && <p>One pedal is on. Order starts to matter with two or more.</p>}
        {notes.map(note => <p key={note}>{note}</p>)}
        {!amp.cab && <p>The speaker cab is off. That fizzy, harsh top end is what an amp sounds like before a speaker filters it, and it is why direct recordings need a cab or impulse response.</p>}
      </section>
    </div>
  );
}
