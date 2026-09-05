import source from "./routine-template.json" with { type: "json" };
import type { LearningProgress } from "./progress.ts";
export const routineTemplate = source;
export type RoutineBlockId = string;
export type RoutineBlock = typeof source.blocks[number];
export interface PreparationConfirmation { confirmedAt: string; source: "selfReported" }
export interface RoutineAttempt {
  id: string; createdAt: string; updatedAt: string; elapsedMs: number; targetSeconds: number;
  status: "pending" | "paused" | "review" | "reviewed" | "skipped";
  interrupted: boolean; completeMinute: boolean;
  reflection: "practiced" | "revisit" | null;
  manualCount: number | null;
}
export interface RoutineBlockRecord { blockId: string; plannedSeconds: number; attempts: RoutineAttempt[] }
export interface RoutineSession {
  id: string; templateId: string; templateRevision: number; createdAt: string; updatedAt: string;
  finishedAt: string | null; selectedBlockId: string; blocks: RoutineBlockRecord[];
}
export interface RoutineState {
  version: 1; templateId: string; durations: Record<string, number>;
  preparation: Record<string, PreparationConfirmation>; currentSessionId: string | null; sessions: RoutineSession[];
}
export const routineStorageKey = "guitarhub.routine.v1.guitar-beginner-ad";
export const defaultRoutineSeconds = source.blocks.reduce((sum, block) => sum + block.suggestedSeconds, 0);
export function emptyRoutineState(): RoutineState { return { version: 1, templateId: source.id, durations: Object.fromEntries(source.blocks.map(block => [block.id, block.suggestedSeconds])), preparation: {}, currentSessionId: null, sessions: [] }; }
const timestamp = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(value);
const seconds = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 15 && value <= 3600;
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
/** Runtime clocks are never serialized. A reload can only restore paused elapsed time. */
export function parseRoutineState(raw: string | null): RoutineState {
  const state = emptyRoutineState();
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!object(value) || value.version !== 1 || value.templateId !== source.id) return state;
    for (const block of source.blocks) if (object(value.durations) && seconds(value.durations[block.id])) state.durations[block.id] = value.durations[block.id] as number;
    for (const item of source.preparation) {
      const entry = object(value.preparation) ? value.preparation[item.id] : null;
      if (object(entry) && entry.source === "selfReported" && timestamp(entry.confirmedAt)) state.preparation[item.id] = { source: "selfReported", confirmedAt: entry.confirmedAt };
    }
    if (!Array.isArray(value.sessions)) return state;
    const seenSessions = new Set<string>(), seenAttempts = new Set<string>();
    for (const entry of value.sessions) {
      if (!object(entry) || !identifier(entry.id) || seenSessions.has(entry.id) || entry.templateId !== source.id || entry.templateRevision !== source.revision || !timestamp(entry.createdAt) || !timestamp(entry.updatedAt) || (entry.finishedAt !== null && !timestamp(entry.finishedAt)) || !source.blocks.some(block => block.id === entry.selectedBlockId) || !Array.isArray(entry.blocks)) continue;
      const blocks: RoutineBlockRecord[] = [];
      const sessionAttemptIds = new Set<string>();
      for (const block of source.blocks) {
        const record = entry.blocks.find(item => object(item) && item.blockId === block.id);
        if (!object(record) || !seconds(record.plannedSeconds) || !Array.isArray(record.attempts)) break;
        const attempts: RoutineAttempt[] = [];
        for (const attempt of record.attempts) {
          if (!object(attempt) || !identifier(attempt.id) || seenAttempts.has(attempt.id) || sessionAttemptIds.has(attempt.id) || !seconds(attempt.targetSeconds) || !timestamp(attempt.createdAt) || !timestamp(attempt.updatedAt) || typeof attempt.elapsedMs !== "number" || !Number.isFinite(attempt.elapsedMs) || attempt.elapsedMs < 0 || attempt.elapsedMs > attempt.targetSeconds * 1000 || !["pending", "paused", "review", "reviewed", "skipped"].includes(String(attempt.status)) || typeof attempt.interrupted !== "boolean" || ![null, "practiced", "revisit"].includes(attempt.reflection as string | null) || (attempt.manualCount !== null && (typeof attempt.manualCount !== "number" || !Number.isInteger(attempt.manualCount) || attempt.manualCount < 0 || attempt.manualCount > 10000))) continue;
          const requestedStatus = attempt.status as RoutineAttempt["status"];
          const status = requestedStatus === "reviewed" && attempt.reflection === null ? attempt.elapsedMs === attempt.targetSeconds * 1000 ? "review" : "paused" : requestedStatus;
          const completeMinute = block.kind === "changes" && attempt.completeMinute === true && attempt.targetSeconds === 60 && attempt.elapsedMs === 60000 && !attempt.interrupted && ["review", "reviewed"].includes(status);
          attempts.push({ id: attempt.id, createdAt: attempt.createdAt, updatedAt: attempt.updatedAt, elapsedMs: attempt.elapsedMs, targetSeconds: attempt.targetSeconds, status, interrupted: attempt.interrupted, completeMinute, reflection: status === "reviewed" ? attempt.reflection as RoutineAttempt["reflection"] : null, manualCount: block.kind === "changes" && status === "reviewed" ? attempt.manualCount as number | null : null });
          sessionAttemptIds.add(attempt.id);
        }
        blocks.push({ blockId: block.id, plannedSeconds: record.plannedSeconds, attempts });
      }
      if (blocks.length !== source.blocks.length) continue;
      for (const id of sessionAttemptIds) seenAttempts.add(id);
      state.sessions.push({ id: entry.id, templateId: source.id, templateRevision: source.revision, createdAt: entry.createdAt, updatedAt: entry.updatedAt, finishedAt: entry.finishedAt, selectedBlockId: entry.selectedBlockId as string, blocks }); seenSessions.add(entry.id);
    }
    const current = state.sessions.find(session => session.id === value.currentSessionId && session.finishedAt === null);
    state.currentSessionId = current?.id ?? null;
  } catch { /* Corrupt storage cannot create practice evidence. */ }
  return state;
}
export function preparationEvidence(id: string, state: RoutineState, progress: LearningProgress): "lessonEvidence" | "selfReported" | null {
  const item = source.preparation.find(item => item.id === id);
  if (!item) return null;
  if (progress.track === "guitar" && item.lessonIds.every(id => progress.lessons[id]?.assessment === "ready")) return "lessonEvidence";
  return state.preparation[id]?.source === "selfReported" ? "selfReported" : null;
}
export function routinePrepared(state: RoutineState, progress: LearningProgress) { return source.preparation.every(item => preparationEvidence(item.id, state, progress) !== null); }
export function newRoutineSession(state: RoutineState, id: string, now: string): RoutineState {
  if (state.currentSessionId || !identifier(id) || !timestamp(now) || state.sessions.some(session => session.id === id)) return state;
  const session: RoutineSession = { id, templateId: source.id, templateRevision: source.revision, createdAt: now, updatedAt: now, finishedAt: null, selectedBlockId: source.blocks[0].id, blocks: source.blocks.map(block => ({ blockId: block.id, plannedSeconds: state.durations[block.id], attempts: [] })) };
  return { ...state, currentSessionId: id, sessions: [...state.sessions, session] };
}
export function newRoutineAttempt(id: string, now: string, targetSeconds: number): RoutineAttempt { return { id, createdAt: now, updatedAt: now, elapsedMs: 0, targetSeconds, status: "pending", interrupted: false, completeMinute: false, reflection: null, manualCount: null }; }
/** Planning before the first start is editable. Once started, even a zero-time
 * persisted checkpoint must retain its interruption when the target changes. */
export function editRoutineAttemptTarget(attempt: RoutineAttempt, targetSeconds: number): RoutineAttempt {
  if (!seconds(targetSeconds) || !["pending", "paused", "review"].includes(attempt.status) || targetSeconds * 1000 < attempt.elapsedMs) return attempt;
  const started = attempt.status !== "pending" || attempt.elapsedMs > 0;
  return { ...attempt, targetSeconds, completeMinute: false,
    interrupted: attempt.interrupted || started,
    status: attempt.elapsedMs === targetSeconds * 1000 ? "review" : started ? "paused" : "pending" };
}
/** Only continuous, exactly 60-second changes have a per-minute count. */
export function routineChangeRate(attempt: RoutineAttempt) { return attempt.completeMinute && attempt.targetSeconds === 60 && !attempt.interrupted && attempt.elapsedMs === 60000 && attempt.status === "reviewed" ? attempt.manualCount : null; }
export function routineElapsedSeconds(session: RoutineSession) { return Math.floor(session.blocks.reduce((sum, block) => sum + block.attempts.reduce((sum, attempt) => sum + attempt.elapsedMs, 0), 0) / 1000); }
export function finishRoutineSession(state: RoutineState, now: string): RoutineState { if (!timestamp(now)) return state; return { ...state, currentSessionId: null, sessions: state.sessions.map(session => session.id === state.currentSessionId ? { ...session, updatedAt: now, finishedAt: now } : session) }; }
/** Foreground monotonic clock: wall-clock dates are metadata, never elapsed-time input. */
export class RoutineTimer {
  private anchor: number | null = null;
  private accumulated = 0;
  private lastObserved = 0;
  start(elapsedMs: number, nowMs: number) { this.accumulated = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0; this.anchor = Number.isFinite(nowMs) ? nowMs : null; this.lastObserved = nowMs; }
  elapsed(nowMs: number, limitMs: number) { return Math.min(limitMs, this.accumulated + (this.anchor === null ? 0 : (Number.isFinite(nowMs) ? Math.max(0, nowMs - this.anchor) : 0))); }
  /** A delayed foreground heartbeat cannot establish that practice continued during suspension. */
  sample(nowMs: number, limitMs: number) {
    if (!Number.isFinite(nowMs) || nowMs - this.lastObserved > 2000) {
      const elapsedMs = this.pause(this.lastObserved, limitMs);
      return { elapsedMs, interrupted: true };
    }
    this.lastObserved = Math.max(this.lastObserved, nowMs);
    return { elapsedMs: this.elapsed(nowMs, limitMs), interrupted: false };
  }
  pause(nowMs: number, limitMs: number) { this.accumulated = this.elapsed(nowMs, limitMs); this.anchor = null; return this.accumulated; }
}

/** A timer ending requests reflection; it never records musical accuracy. */
export function checkpointRoutineAttempt(attempt: RoutineAttempt, block: RoutineBlock, elapsedMs: number, now: string, interrupted = false): RoutineAttempt {
  if (["reviewed", "skipped"].includes(attempt.status) || !Number.isFinite(elapsedMs) || !timestamp(now)) return attempt;
  const elapsed = Math.min(attempt.targetSeconds * 1000, Math.max(attempt.elapsedMs, elapsedMs));
  const ended = elapsed === attempt.targetSeconds * 1000;
  const wasInterrupted = attempt.interrupted || (interrupted && !ended);
  return { ...attempt, elapsedMs: elapsed, updatedAt: now, interrupted: wasInterrupted, status: ended ? "review" : "paused", completeMinute: block.kind === "changes" && ended && attempt.targetSeconds === 60 && !wasInterrupted };
}
export function reviewRoutineAttempt(attempt: RoutineAttempt, reflection: "practiced" | "revisit", manualCount: number | null, now: string): RoutineAttempt {
  if (!["paused", "review"].includes(attempt.status) || !timestamp(now) || (manualCount !== null && (!Number.isInteger(manualCount) || manualCount < 0 || manualCount > 10000))) return attempt;
  return { ...attempt, updatedAt: now, status: "reviewed", reflection, manualCount };
}

/** Persist paused before running so even an immediate reload is an interruption. */
export function beginRoutineAttempt(attempt: RoutineAttempt): RoutineAttempt {
  if (!["pending", "paused"].includes(attempt.status)) return attempt;
  return { ...attempt, status: "paused", interrupted: attempt.interrupted || attempt.status === "paused" || attempt.elapsedMs > 0 };
}
