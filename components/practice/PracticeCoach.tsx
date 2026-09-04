'use client';
import { useEffect, useRef, useState } from 'react';
import { estimatePitch, frequencyForMIDI, noteName, OnsetDetector } from '@/lib/audio/dsp';
import { startCapture, playReference, type Capture } from '@/lib/audio/capture';
import { ActivePracticeClock, scorePractice, transportAt, validSpec, type Observation, type PracticeResult, type PracticeSpec } from '@/lib/audio/practice';
import styles from './PracticeCoach.module.css';
type Phase = 'ready' | 'requesting' | 'counting' | 'running' | 'paused' | 'help' | 'result' | 'reference';
export function PracticeCoach({ spec, track, onComplete }: {
    spec: PracticeSpec;
    track: 'guitar' | 'voice';
    onComplete?: (result: PracticeResult) => void;
}) {
    const [phase, setPhase] = useState<Phase>('ready'), [mode, setMode] = useState<'practice' | 'play'>('practice');
    const [speed, setSpeed] = useState(100), [index, setIndex] = useState(0), [loop, setLoop] = useState(false), [leftHanded, setLeftHanded] = useState(false);
    const [pulse, setPulse] = useState(0), [count, setCount] = useState(4), [heard, setHeard] = useState('Play one note at a time.');
    const [message, setMessage] = useState(''), [result, setResult] = useState<PracticeResult | null>(null);
    const capture = useRef<Capture | null>(null), abort = useRef<AbortController | null>(null), animation = useRef<number>(0);
    const activeClock = useRef(new ActivePracticeClock());
    const current = useRef(0), observations = useRef<Observation[]>([]), generation = useRef(0), active = useRef(false);
    const fresh = useRef<{
        midi: number;
        start: number;
        last: number;
    } | null>(null), releaseNeeded = useRef(false), lastProgress = useRef(0);
    const playbackAbort = useRef<AbortController | null>(null);
    const acceptedPitch = useRef<number | null>(null), acceptedAudioTime = useRef(-Infinity);
    const live = useRef({ mode, loop, speed, onComplete });
    useEffect(() => { live.current = { mode, loop, speed, onComplete }; }, [mode, loop, speed, onComplete]);
    function stopCapture() { activeClock.current.pause(performance.now() / 1000); active.current = false; generation.current++; abort.current?.abort(); capture.current?.stop(); capture.current = null; cancelAnimationFrame(animation.current); fresh.current = null; }
    function pause(reason = 'Paused. Resume when you are ready.') { stopCapture(); setMessage(reason); setPhase('paused'); }
    useEffect(() => {
        const background = () => { if (document.hidden && (active.current || (abort.current && !abort.current.signal.aborted) || (playbackAbort.current && !playbackAbort.current.signal.aborted))) {
            stopCapture();
            playbackAbort.current?.abort();
            setMessage('Paused while the app was in the background.');
            setPhase('paused');
        } };
        document.addEventListener('visibilitychange', background);
        return () => { document.removeEventListener('visibilitychange', background); stopCapture(); playbackAbort.current?.abort(); };
    }, []);
    const target = spec.targets[Math.min(index, spec.targets.length - 1)];
    const busy = phase === 'requesting' || phase === 'running' || phase === 'counting' || phase === 'reference';
    function finish() {
        stopCapture();
        if (live.current.mode === 'practice') {
            setMessage('Practice finished. Repeat a section or try the full check when ready.');
            setPhase('ready');
            return;
        }
        const scored = scorePractice({ ...spec, bpm: spec.bpm * live.current.speed / 100 }, observations.current, activeClock.current.elapsed(performance.now() / 1000));
        setResult(scored);
        setPhase('result');
        // Saving/awarding completion remains an explicit action in the result view.
    }
    async function start(resume = false) {
        stopCapture();
        playbackAbort.current?.abort();
        setMessage('');
        setResult(null);
        if (document.hidden) {
            setPhase('paused');
            setMessage('Return to this tab before starting microphone practice.');
            return;
        }
        if (!validSpec(spec)) {
            setMessage('This exercise needs corrected targets. Continue with the lesson instructions.');
            return;
        }
        if (!resume || spec.mode === 'rhythm' || mode === 'play') {
            current.current = 0;
            setIndex(0);
            observations.current = [];
            activeClock.current.reset();
        }
        fresh.current = null;
        releaseNeeded.current = false;
        const id = ++generation.current;
        abort.current = new AbortController();
        setPhase('requesting');
        let detector: OnsetDetector | null = null, firstSample: number | null = null, runStart = Infinity, epoch = Infinity;
        const bpm = spec.bpm * speed / 100, countIn = (spec.mode === 'rhythm' || mode === 'play') ? Math.max(4, spec.countInBeats) : spec.countInBeats;
        try {
            const audio = await startCapture((samples, time, sampleRate) => {
                if (id !== generation.current || !active.current)
                    return;
                if (firstSample === null) {
                    firstSample = time;
                    detector = new OnsetDetector(sampleRate);
                }
                const events = detector!.process(samples);
                const context = capture.current?.context;
                if (!context || context.currentTime - (time + samples.length / sampleRate) > .4) {
                    fresh.current = null;
                    return;
                }
                if (spec.mode === 'rhythm') {
                    for (const event of events) {
                        const relative = firstSample + event.time - runStart;
                        if (relative >= 0)
                            observations.current.push({ time: relative, confidence: event.confidence });
                    }
                    return;
                }
                if (time < runStart)
                    return;
                if (live.current.mode === 'play') {
                    const beat = (time + samples.length / sampleRate - runStart) * bpm / 60;
                    const slot = spec.targets.findIndex((t, i) => beat >= t.beat && beat < (spec.targets[i + 1]?.beat ?? t.beat + 1));
                    if (slot < 0)
                        return;
                    if (current.current !== slot) {
                        fresh.current = null;
                        current.current = slot;
                        setIndex(slot);
                    }
                    if (observations.current.some(o => o.targetID === spec.targets[slot].id))
                        return;
                }
                const estimate = estimatePitch(samples, sampleRate), expected = spec.targets[current.current];
                if (!expected)
                    return;
                if (!estimate || estimate.clarity < .85) {
                    fresh.current = null;
                    if (Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length) < .012)
                        releaseNeeded.current = false;
                    setHeard('No clear note yet. Pluck one string and let it ring.');
                    return;
                }
                const error = (estimate.midi - expected.midi!) * 100 + estimate.cents;
                setHeard(`${estimate.name} · ${Math.round(Math.abs(error))} cents ${error < 0 ? 'below' : 'above'} target`);
                if (live.current.mode === 'practice' && Math.abs(error) > spec.toleranceCents) {
                    fresh.current = null;
                    releaseNeeded.current = false;
                    return;
                }
                if (releaseNeeded.current && (estimate.midi !== acceptedPitch.current || events.some(e => e.confidence >= .6 && firstSample! + e.time > acceptedAudioTime.current + .075)))
                    releaseNeeded.current = false;
                if (releaseNeeded.current)
                    return;
                if (!fresh.current || fresh.current.midi !== estimate.midi || time - fresh.current.last > .25)
                    fresh.current = { midi: estimate.midi, start: time, last: time };
                else
                    fresh.current.last = time;
                if (time - fresh.current.start < .18)
                    return;
                observations.current.push({ time: Math.max(0, time + samples.length / sampleRate - runStart), midi: estimate.midi, cents: estimate.cents, confidence: estimate.clarity, targetID: live.current.mode === 'play' ? expected.id : undefined });
                acceptedPitch.current = estimate.midi;
                acceptedAudioTime.current = time + samples.length / sampleRate;
                if (live.current.mode === 'play') {
                    fresh.current = null;
                    releaseNeeded.current = true;
                    return;
                }
                fresh.current = null;
                lastProgress.current = context.currentTime;
                const previous = expected.midi;
                current.current++;
                if (live.current.mode === 'practice' && live.current.loop) {
                    current.current = Math.max(0, current.current - 1);
                    releaseNeeded.current = true;
                }
                else
                    releaseNeeded.current = spec.targets[current.current]?.midi === previous;
                if (current.current >= spec.targets.length) {
                    finish();
                    return;
                }
                setIndex(current.current);
            }, () => pause('Audio input was interrupted. Check your microphone and resume.'), abort.current.signal);
            if (id !== generation.current || document.hidden) {
                audio.stop();
                if (id === generation.current) {
                    stopCapture();
                    setPhase('paused');
                }
                return;
            }
            capture.current = audio;
            active.current = true;
            // A quiet calibration interval precedes the visible bar count-in.
            epoch = audio.context.currentTime + (spec.mode === 'rhythm' ? .8 : .2);
            runStart = epoch + countIn * 60 / bpm;
            activeClock.current.start(performance.now() / 1000 + runStart - audio.context.currentTime);
            lastProgress.current = runStart;
            setPhase(countIn > 0 ? 'counting' : 'running');
            const tick = () => {
                if (id !== generation.current || !active.current)
                    return;
                if (live.current.mode === 'practice' && activeClock.current.runElapsed(performance.now() / 1000) >= 120) {
                    pause('Two minutes of focused practice. Rest your hands, then resume or try the full check.');
                    return;
                }
                const now = audio.context.currentTime, transport = transportAt(now, epoch, bpm, countIn);
                if (now < epoch) {
                    setCount(countIn);
                    setMessage('Stay quiet for the room check.');
                }
                else if (transport.countingIn) {
                    setPhase('counting');
                    setCount(transport.remaining);
                    setMessage('Get ready');
                }
                else {
                    setPhase('running');
                    setPulse(transport.pulse);
                    setMessage('');
                    if (spec.mode === 'rhythm') {
                        const next = spec.targets.findIndex(t => t.beat > transport.beat);
                        setIndex(next < 0 ? spec.targets.length - 1 : Math.max(0, next - 1));
                        if (transport.beat > spec.targets[spec.targets.length - 1].beat + 1) {
                            if (live.current.mode === 'practice' && live.current.loop) {
                                observations.current = [];
                                epoch = now;
                                runStart = now + countIn * 60 / bpm;
                                setPhase('counting');
                            }
                            else {
                                finish();
                                return;
                            }
                        }
                    }
                    else if (live.current.mode === 'play') {
                        const next = spec.targets.findIndex(t => t.beat > transport.beat);
                        setIndex(next < 0 ? spec.targets.length - 1 : Math.max(0, next - 1));
                        if (transport.beat > spec.targets[spec.targets.length - 1].beat + 1) {
                            finish();
                            return;
                        }
                    }
                    else if (now - lastProgress.current > 18) {
                        stopCapture();
                        setPhase('help');
                        setMessage('Let’s reset: check the highlighted string, mute the others, and pluck gently. Try the reference tone, then resume.');
                        return;
                    }
                }
                animation.current = requestAnimationFrame(tick);
            };
            tick();
        }
        catch (error) {
            if (id !== generation.current)
                return;
            stopCapture();
            setPhase('paused');
            setMessage(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone access is off. Allow it in browser settings, or practice without scoring.' : error instanceof Error ? error.message : 'The microphone could not start. Try again or practice without scoring.');
        }
    }
    async function reference() {
        if (target?.midi == null)
            return;
        stopCapture();
        setPhase('reference');
        setMessage('Listen to the target. The microphone is off.');
        playbackAbort.current?.abort();
        const controller = new AbortController();
        playbackAbort.current = controller;
        try {
            await playReference(frequencyForMIDI(target.midi), controller.signal);
        }
        catch {
            if (!controller.signal.aborted) {
                setPhase('paused');
                setMessage('Reference playback is unavailable. Check your device volume.');
            }
            return;
        }
        if (!controller.signal.aborted) {
            setPhase('paused');
            setMessage(mode === 'play' ? 'Reference finished. Start a fresh full check when ready.' : 'Let the reference fade, then resume and play the note yourself.');
        }
    }
    return <section className={styles.coach} aria-label="Interactive practice">
    <div className={styles.heading}><p className={styles.eyebrow}>Your practice room</p><h2>{spec.mode === 'pitchSequence' ? 'Find each note' : 'Keep a steady pulse'}</h2></div>
    <p>{spec.mode === 'pitchSequence' ? 'Single-note pitch feedback. Practice waits for each note; Play checks the sequence at your chosen tempo. This does not assess chord quality or fret buzz.' : 'Audio-attack timing feedback. This check does not identify chords or distinguish every background sound from a strum. Use a quiet room and visual beats.'}</p>
    <div className={styles.controls} role="group" aria-label="Practice mode">
      <button disabled={busy} aria-pressed={mode === 'practice'} onClick={() => { setMode('practice'); setResult(null); setPhase('ready'); }}>Practice · no score</button>
      <button disabled={busy} aria-pressed={mode === 'play'} onClick={() => { setMode('play'); setLoop(false); setResult(null); setPhase('ready'); }}>Play · full check</button>
    </div>
    <label className={styles.tempo}>Tempo · {Math.round(spec.bpm * speed / 100)} BPM ({speed}%)<input aria-label="Practice speed" type="range" min="25" max="125" step="5" value={speed} disabled={busy} onChange={e => setSpeed(Number(e.target.value))}/></label>
    {mode === 'practice' && <label className={styles.check}><input type="checkbox" checked={loop} disabled={busy} onChange={e => setLoop(e.target.checked)}/>Repeat {spec.mode === 'pitchSequence' ? 'this note (mute before repeating)' : 'the exercise with a count-in'}</label>}
    {spec.mode === 'pitchSequence' && target && <>
      <div className={styles.target}><span>Target {Math.min(index + 1, spec.targets.length)} of {spec.targets.length}</span><strong>{target.midi != null ? noteName(target.midi) : '—'}</strong><span>{track === 'guitar' && target.guitarString ? `String ${target.guitarString} · ${target.fret === 0 ? 'open' : `fret ${target.fret}`}` : 'Match the note at a comfortable volume'}</span></div>
      {track === 'guitar' && target.guitarString && <><label className={styles.check}><input type="checkbox" checked={leftHanded} onChange={e => setLeftHanded(e.target.checked)}/>Left-handed diagram</label><div className={styles.strings} style={{ direction: leftHanded ? 'rtl' : 'ltr' }} role="img" aria-label={`Play string ${target.guitarString}, ${target.fret === 0 ? 'open' : `fret ${target.fret}`}. String six is the thickest, low E.`}>{[6, 5, 4, 3, 2, 1].map((string, i) => <div key={string} className={string === target.guitarString ? styles.selected : ''}><span>{string}</span><i style={{ height: string }}/><span>{['E2', 'A2', 'D3', 'G3', 'B3', 'E4'][i]} {string === target.guitarString ? '●' : ''}</span></div>)}</div></>}
      <p className={styles.heard}>{heard}</p>
    </>}
    {spec.mode === 'rhythm' && <div className={styles.beats} aria-label={`Beat ${pulse + 1} of 4`}>{[0, 1, 2, 3].map(n => <span key={n} className={phase === 'running' && pulse === n ? styles.beatOn : ''}>{n + 1}</span>)}</div>}
    <p role="status" className={styles.status}>{phase === 'counting' ? `Count in: ${count}. ${message}` : message || (phase === 'running' ? 'Listening — keep playing.' : phase === 'requesting' ? 'Waiting for microphone permission…' : 'Tune first. Audio stays on this device.')}</p>
    {phase === 'result' && result && <div className={styles.result}>
      <h3>{result.score === null ? 'No reliable result' : `${result.noteScore !== null ? 'Pitch' : 'Timing'}: ${result.score}%`}</h3>
      <p>{result.score === null ? 'The signal was too limited to grade. Check your setup and try again.' : `${result.matchedTargets} of ${result.targetCount} targets matched. ${result.passed ? 'You can continue or repeat for consistency.' : 'Slow down and repeat a smaller section in Practice.'}`}</p>
      {result.passed && <button onClick={() => onComplete?.(result)}>Save checked result and continue</button>}
    </div>}
    <div className={styles.controls}>
      {!busy && <button onClick={() => void start(phase === 'paused' || phase === 'help')}>{phase === 'paused' || phase === 'help' ? (mode === 'play' ? 'Restart full check' : 'Resume') : phase === 'result' ? 'Try again' : 'Start'}</button>}
      {(phase === 'running' || phase === 'counting' || phase === 'requesting') && <button onClick={() => pause()}>Pause</button>}
      {target?.midi != null && <button disabled={phase === 'reference'} onClick={() => void reference()}>Hear target</button>}
      {(phase === 'paused' || phase === 'help' || phase === 'result') && <button onClick={() => { setSpeed(s => Math.max(25, s - 5)); setMode('practice'); setPhase('ready'); setResult(null); }}>Practice slower</button>}
      <button onClick={() => { stopCapture(); playbackAbort.current?.abort(); current.current = 0; setIndex(0); observations.current = []; setResult(null); setPhase('ready'); setMessage('Microphone off. Follow the lesson steps and record your own reflection below.'); }}>Stop · practice without scoring</button>
    </div>
  </section>;
}
