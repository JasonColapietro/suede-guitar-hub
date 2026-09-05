import type { Observation } from './practice';

/** GuitarHub's explicit cross-platform guitar contract. These are local
 * engineering parameters, not claimed competitor scoring tolerances. */
export const guitarPractice = {
    minimumFrequency: 60, maximumFrequency: 1400, minimumClarity: .85,
    silenceRMS: .012, requiredFrames: 3, minimumHold: .18,
    maximumAge: .45, maximumGap: .25, minimumMute: .06,
    onsetRefractory: .075, minimumOnsetConfidence: .6,
} as const;

export function guitarCountIn(authored: number, timed: boolean) {
    return timed ? Math.max(4, authored) : authored;
}

/** Audio automation schedules the complete run before it starts, so a late
 * animation frame cannot omit a click. The final bar is end-exclusive. */
export function rhythmClickPlan(bpm: number, countIn: number, duration: number) {
    if (!Number.isFinite(bpm) || bpm <= 0 || bpm > 500 || !Number.isInteger(countIn) || countIn < 0 || countIn > 16 ||
        !Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error('This exercise has an unsupported duration or tempo.');
    const step = 60 / bpm, beats = countIn + duration * bpm / 60;
    const nearest = Math.round(beats), count = Math.abs(beats - nearest) < 1e-9 ? nearest : Math.ceil(beats);
    return Array.from({ length: count }, (_, beat) => ({ time: beat * step, accent: beat % 4 === 0 }));
}

/** Duplicate polls, delayed buffers and gaps cannot manufacture a hold. */
export class FreshPitchGate {
    private sequence: number | null = null;
    private first: number | null = null;
    private last: number | null = null;
    private frames = 0;
    reset() { this.sequence = null; this.first = null; this.last = null; this.frames = 0; }
    accepts(sequence: number, observedAt: number, now: number, matching: boolean) {
        if (!Number.isFinite(observedAt) || !Number.isFinite(now) || observedAt > now || now - observedAt > guitarPractice.maximumAge) {
            this.first = this.last = null; this.frames = 0; return false;
        }
        if (sequence === this.sequence) return false;
        this.sequence = sequence;
        if (!matching) { this.first = this.last = null; this.frames = 0; return false; }
        if (this.last !== null && (observedAt <= this.last || observedAt - this.last > guitarPractice.maximumGap)) {
            this.first = null; this.frames = 0;
        }
        this.first ??= observedAt;
        this.last = observedAt;
        this.frames++;
        return this.frames >= guitarPractice.requiredFrames && observedAt - this.first >= guitarPractice.minimumHold;
    }
}

/** A repeated pitch needs a fresh attack or mute. A different clear note does not
 * release the previous accepted pitch unless it is itself accepted. */
export class GuitarRearticulationGate {
    private lastMIDI: number | null = null;
    private acceptedAt = -Infinity;
    private silenceStart: number | null = null;
    private releaseAt = -Infinity;
    private observedAt = -Infinity;
    observe(silent: boolean, observedAt: number, now: number) {
        if (!Number.isFinite(observedAt) || !Number.isFinite(now) || observedAt > now || now - observedAt > guitarPractice.maximumAge) {
            this.silenceStart = null; return;
        }
        if (observedAt <= this.observedAt) return;
        if (observedAt - this.observedAt > guitarPractice.maximumGap) this.silenceStart = null;
        this.observedAt = observedAt;
        if (!silent) { this.silenceStart = null; return; }
        this.silenceStart ??= observedAt;
        if (observedAt - this.silenceStart >= guitarPractice.minimumMute) this.releaseAt = observedAt;
    }
    permits(midi: number) { return this.lastMIDI !== midi || this.releaseAt > this.acceptedAt; }
    observeOnset(observedAt: number, confidence: number, now: number) {
        if (Number.isFinite(observedAt) && Number.isFinite(now) && Number.isFinite(confidence) &&
            confidence >= guitarPractice.minimumOnsetConfidence && observedAt <= now &&
            now - observedAt <= guitarPractice.maximumAge && observedAt > this.acceptedAt + guitarPractice.onsetRefractory)
            this.releaseAt = Math.max(this.releaseAt, observedAt);
    }
    accepted(midi: number, observedAt: number) { this.lastMIDI = midi; this.acceptedAt = observedAt; }
}

/** The detector cannot emit faster than its refractory interval. Bound a
 * complete performance by that limit, never by dropping its earliest notes.
 * Only score-eligible events inside the authored music window are retained. */
export class RhythmObservationWindow {
    readonly observations: Observation[] = [];
    readonly capacity: number;
    readonly duration: number;
    overflowed = false;
    constructor(duration: number) {
        if (!Number.isFinite(duration) || duration <= 0 || duration > 86400)
            throw new Error('This exercise has an unsupported duration.');
        this.duration = duration;
        this.capacity = Math.ceil(duration / guitarPractice.onsetRefractory) + 2;
    }
    append(observation: Observation) {
        if (!Number.isFinite(observation.time) || observation.time < 0 || observation.time >= this.duration ||
            !Number.isFinite(observation.confidence) || observation.confidence < guitarPractice.minimumOnsetConfidence) return;
        if (this.observations.length >= this.capacity) { this.overflowed = true; return; }
        this.observations.push(observation);
    }
}
