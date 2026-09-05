"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { allLessons, availableLessons, type TrackId } from "@/lib/learning/curriculum";
import { parseProgress, progressKey, parseReadingQuizProgress, readingQuizKey, withReadingQuizEvidence, withLessonRecord, type LessonRecord } from "@/lib/learning/progress";
import { answerReadingQuestion, readingQuizResult, type InstructionQuiz, type ReadingQuizAttempt } from "@/lib/learning/instructions";
import { parseStageTwoHistory, stageTwoKey, type ManualChangeAttempt, type StudyAttempt } from "@/lib/learning/stage-two";
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
function write(key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  let persisted = true;
  try { window.localStorage.setItem(key, serialized); }
  catch { persisted = false; }
  memory.set(key, serialized);
  window.dispatchEvent(new Event(eventName));
  return persisted;
}
export function useLearningProgress(track: TrackId) {
  const key = progressKey(track);
  const ids = useMemo(() => allLessons(track).map(({ lesson }) => lesson.id), [track]);
  const availableIds = useMemo(() => availableLessons(track).map(({ lesson }) => lesson.id), [track]);
  const getSnapshot = useCallback(() => read(key), [key]);
  const getReadingSnapshot = useCallback(() => read(readingQuizKey(track)), [track]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const readingRaw = useSyncExternalStore(subscribe, getReadingSnapshot, serverSnapshot);
  const progress = useMemo(() => withReadingQuizEvidence(parseProgress(raw, track, ids), parseReadingQuizProgress(readingRaw, track)), [raw, readingRaw, track, ids]);
  const save = useCallback((lessonId: string, record: LessonRecord, attemptId?: string) => {
    if (!availableIds.includes(lessonId)) return false;
    const latest = withLessonRecord(parseProgress(read(key), track, ids), lessonId, record, attemptId ?? crypto.randomUUID());
    // Reuse the decoder at the write boundary so malformed component input cannot persist.
    const normalized = parseProgress(JSON.stringify(latest), track, ids);
    if (!normalized.lessons[lessonId]) return false;
    return write(key, normalized);
  }, [key, ids, availableIds, track]);
  return { progress, save };
}

export function useReadingQuizProgress(track: TrackId, lessonId: string, quiz?: InstructionQuiz) {
  const key = readingQuizKey(track);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const state = useMemo(() => parseReadingQuizProgress(raw, track), [raw, track]);
  const [storageWarning, setStorageWarning] = useState(false);
  const attempts = state.attempts.filter(attempt => attempt.lessonId === lessonId);
  const currentAttempt = attempts.find(attempt => attempt.id === state.currentAttemptIds[lessonId]);
  function start() {
    if (!quiz) return undefined;
    const latest = parseReadingQuizProgress(read(key), track);
    const existing = latest.attempts.find(attempt => attempt.id === latest.currentAttemptIds[lessonId]);
    if (existing && !readingQuizResult(quiz, existing)) return existing;
    const attempt: ReadingQuizAttempt = { id: crypto.randomUUID(), lessonId, createdAt: new Date().toISOString(), answers: {} };
    latest.attempts.push(attempt); latest.currentAttemptIds[lessonId] = attempt.id;
    setStorageWarning(!write(key, latest));
    return attempt;
  }
  function answer(questionId: string, optionIndex: number) {
    if (!quiz) return undefined;
    const latest = parseReadingQuizProgress(read(key), track);
    const index = latest.attempts.findIndex(attempt => attempt.id === latest.currentAttemptIds[lessonId]);
    if (index < 0) return undefined;
    const attempt = answerReadingQuestion(quiz, latest.attempts[index], questionId, optionIndex, new Date().toISOString());
    if (attempt === latest.attempts[index]) return undefined;
    latest.attempts[index] = attempt;
    setStorageWarning(!write(key, latest));
    return attempt;
  }
  return { attempts, currentAttempt, start, answer, storageWarning };
}

export function useStageTwoProgress(track: TrackId) {
  const key = stageTwoKey(track);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const history = useMemo(() => parseStageTwoHistory(raw, track), [raw, track]);
  const recordChange = useCallback((attempt: ManualChangeAttempt) => {
    const latest = parseStageTwoHistory(read(key), track);
    const index = latest.changes.findIndex(item => item.id === attempt.id);
    if (index >= 0 && latest.changes[index].count !== null) return true;
    if (index >= 0) latest.changes[index] = attempt; else latest.changes.push(attempt);
    return write(key, parseStageTwoHistory(JSON.stringify(latest), track));
  }, [key, track]);
  const recordStudy = useCallback((attempt: StudyAttempt) => {
    const latest = parseStageTwoHistory(read(key), track);
    if (latest.studies.some(item => item.id === attempt.id)) return true;
    latest.studies.push(attempt);
    return write(key, parseStageTwoHistory(JSON.stringify(latest), track));
  }, [key, track]);
  return { history, recordChange, recordStudy };
}
