import contract from "../../contracts/practice-tools.json" with { type: "json" };
import { claimAudioSession, type Capture } from "./capture.ts";
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
  createContext: () => new AudioContext({ latencyHint: "interactive" }),
  schedule: (callback, delayMs) => { const timer = window.setTimeout(callback, delayMs); return () => window.clearTimeout(timer); },
};
export interface MetronomePlayback extends Capture { setTempo: (bpm: number) => void }

/** The native four-beat cadence: click immediately, adopt tempo changes after the next beat. */
export async function startMetronome(initialBPM: number, onBeat: (beat: number) => void, onInterrupted: () => void, signal: AbortSignal, environment: MetronomeEnvironment = browserEnvironment): Promise<MetronomePlayback> {
  if (signal.aborted) throw new Error("Metronome start was cancelled.");
  const context = environment.createContext();
  let stopped = false, releaseSession = () => {}, cancelTimer = () => {};
  let bpm = metronomeBPM(initialBPM), beat = 0;
  const sources = new Set<AudioBufferSourceNode>();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelTimer();
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
     * The audio-clock time the beat being scheduled belongs on.
     *
     * Each click used to start at `context.currentTime` — whenever the timer
     * happened to fire — and the next timer was armed for a whole interval from
     * that moment. setTimeout is allowed to fire late, and every late firing
     * pushed the following beat later still, so the error accumulated instead of
     * cancelling out: a metronome that is audibly behind after a couple of
     * minutes, which is the one thing a metronome may not be.
     *
     * Anchoring to the audio clock fixes that. The beat grid advances by exact
     * intervals independently of when the timer runs, so a late firing still
     * places its click on the grid and the next delay is short by exactly the
     * amount the last one overran.
     */
    let nextBeatAt = context.currentTime;
    const playBeat = (initial = false) => {
      if (stopped) return;
      try {
        const interval = metronomeInterval(bpm);
        // A suspended tab can leave the grid far in the past. Re-anchor rather
        // than firing a burst of catch-up clicks for beats nobody heard.
        if (nextBeatAt < context.currentTime - interval) nextBeatAt = context.currentTime;
        const source = context.createBufferSource();
        source.buffer = beat === 0 ? accent : tick;
        source.connect(context.destination);
        source.onended = () => { sources.delete(source); source.disconnect(); };
        sources.add(source);
        // Never schedule in the past: a beat the timer delivered late plays now,
        // while the grid it belongs to stays where it was.
        source.start(Math.max(nextBeatAt, context.currentTime));
        onBeat(beat);
        beat = nextMetronomeBeat(beat);
        nextBeatAt += interval;
        // Keep the already scheduled beat when a slider moves; changing tempo must not starve clicks.
        cancelTimer = environment.schedule(() => playBeat(), Math.max(0, (nextBeatAt - context.currentTime) * 1000));
      } catch (error) {
        stop();
        if (initial) throw error;
        onInterrupted();
      }
    };
    context.onstatechange = () => { if (!stopped && context.state !== "running") { stop(); onInterrupted(); } };
    playBeat(true);
    return { context, stop, setTempo: value => { bpm = metronomeBPM(value); } };
  } catch (error) { stop(); throw error; }
}
