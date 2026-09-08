"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { bindPracticeLifecycle, metronomeBPM, metronomeConfiguration as configuration, startMetronome, type MetronomePlayback } from "@/lib/audio/practice-tools";
import styles from "./PracticeTools.module.css";

export function Metronome() {
  const [bpm, setBPM] = useState(configuration.defaultBPM);
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [beat, setBeat] = useState<number | null>(null);
  const [message, setMessage] = useState("Choose a comfortable tempo, then start the click.");
  const playback = useRef<MetronomePlayback | null>(null);
  const request = useRef<AbortController | null>(null);
  const tempo = useRef(bpm);
  const stopResources = useCallback(() => {
    request.current?.abort(); request.current = null;
    playback.current?.stop(); playback.current = null;
  }, []);
  useEffect(() => bindPracticeLifecycle(() => {
    stopResources(); setPhase("idle"); setBeat(null);
    setMessage("Metronome paused. Start it again when you return to this page.");
  }), [stopResources]);
  function changeTempo(value: number) {
    const next = metronomeBPM(value);
    tempo.current = next; setBPM(next); playback.current?.setTempo(next);
  }
  function stop() {
    stopResources(); setPhase("idle"); setBeat(null);
    setMessage("Metronome stopped. Start again on beat one when you are ready.");
  }
  async function start() {
    stopResources(); setBeat(null);
    if (document.hidden) { setPhase("idle"); setMessage("Return to this page before starting the metronome."); return; }
    const controller = new AbortController(); request.current = controller;
    setPhase("starting"); setMessage("Starting audio playback…");
    try {
      const audio = await startMetronome(tempo.current, value => {
        if (request.current === controller && !controller.signal.aborted) setBeat(value);
      }, () => {
        if (request.current !== controller) return;
        stopResources(); setBeat(null); setPhase("idle");
        setMessage("Metronome stopped because audio was interrupted or another audio tool started.");
      }, controller.signal);
      if (controller.signal.aborted || request.current !== controller || document.hidden) { audio.stop(); return; }
      playback.current = audio; audio.setTempo(tempo.current);
      setPhase("running"); setMessage("Four beats per bar. The first beat has a brighter click.");
    } catch {
      if (controller.signal.aborted || request.current !== controller) return;
      stopResources(); setPhase("error"); setBeat(null);
      setMessage("Audio playback could not start. Check your browser’s sound settings and output device, then try again.");
    }
  }
  return <section className={styles.metronome} aria-labelledby="metronome-title">
    <p className={styles.eyebrow}>Keep a steady pulse</p><h2 id="metronome-title">Metronome</h2>
    <p>Use the click for chord changes, scales, or a passage you are working on. No microphone is needed.</p>
    <div className={styles.beats} aria-label={phase === "running" && beat !== null ? `Beat ${beat + 1} of ${configuration.beatsPerBar}` : "Metronome stopped"}>{Array.from({ length: configuration.beatsPerBar }, (_, index) => <span key={index} data-active={beat === index && phase === "running"} data-accent={index === 0} aria-hidden="true">{index + 1}</span>)}</div>
    <p className={styles.tempo}><strong>{bpm}</strong><span>beats per minute</span></p>
    <div className={styles.tempoControls}>
      <button type="button" aria-label={`Slower by ${configuration.buttonStepBPM} beats per minute`} disabled={bpm <= configuration.minimumBPM} onClick={() => changeTempo(bpm - configuration.buttonStepBPM)}>−</button>
      <label className={styles.slider}><span>Tempo</span><input type="range" min={configuration.minimumBPM} max={configuration.maximumBPM} step={configuration.sliderStepBPM} value={bpm} aria-valuetext={`${bpm} beats per minute`} onChange={event => changeTempo(Number(event.target.value))} /></label>
      <button type="button" aria-label={`Faster by ${configuration.buttonStepBPM} beats per minute`} disabled={bpm >= configuration.maximumBPM} onClick={() => changeTempo(bpm + configuration.buttonStepBPM)}>+</button>
    </div>
    <p className={styles.caption}>{configuration.minimumBPM}–{configuration.maximumBPM} BPM. Tempo changes take effect after the next beat.</p>
    <button className={styles.start} type="button" onClick={phase === "running" || phase === "starting" ? stop : start}>{phase === "running" ? "Stop metronome" : phase === "starting" ? "Cancel audio start" : phase === "error" ? "Retry metronome" : "Start metronome"}</button>
    <p role="status" className={styles.status}>{message}</p>
  </section>;
}
