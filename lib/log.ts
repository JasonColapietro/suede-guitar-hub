/**
 * The practice evidence log.
 *
 * Pure, deterministic, and dependency-free: no React, no `window`, no DOM, and
 * — the rule that matters most here — **no clock**. Every function that needs
 * to know what day it is takes that day as an argument. A module that calls
 * `Date.now()` internally cannot be tested, because its answers change while
 * you are asserting on them; `tests/log.test.ts` proves the absence by making
 * `Date.now` throw and running the whole surface anyway.
 *
 * The thing this tool refuses to do is the point of it.
 *
 *   1. **No streak.** There is no consecutive-day counter anywhere in this file
 *      and there should never be one. A streak measures attendance. It goes up
 *      on a session that changed nothing, and it goes to zero on a week off
 *      that changed a lot. It is a number that always moves, which is exactly
 *      why it feels like evidence and is not.
 *   2. **No direction under three points.** A focus with one or two logged
 *      sessions returns `insufficient`, never `up`. Two points always draw a
 *      line, and the line means nothing. `MIN_TREND_POINTS` is the whole
 *      honesty rule, enforced here rather than in the copy, so no interface
 *      built on this module can talk its way past it.
 *   3. **No claim the numbers do not support.** A rising average whose worst
 *      session fell is `unclear`, not `up`. An average that held while the
 *      individual sessions scattered is `unclear`, not `flat`.
 *
 * Errors are returned, never thrown — the caller is a form handler that has to
 * put a sentence on screen — following the same convention as `lib/tempo.ts`.
 */

/* ------------------------------------------------------------------ *
 * Storage and file identity
 * ------------------------------------------------------------------ */

/**
 * localStorage key.
 *
 * Deliberately unversioned, unlike the tempo and readiness keys. Those tools
 * store a small input the player can retype in seconds, so bumping the key and
 * orphaning the old value costs nothing. A log is the opposite: it is the only
 * copy of work that took weeks to accumulate. The schema version travels
 * *inside* the payload instead, so a future shape change can read what is
 * already there, upgrade it, and write it back to the same key.
 */
export const LOG_STORAGE_KEY = "guitarhub.practice-log";

/** Current stored and exported schema version. */
export const LOG_VERSION = 2;

/**
 * Versions this module can still read.
 *
 * Version 1 stored `bpm` and had no `metric` field, because the log measured
 * tempo and nothing else. Version 2 added pass-rate, which made the measure
 * explicit. `upgradeEntry` below is the whole migration. Anything outside this
 * list is refused rather than guessed at — a payload from a *newer* version was
 * written by code this build has never seen, and reading it optimistically is
 * how you silently drop fields.
 */
export const READABLE_LOG_VERSIONS: readonly number[] = [1, 2];

/** Tag on the exported file, so an unrelated JSON file is refused by name. */
export const LOG_FILE_FORMAT = "guitarhub.practice-log";

/* ------------------------------------------------------------------ *
 * Limits
 * ------------------------------------------------------------------ */

/** Past this the log stops being a log and starts being a database. */
export const MAX_ENTRIES = 500;
export const MAX_FOCUS_LENGTH = 60;
/** One line. Not a journal — the log is for the number and the honest sentence. */
export const MAX_NOTE_LENGTH = 160;

export const TEMPO_MIN = 30;
export const TEMPO_MAX = 300;
export const PASS_RATE_MIN = 0;
export const PASS_RATE_MAX = 100;

/** Nothing before this is a date somebody typed on purpose. */
export const EARLIEST_DATE = "2000-01-01";

/** The two windows the summary reports. */
export const WINDOW_SHORT = 7;
export const WINDOW_LONG = 30;

/**
 * The honesty threshold. Below this, no direction is returned for a focus.
 *
 * Two points define a line through any pair of numbers, including a good day
 * followed by a bad one. Three is the smallest count where a middle session
 * can contradict the two ends, which is the least a direction can be worth.
 */
export const MIN_TREND_POINTS = 3;

/** Rendered wherever a trend is refused. One constant so the copy cannot drift. */
export const NO_EVIDENCE_LABEL = "Not enough evidence yet";

/** A tempo comparison inside this many BPM is the metronome, not you. */
const TEMPO_NOISE_BPM = 2;
/** Above roughly 67 BPM the proportional band overtakes the absolute floor. */
const TEMPO_NOISE_RATIO = 0.03;
/** Pass rate is already a percentage, so its band is absolute. */
const PASS_RATE_NOISE_POINTS = 5;
/**
 * How far a single session may sit from the mean before "flat" stops being an
 * honest word for it. A log whose average held while its sessions swung is not
 * holding steady; it is two different players taking turns.
 */
const FLAT_SPREAD_FACTOR = 2;

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type LogMetric = "tempo" | "pass-rate";

export type LogMetricSpec = {
  id: LogMetric;
  /** Field label. */
  label: string;
  /** Short unit, used inside generated sentences. */
  unit: string;
  min: number;
  max: number;
  /** One sentence on what the number means, shown under the field. */
  help: string;
};

export const LOG_METRICS: readonly LogMetricSpec[] = [
  {
    id: "tempo",
    label: "Tempo reached",
    unit: "BPM",
    min: TEMPO_MIN,
    max: TEMPO_MAX,
    help: "The fastest metronome setting you played it cleanly today, not the fastest you tried.",
  },
  {
    id: "pass-rate",
    label: "Clean passes",
    unit: "out of 100",
    min: PASS_RATE_MIN,
    max: PASS_RATE_MAX,
    help: "Clean run-throughs as a percentage of your attempts. Ten tries and six clean is 60.",
  },
];

export function metricSpec(metric: LogMetric): LogMetricSpec {
  return LOG_METRICS.find((entry) => entry.id === metric) ?? LOG_METRICS[0];
}

export type LogEntry = {
  id: string;
  /** Calendar date, `YYYY-MM-DD`. No time, no timezone. */
  date: string;
  /** Display spelling of what was worked on. */
  focus: string;
  metric: LogMetric;
  /** BPM, or clean passes out of 100. Always a whole number. */
  value: number;
  /** The one honest line about whether it moved. */
  note: string;
};

/** What a form hands in. Every field is `unknown` because a form can hand in anything. */
export type LogDraft = {
  date?: unknown;
  focus?: unknown;
  metric?: unknown;
  value?: unknown;
  note?: unknown;
};

export type LogErrorCode =
  | "date-missing"
  | "date-invalid"
  | "date-in-future"
  | "date-too-old"
  | "focus-missing"
  | "focus-too-long"
  | "metric-invalid"
  | "value-not-a-number"
  | "value-out-of-range"
  | "note-missing"
  | "note-too-long"
  | "log-full"
  | "entry-not-found"
  | "file-unreadable"
  | "file-not-a-log"
  | "file-version-unreadable"
  | "file-empty";

export type LogError = {
  code: LogErrorCode;
  /** Written as copy. The UI renders it verbatim. */
  message: string;
  /** Which field to send focus back to, where one is at fault. */
  field?: "date" | "focus" | "metric" | "value" | "note";
};

export type LogResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LogError };

export type TrendVerdict = "insufficient" | "up" | "flat" | "unclear";

export type LogTrend = {
  verdict: TrendVerdict;
  /** Short badge text. `NO_EVIDENCE_LABEL` when the verdict is insufficient. */
  label: string;
  /** One sentence naming what the numbers did, and what they did not show. */
  detail: string;
  metric: LogMetric;
  /** Sessions that actually fed the comparison. */
  points: number;
  /** Later-half mean minus earlier-half mean, to one decimal. Null when refused. */
  change: number | null;
  /** The band a change has to clear to count, to one decimal. Null when refused. */
  band: number | null;
};

export type FocusSummary = {
  /** Case-folded grouping key. */
  key: string;
  /** Display spelling, taken from the most recent entry. */
  focus: string;
  /** The metric compared: whichever the most recent session used. */
  metric: LogMetric;
  /** Every session for this focus in the window, whatever it measured. */
  sessions: number;
  /** The best value recorded on the compared metric, or null when there is none. */
  best: number | null;
  /** The most recent value on the compared metric. */
  latest: number | null;
  /** Sessions in the window that measured something else and were left out. */
  otherMetricSessions: number;
  trend: LogTrend;
};

export type LogWindowSummary = {
  days: number;
  /** Inclusive first day of the window, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive last day of the window — the `today` that was passed in. */
  to: string;
  sessions: number;
  distinctFocuses: number;
  /** Focuses with enough sessions for a direction. */
  focusesWithEvidence: number;
  focuses: FocusSummary[];
  /** One sentence, generated from the counts above and nothing else. */
  headline: string;
};

export type LogSummary = {
  today: string;
  /** Every entry held, including any outside both windows. */
  total: number;
  firstDate: string | null;
  lastDate: string | null;
  last7: LogWindowSummary;
  last30: LogWindowSummary;
};

export type LogFile = {
  format: string;
  version: number;
  exportedOn: string;
  entries: LogEntry[];
};

/** What a file yielded, and what it held that would not fit. */
export type LogImport = {
  entries: LogEntry[];
  /**
   * Readable sessions the file held beyond `MAX_ENTRIES`, all older than the
   * ones kept. Never silently zero: the caller has to say this out loud.
   */
  truncated: number;
};

export type LogMerge = {
  entries: LogEntry[];
  added: number;
  /** Incoming sessions identical to one already held. */
  skipped: number;
  /** Incoming sessions the log had no room for. Never counted as duplicates. */
  dropped: number;
};

/* ------------------------------------------------------------------ *
 * Dates, without a clock
 * ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The only function here that touches a live `Date`, and it takes it as an
 * argument. The caller reads the clock; this converts what it read.
 *
 * Local getters on purpose: a session logged at 11pm belongs to the day the
 * player just practised, not to tomorrow in UTC.
 */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True only for a real calendar date written `YYYY-MM-DD`. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  // Round-tripping catches both February 30th and the two-digit-year window
  // `Date.UTC` applies below 100, which would otherwise let "0099-01-01" pass.
  const stamp = Date.UTC(year, month - 1, day);
  const back = new Date(stamp);
  return (
    back.getUTCFullYear() === year &&
    back.getUTCMonth() === month - 1 &&
    back.getUTCDate() === day
  );
}

/** Days since the epoch. `Date.UTC` is arithmetic, not a clock read. */
export function dayNumber(iso: string): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Whole days from `from` to `to`. Negative when `to` is the earlier date. */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** `offset` days from `iso`, as another ISO date. */
export function shiftIsoDate(iso: string, offset: number): string {
  const shifted = new Date((dayNumber(iso) + offset) * MS_PER_DAY);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/* ------------------------------------------------------------------ *
 * Text normalization
 * ------------------------------------------------------------------ */

/** Trim and collapse runs of whitespace, newlines included. */
function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeFocus(value: unknown): string {
  return typeof value === "string" ? collapse(value) : "";
}

/**
 * Grouping key. "Bourrée bar 12" and "bourrée  BAR 12" are the same passage,
 * and a log that treats them as two is a log that never reaches three points.
 */
export function focusKey(value: string): string {
  return collapse(value).toLowerCase();
}

function slug(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
  return cleaned || "session";
}

/**
 * A readable id, made unique against the ids already in use.
 *
 * Derived rather than random so that the same log built the same way is
 * byte-identical, which is what makes an export/import round-trip assertable.
 *
 * `resume` is not an optimisation for its own sake. Reading a file validates
 * every row rather than the first `MAX_ENTRIES` of them — that is what stopped
 * imports discarding the newest sessions — so a file whose rows all share a
 * date and a focus hands this function the same `base` thousands of times. One
 * passage logged over and over is exactly the usage this tool encourages, so
 * that file shape is ordinary, not adversarial. Rescanning from suffix 2 every
 * time is quadratic: 5.3 seconds of frozen main thread on 20,000 such rows,
 * against 118ms when the focuses differ. Remembering where each base got to
 * makes the common case a single lookup.
 *
 * The scan stays as the correctness path. `resume` is a hint about where free
 * suffixes start, never a promise that the one it names is free — ids can also
 * arrive from the file itself, and those are added to `taken` without this
 * function ever seeing them.
 */
function makeId(
  date: string,
  focus: string,
  taken: Set<string>,
  resume?: Map<string, number>,
): string {
  const base = `${date}-${slug(focus)}`;
  if (!taken.has(base)) return base;

  // Bounded by pigeonhole rather than by MAX_ENTRIES: at most `taken.size` of
  // the suffixes in this range can be spoken for, so one of them is free. The
  // old ceiling assumed no more than MAX_ENTRIES ids were ever in play, which
  // stopped being true once a whole file is read before it is cut down.
  const ceiling = taken.size + 2;
  for (let suffix = resume?.get(base) ?? 2; suffix <= ceiling; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) {
      resume?.set(base, suffix + 1);
      return candidate;
    }
  }
  return `${base}-${taken.size + 1}`;
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function fail<T>(
  code: LogErrorCode,
  message: string,
  field?: LogError["field"],
): LogResult<T> {
  return { ok: false, error: { code, message, ...(field ? { field } : {}) } };
}

function readMetric(value: unknown): LogMetric | null {
  return value === "tempo" || value === "pass-rate" ? value : null;
}

/**
 * Validate one drafted session against the day it is being logged on.
 *
 * `today` is required and is never read from the system. A session dated
 * tomorrow is refused: the log is a record of what happened, and a record of
 * what has not happened yet is the one thing it must never hold.
 */
export function validateDraft(
  draft: LogDraft,
  today: string,
): LogResult<Omit<LogEntry, "id">> {
  if (draft.date === undefined || draft.date === null || draft.date === "") {
    return fail("date-missing", "Pick the date you practised.", "date");
  }
  if (!isIsoDate(draft.date)) {
    return fail(
      "date-invalid",
      "That is not a date the log can read. Use the date picker.",
      "date",
    );
  }
  if (isIsoDate(today) && daysBetween(draft.date, today) < 0) {
    return fail(
      "date-in-future",
      "That date has not happened yet. A log records sessions you have already done.",
      "date",
    );
  }
  if (daysBetween(EARLIEST_DATE, draft.date) < 0) {
    return fail(
      "date-too-old",
      `The log starts at ${EARLIEST_DATE}. Check the year on that date.`,
      "date",
    );
  }

  const focus = normalizeFocus(draft.focus);
  if (focus.length === 0) {
    return fail(
      "focus-missing",
      "Name what you worked on. One passage or one skill, not the whole song.",
      "focus",
    );
  }
  if (focus.length > MAX_FOCUS_LENGTH) {
    return fail(
      "focus-too-long",
      `Keep the focus under ${MAX_FOCUS_LENGTH} characters so it groups with the other sessions on it.`,
      "focus",
    );
  }

  const metric = readMetric(draft.metric);
  if (metric === null) {
    return fail(
      "metric-invalid",
      "Choose whether you are recording a tempo or a pass rate.",
      "metric",
    );
  }

  const spec = metricSpec(metric);
  const value =
    typeof draft.value === "number"
      ? draft.value
      : typeof draft.value === "string" && collapse(draft.value) !== ""
        ? Number(collapse(draft.value))
        : Number.NaN;

  if (!Number.isInteger(value)) {
    return fail(
      "value-not-a-number",
      `Enter the ${metric === "tempo" ? "tempo" : "pass rate"} as a whole number.`,
      "value",
    );
  }
  if (value < spec.min || value > spec.max) {
    return fail(
      "value-out-of-range",
      `That has to sit between ${spec.min} and ${spec.max}.`,
      "value",
    );
  }

  const note = typeof draft.note === "string" ? collapse(draft.note) : "";
  if (note.length === 0) {
    return fail(
      "note-missing",
      "Write the one honest line: did it move, or did it not?",
      "note",
    );
  }
  if (note.length > MAX_NOTE_LENGTH) {
    return fail(
      "note-too-long",
      `Keep the note to one line, under ${MAX_NOTE_LENGTH} characters.`,
      "note",
    );
  }

  return { ok: true, value: { date: draft.date, focus, metric, value, note } };
}

/* ------------------------------------------------------------------ *
 * Ordering
 * ------------------------------------------------------------------ */

/** Oldest first, ties broken by id so the order is total and stable. */
export function sortEntries(entries: readonly LogEntry[]): LogEntry[] {
  return [...entries].sort((left, right) =>
    left.date === right.date
      ? left.id.localeCompare(right.id)
      : left.date.localeCompare(right.date),
  );
}

/** Newest first. What the list on screen shows. */
export function recentFirst(entries: readonly LogEntry[]): LogEntry[] {
  return sortEntries(entries).reverse();
}

/* ------------------------------------------------------------------ *
 * Add, edit, delete
 * ------------------------------------------------------------------ */

export function addEntry(
  entries: readonly LogEntry[],
  draft: LogDraft,
  today: string,
): LogResult<LogEntry[]> {
  if (entries.length >= MAX_ENTRIES) {
    return fail(
      "log-full",
      `This log holds ${MAX_ENTRIES} sessions. Export it, then clear it to keep going.`,
    );
  }

  const checked = validateDraft(draft, today);
  if (!checked.ok) return checked;

  const taken = new Set(entries.map((entry) => entry.id));
  const entry: LogEntry = {
    id: makeId(checked.value.date, checked.value.focus, taken),
    ...checked.value,
  };

  return { ok: true, value: sortEntries([...entries, entry]) };
}

/**
 * Rewrite one session in place.
 *
 * The id survives the edit even when the date changes, so anything holding a
 * reference to this entry — a selection, a scroll target — keeps pointing at
 * it. The id is a handle, not a description.
 */
export function updateEntry(
  entries: readonly LogEntry[],
  id: string,
  draft: LogDraft,
  today: string,
): LogResult<LogEntry[]> {
  const existing = entries.find((entry) => entry.id === id);
  if (!existing) {
    return fail(
      "entry-not-found",
      "That session is no longer in this log. Nothing was changed.",
    );
  }

  const checked = validateDraft(draft, today);
  if (!checked.ok) return checked;

  return {
    ok: true,
    value: sortEntries(
      entries.map((entry) =>
        entry.id === id ? { id, ...checked.value } : entry,
      ),
    ),
  };
}

/** Remove by id. An id that is not here changes nothing, which is not an error. */
export function removeEntry(
  entries: readonly LogEntry[],
  id: string,
): LogEntry[] {
  return sortEntries(entries.filter((entry) => entry.id !== id));
}

/** Every focus in the log, most recently used first. Feeds the input's datalist. */
export function knownFocuses(entries: readonly LogEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const entry of recentFirst(entries)) {
    const key = focusKey(entry.focus);
    if (!seen.has(key)) seen.set(key, entry.focus);
  }
  return [...seen.values()];
}

/* ------------------------------------------------------------------ *
 * Trend
 * ------------------------------------------------------------------ */

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function noiseBand(metric: LogMetric, reference: number): number {
  return metric === "tempo"
    ? Math.max(TEMPO_NOISE_BPM, Math.abs(reference) * TEMPO_NOISE_RATIO)
    : PASS_RATE_NOISE_POINTS;
}

function unitOf(metric: LogMetric): string {
  return metric === "tempo" ? "BPM" : "points";
}

function insufficientTrend(metric: LogMetric, points: number): LogTrend {
  const sessions = points === 1 ? "1 session" : `${points} sessions`;
  return {
    verdict: "insufficient",
    label: NO_EVIDENCE_LABEL,
    detail:
      points === 0
        ? `Nothing logged on this measure yet. ${MIN_TREND_POINTS} sessions is where a direction starts to mean anything.`
        : `${sessions} logged, and this tool will not call a direction under ${MIN_TREND_POINTS}. Two points draw a line through any pair of numbers, including a good day next to a bad one.`,
    metric,
    points,
    change: null,
    band: null,
  };
}

/**
 * The direction of one focus, or a refusal.
 *
 * Split the sessions in half by date, compare the two means, and require the
 * gap to clear a noise band before it is called anything. On an odd count the
 * middle session belongs to neither half, so three sessions compare the first
 * against the last, with the middle one free to contradict them: the mean
 * comparison never reads it, and both guards below do.
 *
 * Two guards stop the comparison from flattering the player:
 *
 *   - A rise only counts as `up` if the worst session in the series is not
 *     below the worst of the earlier ones. Every session, including any the
 *     halves left out, and with no noise tolerance, because the sentence this
 *     prints claims no tolerance. A top that moved while the floor dropped is
 *     a wider spread, not progress.
 *   - `flat` requires every session to sit near the overall mean. An average
 *     that held while the sessions swung is not steadiness.
 *
 * Entries must already be filtered to one focus and one metric.
 */
export function trendForValues(
  values: readonly number[],
  metric: LogMetric,
): LogTrend {
  if (values.length < MIN_TREND_POINTS) {
    return insufficientTrend(metric, values.length);
  }

  const half = Math.floor(values.length / 2);
  const earlier = values.slice(0, half);
  const later = values.slice(values.length - half);
  const earlierMean = mean(earlier);
  const laterMean = mean(later);
  const change = laterMean - earlierMean;
  const band = noiseBand(metric, earlierMean);
  const unit = unitOf(metric);

  const base = {
    metric,
    points: values.length,
    change: round1(change),
    band: round1(band),
  };

  if (change > band) {
    // Every session, not just the two halves. On an odd count the middle one
    // belongs to neither half, so a guard that reads only `later` asserts
    // "your worst session did not get worse" about a number it never looked
    // at. No tolerance either: `band` calibrates one mean against another,
    // and a single session's floor is not a mean.
    const floorHeld = Math.min(...values) >= Math.min(...earlier);
    return floorHeld
      ? {
          ...base,
          verdict: "up",
          label: "Moving up",
          detail: `Your later sessions average ${round1(change)} ${unit} above the earlier ones, and your worst session did not get worse. That is movement, not a good day.`,
        }
      : {
          ...base,
          verdict: "unclear",
          label: "No clear direction",
          detail: `The average rose ${round1(change)} ${unit}, but your worst session dropped with it. A wider spread is not the same as progress, so this is not called an improvement.`,
        };
  }

  if (change < -band) {
    return {
      ...base,
      verdict: "unclear",
      label: "No clear direction",
      detail: `Your later sessions average ${round1(Math.abs(change))} ${unit} below the earlier ones. That is worth knowing rather than hiding: something changed, and the log does not know what.`,
    };
  }

  const overall = mean(values);
  const allowed = band * FLAT_SPREAD_FACTOR;
  const steady = values.every((value) => Math.abs(value - overall) <= allowed);

  return steady
    ? {
        ...base,
        verdict: "flat",
        label: "Holding",
        detail: `The two halves sit within ${round1(band)} ${unit} of each other and no session strayed far from the average. You are holding this, which is a real result and not the same as improving.`,
      }
    : {
        ...base,
        verdict: "unclear",
        label: "No clear direction",
        detail: `The average barely moved, but the individual sessions did — they range across ${round1(Math.max(...values) - Math.min(...values))} ${unit}. An average that holds while the sessions swing is not steadiness.`,
      };
}

/**
 * The direction of a focus from its entries, choosing what to compare.
 *
 * A focus measured in BPM one week and pass rate the next has two incomparable
 * series, so the comparison uses the metric of the most recent session and says
 * how many sessions that left out. Averaging a tempo with a percentage would
 * produce a confident number about nothing.
 */
export function trendForEntries(entries: readonly LogEntry[]): LogTrend {
  const ordered = sortEntries(entries);
  if (ordered.length === 0) return insufficientTrend("tempo", 0);

  const metric = ordered[ordered.length - 1].metric;
  const values = ordered
    .filter((entry) => entry.metric === metric)
    .map((entry) => entry.value);

  return trendForValues(values, metric);
}

/* ------------------------------------------------------------------ *
 * Summaries
 * ------------------------------------------------------------------ */

/** Entries inside the `days`-day window ending on, and including, `today`. */
export function entriesInWindow(
  entries: readonly LogEntry[],
  today: string,
  days: number,
): LogEntry[] {
  return sortEntries(entries).filter((entry) => {
    const age = daysBetween(entry.date, today);
    return age >= 0 && age < days;
  });
}

function summarizeFocus(entries: readonly LogEntry[]): FocusSummary {
  const ordered = sortEntries(entries);
  const newest = ordered[ordered.length - 1];
  const metric = newest.metric;
  const comparable = ordered.filter((entry) => entry.metric === metric);
  const values = comparable.map((entry) => entry.value);

  return {
    key: focusKey(newest.focus),
    focus: newest.focus,
    metric,
    sessions: ordered.length,
    best: values.length > 0 ? Math.max(...values) : null,
    latest: values.length > 0 ? values[values.length - 1] : null,
    otherMetricSessions: ordered.length - comparable.length,
    // The same rule, from the one function that owns it: compare the metric the
    // most recent session used, and leave the rest out.
    trend: trendForEntries(ordered),
  };
}

function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`;
}

/**
 * Sessions, distinct focuses and per-focus bests over a fixed window.
 *
 * `today` is the last day of the window and is always supplied by the caller.
 */
export function summarizeWindow(
  entries: readonly LogEntry[],
  today: string,
  days: number,
): LogWindowSummary {
  const inside = entriesInWindow(entries, today, days);

  const grouped = new Map<string, LogEntry[]>();
  for (const entry of inside) {
    const key = focusKey(entry.focus);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(entry);
    else grouped.set(key, [entry]);
  }

  const focuses = [...grouped.values()]
    .map(summarizeFocus)
    .sort((left, right) => {
      if (right.sessions !== left.sessions) return right.sessions - left.sessions;
      return left.key.localeCompare(right.key);
    });

  const withEvidence = focuses.filter(
    (focus) => focus.trend.verdict !== "insufficient",
  ).length;

  const window = `the last ${days} days`;
  let headline: string;
  if (inside.length === 0) {
    headline = `No sessions logged in ${window}. The log has nothing to show you, which is itself the honest answer.`;
  } else {
    const counted = `${plural(inside.length, "session", "sessions")} across ${plural(focuses.length, "focus", "focuses")} in ${window}.`;
    headline =
      withEvidence === 0
        ? `${counted} None of them has reached ${MIN_TREND_POINTS} sessions yet, so no direction is claimed.`
        : `${counted} ${plural(withEvidence, "focus has", "focuses have")} enough sessions for a direction.`;
  }

  return {
    days,
    from: shiftIsoDate(today, -(days - 1)),
    to: today,
    sessions: inside.length,
    distinctFocuses: focuses.length,
    focusesWithEvidence: withEvidence,
    focuses,
    headline,
  };
}

/** Both windows plus the log's own extent. Never reads the clock. */
export function summarizeLog(
  entries: readonly LogEntry[],
  today: string,
): LogSummary {
  const ordered = sortEntries(entries);
  return {
    today,
    total: ordered.length,
    firstDate: ordered.length > 0 ? ordered[0].date : null,
    lastDate: ordered.length > 0 ? ordered[ordered.length - 1].date : null,
    last7: summarizeWindow(ordered, today, WINDOW_SHORT),
    last30: summarizeWindow(ordered, today, WINDOW_LONG),
  };
}

/* ------------------------------------------------------------------ *
 * Reading entries back: storage, files, and the version migration
 * ------------------------------------------------------------------ */

/**
 * Version 1 stored the tempo as `bpm` with no `metric` field. Anything it held
 * was a tempo, so the upgrade names the measure it always was.
 */
function upgradeEntry(raw: Record<string, unknown>, version: number): unknown {
  if (version >= 2) return raw;
  const { bpm, ...rest } = raw;
  return { ...rest, metric: "tempo", value: bpm };
}

/**
 * Read one stored or imported entry, or return null to drop it.
 *
 * Unlike `validateDraft` this does not refuse a future date. A stored log is
 * the player's own record, and a mis-set system clock two months ago is not a
 * reason to delete the session they actually played.
 */
function readEntry(
  candidate: unknown,
  taken: Set<string>,
  resume?: Map<string, number>,
): LogEntry | null {
  if (!candidate || typeof candidate !== "object") return null;
  const raw = candidate as Record<string, unknown>;

  if (!isIsoDate(raw.date)) return null;
  if (daysBetween(EARLIEST_DATE, raw.date) < 0) return null;

  const focus = normalizeFocus(raw.focus);
  if (focus.length === 0 || focus.length > MAX_FOCUS_LENGTH) return null;

  const metric = readMetric(raw.metric);
  if (metric === null) return null;

  const spec = metricSpec(metric);
  if (typeof raw.value !== "number" || !Number.isInteger(raw.value)) return null;
  if (raw.value < spec.min || raw.value > spec.max) return null;

  const note = typeof raw.note === "string" ? collapse(raw.note) : "";
  if (note.length === 0 || note.length > MAX_NOTE_LENGTH) return null;

  // An id is re-minted whenever it is missing, not a string, or already in use.
  // Two entries sharing an id would make edit and delete hit the wrong session.
  const supplied = typeof raw.id === "string" ? collapse(raw.id) : "";
  const id =
    supplied.length > 0 && supplied.length <= 80 && !taken.has(supplied)
      ? supplied
      : makeId(raw.date, focus, taken, resume);
  taken.add(id);

  return { id, date: raw.date, focus, metric, value: raw.value, note };
}

/**
 * Read every row, then keep at most `MAX_ENTRIES` of them — the newest.
 *
 * Two things this deliberately does not do. It does not cut the raw array
 * before validating, because the first 500 rows of a file are not the first
 * 500 sessions in it: unreadable rows would take slots from real ones. And it
 * does not keep the head of the sorted result, because `exportLog` writes
 * oldest-first, so the head is the oldest work and the tail is the part the
 * 7- and 30-day windows actually read. Dropping the tail would throw away
 * exactly the sessions the player came to see.
 *
 * `truncated` is returned rather than swallowed, for the same reason `mergeLog`
 * counts `dropped` apart from `skipped`: the tool does not get to imply it kept
 * something it did not.
 */
function readEntryList(
  candidate: unknown,
  version: number,
): { entries: LogEntry[]; truncated: number } {
  if (!Array.isArray(candidate)) return { entries: [], truncated: 0 };
  const taken = new Set<string>();
  const resume = new Map<string, number>();
  const entries: LogEntry[] = [];

  for (const item of candidate) {
    const upgraded =
      item && typeof item === "object"
        ? upgradeEntry(item as Record<string, unknown>, version)
        : item;
    const entry = readEntry(upgraded, taken, resume);
    // A single unreadable row is dropped, not fatal. One corrupt line must
    // never cost the player the rest of the log.
    if (entry) entries.push(entry);
  }

  const ordered = sortEntries(entries);
  if (ordered.length <= MAX_ENTRIES) return { entries: ordered, truncated: 0 };

  return {
    entries: ordered.slice(ordered.length - MAX_ENTRIES),
    truncated: ordered.length - MAX_ENTRIES,
  };
}

/** Exactly what goes into localStorage. The version travels with the data. */
export function storedLogPayload(entries: readonly LogEntry[]): {
  version: number;
  entries: LogEntry[];
} {
  return { version: LOG_VERSION, entries: sortEntries(entries) };
}

/**
 * Restore from a parsed localStorage payload.
 *
 * Returns null only when the envelope itself is unusable — not an object, or
 * carrying a version this build cannot read. A readable envelope with some bad
 * rows returns the good rows, because dropping a whole log over one broken
 * entry is a worse failure than losing the entry.
 */
export function restoreLogState(candidate: unknown): LogEntry[] | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const raw = candidate as Record<string, unknown>;
  const version =
    typeof raw.version === "number" && Number.isInteger(raw.version)
      ? raw.version
      : null;

  if (version === null || !READABLE_LOG_VERSIONS.includes(version)) return null;
  if (!Array.isArray(raw.entries)) return null;

  // A stored log written by this build can never be over the cap, so the
  // truncation count has no one to report to here. It matters on import, where
  // the file came from somewhere else.
  return readEntryList(raw.entries, version).entries;
}

/* ------------------------------------------------------------------ *
 * Export and import
 * ------------------------------------------------------------------ */

export function exportLog(
  entries: readonly LogEntry[],
  today: string,
): LogFile {
  return {
    format: LOG_FILE_FORMAT,
    version: LOG_VERSION,
    exportedOn: today,
    entries: sortEntries(entries),
  };
}

/** The exact text of the downloaded file. Indented so it is readable by hand. */
export function serializeLog(
  entries: readonly LogEntry[],
  today: string,
): string {
  return `${JSON.stringify(exportLog(entries, today), null, 2)}\n`;
}

export function exportFileName(today: string): string {
  const stamp = isIsoDate(today) ? today : "export";
  return `guitarhub-practice-log-${stamp}.json`;
}

/** Read a file the player chose. Accepts the raw text or an already-parsed value. */
export function importLog(candidate: unknown): LogResult<LogImport> {
  let parsed: unknown = candidate;

  if (typeof candidate === "string") {
    try {
      parsed = JSON.parse(candidate);
    } catch {
      return fail(
        "file-unreadable",
        "That file is not readable JSON. Choose the file this tool exported.",
      );
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return fail(
      "file-not-a-log",
      "That file is not a practice log export. Choose the file this tool exported.",
    );
  }

  const raw = parsed as Record<string, unknown>;
  if (raw.format !== LOG_FILE_FORMAT) {
    return fail(
      "file-not-a-log",
      "That file is not a practice log export. Choose the file this tool exported.",
    );
  }

  const version =
    typeof raw.version === "number" && Number.isInteger(raw.version)
      ? raw.version
      : null;
  if (version === null || !READABLE_LOG_VERSIONS.includes(version)) {
    return fail(
      "file-version-unreadable",
      "That export was written by a version of this tool the page cannot read. Nothing was changed.",
    );
  }

  const read = readEntryList(raw.entries, version);
  if (read.entries.length === 0) {
    return fail(
      "file-empty",
      "There were no readable sessions in that file, so nothing was imported.",
    );
  }

  return { ok: true, value: read };
}

/**
 * Two sessions are the same session when every field except the id matches.
 *
 * Rendered as one string so sameness is a `Set` lookup rather than a scan of
 * everything held: a 500-into-500 import is otherwise 250,000 comparisons, each
 * one re-normalizing text that `readEntry` already normalized. `JSON.stringify`
 * over the tuple rather than a joined separator, so a focus containing the
 * separator cannot collide with a different session and be called a duplicate.
 */
function sessionKey(entry: LogEntry): string {
  return JSON.stringify([
    entry.date,
    focusKey(entry.focus),
    entry.metric,
    entry.value,
    collapse(entry.note),
  ]);
}

/**
 * Fold an import into what this browser already holds.
 *
 * Additive on purpose. Importing on a second machine should not be able to
 * destroy the log that is already there, so an incoming session is either new
 * or an exact duplicate that is skipped. Ids are re-minted on collision, since
 * the same id arriving twice would break edit and delete.
 */
export function mergeLog(
  existing: readonly LogEntry[],
  incoming: readonly LogEntry[],
): LogMerge {
  const kept = sortEntries(existing);
  const taken = new Set(kept.map((entry) => entry.id));
  // Grown as entries are kept, so a file holding the same session twice sees
  // the second copy skipped against the first, exactly as before.
  const held = new Set(kept.map(sessionKey));
  let added = 0;
  let skipped = 0;
  let dropped = 0;

  for (const entry of sortEntries(incoming)) {
    const key = sessionKey(entry);
    if (held.has(key)) {
      skipped += 1;
      continue;
    }
    // Counted apart from `skipped`: a session there was no room for was not a
    // duplicate, and telling the player it was already here would be a lie.
    if (kept.length >= MAX_ENTRIES) {
      dropped += 1;
      continue;
    }

    const id = taken.has(entry.id)
      ? makeId(entry.date, entry.focus, taken)
      : entry.id;
    taken.add(id);
    held.add(key);
    kept.push({ ...entry, id });
    added += 1;
  }

  return { entries: sortEntries(kept), added, skipped, dropped };
}
