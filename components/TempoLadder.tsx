"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BPM_MAX,
  BPM_MIN,
  MAX_SESSIONS,
  MIN_SESSIONS,
  TEMPO_STORAGE_KEY,
  buildTempoLadder,
  normalizeTempoProgress,
  sessionOptions,
  restoreTempoState,
  tempoProgressPercent,
  type StoredTempoState,
  type TempoLadder as TempoLadderPlan,
  type TempoLadderError,
  type TempoRungKind,
} from "@/lib/tempo";

/**
 * The Tempo Ladder Builder.
 *
 * Every rule about what a ladder may look like lives in `lib/tempo.ts`. This
 * file holds state, storage, and markup, and nothing else: when the numbers are
 * refused, the sentence on screen is the one the library wrote.
 */

const DEFAULT_CURRENT = 80;
const DEFAULT_TARGET = 120;
const DEFAULT_SESSIONS = 11;

const FIELD_CLASSES =
  "w-full rounded-2xl border border-indigo-deep/15 bg-white px-4 py-3.5 text-lg font-semibold text-ink " +
  "focus-visible:border-violet-soft focus-visible:[outline:3px_solid_var(--color-violet-soft)] " +
  "focus-visible:[outline-offset:3px]";

const PILL_FOCUS =
  "focus-visible:[outline:3px_solid_var(--color-violet-soft)] focus-visible:[outline-offset:3px]";

const RUNG_STYLES: Record<TempoRungKind, { badge: string; bubble: string }> = {
  baseline: { badge: "Baseline", bubble: "bg-indigo-deep text-cream" },
  climb: { badge: "Climb", bubble: "bg-violet text-white" },
  hold: { badge: "Hold", bubble: "bg-violet-soft text-indigo-deep" },
  backoff: { badge: "Back off", bubble: "bg-peach text-indigo-deep" },
  target: { badge: "Target", bubble: "bg-indigo-deep text-peach" },
};

/** Let the library judge the value. Anything unparseable arrives as NaN. */
function parseField(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function nearest(options: readonly number[], value: number): number {
  return options.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best,
  );
}

/** Both storage calls can throw on their own in a private window. */
function forgetStored(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TEMPO_STORAGE_KEY);
  } catch {
    // Storage is unavailable, so there is nothing stored to forget.
  }
}

function readStored(): StoredTempoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TEMPO_STORAGE_KEY);
    if (!raw) return null;
    const restored = restoreTempoState(JSON.parse(raw));
    if (restored) return restored;
  } catch {
    // Private mode throws on access; corrupt JSON throws on parse. Either way
    // the stored value is unusable, so drop it and start clean.
  }
  forgetStored();
  return null;
}

function writeStored(state: StoredTempoState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TEMPO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A blocked or full store costs the player their saved progress, not the
    // ladder they are looking at. Nothing here should interrupt them.
  }
}

export default function TempoLadder() {
  const [hydrated, setHydrated] = useState(false);
  const [currentField, setCurrentField] = useState(String(DEFAULT_CURRENT));
  const [targetField, setTargetField] = useState(String(DEFAULT_TARGET));
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [ladder, setLadder] = useState<TempoLadderPlan | null>(null);
  const [completedRungIds, setCompletedRungIds] = useState<string[]>([]);
  const [error, setError] = useState<TempoLadderError | null>(null);
  const [focusResult, setFocusResult] = useState(false);

  useEffect(() => {
    const restored = readStored();
    if (restored) {
      const result = buildTempoLadder(restored.input);
      if (result.ok) {
        setCurrentField(String(restored.input.currentBpm));
        setTargetField(String(restored.input.targetBpm));
        setSessions(restored.input.sessions);
        setLadder(result.value);
        setCompletedRungIds(restored.completedRungIds);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !ladder) return;
    writeStored({
      input: {
        currentBpm: ladder.currentBpm,
        targetBpm: ladder.targetBpm,
        sessions: ladder.sessions,
      },
      completedRungIds,
    });
  }, [completedRungIds, hydrated, ladder]);

  // Runs after the result is committed, which requestAnimationFrame does not
  // guarantee. It also matters on the correction path: pressing the suggested
  // fix removes the button that was pressed, so focus would otherwise be
  // dropped on the body.
  useEffect(() => {
    if (!focusResult || !ladder) return;
    document.getElementById("tempo-result")?.focus();
    setFocusResult(false);
  }, [focusResult, ladder]);

  const options = useMemo(() => {
    const offered = sessionOptions(parseField(currentField), parseField(targetField));
    if (offered.length > 0) return offered;
    // The tempos are not a usable pair yet, so keep the whole range selectable
    // rather than emptying the control under the player.
    return Array.from(
      { length: MAX_SESSIONS - MIN_SESSIONS + 1 },
      (_, index) => MIN_SESSIONS + index,
    );
  }, [currentField, targetField]);

  const percent = useMemo(
    () => (ladder ? tempoProgressPercent(ladder, completedRungIds) : 0),
    [completedRungIds, ladder],
  );

  const completedCount = ladder
    ? normalizeTempoProgress(ladder, completedRungIds).length
    : 0;

  function attempt(currentBpm: number, targetBpm: number, sessionCount: number) {
    const result = buildTempoLadder({ currentBpm, targetBpm, sessions: sessionCount });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setLadder(result.value);
    setCompletedRungIds([]);
    setFocusResult(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    attempt(parseField(currentField), parseField(targetField), sessions);
  }

  /** Take the correction the library offered and rebuild in one press. */
  function applySuggestion(fix: TempoLadderError) {
    const currentBpm = parseField(currentField);
    const targetBpm = fix.suggestedTarget ?? parseField(targetField);
    const offered = sessionOptions(currentBpm, targetBpm);
    const wanted = fix.suggestedSessions ?? sessions;
    const resolved =
      offered.length > 0 && !offered.includes(wanted) ? nearest(offered, wanted) : wanted;

    if (fix.suggestedTarget !== undefined) setTargetField(String(fix.suggestedTarget));
    setSessions(resolved);
    attempt(currentBpm, targetBpm, resolved);
  }

  function changeTempo(field: "current" | "target", raw: string) {
    // The alert quotes the tempos it was built from and its one-tap fix writes
    // one of them back into the form. Left standing after an edit it describes
    // numbers that are no longer on screen, and pressing the fix discards what
    // was just typed. An edit is the correction, so the alert goes with it.
    setError(null);

    const nextCurrent = field === "current" ? raw : currentField;
    const nextTarget = field === "target" ? raw : targetField;
    if (field === "current") setCurrentField(raw);
    else setTargetField(raw);

    const offered = sessionOptions(parseField(nextCurrent), parseField(nextTarget));
    if (offered.length > 0 && !offered.includes(sessions)) {
      setSessions(nearest(offered, sessions));
    }
  }

  function toggleRung(id: string) {
    if (!ladder) return;
    setCompletedRungIds((current) =>
      normalizeTempoProgress(
        ladder,
        current.includes(id)
          ? current.filter((rungId) => rungId !== id)
          : [...current, id],
      ),
    );
  }

  function clearLadder() {
    forgetStored();
    setLadder(null);
    setCompletedRungIds([]);
    setError(null);
  }

  const fixLabel =
    error?.suggestedSessions !== undefined
      ? `Use ${error.suggestedSessions} sessions`
      : error?.suggestedTarget !== undefined
        ? `Aim at ${error.suggestedTarget} BPM instead`
        : null;

  return (
    <div className="rounded-[2rem] border border-indigo-deep/10 bg-white/70 p-6 shadow-[0_28px_80px_rgba(37,17,82,0.07)] sm:p-8 lg:p-12">
      <form onSubmit={submit} aria-busy={!hydrated} noValidate>
        <fieldset className="border-0 p-0">
          <legend className="font-display text-3xl text-indigo-deep">
            Set the two tempos
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            Pick one passage. Enter the fastest tempo you can already play it
            cleanly, then the tempo you actually want. Everything stays in this
            browser.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <label
                htmlFor="tempo-current"
                className="block text-sm font-semibold text-indigo-deep"
              >
                Current clean tempo
              </label>
              <input
                id="tempo-current"
                name="currentBpm"
                type="number"
                inputMode="numeric"
                min={BPM_MIN}
                max={BPM_MAX}
                step={1}
                value={currentField}
                onChange={(event) => changeTempo("current", event.target.value)}
                aria-describedby="tempo-current-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <p id="tempo-current-hint" className="mt-2 text-sm text-ink/60">
                BPM you can play it right now, not your best single attempt.
              </p>
            </div>

            <div>
              <label
                htmlFor="tempo-target"
                className="block text-sm font-semibold text-indigo-deep"
              >
                Target tempo
              </label>
              <input
                id="tempo-target"
                name="targetBpm"
                type="number"
                inputMode="numeric"
                min={BPM_MIN}
                max={BPM_MAX}
                step={1}
                value={targetField}
                onChange={(event) => changeTempo("target", event.target.value)}
                aria-describedby="tempo-target-hint"
                className={`mt-2 ${FIELD_CLASSES}`}
              />
              <p id="tempo-target-hint" className="mt-2 text-sm text-ink/60">
                Between {BPM_MIN} and {BPM_MAX} BPM, and above your clean tempo.
              </p>
            </div>

            <div>
              <label
                htmlFor="tempo-sessions"
                className="block text-sm font-semibold text-indigo-deep"
              >
                Sessions to spend
              </label>
              <select
                id="tempo-sessions"
                name="sessions"
                value={sessions}
                onChange={(event) => {
                  setError(null);
                  setSessions(Number(event.target.value));
                }}
                aria-describedby="tempo-sessions-hint"
                className={`mt-2 appearance-none ${FIELD_CLASSES}`}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option} sessions
                  </option>
                ))}
              </select>
              <p id="tempo-sessions-hint" className="mt-2 text-sm text-ink/60">
                One rung per session. Only counts that fit this gap are offered.
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
            {fixLabel ? (
              <button
                type="button"
                onClick={() => applySuggestion(error)}
                className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-deep/20 px-5 py-2.5 text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`}
              >
                {fixLabel} <span aria-hidden>→</span>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105 ${PILL_FOCUS}`}
          >
            {ladder ? "Rebuild the ladder" : "Build the ladder"}{" "}
            <span aria-hidden>→</span>
          </button>
          {ladder ? (
            <button
              type="button"
              onClick={clearLadder}
              className={`inline-flex min-h-11 items-center rounded-full border border-indigo-deep/20 px-5 py-2.5 text-xs font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`}
            >
              Clear this browser&apos;s ladder
            </button>
          ) : null}
        </div>

        {/* Present from first paint so a screen reader announces the change,
            rather than mounting alongside the result and being missed. */}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-ink/60">
          {ladder
            ? `${ladder.summary} ${completedCount} of ${ladder.sessions} sessions marked done.`
            : ""}
        </p>
      </form>

      {ladder ? (
        <section className="mt-14 border-t border-ink/10 pt-12" aria-labelledby="tempo-result">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            Your ladder
          </p>
          <h2
            id="tempo-result"
            tabIndex={-1}
            className="mt-3 text-4xl text-indigo-deep md:text-5xl"
          >
            {ladder.currentBpm} to{" "}
            <em className="font-display italic">{ladder.targetBpm} BPM</em>
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink/70">{ladder.summary}</p>

          <div className="mt-10">
            <div className="flex items-center justify-between text-sm font-semibold text-indigo-deep">
              <span>Sessions marked done</span>
              <span>{percent}%</span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-indigo-deep/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`${percent}% of the ladder's sessions marked done`}
            >
              <span
                className="block h-full w-full origin-left rounded-full bg-linear-to-r from-violet to-violet-soft motion-safe:transition-transform motion-safe:duration-300"
                style={{ transform: `scaleX(${percent / 100})` }}
              />
            </div>
            <p className="mt-3 text-sm text-ink/60">
              A checked box records that a session happened. The pass condition
              on each rung is what decides whether you have earned the next one.
            </p>
          </div>

          {/* The rail is a sibling of the <ol>, not a child: <ol> admits only
              li, script and template, and a stray child can cost the list its
              semantics — and with them the item count a screen reader reads
              out. The wrapper carries the positioning the rail needs. */}
          <div className="relative mt-12">
            <div
              className="pointer-events-none absolute bottom-8 left-5 top-8 w-px bg-indigo-deep/15"
              aria-hidden
            />
            <ol className="grid gap-4">
            {ladder.rungs.map((rung) => {
              const style = RUNG_STYLES[rung.kind];
              const done = completedRungIds.includes(rung.id);

              return (
                <li
                  key={rung.id}
                  className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4"
                >
                  <div
                    className={`z-10 grid h-10 w-10 place-items-center rounded-full border-4 border-cream text-xs font-extrabold ${style.bubble}`}
                    aria-hidden
                  >
                    {rung.session}
                  </div>

                  <div
                    className={`rounded-2xl border p-5 sm:p-6 ${
                      done
                        ? "border-violet/35 bg-violet-soft/10"
                        : "border-indigo-deep/10 bg-white/85"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                        Session {rung.session} · {style.badge}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep sm:text-2xl">
                      {rung.label}
                    </h3>
                    <p className="mt-3 text-ink/70">{rung.instruction}</p>

                    <p className="mt-4 rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-indigo-deep">
                      <strong className="font-semibold">Move up when:</strong>{" "}
                      {rung.passCondition}
                    </p>

                    <label
                      className={`mt-4 inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm ${
                        done
                          ? "border-violet/35 text-indigo-deep"
                          : "border-indigo-deep/10 text-ink/75"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleRung(rung.id)}
                        className={`h-5 w-5 accent-violet ${PILL_FOCUS}`}
                      />
                      <span>
                        Session done at {rung.bpm} BPM
                        <span className="sr-only"> ({style.badge} rung)</span>
                      </span>
                    </label>
                  </div>
                </li>
              );
            })}
            </ol>
          </div>
        </section>
      ) : null}
    </div>
  );
}
