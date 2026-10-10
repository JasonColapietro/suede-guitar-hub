"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { METRONOME_CLICK_MODES, METRONOME_GAP_BARS, bindPracticeLifecycle, metronomeBPM, metronomeConfiguration as configuration, metronomeVoice, startMetronome, type MetronomePlayback } from "@/lib/audio/practice-tools";
import { DEFAULT_METRONOME_SETTINGS, METRONOME_CLICK_MODE_LABELS, METRONOME_STORAGE_KEY, metronomePatternMessage, metronomeSettingsStore, patternForSettings, type MetronomeSettings } from "@/lib/audio/metronome-settings";
import { subscribeToStoredKey } from "@/lib/shared-storage";
import styles from "./PracticeTools.module.css";

const store = metronomeSettingsStore();
const gapChoices = Array.from({ length: METRONOME_GAP_BARS.maximum - METRONOME_GAP_BARS.minimum + 1 }, (_, index) => METRONOME_GAP_BARS.minimum + index);

export function Metronome() {
  const [settings, setSettings] = useState<MetronomeSettings>(DEFAULT_METRONOME_SETTINGS);
  const { bpm, mode, gapEnabled, playBars, muteBars } = settings;
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [beat, setBeat] = useState<number | null>(null);
  const [mutedBar, setMutedBar] = useState(false);
  const [message, setMessage] = useState("Choose a comfortable tempo, then start the click.");
  const playback = useRef<MetronomePlayback | null>(null);
  const request = useRef<AbortController | null>(null);
  const current = useRef(settings);
  const stopResources = useCallback(() => {
    request.current?.abort(); request.current = null;
    playback.current?.stop(); playback.current = null;
  }, []);
  // The saved tempo and pattern are restored after hydration, so the server
  // markup and the first client render agree. A change in another tab follows.
  useEffect(() => {
    const restore = () => {
      const saved = store.read();
      if (!saved.available || !saved.value) return;
      const next = saved.value;
      current.current = next; setSettings(next);
      playback.current?.setTempo(next.bpm); playback.current?.setPattern(patternForSettings(next));
    };
    restore();
    return subscribeToStoredKey(METRONOME_STORAGE_KEY, restore);
  }, []);
  // Only a metronome that was starting or running is "paused". Hiding the tab
  // while it was stopped leaves the message describing what actually happened.
  useEffect(() => bindPracticeLifecycle(() => {
    const active = request.current !== null || playback.current !== null;
    stopResources();
    if (!active) return;
    setPhase("idle"); setBeat(null); setMutedBar(false);
    setMessage("Metronome paused. Start it again when you return to this page.");
  }), [stopResources]);
  function change(update: Partial<MetronomeSettings>) {
    const next = { ...current.current, ...update };
    current.current = next; setSettings(next);
    store.write(next);
    return next;
  }
  function changeTempo(value: number) {
    const next = change({ bpm: metronomeBPM(value) });
    playback.current?.setTempo(next.bpm);
  }
  function changePattern(update: Partial<MetronomeSettings>) {
    const next = change(update);
    if (!playback.current) return;
    playback.current.setPattern(patternForSettings(next));
    setMessage(metronomePatternMessage(next));
  }
  function stop() {
    stopResources(); setPhase("idle"); setBeat(null); setMutedBar(false);
    setMessage("Metronome stopped. Start again on beat one when you are ready.");
  }
  async function start() {
    stopResources(); setBeat(null); setMutedBar(false);
    if (document.hidden) { setPhase("idle"); setMessage("Return to this page before starting the metronome."); return; }
    const controller = new AbortController(); request.current = controller;
    setPhase("starting"); setMessage("Starting audio playback…");
    try {
      const audio = await startMetronome(current.current.bpm, (value, info) => {
        if (request.current === controller && !controller.signal.aborted) { setBeat(value); setMutedBar(info.muted); }
      }, () => {
        if (request.current !== controller) return;
        stopResources(); setBeat(null); setMutedBar(false); setPhase("idle");
        setMessage("Metronome stopped because audio was interrupted or another audio tool started.");
      }, controller.signal, undefined, patternForSettings(current.current));
      if (controller.signal.aborted || request.current !== controller || document.hidden) { audio.stop(); return; }
      playback.current = audio; audio.setTempo(current.current.bpm); audio.setPattern(patternForSettings(current.current));
      setPhase("running"); setMessage(metronomePatternMessage(current.current));
    } catch {
      if (controller.signal.aborted || request.current !== controller) return;
      stopResources(); setPhase("error"); setBeat(null); setMutedBar(false);
      setMessage("Audio playback could not start. Check your browser’s sound settings and output device, then try again.");
    }
  }
  return <section className={styles.metronome} aria-labelledby="metronome-title">
    <p className={styles.eyebrow}>Keep a steady pulse</p><h2 id="metronome-title">Metronome</h2>
    <p>Use the click for chord changes, scales, or a passage you are working on. No microphone is needed.</p>
    {/* Visual only. A beat that does not click in this pattern is drawn hollow;
        the whole row dims during a silent bar of the gap trainer. */}
    <div className={styles.beats} aria-hidden="true" data-muted={mutedBar && phase === "running"}>{Array.from({ length: configuration.beatsPerBar }, (_, index) => <span key={index} data-active={beat === index && phase === "running"} data-accent={index === 0} data-silent={metronomeVoice(index, 0, { mode, gap: null }) === null} aria-hidden="true">{index + 1}</span>)}</div>
    <p className={styles.tempo}><strong>{bpm}</strong><span>beats per minute</span></p>
    <div className={styles.tempoControls}>
      <button type="button" aria-label={`Slower by ${configuration.buttonStepBPM} beats per minute`} disabled={bpm <= configuration.minimumBPM} onClick={() => changeTempo(bpm - configuration.buttonStepBPM)}>−</button>
      <label className={styles.slider}><span>Tempo</span><input type="range" min={configuration.minimumBPM} max={configuration.maximumBPM} step={configuration.sliderStepBPM} value={bpm} aria-valuetext={`${bpm} beats per minute`} onChange={event => changeTempo(Number(event.target.value))} /></label>
      <button type="button" aria-label={`Faster by ${configuration.buttonStepBPM} beats per minute`} disabled={bpm >= configuration.maximumBPM} onClick={() => changeTempo(bpm + configuration.buttonStepBPM)}>+</button>
    </div>
    <p className={styles.caption}>{configuration.minimumBPM}–{configuration.maximumBPM} BPM. Tempo changes take effect after the next beat.</p>
    <fieldset className={styles.options}>
      <legend>Click pattern</legend>
      {METRONOME_CLICK_MODES.map(id => <label key={id} className={styles.choice}><input type="radio" name="metronome-click-pattern" value={id} checked={mode === id} onChange={() => changePattern({ mode: id })} /><span>{METRONOME_CLICK_MODE_LABELS[id]}</span></label>)}
    </fieldset>
    <fieldset className={styles.options}>
      <legend>Muted bars</legend>
      <label className={styles.choice}><input type="checkbox" checked={gapEnabled} onChange={event => changePattern({ gapEnabled: event.target.checked })} /><span>Silence bars to test your time</span></label>
      <div className={styles.gapControls}>
        <label><span>Bars with click</span><select value={playBars} disabled={!gapEnabled} onChange={event => changePattern({ playBars: Number(event.target.value) })}>{gapChoices.map(count => <option key={count} value={count}>{count}</option>)}</select></label>
        <label><span>Silent bars</span><select value={muteBars} disabled={!gapEnabled} onChange={event => changePattern({ muteBars: Number(event.target.value) })}>{gapChoices.map(count => <option key={count} value={count}>{count}</option>)}</select></label>
      </div>
    </fieldset>
    <button className={styles.start} type="button" onClick={phase === "running" || phase === "starting" ? stop : start}>{phase === "running" ? "Stop metronome" : phase === "starting" ? "Cancel audio start" : phase === "error" ? "Retry metronome" : "Start metronome"}</button>
    <p role="status" className={styles.status}>{message}</p>
  </section>;
}
