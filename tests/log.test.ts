import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EARLIEST_DATE,
  LOG_FILE_FORMAT,
  LOG_VERSION,
  MAX_ENTRIES,
  MAX_FOCUS_LENGTH,
  MAX_NOTE_LENGTH,
  MIN_TREND_POINTS,
  NO_EVIDENCE_LABEL,
  WINDOW_LONG,
  WINDOW_SHORT,
  addEntry,
  daysBetween,
  entriesInWindow,
  exportFileName,
  focusKey,
  importLog,
  isIsoDate,
  knownFocuses,
  mergeLog,
  recentFirst,
  removeEntry,
  restoreLogState,
  serializeLog,
  shiftIsoDate,
  storedLogPayload,
  summarizeLog,
  summarizeWindow,
  toIsoDate,
  trendForEntries,
  trendForValues,
  updateEntry,
  type LogDraft,
  type LogEntry,
  type LogMetric,
} from "../lib/log.ts";

/** The one "today" every assertion below is anchored to. Never `new Date()`. */
const TODAY = "2026-08-29";

function draft(
  date: string,
  focus: string,
  value: number,
  note = "logged it honestly",
  metric: LogMetric = "tempo",
): LogDraft {
  return { date, focus, value, note, metric };
}

/** Build a log through the real add path, so nothing under test is hand-forged. */
function build(drafts: readonly LogDraft[], today = TODAY): LogEntry[] {
  let entries: LogEntry[] = [];
  for (const item of drafts) {
    const result = addEntry(entries, item, today);
    if (!result.ok) {
      assert.fail(`${JSON.stringify(item)} must add, got ${result.error.code}`);
    }
    entries = result.value;
  }
  return entries;
}

function errorFor(
  entries: readonly LogEntry[],
  item: LogDraft,
  today = TODAY,
): { code: string; message: string; field?: string } {
  const result = addEntry(entries, item, today);
  if (result.ok) assert.fail(`${JSON.stringify(item)} must be refused`);
  return result.error;
}

/* ------------------------------------------------------------------ *
 * The clock
 * ------------------------------------------------------------------ */

test("never reads the clock, so the same log always summarizes the same way", () => {
  // Two checks, because either alone is weak. The static one proves the source
  // contains no clock call; the dynamic one proves nothing reaches for one at
  // runtime through some indirection the grep would miss.
  const source = readFileSync(new URL("../lib/log.ts", import.meta.url), "utf8");
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  assert.doesNotMatch(code, /\bDate\.now\s*\(/, "lib/log.ts must not call Date.now()");
  assert.doesNotMatch(
    code,
    /new\s+Date\s*\(\s*\)/,
    "lib/log.ts must not construct a Date from the system clock",
  );

  const entries = build([
    draft(shiftIsoDate(TODAY, -4), "riff", 92),
    draft(shiftIsoDate(TODAY, -2), "riff", 96),
    draft(TODAY, "riff", 100),
  ]);

  const realNow = Date.now;
  try {
    Date.now = () => {
      throw new Error("the log read the clock");
    };

    const first = summarizeLog(entries, TODAY);
    const second = summarizeLog(entries, TODAY);
    assert.deepEqual(first, second, "the same inputs must give the same summary");
    assert.equal(first.last7.sessions, 3);
    assert.equal(trendForEntries(entries).verdict, "up");
    assert.equal(importLog(serializeLog(entries, TODAY)).ok, true);
  } finally {
    Date.now = realNow;
  }
});

test("reads calendar dates without a timezone anywhere near them", () => {
  assert.equal(isIsoDate("2026-08-29"), true);
  assert.equal(isIsoDate("2024-02-29"), true, "2024 is a leap year");
  assert.equal(isIsoDate("2026-02-29"), false, "2026 is not");
  assert.equal(isIsoDate("2026-13-01"), false);
  assert.equal(isIsoDate("2026-08-32"), false);
  assert.equal(isIsoDate("0099-01-01"), false, "Date.UTC remaps years under 100");
  assert.equal(isIsoDate("2026-8-9"), false, "the format is padded or it is not read");
  assert.equal(isIsoDate("29/08/2026"), false);
  assert.equal(isIsoDate(20260829), false);
  assert.equal(isIsoDate(null), false);

  assert.equal(daysBetween("2026-08-22", "2026-08-29"), 7);
  assert.equal(daysBetween("2026-08-29", "2026-08-22"), -7);
  assert.equal(daysBetween("2026-08-29", "2026-08-29"), 0);
  assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2, "a leap day counts");
  assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1, "and a February without one does not");
  assert.equal(daysBetween("2025-12-31", "2026-01-01"), 1, "so does a year end");

  assert.equal(shiftIsoDate("2026-08-29", -7), "2026-08-22");
  assert.equal(shiftIsoDate("2026-08-29", -29), "2026-07-31");
  assert.equal(shiftIsoDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftIsoDate("2026-08-29", 0), "2026-08-29");

  // Local getters, not UTC: a session logged at 11pm belongs to that evening.
  assert.equal(toIsoDate(new Date(2026, 7, 29, 23, 45)), "2026-08-29");
  assert.equal(toIsoDate(new Date(2026, 0, 5, 0, 30)), "2026-01-05");
});

/* ------------------------------------------------------------------ *
 * Add, edit, delete
 * ------------------------------------------------------------------ */

test("adds a session, normalizes what was typed, and keeps the log in date order", () => {
  const entries = build([
    draft("2026-08-27", "  Bourrée   bar 12 ", 88, "  still  rushing\nthe turn "),
    draft("2026-08-20", "Bourrée bar 12", 80),
    draft("2026-08-24", "Bourrée bar 12", 84),
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.date),
    ["2026-08-20", "2026-08-24", "2026-08-27"],
    "the log is stored oldest first regardless of the order it was typed in",
  );
  assert.equal(entries[2].focus, "Bourrée bar 12", "whitespace is collapsed");
  assert.equal(
    entries[2].note,
    "still rushing the turn",
    "the note is one line, newlines included",
  );
  assert.equal(entries[2].metric, "tempo");
  assert.equal(entries[2].value, 88);
  assert.equal(
    new Set(entries.map((entry) => entry.id)).size,
    3,
    "ids must be unique or edit and delete hit the wrong session",
  );

  // Same date and same focus twice: the id has to stay unique anyway.
  const twice = build([
    draft("2026-08-20", "riff", 80),
    draft("2026-08-20", "riff", 84),
  ]);
  assert.equal(new Set(twice.map((entry) => entry.id)).size, 2);

  assert.deepEqual(
    recentFirst(entries).map((entry) => entry.date),
    ["2026-08-27", "2026-08-24", "2026-08-20"],
  );
  assert.deepEqual(knownFocuses(entries), ["Bourrée bar 12"]);
});

test("refuses a session the log cannot stand behind", () => {
  const existing = build([draft("2026-08-20", "riff", 80)]);

  assert.equal(errorFor(existing, { ...draft("", "riff", 80) }).code, "date-missing");
  assert.equal(errorFor(existing, draft("2026-02-30", "riff", 80)).code, "date-invalid");
  assert.equal(errorFor(existing, draft("tomorrow", "riff", 80)).code, "date-invalid");

  const future = errorFor(existing, draft(shiftIsoDate(TODAY, 1), "riff", 80));
  assert.equal(future.code, "date-in-future");
  assert.equal(future.field, "date");
  assert.match(future.message, /already done/i);
  // The day itself is fine; only the day after it is not.
  assert.equal(addEntry(existing, draft(TODAY, "riff", 80), TODAY).ok, true);

  assert.equal(
    errorFor(existing, draft(shiftIsoDate(EARLIEST_DATE, -1), "riff", 80)).code,
    "date-too-old",
  );
  assert.equal(addEntry(existing, draft(EARLIEST_DATE, "riff", 80), TODAY).ok, true);

  assert.equal(errorFor(existing, draft("2026-08-20", "   ", 80)).code, "focus-missing");
  assert.equal(
    errorFor(existing, draft("2026-08-20", "x".repeat(MAX_FOCUS_LENGTH + 1), 80)).code,
    "focus-too-long",
  );
  assert.equal(
    addEntry(existing, draft("2026-08-20", "x".repeat(MAX_FOCUS_LENGTH), 80), TODAY).ok,
    true,
    "the length limit is inclusive",
  );

  assert.equal(
    errorFor(existing, { ...draft("2026-08-20", "riff", 80), metric: "vibes" }).code,
    "metric-invalid",
  );
  assert.equal(
    errorFor(existing, { ...draft("2026-08-20", "riff", 80), metric: undefined }).code,
    "metric-invalid",
  );

  assert.equal(
    errorFor(existing, draft("2026-08-20", "riff", 88.5)).code,
    "value-not-a-number",
  );
  assert.equal(
    errorFor(existing, { ...draft("2026-08-20", "riff", 0), value: "  " }).code,
    "value-not-a-number",
  );
  assert.equal(errorFor(existing, draft("2026-08-20", "riff", 29)).code, "value-out-of-range");
  assert.equal(errorFor(existing, draft("2026-08-20", "riff", 301)).code, "value-out-of-range");
  assert.equal(
    errorFor(existing, draft("2026-08-20", "riff", 101, "note", "pass-rate")).code,
    "value-out-of-range",
  );
  assert.equal(
    addEntry(existing, draft("2026-08-20", "riff", 100, "note", "pass-rate"), TODAY).ok,
    true,
  );
  assert.equal(
    addEntry(existing, draft("2026-08-20", "riff", 0, "note", "pass-rate"), TODAY).ok,
    true,
    "zero clean passes is a real and useful thing to record",
  );

  const noNote = errorFor(existing, draft("2026-08-20", "riff", 80, "  "));
  assert.equal(noNote.code, "note-missing");
  assert.equal(noNote.field, "note");
  assert.equal(
    errorFor(existing, draft("2026-08-20", "riff", 80, "x".repeat(MAX_NOTE_LENGTH + 1))).code,
    "note-too-long",
  );

  // A typed number arrives from a form as a string, and that is not an error.
  const typed = addEntry(
    existing,
    { ...draft("2026-08-20", "riff", 0), value: " 96 " },
    TODAY,
  );
  assert.equal(typed.ok, true);
  assert.equal(typed.ok && typed.value[typed.value.length - 1].value, 96);
});

test("edits one session in place, keeping its id and its neighbours untouched", () => {
  const entries = build([
    draft("2026-08-20", "riff", 80, "first"),
    draft("2026-08-24", "riff", 84, "second"),
    draft("2026-08-27", "riff", 88, "third"),
  ]);
  const target = entries[1];

  const edited = updateEntry(
    entries,
    target.id,
    draft("2026-08-25", "riff", 86, "corrected after listening back"),
    TODAY,
  );
  assert.equal(edited.ok, true);
  if (!edited.ok) return;

  const moved = edited.value.find((entry) => entry.id === target.id);
  assert.ok(moved, "the id is a handle and must survive an edit that moves the date");
  assert.equal(moved.date, "2026-08-25");
  assert.equal(moved.value, 86);
  assert.equal(moved.note, "corrected after listening back");
  assert.equal(edited.value.length, 3);
  assert.deepEqual(
    edited.value.filter((entry) => entry.id !== target.id).map((entry) => entry.note),
    ["first", "third"],
    "editing one session must not touch the others",
  );

  // An edit is validated exactly as strictly as an add.
  const rejected = updateEntry(entries, target.id, draft("2026-08-24", "riff", 999), TODAY);
  assert.equal(rejected.ok, false);
  assert.equal(!rejected.ok && rejected.error.code, "value-out-of-range");

  const missing = updateEntry(entries, "no-such-session", draft("2026-08-24", "riff", 84), TODAY);
  assert.equal(missing.ok, false);
  assert.equal(!missing.ok && missing.error.code, "entry-not-found");
});

test("deletes by id, and an id that is not here changes nothing", () => {
  const entries = build([
    draft("2026-08-20", "riff", 80),
    draft("2026-08-24", "riff", 84),
  ]);

  const after = removeEntry(entries, entries[0].id);
  assert.equal(after.length, 1);
  assert.equal(after[0].id, entries[1].id);
  assert.deepEqual(removeEntry(entries, "no-such-session"), entries);
  assert.deepEqual(removeEntry([], "anything"), []);
});

/* ------------------------------------------------------------------ *
 * The honesty rule
 * ------------------------------------------------------------------ */

test("refuses a direction under three points and returns one at exactly three", () => {
  // The boundary this tool exists for, asserted from both sides.
  assert.equal(MIN_TREND_POINTS, 3);

  const two = trendForValues([80, 88], "tempo");
  assert.equal(two.verdict, "insufficient");
  assert.equal(two.label, NO_EVIDENCE_LABEL);
  assert.equal(two.points, 2);
  assert.equal(two.change, null, "a refused trend must not report a change");
  assert.equal(two.band, null);
  assert.match(two.detail, /2 sessions/);
  assert.match(two.detail, new RegExp(`under ${MIN_TREND_POINTS}`));

  const three = trendForValues([80, 84, 88], "tempo");
  assert.notEqual(three.verdict, "insufficient", "three points is enough for a direction");
  assert.equal(three.points, 3);
  assert.equal(typeof three.change, "number");
  assert.equal(three.verdict, "up");

  assert.equal(trendForValues([], "tempo").verdict, "insufficient");
  assert.equal(trendForValues([80], "tempo").verdict, "insufficient");
  assert.equal(trendForValues([], "tempo").points, 0);

  // Same boundary through the summary the page actually renders.
  const twoSessions = build([
    draft(shiftIsoDate(TODAY, -4), "scale run", 80),
    draft(shiftIsoDate(TODAY, -2), "scale run", 88),
  ]);
  const before = summarizeWindow(twoSessions, TODAY, WINDOW_SHORT);
  assert.equal(before.focuses[0].trend.verdict, "insufficient");
  assert.equal(before.focuses[0].trend.label, NO_EVIDENCE_LABEL);
  assert.equal(before.focusesWithEvidence, 0);
  assert.match(before.headline, /no direction is claimed/i);

  const third = addEntry(twoSessions, draft(TODAY, "scale run", 92), TODAY);
  assert.equal(third.ok, true);
  if (!third.ok) return;
  const after = summarizeWindow(third.value, TODAY, WINDOW_SHORT);
  assert.equal(after.focuses[0].trend.verdict, "up");
  assert.equal(after.focusesWithEvidence, 1);
  assert.doesNotMatch(after.headline, /no direction is claimed/i);
});

test("calls a rise up only when the worst session held up with it", () => {
  const climbing = trendForValues([80, 84, 88], "tempo");
  assert.equal(climbing.verdict, "up");
  assert.equal(climbing.change, 8);
  assert.match(climbing.detail, /8 BPM/);

  // The average rose, but the floor fell out from under it: a wider spread,
  // not progress. This is the claim the tool refuses to make.
  const scattered = trendForValues([80, 82, 70, 100], "tempo");
  assert.equal(scattered.verdict, "unclear");
  assert.ok(scattered.change !== null && scattered.change > 0, "the average did rise");
  assert.match(scattered.detail, /worst session dropped/i);

  // A floor that slipped inside the noise band is still a floor that slipped.
  // The band calibrates the mean comparison; it is not slack on the worst
  // session, and the sentence the `up` branch prints admits no tolerance.
  const insideBand = trendForValues([100, 100, 97, 110], "tempo");
  assert.equal(insideBand.verdict, "unclear");
  assert.match(insideBand.detail, /worst session dropped/i);
  assert.equal(trendForValues([60, 60, 55, 80], "pass-rate").verdict, "unclear");

  // On an odd count the middle session sits in neither half, so the mean
  // comparison never reads it. The floor guard has to, or "your worst session
  // did not get worse" is a claim about a number nobody looked at.
  const collapsed = trendForValues([100, 60, 104], "tempo");
  const spiked = trendForValues([100, 300, 104], "tempo");
  assert.equal(collapsed.verdict, "unclear", "a collapsed middle session is not a rise");
  assert.equal(spiked.verdict, "up", "a high middle session is not a collapse");
  assert.notDeepEqual(
    collapsed,
    spiked,
    "60 and 300 in the middle must not produce the same trend",
  );
  assert.equal(trendForValues([100, 101, 30, 106, 108], "tempo").verdict, "unclear");
  assert.equal(trendForValues([70, 0, 80], "pass-rate").verdict, "unclear");
});

test("says so when the numbers went down, rather than filing it under noise", () => {
  const falling = trendForValues([100, 98, 90], "tempo");
  assert.equal(falling.verdict, "unclear");
  assert.equal(falling.change, -10);
  assert.match(falling.detail, /below the earlier ones/i);
});

test("holds the flat band exactly where the metric's noise ends", () => {
  // Tempo band from a mean of 80: max(2, 80 * 0.03) = 2.4 BPM.
  const inside = trendForValues([80, 81, 82], "tempo");
  assert.equal(inside.verdict, "flat");
  assert.equal(inside.change, 2);
  assert.equal(inside.band, 2.4);
  assert.match(inside.detail, /not the same as improving/i);

  const outside = trendForValues([80, 81, 83], "tempo");
  assert.equal(outside.verdict, "up");
  assert.equal(outside.change, 3);

  // Pass rate is already a percentage, so its band is a flat 5 points.
  assert.equal(trendForValues([60, 60, 65], "pass-rate").verdict, "flat");
  assert.equal(trendForValues([60, 60, 66], "pass-rate").verdict, "up");
  assert.equal(trendForValues([60, 60, 65], "pass-rate").band, 5);

  // The floor for slow tempos is absolute, or a 30 BPM ladder could never move.
  assert.equal(trendForValues([30, 30, 32], "tempo").band, 2);
});

test("refuses to call a swinging log flat just because its average held", () => {
  const swinging = trendForValues([80, 100, 80], "tempo");
  assert.equal(swinging.change, 0, "the halves are identical");
  assert.equal(
    swinging.verdict,
    "unclear",
    "an average that holds while the sessions swing is not steadiness",
  );
  assert.match(swinging.detail, /range across 20 BPM/);

  const steady = trendForValues([80, 81, 80], "tempo");
  assert.equal(steady.verdict, "flat");
});

/* ------------------------------------------------------------------ *
 * Windows and grouping
 * ------------------------------------------------------------------ */

test("counts the 7 and 30 day windows from the day it was handed, inclusive", () => {
  const entries = build([
    draft(shiftIsoDate(TODAY, -30), "outside everything", 70),
    draft(shiftIsoDate(TODAY, -29), "inside the month", 72),
    draft(shiftIsoDate(TODAY, -7), "just outside the week", 74),
    draft(shiftIsoDate(TODAY, -6), "inside the week", 76),
    draft(TODAY, "inside the week", 78),
  ]);

  const summary = summarizeLog(entries, TODAY);
  assert.equal(summary.total, 5);
  assert.equal(summary.today, TODAY);
  assert.equal(summary.firstDate, shiftIsoDate(TODAY, -30));
  assert.equal(summary.lastDate, TODAY);

  assert.equal(summary.last7.days, WINDOW_SHORT);
  assert.equal(summary.last7.sessions, 2, "six days ago is in, seven days ago is out");
  assert.equal(summary.last7.distinctFocuses, 1);
  assert.equal(summary.last7.from, shiftIsoDate(TODAY, -6));
  assert.equal(summary.last7.to, TODAY);

  assert.equal(summary.last30.days, WINDOW_LONG);
  assert.equal(summary.last30.sessions, 4, "29 days ago is in, 30 days ago is out");
  assert.equal(summary.last30.distinctFocuses, 3);
  assert.equal(summary.last30.from, shiftIsoDate(TODAY, -29));

  // A session dated after the day being summarized is not in any window.
  assert.equal(entriesInWindow(entries, shiftIsoDate(TODAY, -10), WINDOW_SHORT).length, 0);
  assert.equal(summarizeWindow(entries, shiftIsoDate(TODAY, -40), WINDOW_LONG).sessions, 0);
  assert.match(
    summarizeWindow([], TODAY, WINDOW_SHORT).headline,
    /No sessions logged in the last 7 days/,
  );
});

test("groups a focus however it was typed, and reports its best and its latest", () => {
  const entries = build([
    draft("2026-08-25", "Bourrée bar 12", 80),
    draft("2026-08-27", "bourrée   BAR 12", 92),
    draft("2026-08-28", "Bourrée Bar 12", 88),
  ]);

  const summary = summarizeWindow(entries, TODAY, WINDOW_LONG);
  assert.equal(summary.distinctFocuses, 1, "one passage typed three ways is one focus");

  const [focus] = summary.focuses;
  assert.equal(focus.key, focusKey("Bourrée bar 12"));
  assert.equal(focus.focus, "Bourrée Bar 12", "the display name is the most recent spelling");
  assert.equal(focus.sessions, 3);
  assert.equal(focus.best, 92, "the best is the best recorded, not the latest");
  assert.equal(focus.latest, 88);
  assert.equal(focus.otherMetricSessions, 0);
  assert.equal(focus.trend.verdict, "up");
});

test("compares like with like when a focus changed what it measures", () => {
  const entries = build([
    draft(shiftIsoDate(TODAY, -20), "riff", 90),
    draft(shiftIsoDate(TODAY, -18), "riff", 95),
    draft(shiftIsoDate(TODAY, -16), "riff", 100),
    draft(shiftIsoDate(TODAY, -10), "riff", 50, "counted them", "pass-rate"),
    draft(shiftIsoDate(TODAY, -8), "riff", 60, "counted them", "pass-rate"),
    draft(shiftIsoDate(TODAY, -6), "riff", 70, "counted them", "pass-rate"),
  ]);

  const [focus] = summarizeWindow(entries, TODAY, WINDOW_LONG).focuses;
  assert.equal(focus.sessions, 6, "every session on the focus is still counted");
  assert.equal(focus.metric, "pass-rate", "the measure is whichever the latest session used");
  assert.equal(focus.trend.points, 3, "only the comparable sessions feed the trend");
  assert.equal(focus.otherMetricSessions, 3);
  assert.equal(focus.best, 70, "the best is the best pass rate, never a BPM");
  assert.equal(focus.trend.verdict, "up");
  assert.equal(trendForEntries(entries).metric, "pass-rate");

  // Two tempo sessions and one pass-rate session is not three points.
  const mixed = build([
    draft(shiftIsoDate(TODAY, -5), "solo", 90),
    draft(shiftIsoDate(TODAY, -4), "solo", 95),
    draft(shiftIsoDate(TODAY, -3), "solo", 40, "counted them", "pass-rate"),
  ]);
  const [thin] = summarizeWindow(mixed, TODAY, WINDOW_SHORT).focuses;
  assert.equal(thin.sessions, 3);
  assert.equal(thin.trend.points, 1);
  assert.equal(thin.trend.verdict, "insufficient");
  assert.equal(thin.trend.label, NO_EVIDENCE_LABEL);
});

/* ------------------------------------------------------------------ *
 * Storage, versions, files
 * ------------------------------------------------------------------ */

test("restores a stored payload and migrates the version 1 shape", () => {
  const entries = build([
    draft("2026-08-20", "riff", 80),
    draft("2026-08-24", "riff", 84, "note", "pass-rate"),
  ]);

  const payload = storedLogPayload(entries);
  assert.equal(payload.version, LOG_VERSION);
  assert.deepEqual(restoreLogState(JSON.parse(JSON.stringify(payload))), entries);

  // Version 1 stored `bpm` and had no `metric` field.
  const legacy = restoreLogState({
    version: 1,
    entries: [
      { id: "old-1", date: "2026-08-20", focus: "Riff", bpm: 96, note: "held it" },
      { id: "old-2", date: "2026-08-22", focus: "Riff", bpm: 100, note: "moved" },
    ],
  });
  assert.ok(legacy, "a version 1 payload must upgrade, not be thrown away");
  assert.equal(legacy.length, 2);
  assert.deepEqual(legacy.map((entry) => entry.metric), ["tempo", "tempo"]);
  assert.deepEqual(legacy.map((entry) => entry.value), [96, 100]);
  assert.equal("bpm" in legacy[0], false, "the old field must not survive the upgrade");
  assert.deepEqual(legacy.map((entry) => entry.id), ["old-1", "old-2"]);

  // A version this build has never seen was written by newer code, so reading
  // it optimistically is how fields get silently dropped. Refuse instead.
  assert.equal(restoreLogState({ version: 99, entries: [] }), null);
  assert.equal(restoreLogState({ version: "2", entries: [] }), null);
  assert.equal(restoreLogState({ entries: [] }), null, "an unversioned payload is refused");
  assert.equal(restoreLogState({ version: 2 }), null, "so is one with no entries array");
  assert.equal(restoreLogState(null), null);
  assert.equal(restoreLogState("corrupt"), null);
  assert.equal(restoreLogState(42), null);
  assert.equal(restoreLogState([]), null, "a bare array is not an envelope");
  assert.deepEqual(restoreLogState({ version: 2, entries: [] }), []);
});

test("drops only the corrupt rows from a stored payload, never the whole log", () => {
  const restored = restoreLogState({
    version: 2,
    entries: [
      { id: "good-1", date: "2026-08-20", focus: "riff", metric: "tempo", value: 80, note: "ok" },
      null,
      "not an entry",
      { date: "2026-02-30", focus: "riff", metric: "tempo", value: 80, note: "ok" },
      { date: "2026-08-21", focus: "", metric: "tempo", value: 80, note: "ok" },
      { date: "2026-08-21", focus: "riff", metric: "vibes", value: 80, note: "ok" },
      { date: "2026-08-21", focus: "riff", metric: "tempo", value: 80.5, note: "ok" },
      { date: "2026-08-21", focus: "riff", metric: "tempo", value: 4000, note: "ok" },
      { date: "2026-08-21", focus: "riff", metric: "tempo", value: 80, note: "" },
      { id: "good-2", date: "2026-08-22", focus: "riff", metric: "pass-rate", value: 60, note: "ok" },
    ],
  });

  assert.ok(restored);
  assert.deepEqual(restored.map((entry) => entry.id), ["good-1", "good-2"]);

  // Duplicate ids would make edit and delete hit the wrong session, so the
  // second one is re-minted rather than trusted.
  const collided = restoreLogState({
    version: 2,
    entries: [
      { id: "same", date: "2026-08-20", focus: "riff", metric: "tempo", value: 80, note: "a" },
      { id: "same", date: "2026-08-21", focus: "riff", metric: "tempo", value: 84, note: "b" },
      { date: "2026-08-22", focus: "riff", metric: "tempo", value: 88, note: "c" },
    ],
  });
  assert.ok(collided);
  assert.equal(collided.length, 3);
  assert.equal(new Set(collided.map((entry) => entry.id)).size, 3);
});

test("round-trips a log through export and import without changing a field", () => {
  const entries = build([
    draft("2026-08-20", "Bourrée bar 12", 80, "clean at last"),
    draft("2026-08-24", "Bourrée bar 12", 84, "second half still late"),
    draft("2026-08-27", "chord changes", 60, "six of ten clean", "pass-rate"),
  ]);

  const text = serializeLog(entries, TODAY);
  const file = JSON.parse(text);
  assert.equal(file.format, LOG_FILE_FORMAT);
  assert.equal(file.version, LOG_VERSION);
  assert.equal(file.exportedOn, TODAY);
  assert.equal(file.entries.length, 3);
  assert.equal(exportFileName(TODAY), `guitarhub-practice-log-${TODAY}.json`);
  assert.equal(exportFileName("not a date"), "guitarhub-practice-log-export.json");

  const imported = importLog(text);
  assert.equal(imported.ok, true);
  assert.deepEqual(
    imported.ok && imported.value.entries,
    entries,
    "what comes back must be exactly what went out",
  );
  assert.equal(imported.ok && imported.value.truncated, 0);

  // The parsed object is accepted as readily as the text.
  const reparsed = importLog(file);
  assert.deepEqual(reparsed.ok && reparsed.value.entries, entries);

  // And the round trip survives a second lap, which is what moving between two
  // browsers actually does.
  const twice = importLog(
    serializeLog(imported.ok ? imported.value.entries : [], TODAY),
  );
  assert.deepEqual(twice.ok && twice.value.entries, entries);
});

test("an import over the cap keeps the newest sessions and says how many it did not read", () => {
  const overflow = 100;
  // Built the way `exportLog` writes one: oldest first, so the sessions the 7-
  // and 30-day windows read sit at the *end* of the file.
  const oversized = Array.from({ length: MAX_ENTRIES + overflow }, (_, index) => ({
    id: `session-${index}`,
    date: shiftIsoDate("2024-01-01", index),
    focus: `focus ${index}`,
    metric: "tempo" as const,
    value: 80,
    note: `session ${index}`,
  }));

  const imported = importLog(
    JSON.stringify({
      format: LOG_FILE_FORMAT,
      version: LOG_VERSION,
      exportedOn: TODAY,
      entries: oversized,
    }),
  );

  assert.equal(imported.ok, true);
  if (!imported.ok) return;

  assert.equal(imported.value.entries.length, MAX_ENTRIES);
  assert.equal(
    imported.value.truncated,
    overflow,
    "the count is reported, never swallowed",
  );

  // The half that matters: what was kept is the recent work, not the first
  // sessions ever logged.
  assert.equal(imported.value.entries[0].note, `session ${overflow}`);
  assert.equal(
    imported.value.entries[MAX_ENTRIES - 1].note,
    `session ${MAX_ENTRIES + overflow - 1}`,
    "the most recent session in the file has to survive the import",
  );
  assert.equal(
    imported.value.entries.some((entry) => entry.note === "session 0"),
    false,
    "the oldest sessions are the ones dropped",
  );

  // Unreadable rows must not take slots from real ones: the cut happens after
  // validation, so a file padded with junk still yields a full log.
  const padded = importLog(
    JSON.stringify({
      format: LOG_FILE_FORMAT,
      version: LOG_VERSION,
      entries: [...Array.from({ length: 50 }, () => null), ...oversized],
    }),
  );
  assert.equal(padded.ok && padded.value.entries.length, MAX_ENTRIES);
  assert.equal(padded.ok && padded.value.truncated, overflow);

  // At the cap exactly, nothing is truncated and nothing is claimed to be.
  const exact = importLog(
    JSON.stringify({
      format: LOG_FILE_FORMAT,
      version: LOG_VERSION,
      entries: oversized.slice(0, MAX_ENTRIES),
    }),
  );
  assert.equal(exact.ok && exact.value.entries.length, MAX_ENTRIES);
  assert.equal(exact.ok && exact.value.truncated, 0);
});

test("a stored payload over the cap is also cut down to the newest sessions", () => {
  const restored = restoreLogState({
    version: LOG_VERSION,
    entries: Array.from({ length: MAX_ENTRIES + 3 }, (_, index) => ({
      id: `stored-${index}`,
      date: shiftIsoDate("2024-01-01", index),
      focus: `focus ${index}`,
      metric: "tempo",
      value: 80,
      note: `session ${index}`,
    })),
  });

  assert.equal(restored?.length, MAX_ENTRIES);
  assert.equal(restored?.[0].note, "session 3");
});

test("refuses a file that is not this tool's export", () => {
  assert.equal(importLog("{ not json").ok, false);
  assert.equal(
    !importLog("{ not json").ok &&
      (importLog("{ not json") as { error: { code: string } }).error.code,
    "file-unreadable",
  );

  const notALog = importLog(JSON.stringify({ hello: "world" }));
  assert.equal(!notALog.ok && notALog.error.code, "file-not-a-log");

  const array = importLog(JSON.stringify([{ date: "2026-08-20" }]));
  assert.equal(!array.ok && array.error.code, "file-not-a-log");

  const newer = importLog(
    JSON.stringify({ format: LOG_FILE_FORMAT, version: 99, entries: [] }),
  );
  assert.equal(!newer.ok && newer.error.code, "file-version-unreadable");
  assert.match(newer.ok ? "" : newer.error.message, /Nothing was changed/);

  const empty = importLog(serializeLog([], TODAY));
  assert.equal(!empty.ok && empty.error.code, "file-empty");

  const allBad = importLog(
    JSON.stringify({
      format: LOG_FILE_FORMAT,
      version: LOG_VERSION,
      entries: [null, { date: "nope" }],
    }),
  );
  assert.equal(!allBad.ok && allBad.error.code, "file-empty");
});

test("merges an import into what the browser already holds, without duplicating it", () => {
  const held = build([
    draft("2026-08-20", "riff", 80, "first"),
    draft("2026-08-24", "riff", 84, "second"),
  ]);
  const incoming = build([
    draft("2026-08-20", "riff", 80, "first"),
    draft("2026-08-24", "riff", 84, "second"),
    draft("2026-08-26", "riff", 88, "third, from the laptop"),
  ]);

  const merged = mergeLog(held, incoming);
  assert.equal(merged.added, 1, "only the session this browser did not have");
  assert.equal(merged.skipped, 2);
  assert.equal(merged.entries.length, 3);
  assert.deepEqual(
    merged.entries.map((entry) => entry.note),
    ["first", "second", "third, from the laptop"],
  );
  assert.equal(new Set(merged.entries.map((entry) => entry.id)).size, 3);

  // A different session that happens to carry an id already in use keeps its
  // content and gets a new handle.
  const clashing = mergeLog(held, [{ ...held[0], value: 92, note: "different session" }]);
  assert.equal(clashing.added, 1);
  assert.equal(clashing.entries.length, 3);
  assert.equal(new Set(clashing.entries.map((entry) => entry.id)).size, 3);

  assert.deepEqual(mergeLog(held, []), {
    entries: held,
    added: 0,
    skipped: 0,
    dropped: 0,
  });
  assert.equal(mergeLog([], incoming).added, 3);

  // A session there was no room for is dropped, never reported as a duplicate.
  const full = build(
    Array.from({ length: MAX_ENTRIES }, (_, index) =>
      draft(shiftIsoDate("2020-01-01", index), `focus ${index}`, 80),
    ),
  );
  const overflowed = mergeLog(full, [
    { ...held[0], id: "brand-new", note: "nowhere to put this" },
  ]);
  assert.equal(overflowed.entries.length, MAX_ENTRIES);
  assert.equal(overflowed.added, 0);
  assert.equal(overflowed.skipped, 0, "it was not already here");
  assert.equal(overflowed.dropped, 1);
});
