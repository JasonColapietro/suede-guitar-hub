import { accountUUID, assertSyncScope, parseLearningAttempt, LearningAccountError, type LearningAttempt, type LearningSyncBinding, type LearningTrack } from "../learning-account/contracts.ts";
import type { LessonRecord } from "../learning/progress.ts";

export type AccountSyncQueue = LearningSyncBinding & { version: 1; attempts: LearningAttempt[] };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function cursor(value: unknown): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value) || BigInt(value) > 9_223_372_036_854_775_807n) throw new LearningAccountError("invalid_sync_response");
  return value;
}
function responseScope(value: unknown, current: LearningSyncBinding): Record<string, unknown> {
  if (!object(value)) throw new LearningAccountError("invalid_sync_response");
  assertSyncScope({ accountId: accountUUID(value.accountId), syncEpoch: accountUUID(value.syncEpoch) }, current);
  return value;
}

export function emptyAccountSyncQueue(binding: LearningSyncBinding): AccountSyncQueue {
  return { version: 1, accountId: accountUUID(binding.accountId), syncEpoch: accountUUID(binding.syncEpoch), attempts: [] };
}

/** Invalid/stale serialized data is quarantined by the caller; never overwrite it with an empty queue. */
export function parseAccountSyncQueue(raw: string, current: LearningSyncBinding, allowedLessons: ReadonlyMap<string, LearningTrack>): AccountSyncQueue {
  if (raw.length > 4_194_304) throw new LearningAccountError("invalid_sync_queue");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new LearningAccountError("invalid_sync_queue"); }
  const body = responseScope(value, current);
  if (body.version !== 1 || !Array.isArray(body.attempts) || body.attempts.length > 1000) throw new LearningAccountError("invalid_sync_queue");
  const attempts = body.attempts.map((attempt) => parseLearningAttempt(attempt, allowedLessons));
  if (new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length) throw new LearningAccountError("invalid_sync_queue");
  return { ...emptyAccountSyncQueue(current), attempts };
}

function canonicalJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (object(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

/** Converts a newly recorded event. Historical/non-UUID IDs need an explicit, persisted import mapping. */
export function attemptFromLessonRecord(id: string, track: LearningTrack, lessonId: string, record: LessonRecord, allowedLessons: ReadonlyMap<string, LearningTrack>): LearningAttempt {
  return parseLearningAttempt({ version: 1, id: accountUUID(id), track, lessonId,
    kind: record.source === "measured" ? "microphone" : record.source === "readingQuiz" ? "reading" : "study",
    createdAt: record.updatedAt, practiceSeconds: record.practiceSeconds, exerciseRevision: record.practiceSpecRevision ?? null,
    source: record.source === "measured" ? "measured" : "selfReported",
    disposition: record.source === "measured" ? "scored" : "reflection", assessment: record.assessment,
    score: record.score, bpm: record.bpm ?? null,
    details: { localSource: record.source, ...(record.readingQuizAttempt ? { readingQuizAttempt: record.readingQuizAttempt } : {}),
      ...(record.completionMinimumBPM === undefined ? {} : { completionMinimumBPM: record.completionMinimumBPM }) },
  }, allowedLessons);
}

export function enqueueAccountAttempt(queue: AccountSyncQueue, current: LearningSyncBinding, attempt: LearningAttempt, allowedLessons: ReadonlyMap<string, LearningTrack>): AccountSyncQueue {
  assertSyncScope(queue, current);
  const clean = parseLearningAttempt(attempt, allowedLessons);
  const previous = queue.attempts.find((entry) => entry.id === clean.id);
  if (previous) {
    if (canonicalJSON(previous) !== canonicalJSON(clean)) throw new LearningAccountError("attempt_identity_conflict");
    return queue;
  }
  if (queue.attempts.length >= 1000) throw new LearningAccountError("sync_queue_full");
  return { ...queue, attempts: [...queue.attempts, clean] };
}

export function prepareAccountUpload(queue: AccountSyncQueue, current: LearningSyncBinding) {
  assertSyncScope(queue, current);
  return { accountId: queue.accountId, syncEpoch: queue.syncEpoch, attempts: queue.attempts.slice(0, 100) };
}

export function acknowledgeAccountUpload(queue: AccountSyncQueue, current: LearningSyncBinding, response: unknown): AccountSyncQueue {
  assertSyncScope(queue, current);
  const body = responseScope(response, current);
  if (!Array.isArray(body.acknowledged) || body.acknowledged.length > 100) throw new LearningAccountError("invalid_sync_response");
  const sentIds = new Set(queue.attempts.slice(0, 100).map((attempt) => attempt.id));
  const acknowledged = new Set<string>();
  for (const row of body.acknowledged) {
    if (!object(row)) throw new LearningAccountError("invalid_sync_response");
    const id = accountUUID(row.attempt_id);
    cursor(row.sequence);
    if (!sentIds.has(id) || acknowledged.has(id)) throw new LearningAccountError("invalid_sync_response");
    acknowledged.add(id);
  }
  return { ...queue, attempts: queue.attempts.filter((attempt) => !acknowledged.has(attempt.id)) };
}

export function parseAccountAttemptPage(response: unknown, current: LearningSyncBinding, allowedLessons: ReadonlyMap<string, LearningTrack>) {
  const body = responseScope(response, current);
  if (!Array.isArray(body.attempts) || body.attempts.length > 100) throw new LearningAccountError("invalid_sync_response");
  const attempts = body.attempts.map((attempt) => parseLearningAttempt(attempt, allowedLessons));
  if (new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length) throw new LearningAccountError("invalid_sync_response");
  const currentCursor = cursor(body.cursor);
  const nextCursor = body.nextCursor === null ? null : cursor(body.nextCursor);
  if (nextCursor !== null && (nextCursor !== currentCursor || !attempts.length)) throw new LearningAccountError("invalid_sync_response");
  return { ...current, attempts, cursor: currentCursor, nextCursor };
}
