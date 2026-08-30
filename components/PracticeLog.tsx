"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  LOG_METRICS,
  LOG_STORAGE_KEY,
  MAX_ENTRIES,
  MAX_FOCUS_LENGTH,
  MAX_NOTE_LENGTH,
  MIN_TREND_POINTS,
  addEntry,
  exportFileName,
  importLog,
  knownFocuses,
  mergeLog,
  metricSpec,
  recentFirst,
  removeEntry,
  restoreLogState,
  serializeLog,
  storedLogPayload,
  summarizeLog,
  toIsoDate,
  updateEntry,
  type LogEntry,
  type LogError,
  type LogMetric,
  type TrendVerdict,
} from "@/lib/log";

/**
 * The Practice Evidence Log.
 *
 * Every rule about what a session is, what counts as a direction, and what the
 * tool refuses to claim lives in `lib/log.ts`. This file owns state, markup,
 * and the literal `localStorage`, `Blob` and `File` calls — the three things
 * that cannot be tested in Node — and nothing else. When a session is refused,
 * the sentence on screen is the one the library wrote.
 *
 * The clock is read here, once, on mount, and passed into the library as a
 * plain `YYYY-MM-DD` string. That is the only reason the summary is testable.
 */

const FIELD_CLASSES =
  "w-full rounded-2xl border border-indigo-deep/15 bg-white px-4 py-3 text-base font-semibold text-ink " +
  "focus-visible:border-violet-soft focus-visible:[outline:3px_solid_var(--color-violet-soft)] " +
  "focus-visible:[outline-offset:3px]";

const PILL_FOCUS =
  "focus-visible:[outline:3px_solid_var(--color-violet-soft)] focus-visible:[outline-offset:3px]";

const SMALL_PILL =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-deep/20 px-4 py-2 " +
  `text-xs font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`;

const TREND_STYLES: Record<TrendVerdict, string> = {
  insufficient: "border border-indigo-deep/20 bg-cream-soft text-indigo-deep",
  up: "bg-violet text-white",
  flat: "bg-violet-soft text-indigo-deep",
  unclear: "bg-peach text-indigo-deep",
};

const SUMMARY_ID = "log-summary";
const DATE_FIELD_ID = "log-date";

type Draft = {
  date: string;
  focus: string;
  metric: LogMetric;
  value: string;
  note: string;
};

function emptyDraft(date: string): Draft {
  return { date, focus: "", metric: "tempo", value: "", note: "" };
}

/** Both storage calls can throw on their own in a private window. */
function forgetStored(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    // Storage is unavailable, so there is nothing stored to forget.
  }
}

function readStored(): LogEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return null;
    const restored = restoreLogState(JSON.parse(raw));
    if (restored) return restored;
  } catch {
    // Private mode throws on access; corrupt JSON throws on parse. Either way
    // the stored value is unusable.
  }
  // Only reached when the payload could not be read at all. A payload that was
  // readable but held a few broken rows came back above with the good rows in
  // it, and is never dropped here.
  forgetStored();
  return null;
}

function writeStored(entries: readonly LogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOG_STORAGE_KEY,
      JSON.stringify(storedLogPayload(entries)),
    );
  } catch {
    // A blocked or full store costs the player persistence, not the log they
    // are looking at. Nothing here should interrupt them.
  }
}

function formatDate(iso: string): string {
  // Parsed as UTC parts and read back as UTC parts, so the label can never
  // slide a day in a negative-offset timezone the way `new Date(iso)` does.
  const stamp = Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
  );
  return new Date(stamp).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PracticeLog() {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<LogError | null>(null);
  const [notice, setNotice] = useState("");
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // The clock is read exactly once, here, and never again. Reading it during
  // render would put a different value in the server HTML than in the first
  // client render, and would make the summary change under the player at
  // midnight without anything having happened.
  useEffect(() => {
    const stamp = toIsoDate(new Date());
    setToday(stamp);
    setDraft(emptyDraft(stamp));
    const restored = readStored();
    if (restored) setEntries(restored);
    setHydrated(true);
  }, []);

  // The `hydrated` gate is load-bearing: without it this fires before the read
  // above has restored, and the empty default overwrites the saved log on
  // every page load.
  useEffect(() => {
    if (!hydrated) return;
    writeStored(entries);
  }, [entries, hydrated]);

  // Runs after React has committed, which is when the element exists.
  // `requestAnimationFrame` would not do: it never fires in a hidden tab, so
  // the move would be silently dropped there.
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  const summary = useMemo(
    () => (today ? summarizeLog(entries, today) : null),
    [entries, today],
  );

  const sevenDayByFocus = useMemo(() => {
    const map = new Map<string, number>();
    for (const focus of summary?.last7.focuses ?? []) {
      map.set(focus.key, focus.sessions);
    }
    return map;
  }, [summary]);

  const focusOptions = useMemo(() => knownFocuses(entries), [entries]);
  const ordered = useMemo(() => recentFirst(entries), [entries]);
  const spec = metricSpec(draft.metric);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    // The alert quotes the field it refused. Editing that field is the
    // correction, so the alert goes with the edit rather than standing over a
    // value it no longer describes.
    setError(null);
    setNotice("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = editingId
      ? updateEntry(entries, editingId, draft, today)
      : addEntry(entries, draft, today);

    if (!result.ok) {
      setError(result.error);
      if (result.error.field) {
        setFocusTarget(
          result.error.field === "metric"
            ? "log-metric-tempo"
            : `log-${result.error.field}`,
        );
      }
      return;
    }

    setEntries(result.value);
    setError(null);
    setNotice(editingId ? "Session updated." : "Session logged.");
    setDraft({ ...emptyDraft(today), focus: draft.focus, metric: draft.metric });
    setEditingId(null);
    setFocusTarget(SUMMARY_ID);
  }

  function startEdit(entry: LogEntry) {
    setEditingId(entry.id);
    setPendingDeleteId(null);
    setError(null);
    setNotice("");
    setDraft({
      date: entry.date,
      focus: entry.focus,
      metric: entry.metric,
      value: String(entry.value),
      note: entry.note,
    });
    setFocusTarget(DATE_FIELD_ID);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
    setDraft(emptyDraft(today));
  }

  function confirmDelete(id: string) {
    setEntries(removeEntry(entries, id));
    setPendingDeleteId(null);
    if (editingId === id) cancelEdit();
    setNotice("Session removed.");
    setFocusTarget(SUMMARY_ID);
  }

  function handleExport() {
    if (typeof window === "undefined" || entries.length === 0) return;
    try {
      const blob = new Blob([serializeLog(entries, today)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFileName(today);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      // Deferred: revoking synchronously after `click()` cancels the download
      // outright in some browsers, because the fetch of the blob has not
      // started yet when the URL is torn down.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError(null);
      setNotice(
        `Downloaded ${exportFileName(today)} with ${entries.length} sessions in it.`,
      );
    } catch {
      setNotice("");
      setError({
        code: "file-unreadable",
        message:
          "This browser blocked the download. Your sessions are untouched and still here.",
      });
    }
  }

  async function handleImport(file: File | undefined) {
    // Cleared first so choosing the same file twice fires `change` again.
    if (importRef.current) importRef.current.value = "";
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setNotice("");
      setError({
        code: "file-unreadable",
        message: "That file could not be read. Nothing was changed.",
      });
      return;
    }

    const parsed = importLog(text);
    if (!parsed.ok) {
      setNotice("");
      setError(parsed.error);
      return;
    }

    const merged = mergeLog(entries, parsed.value);
    setEntries(merged.entries);
    setError(null);
    setNotice(
      `Added ${merged.added} ${merged.added === 1 ? "session" : "sessions"}` +
        (merged.skipped > 0
          ? `, and skipped ${merged.skipped} already in this browser`
          : "") +
        (merged.dropped > 0
          ? `. This log is full at ${MAX_ENTRIES} sessions, so ${merged.dropped} could not be added — export it and clear it to keep going.`
          : "."),
    );
    setFocusTarget(SUMMARY_ID);
  }

  function clearEverything() {
    forgetStored();
    setEntries([]);
    setEditingId(null);
    setPendingDeleteId(null);
    setError(null);
    setDraft(emptyDraft(today));
    setNotice("This browser's log is empty.");
  }

  const windows = summary ? [summary.last7, summary.last30] : [];

  return (
    <div className="rounded-[2rem] border border-indigo-deep/10 bg-white/70 p-6 shadow-[0_28px_80px_rgba(37,17,82,0.07)] sm:p-8 lg:p-12">
      <form onSubmit={submit} aria-busy={!hydrated} noValidate>
        <fieldset className="border-0 p-0">
          <legend className="font-display text-3xl text-indigo-deep">
            {editingId ? "Edit this session" : "Log one session"}
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            One line per sitting: the day, the one thing you worked on, the
            number you actually reached, and an honest sentence about whether it
            moved. Everything stays in this browser.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor={DATE_FIELD_ID}
                className="block text-sm font-semibold text-indigo-deep"
              >
                Date you practised
              </label>
              <input
                id={DATE_FIELD_ID}
                name="date"
                type="date"
                max={today || undefined}
                value={draft.date}
                onChange={(event) => set("date", event.target.value)}
                aria-describedby="log-date-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <p id="log-date-hint" className="mt-2 text-sm text-ink/60">
                Today, or a day you are catching up on. Not a day ahead.
              </p>
            </div>

            <div>
              <label
                htmlFor="log-focus"
                className="block text-sm font-semibold text-indigo-deep"
              >
                What you worked on
              </label>
              <input
                id="log-focus"
                name="focus"
                type="text"
                list="log-focus-options"
                autoComplete="off"
                maxLength={MAX_FOCUS_LENGTH}
                placeholder="Bourrée bar 12"
                value={draft.focus}
                onChange={(event) => set("focus", event.target.value)}
                aria-describedby="log-focus-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <datalist id="log-focus-options">
                {focusOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <p id="log-focus-hint" className="mt-2 text-sm text-ink/60">
                One passage or one skill. Spell it the same way each time and
                the sessions group together.
              </p>
            </div>
          </div>

          <fieldset className="mt-8 border-0 p-0">
            <legend className="text-sm font-semibold text-indigo-deep">
              What you measured
            </legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {LOG_METRICS.map((option) => (
                <label
                  key={option.id}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm font-semibold motion-safe:transition ${
                    draft.metric === option.id
                      ? "border-violet/40 bg-violet-soft/15 text-indigo-deep"
                      : "border-indigo-deep/15 bg-white text-ink/75"
                  }`}
                >
                  <input
                    id={`log-metric-${option.id}`}
                    type="radio"
                    name="metric"
                    value={option.id}
                    checked={draft.metric === option.id}
                    onChange={() => set("metric", option.id)}
                    className={`h-5 w-5 accent-violet ${PILL_FOCUS}`}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="log-value"
                className="block text-sm font-semibold text-indigo-deep"
              >
                {spec.label} ({spec.unit})
              </label>
              <input
                id="log-value"
                name="value"
                type="number"
                inputMode="numeric"
                min={spec.min}
                max={spec.max}
                step={1}
                value={draft.value}
                onChange={(event) => set("value", event.target.value)}
                aria-describedby="log-value-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <p id="log-value-hint" className="mt-2 text-sm text-ink/60">
                {spec.help}
              </p>
            </div>

            <div>
              <label
                htmlFor="log-note"
                className="block text-sm font-semibold text-indigo-deep"
              >
                Did it move?
              </label>
              <input
                id="log-note"
                name="note"
                type="text"
                maxLength={MAX_NOTE_LENGTH}
                placeholder="Cleaner, but only from a standing start"
                value={draft.note}
                onChange={(event) => set("note", event.target.value)}
                aria-describedby="log-note-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <p id="log-note-hint" className="mt-2 text-sm text-ink/60">
                One line, and an honest one. &ldquo;No change&rdquo; is a
                perfectly good entry, and a more useful one than a good mood.
              </p>
            </div>
          </div>
        </fieldset>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-violet/25 bg-violet-soft/10 p-5"
          >
            <p className="font-medium text-indigo-deep">{error.message}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105 ${PILL_FOCUS}`}
          >
            {editingId ? "Save this change" : "Log this session"}{" "}
            <span aria-hidden>→</span>
          </button>
          {editingId ? (
            <button type="button" onClick={cancelEdit} className={SMALL_PILL}>
              Cancel the edit
            </button>
          ) : null}
        </div>

        {/* Present from first paint so a screen reader announces the change,
            rather than mounting alongside the result and being missed.

            The 30-day headline, not the 7-day one: the per-focus verdicts
            rendered below are computed over 30 days, and announcing "no
            direction is claimed" from the shorter window while the page shows
            "Moving up" reads as a contradiction. */}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-ink/60">
          {notice ? `${notice} ` : ""}
          {summary && summary.total > 0 ? summary.last30.headline : ""}
        </p>
      </form>

      <section
        className="mt-14 border-t border-ink/10 pt-12"
        aria-labelledby={SUMMARY_ID}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
          What the log can support
        </p>
        <h2
          id={SUMMARY_ID}
          tabIndex={-1}
          className="mt-3 text-4xl text-indigo-deep md:text-5xl"
        >
          Evidence,{" "}
          <em className="font-display italic">not a streak.</em>
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          There is no consecutive-day counter here, and there is not going to
          be. A streak goes up on a session that changed nothing and resets on a
          week off that changed a lot. These numbers only move when the playing
          does.
        </p>

        {summary && summary.total > 0 ? (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {windows.map((window) => (
                <div
                  key={window.days}
                  className="rounded-2xl border border-indigo-deep/10 bg-white/85 p-6"
                >
                  <h3 className="font-display text-2xl text-indigo-deep">
                    Last {window.days} days
                  </h3>
                  <p className="mt-1 text-xs text-ink/55">
                    {formatDate(window.from)} to {formatDate(window.to)}
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-violet">
                        Sessions
                      </dt>
                      <dd className="mt-1 text-3xl font-bold text-indigo-deep">
                        {window.sessions}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-widest text-violet">
                        Focuses
                      </dt>
                      <dd className="mt-1 text-3xl font-bold text-indigo-deep">
                        {window.distinctFocuses}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-ink/70">
                    {window.headline}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="mt-12 font-display text-2xl text-indigo-deep">
              Each focus, over the last {summary.last30.days} days
            </h3>
            {summary.last30.focuses.length === 0 ? (
              <p className="mt-4 text-ink/70">
                Nothing logged in the last {summary.last30.days} days. The
                sessions below are older than that window.
              </p>
            ) : (
              <ul className="mt-6 grid gap-4">
                {summary.last30.focuses.map((focus) => {
                  const unit = focus.metric === "tempo" ? "BPM" : "out of 100";
                  return (
                    <li
                      key={focus.key}
                      className="rounded-2xl border border-indigo-deep/10 bg-white/85 p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-display text-xl leading-snug text-indigo-deep">
                          {focus.focus}
                        </h4>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${TREND_STYLES[focus.trend.verdict]}`}
                        >
                          {focus.trend.label}
                        </span>
                      </div>

                      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                            Best
                          </dt>
                          <dd className="text-lg font-bold text-indigo-deep">
                            {focus.best ?? "—"}{" "}
                            <span className="text-sm font-medium text-ink/60">
                              {unit}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                            Latest
                          </dt>
                          <dd className="text-lg font-bold text-indigo-deep">
                            {focus.latest ?? "—"}{" "}
                            <span className="text-sm font-medium text-ink/60">
                              {unit}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                            Sessions
                          </dt>
                          <dd className="text-lg font-bold text-indigo-deep">
                            {focus.sessions}
                            <span className="text-sm font-medium text-ink/60">
                              {" "}
                              ({sevenDayByFocus.get(focus.key) ?? 0} in the last
                              7 days)
                            </span>
                          </dd>
                        </div>
                      </dl>

                      <p className="mt-4 rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-indigo-deep">
                        {focus.trend.detail}
                      </p>
                      {focus.otherMetricSessions > 0 ? (
                        <p className="mt-3 text-sm text-ink/60">
                          {focus.otherMetricSessions} earlier{" "}
                          {focus.otherMetricSessions === 1
                            ? "session measured"
                            : "sessions measured"}{" "}
                          something else and {" "}
                          {focus.otherMetricSessions === 1 ? "is" : "are"} left
                          out of this comparison. A tempo and a pass rate are not
                          the same number.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="mt-8 rounded-2xl border border-indigo-deep/10 bg-white/85 p-6 text-ink/70">
            Nothing logged yet. Log {MIN_TREND_POINTS} sessions on the same
            focus and this turns into a direction — before that it stays a list,
            because {MIN_TREND_POINTS - 1} points would only draw a line through
            a good day and a bad one.
          </p>
        )}
      </section>

      {entries.length > 0 ? (
        <section className="mt-14 border-t border-ink/10 pt-12" aria-labelledby="log-sessions">
          <h2 id="log-sessions" className="font-display text-3xl text-indigo-deep">
            Every session, newest first
          </h2>
          <p className="mt-3 text-ink/70">
            {entries.length} logged in this browser.
          </p>

          <ol className="mt-8 grid gap-3">
            {ordered.map((entry) => {
              const unit = entry.metric === "tempo" ? "BPM" : "out of 100";
              const pending = pendingDeleteId === entry.id;

              return (
                <li
                  key={entry.id}
                  className={`rounded-2xl border p-5 ${
                    editingId === entry.id
                      ? "border-violet/40 bg-violet-soft/10"
                      : "border-indigo-deep/10 bg-white/85"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                      <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-ink/45">
                      {entry.value} {unit}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep">
                    {entry.focus}
                  </h3>
                  <p className="mt-2 text-ink/70">{entry.note}</p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {pending ? (
                      <>
                        <button
                          type="button"
                          onClick={() => confirmDelete(entry.id)}
                          className={`${SMALL_PILL} border-violet/40 bg-violet-soft/15`}
                        >
                          Remove it for good
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className={SMALL_PILL}
                        >
                          Keep it
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className={SMALL_PILL}
                        >
                          Edit
                          <span className="sr-only">
                            {" "}
                            the session on {formatDate(entry.date)}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(entry.id)}
                          className={SMALL_PILL}
                        >
                          Delete
                          <span className="sr-only">
                            {" "}
                            the session on {formatDate(entry.date)}
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section className="mt-14 border-t border-ink/10 pt-12" aria-labelledby="log-data">
        <h2 id="log-data" className="font-display text-3xl text-indigo-deep">
          The data is yours
        </h2>
        <p className="mt-3 max-w-2xl text-ink/70">
          No account and no upload. Export writes a plain JSON file you can read
          in any text editor, keep as a backup, or open on another machine.
          Importing adds those sessions to this browser — anything identical is
          skipped rather than duplicated.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className={`${SMALL_PILL} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Export {entries.length > 0 ? `${entries.length} sessions` : "the log"}{" "}
            <span aria-hidden>↓</span>
          </button>

          <input
            ref={importRef}
            id="log-import"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event.target.files?.[0])}
            className="peer sr-only"
          />
          <label
            htmlFor="log-import"
            className={`${SMALL_PILL} cursor-pointer peer-focus-visible:[outline:3px_solid_var(--color-violet-soft)] peer-focus-visible:[outline-offset:3px]`}
          >
            Import a log file <span aria-hidden>↑</span>
          </label>

          {entries.length > 0 ? (
            <button type="button" onClick={clearEverything} className={SMALL_PILL}>
              Clear this browser&apos;s log
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
