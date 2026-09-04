/** Monophonic YIN (de Cheveigné & Kawahara), same band and threshold as iOS.
 * These are GuitarHub parameters, not undocumented competitor tolerances. */
export function estimatePitch(samples: Float32Array, sampleRate: number) {
    const min = 60, max = 1400, threshold = .15;
    if (!Number.isFinite(sampleRate) || sampleRate <= 0 || samples.some(x => !Number.isFinite(x)))
        return null;
    const maxLag = Math.floor(sampleRate / min), minLag = Math.max(2, Math.floor(sampleRate / max));
    const window = samples.length - maxLag;
    if (window <= maxLag || minLag >= maxLag)
        return null;
    let energy = 0;
    for (const x of samples)
        energy += x * x;
    if (Math.sqrt(energy / samples.length) < .012)
        return null;
    const normalized = new Float64Array(maxLag + 1).fill(1);
    let sum = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
        let difference = 0;
        for (let i = 0; i < window; i++) {
            const d = samples[i] - samples[i + lag];
            difference += d * d;
        }
        sum += difference;
        normalized[lag] = sum > 0 ? difference * lag / sum : 1;
    }
    let chosen = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
        if (normalized[lag] < threshold) {
            while (lag < maxLag && normalized[lag + 1] < normalized[lag])
                lag++;
            chosen = lag;
            break;
        }
    }
    if (chosen < 0) {
        let best = minLag;
        for (let lag = minLag; lag <= maxLag; lag++)
            if (normalized[lag] < normalized[best])
                best = lag;
        chosen = best;
        for (const divisor of [4, 3, 2]) {
            const approx = Math.round(best / divisor);
            if (approx < minLag)
                continue;
            let local = approx;
            for (let lag = Math.max(minLag, approx - 2); lag <= Math.min(maxLag, approx + 2); lag++) {
                if (normalized[lag] < normalized[local])
                    local = lag;
            }
            if (normalized[local] <= Math.max(threshold, normalized[best] * 1.2)) {
                chosen = local;
                break;
            }
        }
    }
    const clarity = Math.max(0, Math.min(1, 1 - normalized[chosen]));
    if (clarity <= .5)
        return null;
    let refined = chosen;
    if (chosen > minLag && chosen < maxLag) {
        const a = normalized[chosen - 1], b = normalized[chosen], c = normalized[chosen + 1];
        const denominator = a - 2 * b + c;
        if (Math.abs(denominator) > Number.EPSILON)
            refined += .5 * (a - c) / denominator;
    }
    const frequency = sampleRate / refined;
    if (frequency < min * .9 || frequency > max * 1.1)
        return null;
    const note = noteForFrequency(frequency);
    return note ? { frequency, clarity, ...note } : null;
}
export function frequencyForMIDI(midi: number) { return 440 * 2 ** ((midi - 69) / 12); }
export function noteName(midi: number) {
    return `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
export function noteForFrequency(frequency: number) {
    if (!Number.isFinite(frequency) || frequency <= 0)
        return null;
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    if (midi < 0 || midi > 127)
        return null;
    return { midi, name: noteName(midi), cents: 1200 * Math.log2(frequency / frequencyForMIDI(midi)) };
}
function median(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
    return sorted.length ? sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 : 0;
}
/** Same 512/128 sample novelty, room gate, hysteresis and refractory contract as iOS.
 * Detects audio attacks, not guitar identity or complete chords. */
export class OnsetDetector {
    private buffer: number[] = [];
    private frameStart = 0;
    private previousDB: number | null = null;
    private room: number[] = [];
    private history: number[] = [];
    private gate = -60;
    private armed = true;
    private last = -Infinity;
    calibrated = false;
    readonly sampleRate: number;
    constructor(sampleRate: number) { this.sampleRate = sampleRate; }
    process(samples: Float32Array) {
        const events: {
            time: number;
            confidence: number;
        }[] = [];
        if (!Number.isFinite(this.sampleRate) || this.sampleRate <= 0)
            return events;
        this.buffer.push(...Array.from(samples, x => Number.isFinite(x) ? x : 0));
        while (this.buffer.length >= 512) {
            let square = 0;
            for (let i = 0; i < 512; i++)
                square += this.buffer[i] ** 2;
            const db = 10 * Math.log10(Math.max(square / 512, 1e-12));
            const novelty = Math.max(0, db - (this.previousDB ?? db));
            this.previousDB = db;
            const time = (this.frameStart + 256) / this.sampleRate;
            if (!this.calibrated) {
                this.room.push(db);
                if ((this.frameStart + 512) / this.sampleRate >= .6) {
                    const center = median(this.room), mad = median(this.room.map(x => Math.abs(x - center)));
                    this.gate = Math.max(-60, center + 6 + 3 * mad);
                    this.calibrated = true;
                    this.room = [];
                    this.history = Array(8).fill(0);
                }
            }
            else {
                const center = median(this.history), threshold = Math.max(3, center + 6 * median(this.history.map(x => Math.abs(x - center))));
                const elapsed = time - this.last >= .075;
                if (!this.armed && elapsed && novelty <= threshold * .35)
                    this.armed = true;
                if (this.armed && elapsed && novelty >= threshold && db >= this.gate) {
                    const clamp = (x: number) => Math.max(0, Math.min(1, x));
                    events.push({ time, confidence: clamp(.5 + .35 * clamp((novelty - threshold) / Math.max(threshold, 1)) + .15 * clamp((db - this.gate) / 24)) });
                    this.armed = false;
                    this.last = time;
                }
                this.history.push(novelty);
                if (this.history.length > 64)
                    this.history.shift();
            }
            this.buffer.splice(0, 128);
            this.frameStart += 128;
        }
        return events;
    }
}
