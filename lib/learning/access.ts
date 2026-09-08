import { allLessons, isModuleAvailable, type TrackId } from "./curriculum.ts";
import { accountUUID } from "../learning-account/contracts.ts";
import { getLessonInstructions } from "./instructions.ts";

/** A server-verified access snapshot. It never contains authentication tokens. */
export type LearningAccess = {
  enabled: boolean;
  accountId: string | null;
  tracks: TrackId[];
  status: "disabled" | "signedOut" | "verified" | "unavailable";
};

export const guestLearningAccess: LearningAccess = {
  enabled: false, accountId: null, tracks: [], status: "disabled",
};

export function canOpenModule(track: TrackId, moduleId: string, access: LearningAccess): boolean {
  // A grant cannot open an invented module, even when a track is owned.
  if (!allLessons(track).some(entry => entry.module.id === moduleId)) return false;
  return isModuleAvailable(track, moduleId)
    || (access.enabled && access.status === "verified" && access.accountId !== null && access.tracks.includes(track));
}

export function accessibleLessonIds(track: TrackId, access: LearningAccess): string[] {
  return allLessons(track).filter(entry => isLessonReady(track, entry.lesson.id) && canOpenModule(track, entry.module.id, access)).map(entry => entry.lesson.id);
}

export function isLessonReady(track: TrackId, lessonId: string): boolean {
  const entry = allLessons(track).find(item => item.lesson.id === lessonId);
  return !!entry && (!!entry.lesson.practiceSpec || !!getLessonInstructions(lessonId));
}

/** Guest records retain their original key; signing in never assigns them to an account. */
export function accountHistoryKey(guestKey: string, accountId: string | null): string {
  return accountId === null ? guestKey : `${guestKey}.account.${accountUUID(accountId)}`;
}
