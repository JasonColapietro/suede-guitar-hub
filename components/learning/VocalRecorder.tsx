"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { claimAudioSession } from "@/lib/audio/capture";
import { bindVocalRecordingLifecycle, deleteVocalTake, loadVocalTake, recordingElapsedSeconds, saveVocalTake, VOCAL_TAKE_LIMIT_SECONDS, vocalTakeOwnerScope, type StoredVocalTake } from "@/lib/learning/vocal-recording";
import styles from "./VocalMaterial.module.css";

function recordingError(error: unknown) {
  if (error instanceof Error && error.name === "NotAllowedError") return "Microphone access was declined. Allow it in this site's browser settings to record a take.";
  if (error instanceof Error && error.name === "NotFoundError") return "No microphone was found. Connect an input and try again.";
  if (error instanceof Error && error.name === "NotReadableError") return "The microphone is busy or unavailable. Close other audio apps and try again.";
  return error instanceof Error ? error.message : "The recording could not start.";
}

export function VocalRecorder({ lessonId, accountId }: { lessonId: string; accountId: string | null }) {
  const ownerScope = vocalTakeOwnerScope(accountId);
  const [take, setTake] = useState<StoredVocalTake>();
  const [status, setStatus] = useState("Loading the latest take kept in this browser…");
  const [loading, setLoading] = useState(true), [starting, setStarting] = useState(false), [recording, setRecording] = useState(false), [playing, setPlaying] = useState(false), [deleting, setDeleting] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [elapsed, setElapsed] = useState(0);
  const mounted = useRef(false), pending = useRef(false), operation = useRef(0);
  const stream = useRef<MediaStream | null>(null), recorder = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]);
  const started = useRef(0), timer = useRef<number | null>(null), finishTimer = useRef<number | null>(null), discard = useRef(false), release = useRef<(() => void) | null>(null);
  const player = useRef<HTMLAudioElement | null>(null), objectUrl = useRef<string | null>(null);

  function stopClock() {
    if (timer.current !== null) window.clearInterval(timer.current);
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    timer.current = finishTimer.current = null;
  }
  function releaseAudioSession() { release.current?.(); release.current = null; }
  function stopPlayback() {
    const active = player.current; player.current = null;
    if (active) { active.pause(); active.removeAttribute("src"); active.load(); }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    if (mounted.current) setPlaying(false);
    releaseAudioSession();
  }
  function stopRecording(save = true) {
    const active = recorder.current;
    if (!save) discard.current = true;
    if (active && active.state !== "inactive") { active.stop(); }
    else {
      pending.current = false;
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      recorder.current = null;
      releaseAudioSession();
      if (mounted.current) { setStarting(false); setRecording(false); setElapsed(0); }
    }
    stopClock();
  }
  function interrupt(message = "Audio stopped because this page was hidden.") {
    operation.current += 1;
    const hadRecorder = pending.current || recorder.current !== null;
    stopPlayback();
    if (hadRecorder) {
      stopRecording(false);
      if (mounted.current && message) setStatus(`${message} The new take was discarded; your previous take was kept.`);
    }
  }
  const onLifecycleInterrupt = useEffectEvent(() => interrupt());
  const onLifecycleCleanup = useEffectEvent(() => {
    mounted.current = false;
    operation.current += 1;
    stopPlayback();
    stopRecording(false);
  });

  useEffect(() => {
    mounted.current = true;
    const loadOperation = ++operation.current;
    setLoading(true);
    setConfirmDelete(false);
    void loadVocalTake(ownerScope, lessonId).then(value => {
      if (mounted.current && operation.current === loadOperation) {
        setTake(value);
        setLoading(false);
        setStatus(value ? "One latest take is stored only in this browser." : "No take saved for this lesson in this browser.");
      }
    }).catch(error => { if (mounted.current && operation.current === loadOperation) { setLoading(false); setStatus(recordingError(error)); } });
    const removeLifecycle = bindVocalRecordingLifecycle(onLifecycleInterrupt);
    return () => {
      removeLifecycle();
      onLifecycleCleanup();
    };
  }, [lessonId, ownerScope]);

  async function begin() {
    stopPlayback();
    setStatus("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Local recording needs a secure browser with MediaRecorder support.");
      return;
    }
    const currentOperation = ++operation.current;
    pending.current = true;
    setStarting(true);
    release.current = claimAudioSession(() => {
      operation.current += 1;
      stopRecording(false);
      if (mounted.current) setStatus("Recording stopped because another GuitarHub audio tool started. The new take was discarded; your previous take was kept.");
    });
    try {
      const current = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (!mounted.current || currentOperation !== operation.current || document.hidden) {
        pending.current = false;
        current.getTracks().forEach(track => track.stop());
        releaseAudioSession();
        if (mounted.current && currentOperation === operation.current) { setStarting(false); setStatus("Recording did not start because this page is hidden."); }
        return;
      }
      pending.current = false;
      const supported = typeof MediaRecorder.isTypeSupported === "function";
      const mimeType = supported ? ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type)) : undefined;
      const next = new MediaRecorder(current, mimeType ? { mimeType } : undefined);
      stream.current = current;
      recorder.current = next;
      chunks.current = [];
      discard.current = false;
      next.ondataavailable = event => { if (event.data.size > 0) chunks.current.push(event.data); };
      next.onerror = () => {
        discard.current = true;
        if (mounted.current) setStatus("The microphone stopped unexpectedly. The new take was discarded; your previous take was kept.");
        stopRecording(false);
      };
      next.onstop = () => {
        const durationSeconds = recordingElapsedSeconds(started.current, performance.now());
        current.getTracks().forEach(track => track.stop());
        stream.current = null;
        recorder.current = null;
        pending.current = false;
        stopClock();
        releaseAudioSession();
        if (mounted.current) { setStarting(false); setRecording(false); setElapsed(0); }
        const shouldDiscard = discard.current || chunks.current.length === 0 || currentOperation !== operation.current;
        if (shouldDiscard) { chunks.current = []; return; }
        const blob = new Blob(chunks.current, { type: next.mimeType || "audio/webm" });
        chunks.current = [];
        const saved = { ownerScope, lessonId, blob, recordedAt: new Date().toISOString(), durationSeconds: Math.min(VOCAL_TAKE_LIMIT_SECONDS, durationSeconds) };
        void saveVocalTake(saved).then(() => {
          if (mounted.current && currentOperation === operation.current) {
            setTake(saved);
            setStatus("Saved locally in this browser. This take is not uploaded and does not complete the lesson.");
          }
        }).catch(error => { if (mounted.current && currentOperation === operation.current) setStatus(`${recordingError(error)} Your previous take was kept.`); });
      };
      next.start(500);
      started.current = performance.now();
      setStarting(false);
      setRecording(true);
      setElapsed(0);
      setStatus("Recording locally. Stop at any time; the two-minute limit stops automatically.");
      timer.current = window.setInterval(() => setElapsed(recordingElapsedSeconds(started.current, performance.now())), 250);
      finishTimer.current = window.setTimeout(() => stopRecording(true), VOCAL_TAKE_LIMIT_SECONDS * 1000);
    } catch (error) {
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      recorder.current = null;
      pending.current = false;
      releaseAudioSession();
      if (mounted.current && currentOperation === operation.current) { setStarting(false); setRecording(false); setStatus(recordingError(error)); }
    }
  }

  function play() {
    if (!take) return;
    stopPlayback();
    const url = URL.createObjectURL(take.blob), audio = new Audio(url);
    objectUrl.current = url;
    player.current = audio;
    release.current = claimAudioSession(() => { stopPlayback(); if (mounted.current) setStatus("Playback stopped because another GuitarHub audio tool started."); });
    audio.onended = () => stopPlayback();
    audio.onerror = () => { stopPlayback(); if (mounted.current) setStatus("This saved take could not be played. You can remove it and record a new one."); };
    setPlaying(true);
    setStatus("Playing the take stored in this browser.");
    void audio.play().catch(() => { stopPlayback(); if (mounted.current) setStatus("Playback could not start. Check your browser audio and try again."); });
  }

  async function remove() {
    stopPlayback();
    setDeleting(true);
    try { await deleteVocalTake(ownerScope, lessonId); setTake(undefined); setConfirmDelete(false); setStatus("Saved take removed from this browser."); }
    catch (error) { setStatus(recordingError(error)); }
    finally { setDeleting(false); }
  }

  return <section className={styles.recorder} aria-label="Optional local voice recording">
    <h3>Listen to your own take</h3>
    <p>Record up to two minutes, then listen back. GuitarHub keeps one latest take for this lesson in this browser. It is optional, never uploaded or synced, does not score your singing, and does not complete the lesson.</p>
    {recording ? <><p className={styles.recording} role="timer">Recording · {Math.floor(elapsed)} / {VOCAL_TAKE_LIMIT_SECONDS} seconds</p><div className={styles.actions}><button type="button" onClick={() => stopRecording(true)}>Save take</button><button type="button" onClick={() => stopRecording(false)}>Discard new take</button></div></> : <button type="button" disabled={loading || starting || deleting} onClick={() => void begin()}>{loading ? "Loading saved take…" : starting ? "Waiting for microphone…" : take ? "Replace take" : "Record a take"}</button>}
    {take && !recording && !starting && <div className={styles.savedTake}><strong>Latest take · {Math.max(1, Math.round(take.durationSeconds))} seconds</strong><span>{new Date(take.recordedAt).toLocaleString()}</span><div className={styles.actions}><button type="button" disabled={deleting} onClick={playing ? stopPlayback : play}>{playing ? "Stop playback" : "Play take"}</button>{confirmDelete ? <><span role="alert">Delete this take permanently?</span><button type="button" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Confirm delete"}</button><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep take</button></> : <button type="button" disabled={deleting} onClick={() => setConfirmDelete(true)}>Delete take</button>}</div></div>}
    <p className={styles.status} role="status">{status}</p>
  </section>;
}
