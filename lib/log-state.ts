import { MAX_ENTRIES, mergeLog, type LogEntry, type LogImport } from "./log.ts";

export type LogState = {
  entries: LogEntry[];
  importReceipt: { message: string } | null;
};
export type LogAction =
  | { type: "replace"; entries: LogEntry[] }
  | { type: "import"; imported: LogImport };

/** Merge only when React applies the action, using the latest edited entries. */
export function reduceLogState(state: LogState, action: LogAction): LogState {
  if (action.type === "replace") return { entries: action.entries, importReceipt: null };
  const { entries: incoming, truncated } = action.imported;
  const merged = mergeLog(state.entries, incoming);
  const message =
    `Added ${merged.added} ${merged.added === 1 ? "session" : "sessions"}` +
    (merged.skipped > 0 ? `, and skipped ${merged.skipped} already in this browser` : "") +
    (merged.dropped > 0
      ? `. This log is full at ${MAX_ENTRIES} sessions, so ${merged.dropped} could not be added — export it and clear it to keep going.`
      : ".") +
    (truncated > 0
      ? ` That file held more than ${MAX_ENTRIES} readable sessions, so its ${truncated} oldest ${truncated === 1 ? "was" : "were"} not read — the most recent ${MAX_ENTRIES} are the ones that were.`
      : "");
  return { entries: merged.entries, importReceipt: { message } };
}
