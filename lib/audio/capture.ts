// Capture in fixed blocks on the audio rendering thread. Samples stay in this
// browser, never enter a request, and are released when the session stops.

/**
 * The browser's AudioContext constructor, including the prefixed one older
 * iPhones and some in-app browsers (TikTok, Instagram) still expose.
 */
export function audioContextClass(): typeof AudioContext | undefined {
    const scope = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; window?: { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext } };
    return scope.AudioContext ?? scope.window?.AudioContext ?? scope.webkitAudioContext ?? scope.window?.webkitAudioContext;
}
export function hasWebAudio() { return audioContextClass() !== undefined; }
export function createAudioContext(options?: AudioContextOptions): AudioContext {
    const Context = audioContextClass();
    if (!Context) throw new Error('This browser does not support Web Audio.');
    try { return new Context(options); } catch { return new Context(); }
}
/**
 * Watch a context for a real loss of audio, not a blip.
 *
 * iOS Safari moves a running context to "interrupted" (and sometimes
 * "suspended") for a moment whenever the audio session changes: opening the
 * microphone, a notification sound, the ringer switch, a Bluetooth route
 * change. Treating every non-running state as fatal stopped exercises the
 * instant they started on iPhone. A closed context is lost at once; anything
 * else is resumed and only counted as lost when it stays down.
 */
export function watchAudioState(context: AudioContext, onLost: () => void, graceMs = 1500) {
    let timer: ReturnType<typeof setTimeout> | null = null, done = false;
    const clear = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
    const inspect = () => {
        if (done) return;
        const state = context.state as string;
        if (state === 'running') { clear(); return; }
        if (state === 'closed') { clear(); done = true; onLost(); return; }
        void context.resume().catch(() => { });
        if (timer === null) timer = setTimeout(() => { timer = null; if (!done && (context.state as string) !== 'running') { done = true; onLost(); } }, graceMs);
    };
    context.onstatechange = inspect;
    // Setup can finish after the browser has already suspended the context.
    // Waiting for another event in that state leaves the practice clock frozen.
    inspect();
    return () => { done = true; clear(); context.onstatechange = null; };
}
let interruptCurrentAudio: (() => void) | null = null;
export function claimAudioSession(interrupt: () => void) {
    const previous = interruptCurrentAudio;
    interruptCurrentAudio = null;
    previous?.();
    interruptCurrentAudio = interrupt;
    return () => { if (interruptCurrentAudio === interrupt) interruptCurrentAudio = null; };
}
export interface Capture {
    context: AudioContext;
    stop: () => void;
    /**
     * The microphone track, when there is one.
     *
     * Exposed for `captureLagSec`, which prefers the track's reported `latency`
     * over `AudioContext.baseLatency`. Without it the compensation fell back to
     * baseLatency every time — and baseLatency describes the graph and output
     * path, not the microphone and driver delay that actually shifts a captured
     * attack late. Absent on the rehearsal path, which never opens a mic.
     */
    inputTrack?: MediaStreamTrack | null;
}
export async function startCapture(onSamples: (samples: Float32Array, time: number, sampleRate: number) => void, onInterrupted: () => void, signal: AbortSignal): Promise<Capture> {
    if (signal.aborted)
        throw new Error('Microphone setup was cancelled.');
    if (!navigator.mediaDevices?.getUserMedia || !hasWebAudio())
        throw new Error('Microphone practice needs a secure browser with Web Audio. You can still practice without scoring.');
    const context = createAudioContext({ latencyHint: 'interactive' });
    let stream: MediaStream | null = null, source: MediaStreamAudioSourceNode | null = null, worklet: AudioWorkletNode | null = null, processor: ScriptProcessorNode | null = null;
    let stopped = false;
    let releaseSession = () => {}, unwatch = () => {};
    const stop = () => {
        if (stopped)
            return;
        stopped = true;
        unwatch();
        if (worklet) {
            worklet.port.onmessage = null;
            worklet.disconnect();
        }
        if (processor) {
            processor.onaudioprocess = null;
            processor.disconnect();
        }
        source?.disconnect();
        stream?.getTracks().forEach(t => t.stop());
        context.onstatechange = null;
        void context.close().catch(() => { });
        signal.removeEventListener('abort', stop);
        releaseSession();
    };
    signal.addEventListener('abort', stop, { once: true });
    releaseSession = claimAudioSession(() => { stop(); onInterrupted(); });
    try {
        // Start both inside the tap that called us. iOS only lets a context
        // start and a microphone prompt open while that gesture is live, so
        // awaiting one before asking for the other lost the gesture and left
        // the exercise sitting on "Get ready" with no audio flowing.
        const resuming = context.resume().catch(() => { });
        const requesting = navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(input => {
            // Own the mic as soon as permission resolves, even when resume is
            // still pending. Stop must release it in either completion order.
            if (signal.aborted || stopped) {
                input.getTracks().forEach(t => t.stop());
                throw new Error('Microphone setup was cancelled.');
            }
            stream = input;
            return input;
        });
        // Observe both immediately so denial is handled while resume is pending.
        [stream] = await Promise.all([requesting, resuming]);
        if (signal.aborted || stopped) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error('Microphone setup was cancelled.');
        }
        // Opening the microphone switches the iOS audio session, which parks a
        // running context. Wake it again before wiring the graph.
        if ((context.state as string) !== 'running')
            await context.resume().catch(() => { });
        if (signal.aborted || stopped)
            throw new Error('Microphone setup was cancelled.');
        source = context.createMediaStreamSource(stream);
        const deliver = (samples: Float32Array, time: number) => { if (!stopped) onSamples(samples, time, context.sampleRate); };
        let workletReady = false;
        if (context.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
            try {
                await context.audioWorklet.addModule('/audio/guitarhub-capture.worklet.js');
                workletReady = true;
            }
            catch {
                workletReady = false;
            }
        }
        if (signal.aborted || stopped)
            throw new Error('Microphone setup was cancelled.');
        if (workletReady) {
            worklet = new AudioWorkletNode(context, 'guitarhub-capture');
            worklet.port.onmessage = (event: MessageEvent<{
                samples: Float32Array;
                time: number;
            }>) => deliver(event.data.samples, event.data.time);
            // Processor outputs silence; connecting keeps capture active without mic monitoring.
            source.connect(worklet);
            worklet.connect(context.destination);
        }
        else {
            // Older iPhones and in-app browsers without AudioWorklet: the same
            // 4096-sample blocks from the main thread.
            processor = context.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = event => {
                const input = event.inputBuffer.getChannelData(0);
                const samples = new Float32Array(input.length);
                samples.set(input);
                event.outputBuffer.getChannelData(0).fill(0);
                deliver(samples, Math.max(0, context.currentTime - input.length / context.sampleRate));
            };
            source.connect(processor);
            processor.connect(context.destination);
        }
        unwatch = watchAudioState(context, () => { if (!stopped) onInterrupted(); });
        stream.getAudioTracks().forEach(t => { t.onended = () => { if (!stopped)
            onInterrupted(); }; });
        return { context, stop, inputTrack: stream.getAudioTracks()[0] ?? null };
    }
    catch (error) {
        stop();
        throw error;
    }
}
export async function playReference(frequency: number, externalSignal: AbortSignal) {
    if (externalSignal.aborted) return false;
    const controller = new AbortController(), signal = controller.signal;
    const cancel = () => controller.abort();
    externalSignal.addEventListener('abort', cancel, { once: true });
    let context: AudioContext | null = null, oscillator: OscillatorNode | null = null, gain: GainNode | null = null;
    let closed = false, unwatch = () => {}, releaseSession = () => {};
    const stop = () => { if (closed)
        return; closed = true; unwatch(); if (oscillator) oscillator.onended = null; oscillator?.disconnect(); gain?.disconnect(); void context?.close().catch(() => { }); };
    signal.addEventListener('abort', stop, { once: true });
    try {
        // Each resource is owned before the next construction can throw.
        context = createAudioContext();
        oscillator = context.createOscillator();
        gain = context.createGain();
        releaseSession = claimAudioSession(cancel);
        await context.resume();
        if (signal.aborted)
            return false;
        // A lost audio clock never reaches the oscillator's scheduled end.
        // Resolve as interrupted so tuner and lesson controls can recover.
        unwatch = watchAudioState(context, cancel);
        if (signal.aborted)
            return false;
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        oscillator.connect(gain);
        gain.connect(context.destination);
        const now = context.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(.12, now + .03);
        gain.gain.setValueAtTime(.12, now + .65);
        gain.gain.exponentialRampToValueAtTime(.0001, now + .9);
        oscillator.start(now);
        oscillator.stop(now + .95);
        const playingOscillator = oscillator;
        await new Promise<void>(resolve => {
            const cancelled = () => resolve();
            playingOscillator.onended = () => { signal.removeEventListener('abort', cancelled); resolve(); };
            signal.addEventListener('abort', cancelled, { once: true });
        });
        if (!signal.aborted)
            await new Promise<void>(resolve => {
                const cancelled = () => { clearTimeout(timer); resolve(); };
                const timer = setTimeout(() => { signal.removeEventListener('abort', cancelled); resolve(); }, 1000);
                signal.addEventListener('abort', cancelled, { once: true });
            });
        return !signal.aborted;
    }
    finally {
        signal.removeEventListener('abort', stop);
        externalSignal.removeEventListener('abort', cancel);
        releaseSession();
        // Monitoring can synchronously cancel an already-closed context
        // before its cleanup callback has been assigned to unwatch.
        unwatch();
        stop();
    }
}
