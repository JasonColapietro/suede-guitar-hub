import { catalogLesson, catalogLessons } from "./catalog.ts";
import type { TrackId } from "./models.ts";
import { accountUUID } from "../learning-account/contracts.ts";
import { isGuidedLesson } from "./instruction-index.ts";
import { isFreeModuleCandidate } from "./free-module.ts";

/** A server-verified access snapshot. It never contains authentication tokens. */
export type LearningAccess = {
  enabled: boolean;
  accountId: string | null;
  tracks: TrackId[];
  status: "disabled" | "signedOut" | "verified" | "unavailable";
  /** The guitar module this visitor chose to open free, or null. */
  freeModuleId: string | null;
  /** Where the verified purchase was made, or null without one. */
  purchaseSource: "apple" | "stripe" | null;
};

export const guestLearningAccess: LearningAccess = {
  enabled: false, accountId: null, tracks: [], status: "disabled", freeModuleId: null, purchaseSource: null,
};

export function hasVerifiedTrackAccess(track: TrackId, access: LearningAccess): boolean {
  return access.enabled && access.status === "verified" && access.accountId !== null && access.tracks.includes(track);
}

export function canOpenModule(track: TrackId, moduleId: string, access: LearningAccess): boolean {
  // A grant cannot open an invented module, even when a track is owned.
  if (!catalogLessons(track).some(entry => entry.module.id === moduleId)) return false;
  // Beyond a purchase, the one guitar module the visitor chose to open free is allowed.
  // It does not depend on `enabled` or `status`. Catalog labels remain shared with iOS;
  // they do not authorize web access.
  if (track === "guitar" && access.freeModuleId === moduleId && isFreeModuleCandidate(moduleId)) return true;
  return hasVerifiedTrackAccess(track, access);
}

export function accessibleLessonIds(track: TrackId, access: LearningAccess): string[] {
  return catalogLessons(track).filter(entry => isLessonReady(track, entry.lesson.id) && canOpenModule(track, entry.module.id, access)).map(entry => entry.lesson.id);
}

export function isLessonReady(track: TrackId, lessonId: string): boolean {
  const entry = catalogLesson(track, lessonId);
  return !!entry && (!!entry.lesson.practice || isGuidedLesson(lessonId));
}

/** Guest records retain their original key; signing in never assigns them to an account. */
export function accountHistoryKey(guestKey: string, accountId: string | null): string {
  return accountId === null ? guestKey : `${guestKey}.account.${accountUUID(accountId)}`;
}
