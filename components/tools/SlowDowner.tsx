"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { claimAudioSession, createAudioContext } from "@/lib/audio/capture";
import { bindPracticeLifecycle } from "@/lib/audio/practice-tools";
import {
  LOOP_NUDGE_SECONDS, SEEK_STEP_SECONDS, SKIP_BACK_SECONDS, SPEED_MAX, SPEED_MIN, SPEED_NUDGE, SPEED_PRESETS,
  SPEED_UP_STEP_MAX, SPEED_UP_STEP_MIN, DEFAULT_SLOW_DOWNER_SETTINGS,
  clampSpeed, crossedLoopEnd, describePitchShift, extractPeaks, formatTime, mergePeaks, nextSpeedUpRate,
  normalizeLoop, parseSlowDownerSettings, speedToRate, timeAtPosition, type LoopBounds,
} from "@/lib/tools/slow-downer";
import styles from "./Tools.module.css";
import own from "./SlowDowner.module.css";

const STORAGE_KEY = "guitarhub.slow-downer.v1";
const PEAK_BUCKETS = 1200;
/** Decoding needs the whole song in memory as raw samples; past this size only the waveform is skipped. */
const MAX_DECODE_BYTES = 150 * 1024 * 1024;
const AUDIO_NAME = /\.(mp3|m4a|aac|mp4|wav|wave|aif|aiff|flac|ogg|oga|opus|webm|caf)$/i;

type PitchAudio = HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };

function applyPlayback(audio: HTMLAudioElement, speed: number, tape: boolean) {
  const element = audio as PitchAudio;
  // Set pitch handling before the rate: some browsers read it when the rate changes.
  element.preservesPitch = !tape;
  element.webkitPreservesPitch = !tape;
  element.mozPreservesPitch = !tape;
  const rate = speedToRate(speed);
  element.defaultPlaybackRate = rate;
  element.playbackRate = rate;
}

/** decodeAudioData, promise or callback style (older Safari only has the callback). */
function decodeAudio(context: AudioContext, data: ArrayBuffer) {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const result = context.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    if (result && typeof result.then === "function") result.then(resolve, reject);
  });
}

type DrawState = { peaks: Float32Array | null; duration: number; time: number; loop: LoopBounds | null; loopOn: boolean; a: number | null; b: number | null };

function drawWaveform(canvas: HTMLCanvasElement, width: number, state: DrawState) {
  const height = 120, ratio = Math.min(3, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  const { peaks, duration, time, loop, loopOn, a, b } = state;
  const x = (seconds: number) => duration > 0 ? (seconds / duration) * width : 0;
  const middle = height / 2;
  if (loop) {
    context.fillStyle = loopOn ? "rgba(109,40,217,.2)" : "rgba(109,40,217,.08)";
    context.fillRect(x(loop.start), 0, Math.max(1, x(loop.end) - x(loop.start)), height);
  }
  if (peaks && peaks.length >= 2) {
    const buckets = peaks.length / 2;
    let loudest = 0;
    for (let index = 0; index < peaks.length; index++) loudest = Math.max(loudest, Math.abs(peaks[index]));
    const scale = loudest > 0 ? (middle - 6) / loudest : 0;
    context.fillStyle = "#6d28d9";
    for (let column = 0; column < width; column++) {
      const bucket = Math.min(buckets - 1, Math.floor((column / width) * buckets));
      const low = peaks[bucket * 2] * scale, high = peaks[bucket * 2 + 1] * scale;
      context.fillRect(column, middle - high, 1, Math.max(1, high - low));
    }
  } else {
    context.fillStyle = "#b9a9cc";
    context.fillRect(0, middle - 1, width, 2);
  }
  context.fillStyle = "#251152";
  context.font = "700 12px system-ui, sans-serif";
  for (const [label, value] of [["A", a], ["B", b]] as const) {
    if (value === null || duration <= 0) continue;
    const at = Math.min(width - 2, Math.max(0, x(value)));
    context.fillRect(at, 0, 2, height);
    context.fillText(label, Math.min(width - 12, at + 4), 14);
  }
  if (duration > 0) {
    context.fillStyle = "#c2410c";
    context.fillRect(Math.min(width - 2, Math.max(0, x(time) - 1)), 0, 2, height);
  }
}

/** A number input you can type freely into; it commits in-range values as you type and clamps on blur. */
function NumberField({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const commit = (raw: string) => {
    const number = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(number)) onCommit(Math.min(max, Math.max(min, Math.round(number))));
  };
  return <label className={styles.field}>{label}
    <input type="number" inputMode="numeric" min={min} max={max} step={1} value={editing ? text : String(value)}
      onFocus={() => { setText(String(value)); setEditing(true); }}
      onChange={event => {
        setText(event.target.value);
        const number = Number(event.target.value);
        if (event.target.value !== "" && number >= min && number <= max) onCommit(Math.round(number));
      }}
      onBlur={event => { commit(event.target.value); setEditing(false); }}
      onKeyDown={event => { if (event.key === "Enter") commit(event.currentTarget.value); }} />
  </label>;
}

export function SlowDowner() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<string | null>(null);
  const decodeRef = useRef<AbortController | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const lastTimeRef = useRef(0);
  const loopRef = useRef<LoopBounds | null>(null);
  const speedRef = useRef(DEFAULT_SLOW_DOWNER_SETTINGS.speed);
  const tapeRef = useRef(false);
  const speedUpRef = useRef({ on: false, step: DEFAULT_SLOW_DOWNER_SETTINGS.speedUpStep, ceiling: DEFAULT_SLOW_DOWNER_SETTINGS.speedUpCeiling });
  const restored = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SLOW_DOWNER_SETTINGS.speed);
  const [tape, setTape] = useState(false);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [loopOn, setLoopOn] = useState(false);
  const [speedUpOn, setSpeedUpOn] = useState(false);
  const [speedUpStep, setSpeedUpStep] = useState(DEFAULT_SLOW_DOWNER_SETTINGS.speedUpStep);
  const [speedUpCeiling, setSpeedUpCeiling] = useState(DEFAULT_SLOW_DOWNER_SETTINGS.speedUpCeiling);
  const [passes, setPasses] = useState(0);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [waveNote, setWaveNote] = useState("");
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("Open an audio file to start. It stays on this device.");

  const hasFile = fileName !== null;
  const loop = useMemo(() => normalizeLoop(pointA, pointB, duration), [pointA, pointB, duration]);

  // Restore the last speed and tape-mode choice. The file itself is never stored.
  useEffect(() => {
    let saved = DEFAULT_SLOW_DOWNER_SETTINGS;
    try { saved = parseSlowDownerSettings(window.localStorage.getItem(STORAGE_KEY)); } catch {}
    setSpeed(saved.speed); setTape(saved.tape); setSpeedUpStep(saved.speedUpStep); setSpeedUpCeiling(saved.speedUpCeiling);
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed, tape, speedUpStep, speedUpCeiling })); } catch {}
  }, [speed, tape, speedUpStep, speedUpCeiling]);

  useEffect(() => {
    speedRef.current = speed; tapeRef.current = tape;
    if (audioRef.current) applyPlayback(audioRef.current, speed, tape);
  }, [speed, tape]);
  useEffect(() => { loopRef.current = loopOn ? loop : null; }, [loop, loopOn]);
  useEffect(() => { speedUpRef.current = { on: speedUpOn, step: speedUpStep, ceiling: speedUpCeiling }; }, [speedUpOn, speedUpStep, speedUpCeiling]);

  // Pause on a hidden tab or page departure; revoke the object URL on unmount.
  useEffect(() => {
    const audio = audioRef.current;
    const unbind = bindPracticeLifecycle(() => {
      if (audio && !audio.paused) { audio.pause(); setMessage("Paused because the page was hidden. Press Play to carry on."); }
    });
    return () => {
      unbind();
      decodeRef.current?.abort();
      releaseRef.current?.(); releaseRef.current = null;
      if (audio) { audio.removeAttribute("src"); audio.load(); }
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const wave = waveRef.current;
    if (!wave || typeof ResizeObserver === "undefined") { if (wave) setWidth(wave.clientWidth); return; }
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
    observer.observe(wave);
    return () => observer.disconnect();
  }, [hasFile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && width > 0) drawWaveform(canvas, width, { peaks, duration, time, loop, loopOn, a: pointA, b: pointB });
  }, [peaks, duration, time, loop, loopOn, pointA, pointB, width]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const target = Math.min(audio.duration, Math.max(0, seconds));
    audio.currentTime = target;
    lastTimeRef.current = target;
    setTime(target);
  }, []);

  /** The loop check, run from timeupdate and from every animation frame while playing. */
  const checkLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = audio.currentTime, bounds = loopRef.current;
    if (bounds && crossedLoopEnd(lastTimeRef.current, now, bounds)) {
      audio.currentTime = bounds.start;
      lastTimeRef.current = bounds.start;
      setPasses(count => count + 1);
      const speedUp = speedUpRef.current;
      if (speedUp.on) {
        const next = nextSpeedUpRate(speedRef.current, speedUp.step, speedUp.ceiling);
        if (next !== speedRef.current) { speedRef.current = next; applyPlayback(audio, next, tapeRef.current); setSpeed(next); }
      }
      return;
    }
    lastTimeRef.current = now;
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0, shown = -1;
    const tick = () => {
      checkLoop();
      const audio = audioRef.current;
      if (audio && Math.abs(audio.currentTime - shown) >= 0.03) { shown = audio.currentTime; setTime(shown); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, checkLoop]);

  async function decodeWaveform(file: File, signal: AbortSignal) {
    if (file.size > MAX_DECODE_BYTES) { setWaveNote("This file is too large to draw a waveform. Playback, speed and looping still work."); return; }
    setWaveNote("Drawing the waveform…");
    let context: AudioContext | null = null;
    try {
      const data = await file.arrayBuffer();
      if (signal.aborted) return;
      context = createAudioContext();
      const buffer = await decodeAudio(context, data);
      if (signal.aborted) return;
      const channels: Float32Array[] = [];
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) channels.push(extractPeaks(buffer.getChannelData(channel), PEAK_BUCKETS));
      setPeaks(mergePeaks(channels)); setWaveNote("");
    } catch {
      if (!signal.aborted) { setPeaks(null); setWaveNote("This browser could not decode the file to draw a waveform. Playback, speed and looping still work."); }
    } finally {
      if (context) void context.close().catch(() => {});
    }
  }

  function openFile(file: File | undefined) {
    const audio = audioRef.current;
    if (!file || !audio) return;
    // Some phones report no type at all; let the browser try those and report if it cannot play them.
    if (file.type !== "" && !file.type.startsWith("audio/") && !AUDIO_NAME.test(file.name)) {
      setMessage("That does not look like an audio file. Choose an MP3, M4A, WAV, FLAC or OGG file."); return;
    }
    audio.pause();
    decodeRef.current?.abort();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    audio.src = url;
    applyPlayback(audio, speedRef.current, tapeRef.current);
    audio.load();
    lastTimeRef.current = 0;
    setFileName(file.name); setDuration(0); setTime(0); setPointA(null); setPointB(null); setLoopOn(false); setPasses(0); setPeaks(null);
    setMessage(`Opened ${file.name}. Press Play or Space to start.`);
    const controller = new AbortController();
    decodeRef.current = controller;
    void decodeWaveform(file, controller.signal);
  }

  async function play() {
    const audio = audioRef.current;
    if (!audio || !hasFile) return;
    releaseRef.current?.();
    releaseRef.current = claimAudioSession(() => {
      if (!audio.paused) { audio.pause(); setMessage("Paused because another audio tool on this page started."); }
    });
    const bounds = loopRef.current;
    if (bounds && (audio.currentTime < bounds.start || audio.currentTime >= bounds.end)) seek(bounds.start);
    applyPlayback(audio, speedRef.current, tapeRef.current);
    try {
      await audio.play();
      setMessage(loopRef.current ? "Playing the loop." : "Playing.");
    } catch {
      releaseRef.current?.(); releaseRef.current = null;
      setMessage("Playback could not start. Check your browser’s sound settings, or try another file format.");
    }
  }
  function pause() { audioRef.current?.pause(); }
  function togglePlay() { if (playing) pause(); else void play(); }

  function setPoints(a: number | null, b: number | null) {
    const bounds = normalizeLoop(a, b, duration);
    if (bounds) { setPointA(bounds.start); setPointB(bounds.end); }
    else { setPointA(a); setPointB(b); }
  }
  function currentTime() { return audioRef.current?.currentTime ?? time; }
  function setA() { if (hasFile) { setPoints(currentTime(), pointB); setPasses(0); } }
  function setB() { if (hasFile) { setPoints(pointA, currentTime()); setPasses(0); } }
  function nudge(which: "a" | "b", amount: number) {
    const clamp = (value: number) => Math.min(duration, Math.max(0, value));
    if (which === "a" && pointA !== null) setPoints(clamp(pointA + amount), pointB);
    if (which === "b" && pointB !== null) setPoints(pointA, clamp(pointB + amount));
  }
  function toggleLoop() {
    if (!loop) { setMessage("Set A and B first, then turn the loop on."); return; }
    const next = !loopOn;
    setLoopOn(next); setPasses(0);
    if (next) {
      const now = currentTime();
      if (now < loop.start || now >= loop.end) seek(loop.start);
      setMessage(`Loop on: ${formatTime(loop.start)} to ${formatTime(loop.end)}.`);
    } else setMessage("Loop off. Playback runs to the end of the song.");
  }
  function clearLoop() { setPointA(null); setPointB(null); setLoopOn(false); setPasses(0); setMessage("Loop cleared."); }
  function changeSpeed(value: number) { setSpeed(clampSpeed(value)); }

  // Keyboard shortcuts, ignored while typing in a field. The handlers read the latest render.
  const actions = useRef({ togglePlay, setA, setB, toggleLoop, seekBy: (amount: number) => seek(currentTime() + amount), hasFile });
  useEffect(() => { actions.current = { togglePlay, setA, setB, toggleLoop, seekBy: (amount: number) => seek(currentTime() + amount), hasFile }; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const act = actions.current;
      if (!act.hasFile) return;
      if (event.key === " ") {
        if (tag === "BUTTON" || tag === "A") return; // Space already activates the focused control.
        event.preventDefault(); act.togglePlay();
      } else if (event.key === "[") { event.preventDefault(); act.setA(); }
      else if (event.key === "]") { event.preventDefault(); act.setB(); }
      else if (event.key === "l" || event.key === "L") { event.preventDefault(); act.toggleLoop(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); act.seekBy(-SEEK_STEP_SECONDS); }
      else if (event.key === "ArrowRight") { event.preventDefault(); act.seekBy(SEEK_STEP_SECONDS); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onWavePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!hasFile || duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    seek(timeAtPosition(event.clientX - rect.left, rect.width, duration));
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    openFile(event.dataTransfer.files[0]);
  }

  const pitchLine = tape ? `Tape mode: ${describePitchShift(speedToRate(speed))}` : "Pitch unchanged";

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="slow-file">
      <h2 id="slow-file">Your song</h2>
      <div className={own.drop} data-dragging={dragging}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        {hasFile ? <p>Playing from this device: <span className={own.fileName}>{fileName}</span></p>
          : <p>Choose an audio file, or drop one here. The file stays on your device: your browser plays it directly and nothing is uploaded.</p>}
        <button type="button" className={`${styles.button} ${hasFile ? "" : styles.primary}`} onClick={() => inputRef.current?.click()}>
          {hasFile ? "Open another file" : "Choose an audio file"}
        </button>
        <input ref={inputRef} className={own.hiddenInput} type="file" accept="audio/*" aria-label="Audio file"
          onChange={event => { openFile(event.target.files?.[0]); event.target.value = ""; }} />
      </div>
      <audio ref={audioRef} preload="auto"
        onLoadedMetadata={event => { const audio = event.currentTarget; setDuration(Number.isFinite(audio.duration) ? audio.duration : 0); applyPlayback(audio, speedRef.current, tapeRef.current); }}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); setTime(audioRef.current?.currentTime ?? 0); releaseRef.current?.(); releaseRef.current = null; }}
        onTimeUpdate={event => { checkLoop(); if (event.currentTarget.paused) setTime(event.currentTarget.currentTime); }}
        onSeeked={event => { lastTimeRef.current = event.currentTarget.currentTime; }}
        onEnded={event => {
          const audio = event.currentTarget, bounds = loopRef.current;
          if (bounds && bounds.end >= audio.duration - 0.05) {
            lastTimeRef.current = bounds.end - 0.001; checkLoop();
            void audio.play().catch(() => {});
          } else setMessage("End of the song.");
        }}
        onError={() => { if (urlRef.current) setMessage("This browser cannot play that file. Try an MP3, M4A or WAV version."); }} />

      <div ref={waveRef} className={own.wave}>
        {hasFile ? <canvas ref={canvasRef} role="slider" tabIndex={0} aria-label="Playback position. Click or tap to seek; arrow keys move 2 seconds."
          aria-valuemin={0} aria-valuemax={Math.round(duration * 10) / 10} aria-valuenow={Math.round(time * 10) / 10}
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`} onPointerDown={onWavePointer} />
          : <p className={own.empty}>No song open yet. The waveform appears here once you choose a file.</p>}
      </div>
      {waveNote && <p className={styles.caption}>{waveNote}</p>}

      <div className={styles.row}>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!hasFile} onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
        <button type="button" className={styles.button} disabled={!hasFile} onClick={() => seek(currentTime() - SKIP_BACK_SECONDS)}>Back {SKIP_BACK_SECONDS} s</button>
        <span className={own.times} aria-label={`Time ${formatTime(time)} of ${formatTime(duration)}`}>{formatTime(time)} / {formatTime(duration)}</span>
      </div>
      <p role="status" className={styles.status}>{message}</p>
    </section>

    <section className={styles.panel} aria-labelledby="slow-speed">
      <h2 id="slow-speed">Speed</h2>
      <div className={styles.readout}><strong>{speed}%</strong><span>{pitchLine}</span></div>
      <div className={styles.fields}>
        <label className={styles.field}>Speed <span className={styles.value}>{speed}%</span>
          <input type="range" min={SPEED_MIN} max={SPEED_MAX} step={1} value={speed} aria-valuetext={`${speed} percent`} onChange={event => changeSpeed(Number(event.target.value))} />
        </label>
      </div>
      <div className={styles.row} role="group" aria-label="Speed presets">
        <button type="button" className={styles.button} aria-label={`Slower by ${SPEED_NUDGE} percent`} disabled={speed <= SPEED_MIN} onClick={() => changeSpeed(speed - SPEED_NUDGE)}>−{SPEED_NUDGE}</button>
        {SPEED_PRESETS.map(preset => <button key={preset} type="button" className={styles.button} aria-pressed={speed === preset} onClick={() => changeSpeed(preset)}>{preset}%</button>)}
        <button type="button" className={styles.button} aria-label={`Faster by ${SPEED_NUDGE} percent`} disabled={speed >= SPEED_MAX} onClick={() => changeSpeed(speed + SPEED_NUDGE)}>+{SPEED_NUDGE}</button>
      </div>
      <div className={styles.row}>
        <button type="button" className={styles.button} aria-pressed={tape} onClick={() => setTape(value => !value)}>Tape mode: {tape ? "on" : "off"}</button>
      </div>
      <p className={styles.caption}>With tape mode off, your browser time-stretches the audio so the pitch stays where it was recorded; slow settings can sound smeared. With tape mode on, pitch falls with speed like a tape machine: at 50% the song sounds one octave lower, 12 semitones.</p>
    </section>

    <section className={styles.panel} aria-labelledby="slow-loop">
      <h2 id="slow-loop">A–B loop</h2>
      <div className={styles.row}>
        <button type="button" className={styles.button} disabled={!hasFile} onClick={setA}>Set A</button>
        <button type="button" className={styles.button} disabled={!hasFile} onClick={setB}>Set B</button>
        <button type="button" className={styles.button} aria-pressed={loopOn} disabled={!loop} onClick={toggleLoop}>Loop: {loopOn ? "on" : "off"}</button>
        <button type="button" className={styles.button} disabled={pointA === null && pointB === null} onClick={clearLoop}>Clear loop</button>
      </div>
      <div className={own.points}>
        {([["a", "A", pointA], ["b", "B", pointB]] as const).map(([key, label, value]) => <div key={key} className={own.point}>
          <span>{label}: <strong>{value === null ? "not set" : formatTime(value)}</strong></span>
          <div className={own.nudges}>
            <button type="button" className={styles.button} disabled={value === null} aria-label={`Move ${label} 0.1 seconds earlier`} onClick={() => nudge(key, -LOOP_NUDGE_SECONDS)}>−0.1 s</button>
            <button type="button" className={styles.button} disabled={value === null} aria-label={`Move ${label} 0.1 seconds later`} onClick={() => nudge(key, LOOP_NUDGE_SECONDS)}>+0.1 s</button>
          </div>
        </div>)}
      </div>
      <p className={styles.caption}>A loop is at least 0.2 s long. If B comes before A, the two swap.</p>

      <h3>Speed-up loop</h3>
      <label className={own.check}><input type="checkbox" checked={speedUpOn} onChange={event => setSpeedUpOn(event.target.checked)} />Raise the speed after each pass of the loop</label>
      <div className={styles.fields}>
        <NumberField label={`Raise by (${SPEED_UP_STEP_MIN}–${SPEED_UP_STEP_MAX} percentage points)`} value={speedUpStep} min={SPEED_UP_STEP_MIN} max={SPEED_UP_STEP_MAX} onCommit={setSpeedUpStep} />
        <NumberField label={`Stop raising at (${SPEED_MIN}–${SPEED_MAX}%)`} value={speedUpCeiling} min={SPEED_MIN} max={SPEED_MAX} onCommit={setSpeedUpCeiling} />
      </div>
      <p className={styles.caption}>Start slow, loop the passage, and let each clean pass bring it closer to full speed. The speed only rises while the loop is on. Passes completed: <strong>{passes}</strong>.</p>

      <h3>Keyboard shortcuts</h3>
      <ul className={own.keys}>
        <li><kbd>Space</kbd>Play or pause</li>
        <li><kbd>[</kbd>Set A</li>
        <li><kbd>]</kbd>Set B</li>
        <li><kbd>L</kbd>Loop on or off</li>
        <li><kbd>←</kbd>Back 2 s</li>
        <li><kbd>→</kbd>Forward 2 s</li>
      </ul>
      <p className={styles.caption}>Shortcuts work when the focus is not in a text or number field.</p>
    </section>
  </div>;
}
