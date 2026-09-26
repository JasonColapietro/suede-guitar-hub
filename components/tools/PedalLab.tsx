"use client";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { hasWebAudio } from "@/lib/audio/capture";
import { bindPracticeLifecycle } from "@/lib/audio/practice-tools";
import { DEMO_RIFF_STYLES, type DemoRiffStyle } from "@/lib/tools/demo-riff";
import { startPedalLab, type PedalLabSession } from "@/lib/tools/pedal-graph";
import {
  AMP_KNOBS, DEFAULT_OUTPUT, DEFAULT_PRESET_ID, INPUT_GAIN, PEDAL_DEFS, PEDAL_PRESETS, PEDAL_TYPES,
  chainLabels, clampKnob, conventionalOrder, createPedal, findPreset, isConventionalOrder, liveInputError, movePedal,
  presetState, type AmpSettings, type Pedal, type PedalType,
} from "@/lib/tools/pedal-lab";
import { Knob, PedalCard } from "./pedal-lab/Controls";
import tools from "./Tools.module.css";
import styles from "./PedalLab.module.css";

type Phase = "idle" | "starting" | "playing" | "error";
type SourceKind = "demo" | "live";

const initial = presetState(findPreset(DEFAULT_PRESET_ID)!);

/** Keep `?preset=` in the address bar in step with the board, so the page can be shared. */
function writePresetToUrl(id: string | null) {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("preset", id); else url.searchParams.delete("preset");
    window.history.replaceState(window.history.state, "", url);
  } catch { /* the board works without it */ }
}

export function PedalLab() {
  const idPrefix = useId().replace(/:/g, "");
  const [chain, setChain] = useState<Pedal[]>(initial.chain);
  const [amp, setAmp] = useState<AmpSettings>(initial.amp);
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET_ID);
  const [source, setSource] = useState<SourceKind>("demo");
  const [style, setStyle] = useState<DemoRiffStyle>(findPreset(DEFAULT_PRESET_ID)!.style);
  const [volume, setVolume] = useState(DEFAULT_OUTPUT);
  const [inputGain, setInputGain] = useState<number>(INPUT_GAIN.default);
  const [adding, setAdding] = useState<PedalType>("overdrive");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Pick a preset or build a board, then press Start. The demo riff loops until you stop it.");

  const session = useRef<PedalLabSession | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const latest = useRef({ chain, amp, volume, inputGain });
  useEffect(() => { latest.current = { chain, amp, volume, inputGain }; }, [chain, amp, volume, inputGain]);
  const focusAfter = useRef<string | null>(null);

  const stopResources = useCallback(() => {
    generation.current++;
    const wasActive = request.current !== null || session.current !== null;
    request.current?.abort();
    request.current = null;
    session.current?.stop();
    session.current = null;
    return wasActive;
  }, []);

  useEffect(() => bindPracticeLifecycle(() => {
    if (stopResources()) { setPhase("idle"); setMessage("Stopped because the page was hidden. Press Start to play again."); }
  }), [stopResources]);

  // A tone course lesson links here with ?preset=<id>. Read it once, after hydration.
  useEffect(() => {
    let id: string | null = null;
    try { id = new URLSearchParams(window.location.search).get("preset"); } catch { id = null; }
    const preset = findPreset(id);
    if (!preset || preset.id === DEFAULT_PRESET_ID) return;
    const state = presetState(preset);
    setChain(state.chain); setAmp(state.amp); setStyle(preset.style); setPresetId(preset.id);
    setMessage(`Loaded the ${preset.name} preset. Press Start to hear it.`);
  }, []);

  // Keep keyboard focus on a pedal's move button after the board re-renders.
  useEffect(() => {
    const target = focusAfter.current;
    focusAfter.current = null;
    if (!target) return;
    const button = document.getElementById(target) as HTMLButtonElement | null;
    if (button && !button.disabled) button.focus();
    else document.getElementById(target.replace(/-(left|right)$/, (_, side: string) => side === "left" ? "-right" : "-left"))?.focus();
  }, [chain]);

  const playing = phase === "playing";

  function updateChain(next: Pedal[], rewire = true) {
    setChain(next);
    setPresetId("custom");
    writePresetToUrl(null);
    if (rewire) session.current?.setChain(next);
  }

  async function start() {
    stopResources();
    if (document.hidden) { setMessage("Return to this tab before starting."); return; }
    if (!hasWebAudio()) { setPhase("error"); setMessage("This browser does not support Web Audio, so the pedal lab cannot make sound here."); return; }
    if (source === "live" && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)) {
      setPhase("error"); setMessage("Live input needs a secure HTTPS page and a browser with microphone support. The demo riff still works."); return;
    }
    const id = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    setPhase("starting");
    setMessage(source === "live" ? "Asking for the input. Put your headphones on first." : "Starting the demo riff.");
    try {
      const { chain: c, amp: a, volume: v, inputGain: g } = latest.current;
      const started = await startPedalLab({
        source: source === "live" ? { kind: "live" } : { kind: "demo", style },
        chain: c, amp: a, volume: v, inputGainDb: g, signal: controller.signal,
        onInterrupted: () => {
          if (generation.current !== id) return;
          session.current = null; request.current = null;
          setPhase("idle");
          setMessage("Stopped because another sound on the page started, or the audio device changed. Press Start to play again.");
        },
      });
      if (generation.current !== id) { started.stop(); return; }
      request.current = null;
      session.current = started;
      // Anything changed while it was starting.
      started.setChain(latest.current.chain); started.setAmp(latest.current.amp);
      started.setVolume(latest.current.volume); started.setInputGain(latest.current.inputGain);
      setPhase("playing");
      setMessage(source === "live" ? "Live input is running through the board. Nothing is recorded." : "The demo riff is looping through the board.");
    } catch (error) {
      if (generation.current !== id) return;
      request.current = null;
      setPhase("error");
      setMessage(source === "live" ? liveInputError(error) : "Audio could not start. Check that the device is not muted, then try again.");
    }
  }
  function stop() {
    stopResources();
    setPhase("idle");
    setMessage("Stopped.");
  }

  function chooseSource(next: SourceKind) {
    if (next === source) return;
    const was = stopResources();
    setSource(next);
    setPhase("idle");
    setMessage(next === "live"
      ? "Live input selected. Put headphones on, then press Start and allow the input."
      : was ? "Demo riff selected. Press Start to play it." : "Demo riff selected.");
  }
  function chooseStyle(next: DemoRiffStyle) {
    setStyle(next);
    session.current?.setStyle(next);
  }

  function loadPreset(id: string) {
    const preset = findPreset(id);
    if (!preset) return;
    const state = presetState(preset);
    setChain(state.chain); setAmp(state.amp); setPresetId(id);
    setStyle(preset.style);
    session.current?.setChain(state.chain); session.current?.setAmp(state.amp); session.current?.setStyle(preset.style);
    writePresetToUrl(id);
    setMessage(`Loaded the ${preset.name} preset.`);
  }

  function setKnob(pedalId: string, knob: string, value: number) {
    const next = chain.map(pedal => {
      if (pedal.id !== pedalId) return pedal;
      const def = PEDAL_DEFS[pedal.type].knobs.find(k => k.id === knob);
      return def ? { ...pedal, settings: { ...pedal.settings, [knob]: clampKnob(def, value) } } : pedal;
    });
    updateChain(next, false);
    session.current?.setParam(pedalId, knob, value);
  }
  function toggle(pedalId: string) {
    const pedal = chain.find(p => p.id === pedalId);
    if (!pedal) return;
    updateChain(chain.map(p => p.id === pedalId ? { ...p, on: !p.on } : p), false);
    session.current?.setBypass(pedalId, !pedal.on);
    setMessage(`${PEDAL_DEFS[pedal.type].name} ${pedal.on ? "bypassed" : "on"}.`);
  }
  function move(index: number, direction: -1 | 1) {
    const next = movePedal(chain, index, direction);
    const moved = chain[index];
    focusAfter.current = `${idPrefix}-${moved.id}-${direction < 0 ? "left" : "right"}`;
    updateChain(next);
    const neighbour = chain[index + direction];
    if (neighbour) setMessage(`Moved ${PEDAL_DEFS[moved.type].name} ${direction < 0 ? "before" : "after"} ${PEDAL_DEFS[neighbour.type].name}.`);
  }
  function remove(pedalId: string) {
    const pedal = chain.find(p => p.id === pedalId);
    updateChain(chain.filter(p => p.id !== pedalId));
    if (pedal) setMessage(`Removed ${PEDAL_DEFS[pedal.type].name}.`);
  }
  function add() {
    const pedal = createPedal(chain, adding);
    updateChain([...chain, pedal]);
    setMessage(`Added ${PEDAL_DEFS[adding].name} at the end of the chain, before the amp.`);
  }
  function orderConventionally() {
    if (isConventionalOrder(chain)) { setMessage("The board is already in the conventional order."); return; }
    updateChain(conventionalOrder(chain));
    setMessage("Reordered: dynamics and filters, then gain, modulation, delay and reverb.");
  }
  function changeAmp(next: AmpSettings) {
    setAmp(next);
    setPresetId("custom");
    writePresetToUrl(null);
    session.current?.setAmp(next);
  }

  const preset = findPreset(presetId);
  const blocks = chainLabels(chain, amp);

  return <div className={tools.tool}>
    <section className={tools.panel} aria-labelledby={`${idPrefix}-play`}>
      <h2 id={`${idPrefix}-play`}>Sound</h2>
      <div className={tools.segmented} role="group" aria-label="Sound source">
        <button type="button" aria-pressed={source === "demo"} onClick={() => chooseSource("demo")}>Demo riff</button>
        <button type="button" aria-pressed={source === "live"} onClick={() => chooseSource("live")}>Live input</button>
      </div>
      {source === "demo"
        ? <div className={tools.fields}>
          <label className={tools.field} htmlFor={`${idPrefix}-style`}>Riff
            <select id={`${idPrefix}-style`} value={style} onChange={event => chooseStyle(event.target.value as DemoRiffStyle)}>
              {DEMO_RIFF_STYLES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
        : <div className={styles.warning}>
          <p><strong>Use headphones.</strong> With speakers, the microphone hears its own output and feeds back, which can get loud very fast.</p>
          <p>A guitar through an audio interface works best. The input is processed live on this device and is not recorded or uploaded.</p>
        </div>}
      <div className={tools.fields}>
        {source === "live" && <Knob id={`${idPrefix}-input`} knob={{ id: "input", label: "Input gain", min: INPUT_GAIN.min, max: INPUT_GAIN.max, step: INPUT_GAIN.step, default: INPUT_GAIN.default, unit: "dB" }}
          value={inputGain} onChange={value => { setInputGain(value); session.current?.setInputGain(value); }} />}
        <Knob id={`${idPrefix}-volume`} knob={{ id: "volume", label: "Output volume", min: 0, max: 100, step: 1, default: DEFAULT_OUTPUT, unit: "%" }}
          value={volume} onChange={value => { setVolume(value); session.current?.setVolume(value); }} />
      </div>
      <div className={tools.row}>
        {phase === "playing" || phase === "starting"
          ? <button type="button" className={`${tools.button} ${tools.primary}`} onClick={stop}>{phase === "starting" ? "Cancel" : "Stop"}</button>
          : <button type="button" className={`${tools.button} ${tools.primary}`} onClick={() => void start()}>Start</button>}
      </div>
      <p className={tools.status} role="status" aria-live="polite">{message}</p>
      <p className={tools.caption}>The output starts low. Turn it up slowly: high gain and long feedback get loud quickly, and a limiter sits at the end to catch peaks.</p>
    </section>

    <section className={tools.panel} aria-labelledby={`${idPrefix}-presets`}>
      <h2 id={`${idPrefix}-presets`}>Presets</h2>
      <div className={tools.fields}>
        <label className={tools.field} htmlFor={`${idPrefix}-preset`}>Preset
          <select id={`${idPrefix}-preset`} value={presetId} onChange={event => loadPreset(event.target.value)}>
            {presetId === "custom" && <option value="custom">Your board (edited)</option>}
            {PEDAL_PRESETS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
      </div>
      {preset
        ? <p>{preset.description} <Link href={`/tone/recipe-${preset.id}`}>Read the {preset.name.toLowerCase()} recipe</Link>.</p>
        : <p className={tools.caption}>You have changed the preset. Pick one again to reset the board.</p>}
    </section>

    <section className={tools.panel} aria-labelledby={`${idPrefix}-board`}>
      <h2 id={`${idPrefix}-board`}>Pedalboard</h2>
      <ol className={styles.chain} aria-label="Signal chain">
        {blocks.map((block, index) => <li key={`${block.label}-${index}`}>
          <span className={styles.block} data-on={block.on}>{block.label}{!block.on && <span className={styles.off}>&nbsp;(off)</span>}</span>
        </li>)}
      </ol>
      <div className={styles.addRow}>
        <label className={tools.field} htmlFor={`${idPrefix}-add`}>Add a pedal
          <select id={`${idPrefix}-add`} value={adding} onChange={event => setAdding(event.target.value as PedalType)}>
            {PEDAL_TYPES.map(type => <option key={type} value={type}>{PEDAL_DEFS[type].name}</option>)}
          </select>
        </label>
        <button type="button" className={tools.button} onClick={add} disabled={chain.length >= 10}>Add</button>
        <button type="button" className={tools.button} onClick={orderConventionally} disabled={chain.length < 2}>Order it conventionally</button>
      </div>
      <p className={tools.caption}>
        The conventional order is gate, dynamics and filters, then gain, modulation, delay, and reverb last. It is a starting point, not the only right order.
        A fuzz before a wah sounds different from a fuzz after it, and delay before drive smears the repeats into the distortion. Move them and listen.
      </p>
      {chain.length === 0
        ? <p className={tools.caption}>No pedals. The guitar goes straight into the amp. Add a pedal to start building.</p>
        : <ol className={styles.board}>
          {chain.map((pedal, index) => <PedalCard key={pedal.id} pedal={pedal} index={index} count={chain.length} idPrefix={idPrefix}
            onKnob={(knob, value) => setKnob(pedal.id, knob, value)} onToggle={() => toggle(pedal.id)}
            onMove={direction => move(index, direction)} onRemove={() => remove(pedal.id)} />)}
        </ol>}
    </section>

    <section className={tools.panel} aria-labelledby={`${idPrefix}-amp`}>
      <h2 id={`${idPrefix}-amp`}>Amp and cab</h2>
      <div className={tools.row}>
        <button type="button" className={tools.button} aria-pressed={amp.on} onClick={() => changeAmp({ ...amp, on: !amp.on })}>Amp {amp.on ? "on" : "off"}</button>
        <button type="button" className={tools.button} aria-pressed={amp.cab} onClick={() => changeAmp({ ...amp, cab: !amp.cab })}>Cab {amp.cab ? "on" : "off"}</button>
      </div>
      <div className={tools.fields}>
        {AMP_KNOBS.map(knob => <Knob key={knob.id} knob={knob} id={`${idPrefix}-amp-${knob.id}`} value={amp[knob.id as keyof AmpSettings] as number}
          onChange={value => changeAmp({ ...amp, [knob.id]: clampKnob(knob, value) })} />)}
      </div>
      <p className={tools.caption}>
        Gain runs from clean at 0, through crunch around 5, to high gain at 10. Bass, mid and treble are a simplified tone stack: on a real amp the three controls interact,
        and moving one changes what the others do. Here each is its own band. The cab is a set of filters (a low cut near 80 Hz, a high cut near 5 kHz, a low resonance
        and a presence dip), not a recording of a speaker. Switch it off to hear how harsh an amp sounds without one.
      </p>
      <p className={tools.caption}>
        The lab runs at your device&apos;s default sample rate. The clipping stages oversample four times to keep the distortion smooth, which uses more processing;
        on an older phone, a shorter board plays more reliably.
      </p>
      {playing && <p className={tools.caption}>Changes are applied while it plays.</p>}
    </section>
  </div>;
}
