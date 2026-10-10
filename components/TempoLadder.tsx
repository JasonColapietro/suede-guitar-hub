"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BPM_MAX,
  BPM_MIN,
  MAX_SESSIONS,
  MIN_SESSIONS,
  TEMPO_STORAGE_KEY,
  buildTempoLadder,
  normalizeTempoProgress,
  rebuildTempoState,
  sessionOptions,
  restoreTempoState,
  setTempoRungDone,
  tempoErrorField,
  tempoLadderInput,
  tempoProgressPercent,
  type StoredTempoState,
  type TempoLadder as TempoLadderPlan,
  type TempoLadderError,
  type TempoRungKind,
} from "@/lib/tempo";
import { createStoredValue, subscribeToStoredKey } from "@/lib/shared-storage";

/**
 * The Tempo Ladder Builder.
 *
 * Every rule about what a ladder may look like lives in `lib/tempo.ts`. This
 * file holds state, storage, and markup, and nothing else: when the numbers are
 * refused, the sentence on screen is the one the library wrote.
 *
 * Every change is applied to the ladder as it is stored now, and a write from
 * another tab is re-read as it happens, so two open tabs cannot overwrite each
 * other's checked sessions.
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

const SMALL_PILL =
  "inline-flex min-h-11 items-center rounded-full border border-indigo-deep/20 px-5 py-2.5 text-xs font-semibold " +
  `text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`;

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

const tempoStore = createStoredValue<StoredTempoState>({
  key: TEMPO_STORAGE_KEY,
  restore: restoreTempoState,
});

const FIELD_IDS = {
  current: "tempo-current",
  target: "tempo-target",
  sessions: "tempo-sessions",
} as const;
const ERROR_ID = "tempo-error";

/** A rebuild waiting on the player, because it would drop checked sessions. */
type PendingRebuild = { ladder: TempoLadderPlan; dropped: number };

export default function TempoLadder() {
  const [hydrated, setHydrated] = useState(false);
  const [currentField, setCurrentField] = useState(String(DEFAULT_CURRENT));
  const [targetField, setTargetField] = useState(String(DEFAULT_TARGET));
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [ladder, setLadder] = useState<TempoLadderPlan | null>(null);
  const [completedRungIds, setCompletedRungIds] = useState<string[]>([]);
  const [error, setError] = useState<TempoLadderError | null>(null);
  const [focusResult, setFocusResult] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [pendingRebuild, setPendingRebuild] = useState<PendingRebuild | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [notice, setNotice] = useState("");

  // What is on screen, for callbacks that outlive the render they were made in.
  const shown = useRef<StoredTempoState | null>(null);
  useEffect(() => {
    shown.current = ladder
      ? { input: tempoLadderInput(ladder), completedRungIds }
      : null;
  }, [completedRungIds, ladder]);

  /** Put a stored state on screen. The fields follow only when asked to. */
  function show(state: StoredTempoState | null, syncFields: boolean) {
    const result = state ? buildTempoLadder(state.input) : null;
    const next = result?.ok ? result.value : null;
    const done = next && state ? normalizeTempoProgress(next, state.completedRungIds) : [];
    shown.current = next ? { input: tempoLadderInput(next), completedRungIds: done } : null;
    setLadder(next);
    setCompletedRungIds(done);
    if (next && syncFields) {
      setCurrentField(String(next.currentBpm));
      setTargetField(String(next.targetBpm));
      setSessions(next.sessions);
    }
  }

  useEffect(() => {
    const restored = tempoStore.read();
    if (restored.available && restored.value) show(restored.value, true);
    setHydrated(true);

    // Another tab ticked, rebuilt or cleared. The fields are left alone unless
    // they still describe the ladder being replaced, so a half-typed edit here
    // is not overwritten from elsewhere.
    return subscribeToStoredKey(TEMPO_STORAGE_KEY, () => {
      const latest = tempoStore.read();
      if (!latest.available) return;
      setPendingRebuild(null);
      if (!latest.value) setPendingClear(false);
      const before = shown.current;
      setCurrentField((current) => {
        const untouched =
          before === null || current === String(before.input.currentBpm);
        return untouched && latest.value ? String(latest.value.input.currentBpm) : current;
      });
      setTargetField((current) => {
        const untouched =
          before === null || current === String(before.input.targetBpm);
        return untouched && latest.value ? String(latest.value.input.targetBpm) : current;
      });
      show(latest.value, false);
      if (latest.value) setSessions(latest.value.input.sessions);
    });
  }, []);

  useEffect(() => {
    if (!focusField) return;
    document.getElementById(focusField)?.focus();
    setFocusField(null);
  }, [focusField]);

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

  /** Write a rebuilt ladder, keeping every checked session whose rung survives. */
  function commitRebuild(next: TempoLadderPlan) {
    let dropped = 0;
    const { value } = tempoStore.update(shown.current, (latest) => {
      const rebuilt = rebuildTempoState(latest, next);
      dropped = rebuilt.dropped.length;
      return rebuilt.state;
    });
    show(value, false);
    setPendingRebuild(null);
    setPendingClear(false);
    const kept = value?.completedRungIds.length ?? 0;
    setNotice(
      kept > 0
        ? `Ladder rebuilt. Kept ${kept} checked ${kept === 1 ? "session" : "sessions"}${dropped > 0 ? `, and cleared ${dropped} whose rung changed` : ""}.`
        : dropped > 0
          ? `Ladder rebuilt. Cleared ${dropped} checked ${dropped === 1 ? "session" : "sessions"} whose rung changed.`
          : "",
    );
    setFocusResult(true);
  }

  function attempt(currentBpm: number, targetBpm: number, sessionCount: number) {
    const result = buildTempoLadder({ currentBpm, targetBpm, sessions: sessionCount });
    if (!result.ok) {
      setError(result.error);
      setPendingRebuild(null);
      setFocusField(FIELD_IDS[tempoErrorField(result.error.code)]);
      return;
    }
    setError(null);

    // Ask before a rebuild throws away sessions the player already checked.
    // Unchanged numbers keep every rung id, so this only asks when it must.
    const latest = tempoStore.read();
    const base = latest.available ? latest.value : shown.current;
    const { dropped } = rebuildTempoState(base, result.value);
    if (dropped.length > 0) {
      setPendingRebuild({ ladder: result.value, dropped: dropped.length });
      return;
    }
    commitRebuild(result.value);
  }

  /** Back out of a rebuild: the fields go back to the ladder still on screen. */
  function keepLadder() {
    setPendingRebuild(null);
    if (ladder) {
      setCurrentField(String(ladder.currentBpm));
      setTargetField(String(ladder.targetBpm));
      setSessions(ladder.sessions);
    }
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
    setPendingRebuild(null);

    const nextCurrent = field === "current" ? raw : currentField;
    const nextTarget = field === "target" ? raw : targetField;
    if (field === "current") setCurrentField(raw);
    else setTargetField(raw);

    const offered = sessionOptions(parseField(nextCurrent), parseField(nextTarget));
    if (offered.length > 0 && !offered.includes(sessions)) {
      setSessions(nearest(offered, sessions));
    }
  }

  function setRungDone(id: string, done: boolean) {
    if (!ladder) return;
    const { value } = tempoStore.update(shown.current, (latest) =>
      setTempoRungDone(latest, ladder, id, done),
    );
    const replaced =
      value === null ||
      value.input.currentBpm !== ladder.currentBpm ||
      value.input.targetBpm !== ladder.targetBpm ||
      value.input.sessions !== ladder.sessions;
    show(value, replaced);
    setNotice(
      replaced
        ? "This ladder was changed in another tab. Showing the saved one; check the session again if it still applies."
        : "",
    );
  }

  function clearLadder() {
    tempoStore.write(null);
    shown.current = null;
    setLadder(null);
    setCompletedRungIds([]);
    setError(null);
    setPendingClear(false);
    setPendingRebuild(null);
    setNotice("Ladder cleared from this browser.");
    setFocusField(FIELD_IDS.current);
  }

  /** Props tying a field to the alert while it is the one at fault. */
  function fieldState(field: keyof typeof FIELD_IDS, hintId: string) {
    const invalid = error !== null && tempoErrorField(error.code) === field;
    return {
      "aria-invalid": invalid ? (true as const) : undefined,
      "aria-describedby": invalid ? `${hintId} ${ERROR_ID}` : hintId,
    };
  }

  // The result on screen no longer matches the form while it is refused or a
  // rebuild is waiting on an answer. It stays readable, dimmed and labelled.
  const stale = Boolean(ladder) && (error !== null || pendingRebuild !== null);

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
                {...fieldState("current", "tempo-current-hint")}
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
                {...fieldState("target", "tempo-target-hint")}
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
                  setPendingRebuild(null);
                  setSessions(Number(event.target.value));
                }}
                {...fieldState("sessions", "tempo-sessions-hint")}
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
            id={ERROR_ID}
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

        {pendingRebuild ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-violet/25 bg-violet-soft/10 p-5"
          >
            <p className="font-medium text-indigo-deep">
              Rebuilding at these numbers changes the rungs behind{" "}
              {pendingRebuild.dropped === 1
                ? "one session you checked"
                : `${pendingRebuild.dropped} sessions you checked`}
              , so {pendingRebuild.dropped === 1 ? "that tick is" : "those ticks are"}{" "}
              cleared. Every rung that stays the same keeps its tick.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => commitRebuild(pendingRebuild.ladder)}
                className={`${SMALL_PILL} border-violet/40 bg-violet-soft/15`}
              >
                Rebuild and clear {pendingRebuild.dropped === 1 ? "it" : "them"}
              </button>
              <button type="button" onClick={keepLadder} className={SMALL_PILL}>
                Keep my current ladder
              </button>
            </div>
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
          {/* Two steps, the pattern the practice log uses: the ladder and its
              checked sessions have no other copy and no undo. */}
          {ladder ? (
            pendingClear ? (
              <>
                <button
                  type="button"
                  onClick={clearLadder}
                  className={`${SMALL_PILL} border-violet/40 bg-violet-soft/15`}
                >
                  Delete the ladder for good
                </button>
                <button
                  type="button"
                  onClick={() => setPendingClear(false)}
                  className={SMALL_PILL}
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPendingClear(true)}
                className={SMALL_PILL}
              >
                Clear this browser&apos;s ladder
              </button>
            )
          ) : null}
        </div>

        {pendingClear && ladder ? (
          <p className="mt-4 max-w-2xl rounded-2xl border border-violet/25 bg-violet-soft/10 p-5 text-ink/80">
            This deletes the ladder and the{" "}
            {completedCount === 1 ? "one session" : `${completedCount} sessions`}{" "}
            marked done. There is no other copy and no undo.
          </p>
        ) : null}

        {/* Present from first paint so a screen reader announces the change,
            rather than mounting alongside the result and being missed. */}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-ink/60">
          {notice ? `${notice} ` : ""}
          {ladder
            ? `${ladder.summary} ${completedCount} of ${ladder.sessions} sessions marked done.`
            : ""}
        </p>
      </form>

      {ladder ? (
        <section
          className={`mt-14 border-t border-ink/10 pt-12 motion-safe:transition-opacity ${stale ? "opacity-50" : ""}`}
          aria-labelledby="tempo-result"
          aria-describedby={stale ? "tempo-stale" : undefined}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            Your ladder
          </p>
          {stale ? (
            <p id="tempo-stale" className="mt-2 text-sm font-semibold text-indigo-deep">
              This is the ladder you built before. It does not reflect the
              numbers in the form until you rebuild.
            </p>
          ) : null}
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
                        onChange={(event) => setRungDone(rung.id, event.target.checked)}
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
