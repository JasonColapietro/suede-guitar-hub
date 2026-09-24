"use client";

import { useEffect, useRef, useState } from "react";
import { claimAudioSession } from "@/lib/audio/capture";
import { getLesson } from "@/lib/learning/curriculum";
import { deleteVocalTake, listVocalTakes, vocalTakeOwnerScope, type StoredVocalTake } from "@/lib/learning/vocal-recording";
import { voiceLessonUrlOnSing } from "@/lib/voice-redirects";
import { useLearningAccess } from "./LearningAccessProvider";
import styles from "./VocalMaterial.module.css";

/**
 * The takes voice lessons saved in this browser, listed where they can still be
 * reached. The lessons themselves now redirect to Suede Sing, which cannot read
 * this site's IndexedDB, so without this page a saved take could be neither
 * played nor deleted, which the privacy policy promises.
 */
export function SavedVoiceTakes() {
  const { accountId } = useLearningAccess();
  const ownerScope = vocalTakeOwnerScope(accountId ?? null);
  const [takes, setTakes] = useState<StoredVocalTake[] | null>(null);
  const [status, setStatus] = useState("Loading the takes kept in this browser…");
  const [playing, setPlaying] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null), objectUrl = useRef<string | null>(null), release = useRef<(() => void) | null>(null);

  function stopPlayback() {
    player.current?.pause();
    player.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    release.current?.();
    release.current = null;
    setPlaying(null);
  }

  useEffect(() => {
    let live = true;
    listVocalTakes(ownerScope)
      .then(found => {
        if (!live) return;
        setTakes(found.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
        setStatus(found.length ? "" : "No voice takes are saved in this browser for this account.");
      })
      .catch((error: unknown) => { if (live) { setTakes([]); setStatus(error instanceof Error ? error.message : "Saved takes could not be read."); } });
    return () => { live = false; stopPlayback(); };
  }, [ownerScope]);

  function play(take: StoredVocalTake) {
    stopPlayback();
    const url = URL.createObjectURL(take.blob);
    const audio = new Audio(url);
    objectUrl.current = url;
    player.current = audio;
    release.current = claimAudioSession(() => stopPlayback());
    audio.onended = () => stopPlayback();
    audio.onerror = () => { stopPlayback(); setStatus("This saved take could not be played. You can delete it."); };
    setPlaying(take.lessonId);
    void audio.play().catch(() => { stopPlayback(); setStatus("Playback could not start. Check your browser audio and try again."); });
  }

  async function remove(take: StoredVocalTake) {
    stopPlayback();
    setDeleting(take.lessonId);
    try {
      await deleteVocalTake(ownerScope, take.lessonId);
      setTakes(current => (current ?? []).filter(t => t.lessonId !== take.lessonId));
      setConfirming(null);
      setStatus("Saved take removed from this browser.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The take could not be deleted.");
    } finally {
      setDeleting(null);
    }
  }

  return <section className={styles.recorder} aria-label="Saved voice takes">
    <ul>
      {(takes ?? []).map(take => {
        const lesson = getLesson("voice", take.lessonId)?.lesson;
        const onSing = voiceLessonUrlOnSing(take.lessonId);
        return <li key={take.lessonId} className={styles.savedTake}>
          <strong>{lesson?.title ?? take.lessonId} · {Math.max(1, Math.round(take.durationSeconds))} seconds</strong>
          <span>{new Date(take.recordedAt).toLocaleString()}</span>
          {onSing && <a href={onSing}>Open this lesson on Suede Sing</a>}
          <div className={styles.actions}>
            <button type="button" disabled={deleting !== null} onClick={() => (playing === take.lessonId ? stopPlayback() : play(take))}>{playing === take.lessonId ? "Stop playback" : "Play take"}</button>
            {confirming === take.lessonId
              ? <><span role="alert">Delete this take permanently?</span><button type="button" disabled={deleting !== null} onClick={() => void remove(take)}>{deleting === take.lessonId ? "Deleting…" : "Confirm delete"}</button><button type="button" disabled={deleting !== null} onClick={() => setConfirming(null)}>Keep take</button></>
              : <button type="button" disabled={deleting !== null} onClick={() => setConfirming(take.lessonId)}>Delete take</button>}
          </div>
        </li>;
      })}
    </ul>
    <p className={styles.status} role="status">{status}</p>
  </section>;
}
