/** Transport contracts. Client learning evidence never grants purchase access. */
export const GUITARHUB_BUNDLE_ID = "org.guitarhub.app";
export const GUITARHUB_LIFETIME_PRODUCT_ID = "org.guitarhub.app.complete.lifetime";
export type StoreEnvironment = "Production" | "Sandbox";
export type LearningTrack = "guitar" | "voice";
export type LearningSyncBinding = { accountId: string; syncEpoch: string };

export class LearningAccountError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = "LearningAccountError"; }
}

export function accountUUID(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new LearningAccountError("invalid_uuid");
  }
  return value.toLowerCase();
}

/** Both inputs are server/session state, never account IDs selected by a request body. */
export function assertAccountScope(queueAccountId: string | null, currentAccountId: string | null): void {
  if (!queueAccountId || !currentAccountId || accountUUID(queueAccountId) !== accountUUID(currentAccountId)) {
    throw new LearningAccountError("account_changed");
  }
}

export function assertSyncScope(queued: LearningSyncBinding, current: LearningSyncBinding): void {
  assertAccountScope(queued.accountId, current.accountId);
  if (accountUUID(queued.syncEpoch) !== accountUUID(current.syncEpoch)) throw new LearningAccountError("sync_epoch_changed");
}

export type AttemptSource = "measured" | "selfReported" | "legacy";
export type AttemptDisposition = "scored" | "insufficientSignal" | "manualOverride" | "reflection" | "imported";
export type LearningAttempt = {
  version: 1;
  id: string;
  track: LearningTrack;
  lessonId: string;
  kind: "microphone" | "reading" | "study" | "manualCount" | "legacy";
  createdAt: string;
  practiceSeconds: number | null;
  exerciseRevision: number | null;
  source: AttemptSource;
  disposition: AttemptDisposition;
  assessment: "repeat" | "ready";
  score: number | null;
  bpm: number | null;
  details: Record<string, unknown>;
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const nullableNumber = (value: unknown, min: number, max: number, integer = false): value is number | null => value === null || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)));

function isBoundedJSON(value: unknown, depth = 0): boolean {
  if (depth > 5) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= 2_000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 128 && value.every((item) => isBoundedJSON(item, depth + 1));
  if (object(value)) return Object.keys(value).length <= 64 && Object.entries(value).every(([key, item]) => key.length <= 80 && !["__proto__", "constructor", "prototype"].includes(key) && isBoundedJSON(item, depth + 1));
  return false;
}

/** Validates transport evidence; curriculum-specific completion must be derived separately. */
export function parseLearningAttempt(input: unknown, allowedLessons: ReadonlyMap<string, LearningTrack>): LearningAttempt {
  if (!object(input) || input.version !== 1 || typeof input.lessonId !== "string" || allowedLessons.get(input.lessonId) !== input.track || !["guitar", "voice"].includes(String(input.track))) throw new LearningAccountError("invalid_attempt");
  const id = accountUUID(input.id);
  if (typeof input.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(input.createdAt) || !Number.isFinite(Date.parse(input.createdAt))) throw new LearningAccountError("invalid_attempt");
  if (!nullableNumber(input.practiceSeconds, 0, 86_400) || !nullableNumber(input.exerciseRevision, 1, 1_000, true) || !nullableNumber(input.score, 0, 100) || !nullableNumber(input.bpm, 1, 400)) throw new LearningAccountError("invalid_attempt");
  if (!["microphone", "reading", "study", "manualCount", "legacy"].includes(String(input.kind)) || !["measured", "selfReported", "legacy"].includes(String(input.source)) || !["scored", "insufficientSignal", "manualOverride", "reflection", "imported"].includes(String(input.disposition)) || !["repeat", "ready"].includes(String(input.assessment))) throw new LearningAccountError("invalid_attempt");
  if (!object(input.details) || !isBoundedJSON(input.details) || JSON.stringify(input.details).length > 16_384) throw new LearningAccountError("invalid_attempt_details");
  const source = input.source as AttemptSource;
  const disposition = input.disposition as AttemptDisposition;
  if (source === "measured" && (input.kind !== "microphone" || !["scored", "insufficientSignal"].includes(disposition))) throw new LearningAccountError("invalid_evidence");
  if (source === "selfReported" && !["manualOverride", "reflection"].includes(disposition)) throw new LearningAccountError("invalid_evidence");
  if (source === "legacy" && (input.kind !== "legacy" || disposition !== "imported")) throw new LearningAccountError("invalid_evidence");
  if (disposition === "scored" && input.score === null) throw new LearningAccountError("invalid_evidence");
  const measuredScore = source === "measured" && disposition === "scored";
  return {
    version: 1, id, track: input.track as LearningTrack, lessonId: input.lessonId,
    kind: input.kind as LearningAttempt["kind"], createdAt: new Date(input.createdAt).toISOString(),
    practiceSeconds: input.practiceSeconds, exerciseRevision: input.exerciseRevision,
    source, disposition, assessment: source === "legacy" || disposition === "insufficientSignal" ? "repeat" : input.assessment as LearningAttempt["assessment"],
    score: measuredScore ? input.score : null, bpm: input.bpm,
    details: JSON.parse(JSON.stringify(input.details)) as Record<string, unknown>,
  };
}

export type VerifiedLifetimePurchase = {
  environment: StoreEnvironment;
  originalTransactionId: string;
  transactionId: string;
  bundleId: typeof GUITARHUB_BUNDLE_ID;
  productId: typeof GUITARHUB_LIFETIME_PRODUCT_ID;
  appAccountToken: string;
  signedAt: string;
  purchasedAt: string;
  revokedAt: string | null;
};

/** Access is environment-scoped and comes only from the server-owned purchase ledger. */
export function lifetimeTracks(purchase: VerifiedLifetimePurchase | null, environment: StoreEnvironment): LearningTrack[] {
  return purchase?.environment === environment && purchase.bundleId === GUITARHUB_BUNDLE_ID && purchase.productId === GUITARHUB_LIFETIME_PRODUCT_ID && purchase.revokedAt === null ? ["guitar", "voice"] : [];
}
