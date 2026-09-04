"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { availableLessons, type TrackId } from "@/lib/learning/curriculum";
import { parseProgress, progressKey, type LessonRecord } from "@/lib/learning/progress";
const memory = new Map<string, string>();
const eventName = "guitarhub-learning-progress";
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key) memory.delete(event.key); else memory.clear(); callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName, callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(eventName, callback); };
}
function read(key: string) {
  try { return memory.get(key) ?? window.localStorage.getItem(key) ?? ""; }
  catch { return memory.get(key) ?? ""; }
}
const serverSnapshot = () => "";
export function useLearningProgress(track: TrackId) {
  const key = progressKey(track);
  const ids = useMemo(() => availableLessons(track).map(({ lesson }) => lesson.id), [track]);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const progress = useMemo(() => parseProgress(raw, track, ids), [raw, track, ids]);
  const save = useCallback((lessonId: string, record: LessonRecord) => {
    if (!ids.includes(lessonId)) return false;
    const latest = parseProgress(read(key), track, ids);
    latest.lessons[lessonId] = record;
    // Reuse the decoder at the write boundary so malformed component input cannot persist.
    const normalized = parseProgress(JSON.stringify(latest), track, ids);
    if (!normalized.lessons[lessonId]) return false;
    const serialized = JSON.stringify(normalized);
    let persisted = true;
    try { window.localStorage.setItem(key, serialized); }
    catch { persisted = false; }
    memory.set(key, serialized);
    window.dispatchEvent(new Event(eventName));
    return persisted;
  }, [key, ids, track]);
  return { progress, save };
}
