"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { allLessons, type TrackId } from "@/lib/learning/curriculum";
import { accessibleLessonIds, accountHistoryKey } from "@/lib/learning/access";
import { useAccountSync, useLearningAccess } from "./LearningAccessProvider";
import { parseProgress, progressKey, parseReadingQuizProgress, readingQuizKey, withLessonRecord, type LessonRecord } from "@/lib/learning/progress";
import { answerReadingQuestion, readingQuizResult, type InstructionQuiz, type ReadingQuizAttempt } from "@/lib/learning/instructions";
import { parseStageTwoHistory, stageTwoKey, type ManualChangeAttempt, type StudyAttempt } from "@/lib/learning/stage-two";
import { attemptFromLessonRecord } from "@/lib/learning-auth/sync";
import { parseLearningAttempt } from "@/lib/learning-account/contracts";
import { mergeAccountProgress, mergeAccountReading, mergeAccountStageTwo, syncLessonMap } from "@/lib/learning-sync/evidence";
import type { PracticeResult } from "@/lib/audio/practice";
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
  const access = useLearningAccess();
  const sync = useAccountSync();
  const key = accountHistoryKey(progressKey(track), access.accountId);
  const readingKey = accountHistoryKey(readingQuizKey(track), access.accountId);
  const ids = useMemo(() => allLessons(track).map(({ lesson }) => lesson.id), [track]);
  const availableIds = useMemo(() => accessibleLessonIds(track, access), [track, access]);
  const getSnapshot = useCallback(() => read(key), [key]);
  const getReadingSnapshot = useCallback(() => read(readingKey), [readingKey]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const readingRaw = useSyncExternalStore(subscribe, getReadingSnapshot, serverSnapshot);
  const progress = useMemo(() => mergeAccountProgress(parseProgress(raw, track, ids), parseReadingQuizProgress(readingRaw, track), sync.attempts), [raw, readingRaw, track, ids, sync.attempts]);
  const save = useCallback((lessonId: string, record: LessonRecord, attemptId?: string, result?: PracticeResult) => {
    if (!availableIds.includes(lessonId) || (sync.client && !sync.client.permitsLocalWrite())) return false;
    const id = attemptId ?? crypto.randomUUID();
    const latest = withLessonRecord(parseProgress(read(key), track, ids), lessonId, record, id);
    // Reuse the decoder at the write boundary so malformed component input cannot persist.
    const normalized = parseProgress(JSON.stringify(latest), track, ids);
    if (!normalized.lessons[lessonId]) return false;
    const persisted = write(key, normalized);
    if (sync.client?.getSnapshot().enabled && (record.source !== "readingQuiz" || (record.readingQuizAttempt && sync.client.acceptsReadingAttempt(record.readingQuizAttempt)))) {
      try {
        const attempt = attemptFromLessonRecord(id, track, lessonId, normalized.lessons[lessonId], syncLessonMap);
        if (result) attempt.details.practiceScore = { noteScore: result.noteScore, rhythmScore: result.rhythmScore, matchedTargets: result.matchedTargets, targetCount: result.targetCount, passed: result.passed };
        if (sync.client?.enqueue(attempt)) void sync.client.sync();
      } catch (error) { sync.client?.recordFailure(error); }
    }
    return persisted;
  }, [key, ids, availableIds, track, sync.client]);
  const saveUnscored = useCallback((lessonId: string, result: PracticeResult, id: string) => {
    if (!availableIds.includes(lessonId) || result.disposition !== "insufficientSignal" || !sync.client?.getSnapshot().enabled) return;
    try {
    const event = parseLearningAttempt({ version: 1, id, track, lessonId, kind: "microphone", createdAt: new Date().toISOString(), practiceSeconds: result.practiceSeconds, exerciseRevision: result.practiceSpecRevision ?? null, source: "measured", disposition: "insufficientSignal", assessment: "repeat", score: null, bpm: result.bpm, details: { practiceScore: { noteScore: result.noteScore, rhythmScore: result.rhythmScore, matchedTargets: result.matchedTargets, targetCount: result.targetCount, passed: result.passed } } }, syncLessonMap);
    if (sync.client.enqueue(event)) void sync.client.sync();
    } catch (error) { sync.client.recordFailure(error); }
  }, [availableIds, track, sync.client]);
  return { progress, save, saveUnscored };
}

export function useReadingQuizProgress(track: TrackId, lessonId: string, quiz?: InstructionQuiz) {
  const access = useLearningAccess();
  const sync = useAccountSync();
  const key = accountHistoryKey(readingQuizKey(track), access.accountId);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const state = useMemo(() => mergeAccountReading(parseReadingQuizProgress(raw, track), sync.attempts), [raw, track, sync.attempts]);
  const [storageWarning, setStorageWarning] = useState(false);
  const attempts = state.attempts.filter(attempt => attempt.lessonId === lessonId);
  const currentAttempt = attempts.find(attempt => attempt.id === state.currentAttemptIds[lessonId]);
  function start() {
    if (!quiz || !accessibleLessonIds(track, access).includes(lessonId) || (sync.client && !sync.client.permitsLocalWrite())) return undefined;
    const latest = mergeAccountReading(parseReadingQuizProgress(read(key), track), sync.attempts);
    const existing = latest.attempts.find(attempt => attempt.id === latest.currentAttemptIds[lessonId]);
    if (existing && !readingQuizResult(quiz, existing)) return existing;
    const attempt: ReadingQuizAttempt = { id: crypto.randomUUID(), lessonId, createdAt: new Date().toISOString(), answers: {} };
    latest.attempts.push(attempt); latest.currentAttemptIds[lessonId] = attempt.id;
    setStorageWarning(!write(key, latest));
    return attempt;
  }
  function answer(questionId: string, optionIndex: number) {
    if (!quiz || !accessibleLessonIds(track, access).includes(lessonId) || (sync.client && !sync.client.permitsLocalWrite())) return undefined;
    const latest = mergeAccountReading(parseReadingQuizProgress(read(key), track), sync.attempts);
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
  const access = useLearningAccess();
  const sync = useAccountSync();
  const key = accountHistoryKey(stageTwoKey(track), access.accountId);
  const getSnapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const history = useMemo(() => mergeAccountStageTwo(parseStageTwoHistory(raw, track), sync.attempts), [raw, track, sync.attempts]);
  const recordChange = useCallback((attempt: ManualChangeAttempt) => {
    if (sync.client && !sync.client.permitsLocalWrite()) return false;
    const latest = parseStageTwoHistory(read(key), track);
    const index = latest.changes.findIndex(item => item.id === attempt.id);
    if (index >= 0 && latest.changes[index].count !== null) return true;
    if (index >= 0) latest.changes[index] = attempt; else latest.changes.push(attempt);
    const persisted = write(key, parseStageTwoHistory(JSON.stringify(latest), track));
    if (sync.client?.acceptsNewEvent(attempt.createdAt)) {
      const event = parseLearningAttempt({ version: 1, id: crypto.randomUUID(), track, lessonId: attempt.lessonId, kind: "manualCount", createdAt: new Date().toISOString(), practiceSeconds: attempt.durationSeconds, exerciseRevision: null, source: "selfReported", disposition: "reflection", assessment: "repeat", score: null, bpm: null, details: { chordChangeAttempt: attempt } }, syncLessonMap);
      if (sync.client.enqueue(event)) void sync.client.sync();
    }
    return persisted;
  }, [key, track, sync.client]);
  const recordStudy = useCallback((attempt: StudyAttempt) => {
    if (sync.client && !sync.client.permitsLocalWrite()) return false;
    const latest = parseStageTwoHistory(read(key), track);
    if (latest.studies.some(item => item.id === attempt.id)) return true;
    latest.studies.push(attempt);
    const persisted = write(key, parseStageTwoHistory(JSON.stringify(latest), track));
    if (sync.client?.acceptsNewEvent(attempt.createdAt)) {
      const event = parseLearningAttempt({ version: 1, id: attempt.id, track, lessonId: attempt.lessonId, kind: "study", createdAt: attempt.createdAt, practiceSeconds: attempt.practiceSeconds, exerciseRevision: null, source: "selfReported", disposition: "reflection", assessment: "repeat", score: null, bpm: attempt.bpm, details: { studyPracticeAttempt: attempt } }, syncLessonMap);
      if (sync.client.enqueue(event)) void sync.client.sync();
    }
    return persisted;
  }, [key, track, sync.client]);
  return { history, recordChange, recordStudy };
}
