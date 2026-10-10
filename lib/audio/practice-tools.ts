import contract from "../../contracts/practice-tools.json" with { type: "json" };
import { claimAudioSession, createAudioContext, watchAudioState, type Capture } from "./capture.ts";
import { estimatePitch, noteForFrequency } from "./dsp.ts";

export const metronomeConfiguration = contract.metronome;
export const tuningConfiguration = contract.tuning;

export function metronomeBPM(value: number) {
  return Number.isFinite(value) ? Math.min(metronomeConfiguration.maximumBPM, Math.max(metronomeConfiguration.minimumBPM, value)) : metronomeConfiguration.defaultBPM;
}
export function metronomeInterval(value: number) { return 60 / metronomeBPM(value); }
export function nextMetronomeBeat(beat: number) { return (Math.max(0, beat) + 1) % metronomeConfiguration.beatsPerBar; }
export function tunerInputError(error: unknown) {
  if (error instanceof Error && error.name === "NotAllowedError") return "Microphone access is unavailable. Check this site's microphone permission, or use your own tuner below.";
  if (error instanceof Error && error.name === "NotFoundError") return "No microphone was found. Connect an input device and try again, or use your own tuner.";
  if (error instanceof Error && error.name === "NotReadableError") return "The microphone could not be opened. Check whether another app is using it, then try again, or use your own tuner.";
  return "The tuner could not get a reliable audio input. Check the microphone, try again, or use your own tuner.";
}

/** The action guard is required even when the reference button is no longer visible. */
export function confirmTuningPreparation(state: { allChecked: boolean; referenceActive: boolean; quietUntil: number; now: number }, confirm: () => void): "waitingForFade" | "incomplete" | "confirmed" {
  if (state.referenceActive || !Number.isFinite(state.now) || !Number.isFinite(state.quietUntil) || state.now < state.quietUntil) return "waitingForFade";
  if (!state.allChecked) return "incomplete";
  confirm();
  return "confirmed";
}

/** Same monophonic detector, with the native tuner's band rather than lesson defaults. */
export function estimateTuningPitch(samples: Float32Array, sampleRate: number) {
  return estimatePitch(samples, sampleRate, { minimumFrequency: tuningConfiguration.minimumFrequencyHz, maximumFrequency: tuningConfiguration.maximumFrequencyHz });
}
export function tuningReading(estimate: { frequency: number; clarity: number } | null, capturedAt: number, now: number, string: number) {
  const target = tuningConfiguration.targets.find(target => target.string === string);
  if (!estimate || !target || !Number.isFinite(capturedAt) || !Number.isFinite(now) || capturedAt > now || now - capturedAt > tuningConfiguration.maximumReadingAgeSeconds || !Number.isFinite(estimate.clarity) || estimate.clarity < tuningConfiguration.minimumClarity || estimate.clarity > 1) return null;
  const note = noteForFrequency(estimate.frequency);
  if (!note) return null;
  const centsFromTarget = 1200 * Math.log2(estimate.frequency / target.frequencyHz);
  const direction = Math.abs(centsFromTarget) <= tuningConfiguration.toleranceCents + 1e-8 ? "nearTarget" : note.midi !== target.midi ? "checkStringAndOctave" : centsFromTarget < 0 ? "raisePitch" : "lowerPitch";
  return { ...note, frequency: estimate.frequency, centsFromTarget, direction };
}

/** One listener boundary for hidden tabs, page departure, and unmount cleanup. */
export function bindPracticeLifecycle(stop: () => void, page: Pick<Document, "hidden" | "addEventListener" | "removeEventListener"> = document, surface: Pick<Window, "addEventListener" | "removeEventListener"> = window) {
  const visibility = () => { if (page.hidden) stop(); };
  page.addEventListener("visibilitychange", visibility);
  surface.addEventListener("pagehide", stop);
  return () => { page.removeEventListener("visibilitychange", visibility); surface.removeEventListener("pagehide", stop); stop(); };
}

type MetronomeEnvironment = {
  createContext: () => AudioContext;
  schedule: (callback: () => void, delayMs: number) => () => void;
};
const browserEnvironment: MetronomeEnvironment = {
  createContext: () => createAudioContext({ latencyHint: "interactive" }),
  schedule: (callback, delayMs) => { const timer = window.setTimeout(callback, delayMs); return () => window.clearTimeout(timer); },
};
export interface MetronomePlayback extends Capture { setTempo: (bpm: number) => void }

/**
 * The lookahead scheduler's timing, after Chris Wilson's "A Tale of Two Clocks".
 *
 * A JavaScript timer wakes every `METRONOME_TIMER_MS` and hands the audio clock
 * every click due in the next `METRONOME_LOOKAHEAD_SECONDS`, each at its exact
 * AudioContext time. The audio thread plays them on time however late the
 * timer itself runs, so main-thread load (layout, garbage collection, another
 * tab) no longer moves a click. Only a stall longer than the lookahead can, and
 * then `METRONOME_LATE_TOLERANCE_SECONDS` decides what happens next.
 */
export const METRONOME_TIMER_MS = 25;
export const METRONOME_LOOKAHEAD_SECONDS = 0.1;
/** A click this late still sounds now; anything later is dropped and the grid resyncs. */
export const METRONOME_LATE_TOLERANCE_SECONDS = 0.03;

export type MetronomeCursor = { nextBeatAt: number; beat: number };
export type MetronomeClick = { beat: number; time: number };

/**
 * Every click to commit to the audio clock between `now` and the lookahead
 * horizon, and where the grid stands afterwards. Pure, so it is tested alone.
 *
 * The interval after a click is fixed when that click is committed, which is
 * what "tempo changes take effect after the next beat" means: the click already
 * on its way keeps its time, and the gap after it uses the new tempo.
 *
 * After a stall long enough that the next click is more than the tolerance
 * late, the missed clicks are not played as a catch-up burst. The grid steps
 * forward to its next slot, keeping its phase and the bar position, so the
 * click comes back on the pulse the player has been keeping.
 */
export function scheduleMetronomeWindow(cursor: MetronomeCursor, now: number, bpm: number): { clicks: MetronomeClick[]; cursor: MetronomeCursor; skipped: number } {
  const interval = metronomeInterval(bpm), beatsPerBar = metronomeConfiguration.beatsPerBar;
  let { nextBeatAt, beat } = cursor, skipped = 0;
  if (!Number.isFinite(nextBeatAt) || !Number.isFinite(now)) return { clicks: [], cursor, skipped };
  if (nextBeatAt < now - METRONOME_LATE_TOLERANCE_SECONDS) {
    skipped = Math.ceil((now - METRONOME_LATE_TOLERANCE_SECONDS - nextBeatAt) / interval);
    nextBeatAt += skipped * interval;
    beat = (beat + skipped) % beatsPerBar;
  }
  const clicks: MetronomeClick[] = [];
  while (nextBeatAt < now + METRONOME_LOOKAHEAD_SECONDS) {
    clicks.push({ beat, time: Math.max(nextBeatAt, now) });
    nextBeatAt += interval;
    beat = nextMetronomeBeat(beat);
  }
  return { clicks, cursor: { nextBeatAt, beat }, skipped };
}

/** The native four-beat cadence: click immediately, adopt tempo changes after the next beat. */
export async function startMetronome(initialBPM: number, onBeat: (beat: number) => void, onInterrupted: () => void, signal: AbortSignal, environment: MetronomeEnvironment = browserEnvironment): Promise<MetronomePlayback> {
  if (signal.aborted) throw new Error("Metronome start was cancelled.");
  const context = environment.createContext();
  let stopped = false, releaseSession = () => {}, cancelTimer = () => {};
  let bpm = metronomeBPM(initialBPM);
  const sources = new Set<AudioBufferSourceNode>();
  const beatDisplays = new Set<() => void>();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelTimer();
    for (const cancel of beatDisplays) cancel();
    beatDisplays.clear();
    context.onstatechange = null;
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
    sources.clear();
    signal.removeEventListener("abort", stop);
    releaseSession();
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });
  releaseSession = claimAudioSession(() => { stop(); onInterrupted(); });
  try {
    await context.resume();
    if (stopped || signal.aborted) throw new Error("Metronome start was cancelled.");
    if (context.state !== "running") await context.resume().catch(() => {});
    if (context.state !== "running") throw new Error("Audio playback did not start.");
    const clickBuffer = (frequency: number) => {
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * metronomeConfiguration.clickSeconds), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        const time = index / context.sampleRate;
        samples[index] = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * metronomeConfiguration.envelopeDecay) * metronomeConfiguration.amplitude;
      }
      return buffer;
    };
    const accent = clickBuffer(metronomeConfiguration.accentFrequencyHz), tick = clickBuffer(metronomeConfiguration.tickFrequencyHz);
    /**
     * Where the beat grid stands on the audio clock.
     *
     * Clicks used to be started "now" from a timer armed one beat ahead, so
     * every millisecond the timer fired late was a millisecond the click was
     * late, and a 700 ms main-thread stall stretched one beat to 1.58 s.
     * Clicks are now committed ahead of time at grid positions; see
     * `scheduleMetronomeWindow`.
     */
    let cursor: MetronomeCursor = { nextBeatAt: context.currentTime, beat: 0 };
    /** The visible beat follows the click's scheduled time, not the timer that queued it. */
    const showBeat = (beat: number, delayMs: number) => {
      if (delayMs < 1) { onBeat(beat); return; }
      const cancel = environment.schedule(() => { beatDisplays.delete(cancel); if (!stopped) onBeat(beat); }, delayMs);
      beatDisplays.add(cancel);
    };
    const pump = (initial = false) => {
      if (stopped) return;
      try {
        const now = context.currentTime;
        const planned = scheduleMetronomeWindow(cursor, now, bpm);
        cursor = planned.cursor;
        const latency = Number.isFinite(context.outputLatency) ? context.outputLatency : 0;
        for (const click of planned.clicks) {
          const source = context.createBufferSource();
          source.buffer = click.beat === 0 ? accent : tick;
          source.connect(context.destination);
          source.onended = () => { sources.delete(source); source.disconnect(); };
          sources.add(source);
          source.start(click.time);
          showBeat(click.beat, (click.time - now + latency) * 1000);
        }
        cancelTimer = environment.schedule(() => pump(), METRONOME_TIMER_MS);
      } catch (error) {
        stop();
        if (initial) throw error;
        onInterrupted();
      }
    };
    watchAudioState(context, () => { if (!stopped) { stop(); onInterrupted(); } });
    pump(true);
    return { context, stop, setTempo: value => { bpm = metronomeBPM(value); } };
  } catch (error) { stop(); throw error; }
}
