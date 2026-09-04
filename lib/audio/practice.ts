export interface PracticeTarget {
    id: string;
    beat: number;
    midi?: number | null;
    guitarString?: number | null;
    fret?: number | null;
}
export interface PracticeSpec {
    mode: 'pitchSequence' | 'rhythm';
    bpm: number;
    countInBeats: number;
    toleranceCents: number;
    passScore: number;
    targets: PracticeTarget[];
}
export interface PracticeResult {
    practiceSeconds: number;
    score: number | null;
    disposition: 'scored' | 'insufficientSignal';
    passed: boolean | null;
    matchedTargets: number;
    targetCount: number;
    noteScore: number | null;
    rhythmScore: number | null;
}
export interface Observation {
    time: number;
    midi?: number;
    cents?: number;
    confidence: number;
    targetID?: string;
}
export function validSpec(spec: PracticeSpec) {
    return Number.isFinite(spec.bpm) && spec.bpm > 0 && spec.bpm <= 400 && Number.isInteger(spec.countInBeats) && spec.countInBeats >= 0 && spec.countInBeats <= 16 && Number.isFinite(spec.toleranceCents) && spec.toleranceCents > 0 && Number.isFinite(spec.passScore) && spec.passScore >= 0 && spec.passScore <= 100 && spec.targets.length > 0 && spec.targets.every((t, i) => Number.isFinite(t.beat) && t.beat >= 0 && (i === 0 || t.beat > spec.targets[i - 1].beat) && (spec.mode !== 'pitchSequence' || (Number.isInteger(t.midi) && t.midi! >= 0 && t.midi! <= 127)));
}
export function scorePractice(spec: PracticeSpec, observations: Observation[], activeSeconds = 0): PracticeResult {
    const practiceSeconds = Number.isFinite(activeSeconds) ? Math.max(0, Math.min(86400, Math.floor(activeSeconds))) : 0;
    const abstain: PracticeResult = { practiceSeconds, score: null, disposition: 'insufficientSignal', passed: null, matchedTargets: 0, targetCount: spec.targets.length, noteScore: null, rhythmScore: null };
    if (!validSpec(spec))
        return abstain;
    const usable = observations.filter(o => Number.isFinite(o.time) && o.time >= 0 && Number.isFinite(o.confidence) && o.confidence >= .6 && (spec.mode !== 'pitchSequence' || (Number.isInteger(o.midi) && Number.isFinite(o.cents ?? 0)))).sort((a, b) => a.time - b.time);
    if (usable.length < Math.max(1, Math.ceil(spec.targets.length * .5)))
        return abstain;
    let cursor = 0, credit = 0, matched = 0;
    for (const target of spec.targets) {
        if (spec.mode === 'pitchSequence') {
            if (usable.some(o => o.targetID !== undefined)) {
                const errors = usable.filter(o => o.targetID === target.id).map(o => Math.abs((o.midi! - target.midi!) * 100 + (o.cents ?? 0))).filter(e => e <= spec.toleranceCents * 2);
                if (errors.length) {
                    const error = Math.min(...errors);
                    credit += error <= spec.toleranceCents ? 1 : Math.max(0, 1 - (error - spec.toleranceCents) / spec.toleranceCents);
                    matched++;
                }
                continue;
            }
            while (cursor < usable.length) {
                const o = usable[cursor++], error = Math.abs((o.midi! - target.midi!) * 100 + (o.cents ?? 0));
                if (error <= spec.toleranceCents * 2) {
                    credit += error <= spec.toleranceCents ? 1 : Math.max(0, 1 - (error - spec.toleranceCents) / spec.toleranceCents);
                    matched++;
                    break;
                }
            }
        }
        else {
            let chosen = -1, error = .5;
            for (let i = cursor; i < usable.length; i++) {
                const e = Math.abs(usable[i].time * spec.bpm / 60 - target.beat);
                if (e <= .5 && (chosen < 0 || e < error)) {
                    chosen = i;
                    error = e;
                }
            }
            if (chosen >= 0) {
                cursor = chosen + 1;
                credit += Math.max(0, 1 - error / .5);
                matched++;
            }
        }
    }
    const score = Math.round(credit / spec.targets.length * 100);
    return { practiceSeconds, score, disposition: 'scored', passed: score >= spec.passScore, matchedTargets: matched, targetCount: spec.targets.length, noteScore: spec.mode === 'pitchSequence' ? score : null, rhythmScore: spec.mode === 'rhythm' ? score : null };
}
/** Active playing time excludes permission prompts, count-ins, and pauses. */
export class ActivePracticeClock {
    private accumulated = 0;
    private startedAt: number | null = null;
    reset() { this.accumulated = 0; this.startedAt = null; }
    start(at: number) { this.startedAt = at; }
    runElapsed(now: number) { return this.startedAt === null ? 0 : Math.max(0, now - this.startedAt); }
    elapsed(now: number) { return this.accumulated + this.runElapsed(now); }
    pause(now: number) { this.accumulated = this.elapsed(now); this.startedAt = null; }
}
/** One audio clock drives count-in, target position and visual pulse. */
export function transportAt(now: number, start: number, bpm: number, countInBeats: number) {
    const beat = (now - start) * bpm / 60 - countInBeats;
    return { beat, countingIn: beat < 0, pulse: ((Math.floor(beat) % 4) + 4) % 4, remaining: Math.max(0, Math.ceil(-beat)) };
}
