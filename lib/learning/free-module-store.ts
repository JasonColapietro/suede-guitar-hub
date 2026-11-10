/**
 * The free module a guest chose, kept in browser storage under
 * `FREE_MODULE_STORAGE_KEY`. Storage can be missing, blocked or throwing; every
 * function here still answers, so placement opens the module for the visit
 * even when nothing can be stored.
 *
 * Signed-in accounts keep their choice on the server (PUT
 * /api/learning/free-module); `adoptServerFreeModule` makes that choice the
 * local one too.
 */
import { FREE_MODULES, FREE_MODULE_STORAGE_KEY, parseFreeModuleChoice, type FreeModuleChoice, type Placement } from "./free-module.ts";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "getItem" | "setItem">;

/** The choice for this page session when storage could not keep it. */
let visitChoice: FreeModuleChoice | null = null;
/** Milestones already sent this page session, for when storage cannot keep the flag. */
const visitMilestones = new Set<string>();
const listeners = new Set<() => void>();

function changed() {
  for (const listener of listeners) listener();
}

function write(storage: WritableStorage | null, choice: FreeModuleChoice) {
  try {
    if (!storage) throw new Error("storage_unavailable");
    storage.setItem(FREE_MODULE_STORAGE_KEY, JSON.stringify(choice));
    visitChoice = null;
  } catch {
    visitChoice = choice;
  }
  changed();
}

/** The stored choice, or null. A module paired with a placement that does not own it is no choice. */
export function readFreeModuleChoice(storage: ReadableStorage | null): FreeModuleChoice | null {
  let raw: string | null;
  try { raw = storage ? storage.getItem(FREE_MODULE_STORAGE_KEY) : null; } catch { return null; }
  const choice = parseFreeModuleChoice(raw);
  return choice && FREE_MODULES[choice.placement] === choice.moduleId ? choice : null;
}

/** The choice for this visit: the stored one, or the one held in memory when storage refused it. */
export function currentFreeModuleChoice(storage: ReadableStorage | null): FreeModuleChoice | null {
  return readFreeModuleChoice(storage) ?? visitChoice;
}

/** The first placement fixes the free module. Without working storage the placement's module is returned and kept for this visit only. */
export function chooseFreeModule(storage: WritableStorage | null, placement: Placement): FreeModuleChoice {
  const stored = readFreeModuleChoice(storage);
  if (stored) return stored;
  const choice: FreeModuleChoice = { moduleId: FREE_MODULES[placement], placement };
  write(storage, choice);
  return choice;
}

/** The account's stored module replaces whatever this browser chose. An id that is not a free module changes nothing. */
export function adoptServerFreeModule(storage: WritableStorage | null, serverModuleId: string): void {
  const placement = (Object.keys(FREE_MODULES) as Placement[]).find(key => FREE_MODULES[key] === serverModuleId);
  if (!placement) return;
  const current = currentFreeModuleChoice(storage);
  if (current?.moduleId === serverModuleId) return;
  write(storage, { moduleId: serverModuleId, placement });
}

/** True the first time a milestone of a module is claimed in this browser, so each is sent once. */
export function claimFreeModuleMilestone(storage: WritableStorage | null, moduleId: string, milestone: "started" | "completed"): boolean {
  const key = `${FREE_MODULE_STORAGE_KEY}.${milestone}.${moduleId}`;
  if (visitMilestones.has(key)) return false;
  visitMilestones.add(key);
  try {
    if (!storage) return true;
    if (storage.getItem(key) !== null) return false;
    storage.setItem(key, "1");
  } catch { /* Without storage the milestone is sent once per visit. */ }
  return true;
}

/** Notifies `listener` when this tab changes the choice. Other tabs announce theirs through the `storage` event. */
export function subscribeFreeModuleChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** `window.localStorage`, or null where reading it throws (blocked site data, some private modes). */
export function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
