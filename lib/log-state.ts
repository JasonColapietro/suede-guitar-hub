import {
  MAX_ENTRIES,
  addEntry,
  mergeLog,
  removeEntry,
  updateEntry,
  type LogDraft,
  type LogEntry,
  type LogError,
  type LogImport,
} from "./log.ts";

/** "1 session", "2 sessions". */
export function sessionCount(count: number): string {
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}

/** The sentence shown after an import, from the merge it describes. */
export function importReceiptMessage(
  merged: { added: number; skipped: number; dropped: number },
  truncated: number,
): string {
  return (
    `Added ${sessionCount(merged.added)}` +
    (merged.skipped > 0 ? `, and skipped ${merged.skipped} already in this browser` : "") +
    (merged.dropped > 0
      ? `. This log is full at ${MAX_ENTRIES} sessions, so ${merged.dropped} could not be added — export it and clear it to keep going.`
      : ".") +
    (truncated > 0
      ? ` That file held more than ${MAX_ENTRIES} readable sessions, so its ${truncated} oldest ${truncated === 1 ? "was" : "were"} not read — the most recent ${MAX_ENTRIES} are the ones that were.`
      : "")
  );
}

/**
 * One change a tab wants to make to the log.
 *
 * Each is described by what it means rather than by the list it produces, so
 * it can be replayed against whatever the log holds *now* — which, with the
 * page open in two tabs, is not the list either tab loaded.
 */
export type LogChange =
  | { type: "add"; draft: LogDraft; today: string }
  | { type: "update"; id: string; draft: LogDraft; today: string }
  | { type: "remove"; id: string }
  | { type: "import"; imported: LogImport }
  /**
   * Clearing names the sessions the player was shown and agreed to delete. A
   * session another tab logged after that confirmation was never seen here, so
   * it is not this tab's to delete.
   */
  | { type: "clear"; ids: readonly string[] };

export type LogChangeResult =
  | { ok: true; entries: LogEntry[]; message: string }
  | { ok: false; error: LogError };

/**
 * Apply one change to the latest stored log.
 *
 * `latest` must be read from storage at the moment of the change. Built from a
 * tab's in-memory copy instead, the result would overwrite everything another
 * tab saved since this one loaded — the data loss this function exists to stop.
 */
export function applyLogChange(
  latest: readonly LogEntry[],
  change: LogChange,
): LogChangeResult {
  switch (change.type) {
    case "add": {
      const result = addEntry(latest, change.draft, change.today);
      return result.ok
        ? { ok: true, entries: result.value, message: "Session logged." }
        : result;
    }
    case "update": {
      const result = updateEntry(latest, change.id, change.draft, change.today);
      return result.ok
        ? { ok: true, entries: result.value, message: "Session updated." }
        : result;
    }
    case "remove":
      return {
        ok: true,
        entries: removeEntry(latest, change.id),
        message: "Session removed.",
      };
    case "import": {
      const merged = mergeLog(latest, change.imported.entries);
      return {
        ok: true,
        entries: merged.entries,
        message: importReceiptMessage(merged, change.imported.truncated),
      };
    }
    case "clear": {
      const doomed = new Set(change.ids);
      const entries = latest.filter((entry) => !doomed.has(entry.id));
      const removed = latest.length - entries.length;
      const message =
        entries.length === 0
          ? `Deleted ${sessionCount(removed)}. This browser's log is empty.`
          : `Deleted ${sessionCount(removed)}. Kept ${sessionCount(entries.length)} logged in another tab after you chose to clear.`;
      return { ok: true, entries, message };
    }
  }
}
