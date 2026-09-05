import { claimAudioSession, type Capture } from './capture';
import { rhythmClickPlan } from './guitar-practice';

export interface RhythmPlayback extends Capture {
    schedule: (start: number, bpm: number, countIn: number, duration: number) => void;
}

/** An audio clock and optional clicks for rehearsal. Never requests a mic. */
export async function startRhythmPractice(onInterrupted: () => void, signal: AbortSignal): Promise<RhythmPlayback> {
    if (signal.aborted) throw new Error('Practice setup was cancelled.');
    const context = new AudioContext({ latencyHint: 'interactive' });
    const nodes = new Map<OscillatorNode, GainNode>();
    let stopped = false, release = () => {};
    const stop = () => {
        if (stopped) return;
        stopped = true;
        context.onstatechange = null;
        for (const [node, gain] of nodes) { node.onended = null; node.disconnect(); gain.disconnect(); try { node.stop(); } catch {} }
        nodes.clear();
        signal.removeEventListener('abort', stop);
        release();
        void context.close().catch(() => {});
    };
    signal.addEventListener('abort', stop, { once: true });
    release = claimAudioSession(() => { stop(); onInterrupted(); });
    try {
        await context.resume();
        if (stopped || signal.aborted) throw new Error('Practice setup was cancelled.');
        context.onstatechange = () => { if (!stopped && context.state !== 'running') { stop(); onInterrupted(); } };
        return { context, stop, schedule(start, bpm, countIn, duration) {
            if (stopped) return;
            const clicks = rhythmClickPlan(bpm, countIn, duration);
            const node = context.createOscillator(), gain = context.createGain();
            gain.gain.setValueAtTime(0, context.currentTime);
            for (const click of clicks) {
                const at = start + click.time;
                node.frequency.setValueAtTime(click.accent ? 1200 : 850, at);
                gain.gain.setValueAtTime(.12, at);
                gain.gain.exponentialRampToValueAtTime(.0001, at + .04);
                gain.gain.setValueAtTime(0, at + .05);
            }
            node.connect(gain); gain.connect(context.destination); nodes.set(node, gain);
            node.onended = () => { nodes.delete(node); node.disconnect(); gain.disconnect(); };
            node.start(start); node.stop(start + countIn * 60 / bpm + duration);
        } };
    } catch (error) { stop(); throw error; }
}
