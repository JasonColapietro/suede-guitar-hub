"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimAudioSession, createAudioContext } from "@/lib/audio/capture";
import { DEFAULT_TRAINER, formatTime, normalizeLoop, peaks, trainerSpeed, type Loop, type Trainer } from "@/lib/tone/looper";
import styles from "./Tone.module.css";

const BUCKETS = 600;

export default function SlowDowner() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const url = useRef<string | null>(null);
  const release = useRef<() => void>(() => {});
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [wave, setWave] = useState<Float32Array | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(75);
  const [loop, setLoop] = useState<Loop | null>(null);
  const [pendingA, setPendingA] = useState<number | null>(null);
  const [trainerOn, setTrainerOn] = useState(false);
  const [trainer, setTrainer] = useState<Trainer>(DEFAULT_TRAINER);
  const [loops, setLoops] = useState(0);
  const [status, setStatus] = useState("");

  const effectiveSpeed = trainerOn && loop ? trainerSpeed(trainer, loops) : speed;

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.playbackRate = effectiveSpeed / 100;
    (el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
  }, [effectiveSpeed, name]);

  // Poll on animation frames: `timeupdate` fires too rarely for a tight loop.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const el = audio.current;
      if (el) {
        if (loop && el.currentTime >= loop.b) { el.currentTime = loop.a; setLoops(n => n + 1); }
        setTime(el.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, loop]);

  // Draw the waveform, the loop region and the playhead.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const width = el.width, height = el.height, mid = height / 2;
    ctx.clearRect(0, 0, width, height);
    if (loop && duration) {
      ctx.fillStyle = "rgba(167, 139, 250, 0.28)";
      ctx.fillRect((loop.a / duration) * width, 0, ((loop.b - loop.a) / duration) * width, height);
    }
    if (wave) {
      ctx.fillStyle = "#3b1f7e";
      const bar = width / BUCKETS;
      for (let i = 0; i < BUCKETS; i++) {
        const lo = wave[i * 2], hi = wave[i * 2 + 1];
        ctx.fillRect(i * bar, mid - hi * mid * .95, Math.max(1, bar - .5), Math.max(1, (hi - lo) * mid * .95));
      }
    }
    if (duration) {
      ctx.fillStyle = "#e0602f";
      ctx.fillRect((time / duration) * width - 1, 0, 2, height);
      if (pendingA !== null) { ctx.fillStyle = "#6d28d9"; ctx.fillRect((pendingA / duration) * width - 1, 0, 2, height); }
    }
  }, [wave, time, duration, loop, pendingA]);

  const pause = useCallback(() => { audio.current?.pause(); setPlaying(false); release.current(); }, []);
  useEffect(() => () => { audio.current?.pause(); release.current(); if (url.current) URL.revokeObjectURL(url.current); }, []);

  const load = async (file: File) => {
    pause();
    if (url.current) URL.revokeObjectURL(url.current);
    const objectUrl = URL.createObjectURL(file);
    url.current = objectUrl;
    setName(file.name); setLoop(null); setPendingA(null); setLoops(0); setTime(0); setWave(null);
    setStatus("Reading the song. It stays on this device.");
    if (audio.current) { audio.current.src = objectUrl; audio.current.load(); }
    try {
      const context = createAudioContext();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      void context.close().catch(() => {});
      setWave(peaks(decoded.getChannelData(0), BUCKETS));
      setStatus("");
    } catch {
      setStatus("Could not draw this file's waveform, but it may still play. MP3, M4A, WAV and AAC work in most browsers.");
    }
  };

  const toggle = async () => {
    const el = audio.current;
    if (!el || !name) return;
    if (playing) { pause(); return; }
    release.current = claimAudioSession(() => { el.pause(); setPlaying(false); });
    try { await el.play(); setPlaying(true); } catch { setStatus("Playback was blocked. Tap Play again."); }
  };

  const seekTo = (seconds: number) => { const el = audio.current; if (!el || !duration) return; el.currentTime = Math.max(0, Math.min(duration, seconds)); setTime(el.currentTime); };
  const markA = () => { setPendingA(time); setLoop(null); setLoops(0); };
  const markB = () => {
    const start = pendingA ?? 0;
    const next = normalizeLoop(start, time, duration);
    setLoop(next); setPendingA(null); setLoops(0);
    if (next) seekTo(next.a);
  };
  const clickWave = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seekTo(((event.clientX - rect.left) / rect.width) * duration);
  };
  const nudge = (edge: "a" | "b", by: number) => setLoop(prev => prev ? normalizeLoop(edge === "a" ? prev.a + by : prev.a, edge === "b" ? prev.b + by : prev.b, duration) : prev);

  return (
    <div className={styles.lab}>
      <label className={styles.drop}>
        <input type="file" accept="audio/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void load(file); }} />
        <span className={styles.dropIcon} aria-hidden>♫</span>
        <span className={styles.dropText}>{name ? <>Loaded: <strong>{name}</strong>. Tap to choose another.</> : <>Choose a song file from this device</>}</span>
        <span className={styles.dropHint}>The file never leaves your browser. Nothing is uploaded.</span>
      </label>
      {status && <p className={styles.vibe} role="status">{status}</p>}

      {/* Hidden element: the custom transport above drives it. */}
      <audio ref={audio} preload="auto" onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onEnded={() => { setPlaying(false); release.current(); }} />

      <canvas ref={canvas} width={1200} height={180} className={styles.wave} onClick={clickWave} aria-label="Waveform. Click to jump to a point in the song." role="img" />
      <p className={styles.clock}>{formatTime(time)} / {formatTime(duration)}{loop && <> · Loop {formatTime(loop.a)} to {formatTime(loop.b)} · Pass {loops + 1}</>}</p>

      <div className={styles.transport}>
        <button type="button" className={styles.play} onClick={toggle} disabled={!name}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
        <button type="button" className={styles.ghost} onClick={() => seekTo((loop?.a ?? time) - (loop ? 0 : 5))} disabled={!name}>{loop ? "↺ Loop start" : "↺ Back 5 s"}</button>
        <button type="button" className={styles.ghost} onClick={markA} disabled={!name}>Set A{pendingA !== null ? ` (${formatTime(pendingA)})` : ""}</button>
        <button type="button" className={styles.ghost} onClick={markB} disabled={!name || pendingA === null}>Set B and loop</button>
        {loop && <button type="button" className={styles.ghost} onClick={() => { setLoop(null); setLoops(0); }}>Clear loop</button>}
      </div>
      {loop && (
        <div className={styles.transport} aria-label="Fine-tune the loop">
          <span className={styles.small}>Nudge A</span>
          <button type="button" className={styles.ghost} onClick={() => nudge("a", -.1)}>−0.1 s</button>
          <button type="button" className={styles.ghost} onClick={() => nudge("a", .1)}>+0.1 s</button>
          <span className={styles.small}>Nudge B</span>
          <button type="button" className={styles.ghost} onClick={() => nudge("b", -.1)}>−0.1 s</button>
          <button type="button" className={styles.ghost} onClick={() => nudge("b", .1)}>+0.1 s</button>
        </div>
      )}

      <div className={styles.speedRow}>
        <label htmlFor="speed" className={styles.speedLabel}>Speed <strong>{effectiveSpeed}%</strong> <span className={styles.small}>(pitch stays put)</span></label>
        <input id="speed" type="range" min={25} max={150} step={5} value={effectiveSpeed} disabled={trainerOn && !!loop} onChange={e => setSpeed(Number(e.target.value))} />
        <div className={styles.presets}>{[50, 60, 75, 90, 100].map(value => <button key={value} type="button" className={styles.ghost} aria-pressed={speed === value} onClick={() => setSpeed(value)} disabled={trainerOn && !!loop}>{value}%</button>)}</div>
      </div>

      <fieldset className={styles.trainer}>
        <legend>
          <label><input type="checkbox" checked={trainerOn} onChange={e => { setTrainerOn(e.target.checked); setLoops(0); }} /> Speed trainer</label>
        </legend>
        <p className={styles.small}>Set a loop first. The speed starts low and climbs a step after every few clean passes, up to your target.</p>
        <div className={styles.trainerGrid}>
          {([["from", "Start at %", 25, 150], ["to", "Target %", 25, 150], ["step", "Step %", 1, 25], ["every", "Passes per step", 1, 10]] as const).map(([key, label, min, max]) => (
            <label key={key} className={styles.select}>{label}
              <input type="number" min={min} max={max} value={trainer[key]} onChange={e => { const value = Math.max(min, Math.min(max, Number(e.target.value) || min)); setTrainer(prev => ({ ...prev, [key]: value })); setLoops(0); }} />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
