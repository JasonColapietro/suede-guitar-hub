import { claimAudioSession, createAudioContext, watchAudioState } from "@/lib/audio/capture";
import { vocalStudyTimeline, type VocalStudy } from "@/lib/learning/vocal-material";

export type VocalReferencePlayback = { stop: () => void; durationSeconds: number };
type ReferenceEnvironment = {
  createContext: () => AudioContext;
  schedule: (callback: () => void, delayMs: number) => () => void;
};

const browserEnvironment: ReferenceEnvironment = {
  createContext: () => createAudioContext({ latencyHint: "interactive" }),
  schedule: (callback, delayMs) => {
    const timer = window.setTimeout(callback, delayMs);
    return () => window.clearTimeout(timer);
  },
};

function frequency(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }

export async function startVocalReference(study: VocalStudy, transpose: number, speed: number, onInterrupted: () => void, signal: AbortSignal, environment: ReferenceEnvironment = browserEnvironment): Promise<VocalReferencePlayback> {
  if (signal.aborted) throw new Error("Reference start was cancelled.");
  const context = environment.createContext();
  const timeline = vocalStudyTimeline(study, transpose, speed);
  const beatSeconds = 60 / (study.bpm * ([0.5, 0.75, 1].includes(speed) ? speed : 1));
  const durationSeconds = Math.max(study.countInBeats * beatSeconds, ...timeline.map(note => note.startSeconds + note.durationSeconds)) + 0.08;
  const oscillators = new Set<OscillatorNode>();
  const gains = new Set<GainNode>();
  let stopped = false, releaseSession = () => {}, cancelEnd = () => {};
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelEnd();
    context.onstatechange = null;
    for (const oscillator of oscillators) { oscillator.onended = null; try { oscillator.stop(); } catch {} oscillator.disconnect(); }
    for (const gain of gains) gain.disconnect();
    oscillators.clear(); gains.clear();
    signal.removeEventListener("abort", stop);
    releaseSession();
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", stop, { once: true });
  releaseSession = claimAudioSession(() => { stop(); onInterrupted(); });
  try {
    await context.resume();
    if (stopped || signal.aborted || context.state !== "running") throw new Error("Reference playback did not start.");
    const origin = context.currentTime + 0.03;
    const scheduleTone = (midi: number, endMidi: number, starts: number, lasts: number, amplitude: number) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillators.add(oscillator); gains.add(gain);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency(midi), starts);
      if (endMidi !== midi) oscillator.frequency.exponentialRampToValueAtTime(frequency(endMidi), starts + lasts);
      gain.gain.setValueAtTime(0.0001, starts);
      gain.gain.linearRampToValueAtTime(amplitude, starts + Math.min(0.012, lasts / 4));
      gain.gain.setValueAtTime(amplitude, starts + Math.max(0.012, lasts - Math.min(0.04, lasts / 3)));
      gain.gain.exponentialRampToValueAtTime(0.0001, starts + lasts);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => { oscillators.delete(oscillator); gains.delete(gain); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(starts); oscillator.stop(starts + lasts + 0.01);
    };
    for (let beat = 0; beat < study.countInBeats; beat++) scheduleTone(beat === 0 ? 81 : 76, beat === 0 ? 81 : 76, origin + beat * beatSeconds, Math.min(0.035, beatSeconds / 3), 0.08);
    for (const note of timeline) scheduleTone(note.midi, note.glideEndMidi, origin + note.startSeconds, note.durationSeconds, 0.16);
    watchAudioState(context, () => { if (!stopped) { stop(); onInterrupted(); } });
    cancelEnd = environment.schedule(stop, (durationSeconds + 0.1) * 1000);
    return { stop, durationSeconds };
  } catch (error) { stop(); throw error; }
}
