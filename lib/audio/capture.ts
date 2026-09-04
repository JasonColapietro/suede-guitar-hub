// Capture in fixed blocks on the audio rendering thread. Samples stay in this
// browser, never enter a request, and are released when the session stops.
let interruptCurrentAudio: (() => void) | null = null;
function claimAudioSession(interrupt: () => void) {
    const previous = interruptCurrentAudio;
    interruptCurrentAudio = null;
    previous?.();
    interruptCurrentAudio = interrupt;
    return () => { if (interruptCurrentAudio === interrupt) interruptCurrentAudio = null; };
}
export interface Capture {
    context: AudioContext;
    stop: () => void;
}
export async function startCapture(onSamples: (samples: Float32Array, time: number, sampleRate: number) => void, onInterrupted: () => void, signal: AbortSignal): Promise<Capture> {
    if (signal.aborted)
        throw new Error('Microphone setup was cancelled.');
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext)
        throw new Error('Microphone practice needs a secure browser with Web Audio. You can still practice without scoring.');
    const context = new AudioContext({ latencyHint: 'interactive' });
    let stream: MediaStream | null = null, source: MediaStreamAudioSourceNode | null = null, worklet: AudioWorkletNode | null = null;
    let stopped = false;
    let releaseSession = () => {};
    const stop = () => {
        if (stopped)
            return;
        stopped = true;
        if (worklet) {
            worklet.port.onmessage = null;
            worklet.disconnect();
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
        await context.resume();
        if (signal.aborted || stopped)
            throw new Error('Microphone setup was cancelled.');
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (signal.aborted || stopped) {
            stream.getTracks().forEach(t => t.stop());
            throw new Error('Microphone setup was cancelled.');
        }
        await context.audioWorklet.addModule('/audio/guitarhub-capture.worklet.js');
        if (signal.aborted || stopped)
            throw new Error('Microphone setup was cancelled.');
        source = context.createMediaStreamSource(stream);
        worklet = new AudioWorkletNode(context, 'guitarhub-capture');
        worklet.port.onmessage = (event: MessageEvent<{
            samples: Float32Array;
            time: number;
        }>) => {
            if (!stopped)
                onSamples(event.data.samples, event.data.time, context.sampleRate);
        };
        // Processor outputs silence; connecting keeps capture active without mic monitoring.
        source.connect(worklet);
        worklet.connect(context.destination);
        context.onstatechange = () => { if (!stopped && context.state !== 'running')
            onInterrupted(); };
        stream.getAudioTracks().forEach(t => { t.onended = () => { if (!stopped)
            onInterrupted(); }; });
        return { context, stop };
    }
    catch (error) {
        stop();
        throw error;
    }
}
export async function playReference(frequency: number, externalSignal: AbortSignal) {
    if (externalSignal.aborted) return;
    const controller = new AbortController(), signal = controller.signal;
    const cancel = () => controller.abort();
    externalSignal.addEventListener('abort', cancel, { once: true });
    const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain();
    let closed = false;
    const stop = () => { if (closed)
        return; closed = true; oscillator.disconnect(); gain.disconnect(); void context.close().catch(() => { }); };
    signal.addEventListener('abort', stop, { once: true });
    const releaseSession = claimAudioSession(cancel);
    try {
        await context.resume();
        if (signal.aborted)
            return;
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
        await new Promise<void>(resolve => {
            const cancelled = () => resolve();
            oscillator.onended = () => { signal.removeEventListener('abort', cancelled); resolve(); };
            signal.addEventListener('abort', cancelled, { once: true });
        });
        if (!signal.aborted)
            await new Promise<void>(resolve => {
                const cancelled = () => { clearTimeout(timer); resolve(); };
                const timer = setTimeout(() => { signal.removeEventListener('abort', cancelled); resolve(); }, 1000);
                signal.addEventListener('abort', cancelled, { once: true });
            });
    }
    finally {
        signal.removeEventListener('abort', stop);
        externalSignal.removeEventListener('abort', cancel);
        releaseSession();
        stop();
    }
}
