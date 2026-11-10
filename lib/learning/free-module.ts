import contract from "../../contracts/learning.json" with { type: "json" };
import { catalogLessons } from "./catalog.ts";
import type { PlayerLevelId } from "../levels.ts";

/** The placement a visitor picks; the same three values as `PlayerLevelId`. */
export type Placement = PlayerLevelId;

/** One free guitar module per placement, pinned by the shared `freeModules` contract key. */
export const FREE_MODULES: Readonly<Record<Placement, string>> = contract.freeModules;

export const FREE_MODULE_STORAGE_KEY = "guitarhub.free-module.v1";

export type FreeModuleChoice = { moduleId: string; placement: Placement };

const PLACEMENTS = Object.keys(FREE_MODULES) as Placement[];

export function isFreeModuleCandidate(moduleId: string): boolean {
  return Object.values(FREE_MODULES).includes(moduleId);
}

export function freeModuleFor(placement: Placement): string {
  return FREE_MODULES[placement];
}

/** Lesson ids of a guitar module, in catalogue order. */
export function freeModuleLessonIds(moduleId: string): string[] {
  return catalogLessons("guitar").filter(entry => entry.module.id === moduleId).map(entry => entry.lesson.id);
}

/** Reads a stored choice back; anything malformed or naming a non-candidate module is null. */
export function parseFreeModuleChoice(raw: string | null): FreeModuleChoice | null {
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (typeof value !== "object" || value === null) return null;
  const { moduleId, placement } = value as Record<string, unknown>;
  if (typeof moduleId !== "string" || typeof placement !== "string") return null;
  if (!PLACEMENTS.includes(placement as Placement) || !isFreeModuleCandidate(moduleId)) return null;
  return { moduleId, placement: placement as Placement };
}
