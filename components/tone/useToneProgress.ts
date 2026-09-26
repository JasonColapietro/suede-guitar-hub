"use client";
import { useCallback, useEffect, useState } from "react";
import { TONE_LESSONS } from "@/lib/tone/course";
import { TONE_PROGRESS_KEY, parseToneProgress, withLessonRead, withQuizResult, withoutLesson, type ToneProgress } from "@/lib/tone/progress";

const IDS = TONE_LESSONS.map(lesson => lesson.id);

function read(): ToneProgress {
  try { return parseToneProgress(window.localStorage.getItem(TONE_PROGRESS_KEY), IDS); } catch { return {}; }
}

function write(next: ToneProgress) {
  try { window.localStorage.setItem(TONE_PROGRESS_KEY, JSON.stringify(next)); return true; } catch { return false; }
}

/** Tone course progress in this browser, shared across its tabs. */
export function useToneProgress() {
  const [progress, setProgress] = useState<ToneProgress>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProgress(read());
    setLoaded(true);
    const sync = (event: StorageEvent) => { if (event.key === TONE_PROGRESS_KEY) setProgress(read()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const apply = useCallback((change: (current: ToneProgress) => ToneProgress) => {
    const next = change(read());
    setProgress(next);
    return write(next);
  }, []);
  const recordQuiz = useCallback((id: string, score: number, total: number) => apply(current => withQuizResult(current, id, score, total, new Date().toISOString())), [apply]);
  const markRead = useCallback((id: string) => apply(current => withLessonRead(current, id, new Date().toISOString())), [apply]);
  const reset = useCallback((id: string) => apply(current => withoutLesson(current, id)), [apply]);
  return { progress, loaded, recordQuiz, markRead, reset };
}
