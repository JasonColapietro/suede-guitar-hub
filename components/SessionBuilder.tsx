"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  SESSION_FOCUSES,
  SESSION_STORAGE_KEY,
  buildSessionPlan,
  normalizeSessionProgress,
  rebuildSessionState,
  restoreSessionState,
  sessionMinutesDone,
  sessionProgressPercent,
  setSessionBlockDone,
  type SessionBlockKind,
  type SessionFocus,
  type SessionPlan,
  type SessionPlanError,
  type StoredSessionState,
} from "@/lib/session";
import { createStoredValue, subscribeToStoredKey } from "@/lib/shared-storage";

/**
 * The Practice Session Builder.
 *
 * Every rule about what a session may look like lives in `lib/session.ts`. This
 * file holds state, storage, and markup, and nothing else: when the numbers are
 * refused, the sentence on screen is the one the library wrote.
 *
 * Every change is applied to the plan as it is stored now, and a write from
 * another tab is re-read as it happens, so two open tabs cannot overwrite each
 * other's checked blocks.
 */

const DEFAULT_MINUTES = 45;
const DEFAULT_FOCUS: SessionFocus = "tempo-ceiling";

/** Lengths a real practice slot actually takes. Pressing one builds the plan. */
const PRESETS = [10, 20, 30, 45, 60, 90] as const;

const FIELD_CLASSES =
  "w-full rounded-2xl border border-indigo-deep/15 bg-white px-4 py-3.5 text-lg font-semibold text-ink " +
  "focus-visible:border-violet-soft focus-visible:[outline:3px_solid_var(--color-violet-soft)] " +
  "focus-visible:[outline-offset:3px]";

const PILL_FOCUS =
  "focus-visible:[outline:3px_solid_var(--color-violet-soft)] focus-visible:[outline-offset:3px]";

const SMALL_PILL =
  "inline-flex min-h-11 items-center rounded-full border border-indigo-deep/20 px-5 py-2.5 text-xs font-semibold " +
  `text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`;

const MINUTES_ID = "session-minutes";
const ERROR_ID = "session-error";

const BLOCK_BUBBLE: Record<SessionBlockKind, string> = {
  warmup: "bg-violet-soft text-indigo-deep",
  repair: "bg-violet text-white",
  tempo: "bg-indigo-deep text-cream",
  repertoire: "bg-peach text-indigo-deep",
  coldstart: "bg-indigo-deep text-peach",
};

/** Let the library judge the value. Anything unparseable arrives as NaN. */
function parseField(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

const sessionStore = createStoredValue<StoredSessionState>({
  key: SESSION_STORAGE_KEY,
  restore: restoreSessionState,
});

/** A rebuild waiting on the player, because it would drop checked blocks. */
type PendingRebuild = { plan: SessionPlan; dropped: number };

export default function SessionBuilder() {
  const [hydrated, setHydrated] = useState(false);
  const [minutesField, setMinutesField] = useState(String(DEFAULT_MINUTES));
  const [focus, setFocus] = useState<SessionFocus>(DEFAULT_FOCUS);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [error, setError] = useState<SessionPlanError | null>(null);
  const [focusResult, setFocusResult] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(false);
  const [pendingRebuild, setPendingRebuild] = useState<PendingRebuild | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [notice, setNotice] = useState("");

  // What is on screen, for callbacks that outlive the render they were made in.
  const shown = useRef<StoredSessionState | null>(null);
  useEffect(() => {
    shown.current = plan
      ? { input: { minutes: plan.minutes, focus: plan.focus }, completedBlockIds }
      : null;
  }, [completedBlockIds, plan]);

  /** Put a stored state on screen, and the form with it when asked. */
  function show(state: StoredSessionState | null, syncFields: boolean) {
    const result = state ? buildSessionPlan(state.input) : null;
    const next = result?.ok ? result.value : null;
    const done = next && state ? normalizeSessionProgress(next, state.completedBlockIds) : [];
    shown.current = next
      ? { input: { minutes: next.minutes, focus: next.focus }, completedBlockIds: done }
      : null;
    setPlan(next);
    setCompletedBlockIds(done);
    if (next && syncFields) {
      setMinutesField(String(next.minutes));
      setFocus(next.focus);
    }
  }

  useEffect(() => {
    const restored = sessionStore.read();
    if (restored.available && restored.value) show(restored.value, true);
    setHydrated(true);

    // Another tab ticked, rebuilt or cleared. The minutes field follows only
    // while it still shows the plan being replaced, so a half-typed edit here
    // is not overwritten from elsewhere.
    return subscribeToStoredKey(SESSION_STORAGE_KEY, () => {
      const latest = sessionStore.read();
      if (!latest.available) return;
      setPendingRebuild(null);
      if (!latest.value) setPendingClear(false);
      const before = shown.current;
      if (latest.value) {
        const minutes = String(latest.value.input.minutes);
        setMinutesField((current) =>
          before === null || current === String(before.input.minutes) ? minutes : current,
        );
        setFocus(latest.value.input.focus);
      }
      show(latest.value, false);
    });
  }, []);

  useEffect(() => {
    if (!focusMinutes) return;
    document.getElementById(MINUTES_ID)?.focus();
    setFocusMinutes(false);
  }, [focusMinutes]);

  // Runs after the result is committed, which requestAnimationFrame does not
  // guarantee. It also matters on the correction path: pressing the suggested
  // fix removes the button that was pressed, so focus would otherwise be
  // dropped on the body.
  useEffect(() => {
    if (!focusResult || !plan) return;
    document.getElementById("session-plan")?.focus();
    setFocusResult(false);
  }, [focusResult, plan]);

  const percent = useMemo(
    () => (plan ? sessionProgressPercent(plan, completedBlockIds) : 0),
    [completedBlockIds, plan],
  );

  const minutesDone = plan ? sessionMinutesDone(plan, completedBlockIds) : 0;

  /** Write a rebuilt plan, keeping every checked block that survives. */
  function commitRebuild(next: SessionPlan) {
    let dropped = 0;
    const { value } = sessionStore.update(shown.current, (latest) => {
      const rebuilt = rebuildSessionState(latest, next);
      dropped = rebuilt.dropped.length;
      return rebuilt.state;
    });
    show(value, false);
    setPendingRebuild(null);
    setPendingClear(false);
    const kept = value?.completedBlockIds.length ?? 0;
    setNotice(
      kept > 0
        ? `Session rebuilt. Kept ${kept} checked ${kept === 1 ? "block" : "blocks"}${dropped > 0 ? `, and cleared ${dropped} that changed` : ""}.`
        : dropped > 0
          ? `Session rebuilt. Cleared ${dropped} checked ${dropped === 1 ? "block" : "blocks"} that changed.`
          : "",
    );
    setFocusResult(true);
  }

  function attempt(minutes: number, nextFocus: SessionFocus) {
    const result = buildSessionPlan({ minutes, focus: nextFocus });
    if (!result.ok) {
      setError(result.error);
      setPendingRebuild(null);
      if (result.error.code.startsWith("minutes-")) setFocusMinutes(true);
      return;
    }
    setError(null);

    // Ask before a rebuild throws away blocks the player already checked. The
    // same length and focus keep every block id, so this only asks when it must.
    const latest = sessionStore.read();
    const base = latest.available ? latest.value : shown.current;
    const { dropped } = rebuildSessionState(base, result.value);
    if (dropped.length > 0) {
      setPendingRebuild({ plan: result.value, dropped: dropped.length });
      return;
    }
    commitRebuild(result.value);
  }

  /** Back out of a rebuild: the form goes back to the plan still on screen. */
  function keepPlan() {
    setPendingRebuild(null);
    if (plan) {
      setMinutesField(String(plan.minutes));
      setFocus(plan.focus);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    attempt(parseField(minutesField), focus);
  }

  /** Take the correction the library offered and rebuild in one press. */
  function applySuggestion(fix: SessionPlanError) {
    if (fix.suggestedMinutes === undefined) return;
    setMinutesField(String(fix.suggestedMinutes));
    attempt(fix.suggestedMinutes, focus);
  }

  function changeMinutes(raw: string) {
    // The alert quotes the length it was built from and its one-tap fix writes
    // that number back into the field. Left standing after an edit it describes
    // a number no longer on screen, and pressing the fix discards what was just
    // typed. An edit is the correction, so the alert goes with it.
    setError(null);
    setPendingRebuild(null);
    setMinutesField(raw);
  }

  function applyPreset(minutes: number) {
    setMinutesField(String(minutes));
    attempt(minutes, focus);
  }

  function changeFocus(next: SessionFocus) {
    setError(null);
    setFocus(next);
    // Rebuilding immediately is the point of the control: the focus is what
    // changes the shape of the session, so seeing it change is the answer.
    if (plan) attempt(parseField(minutesField), next);
  }

  function setBlockDone(id: string, done: boolean) {
    if (!plan) return;
    const { value } = sessionStore.update(shown.current, (latest) =>
      setSessionBlockDone(latest, plan, id, done),
    );
    const replaced =
      value === null || value.input.minutes !== plan.minutes || value.input.focus !== plan.focus;
    show(value, replaced);
    setNotice(
      replaced
        ? "This session was changed in another tab. Showing the saved one; check the block again if it still applies."
        : "",
    );
  }

  function clearPlan() {
    sessionStore.write(null);
    shown.current = null;
    setPlan(null);
    setCompletedBlockIds([]);
    setError(null);
    setPendingClear(false);
    setPendingRebuild(null);
    setNotice("Session cleared from this browser.");
    setFocusMinutes(true);
  }

  const minutesInvalid = error !== null && error.code.startsWith("minutes-");
  // The plan on screen no longer matches the form while it is refused or a
  // rebuild is waiting on an answer. It stays readable, dimmed and labelled.
  const stale = Boolean(plan) && (error !== null || pendingRebuild !== null);

  return (
    <div className="rounded-[2rem] border border-indigo-deep/10 bg-white/70 p-6 shadow-[0_28px_80px_rgba(37,17,82,0.07)] sm:p-8 lg:p-12">
      <form onSubmit={submit} aria-busy={!hydrated} noValidate>
        <fieldset className="border-0 p-0">
          <legend className="font-display text-3xl text-indigo-deep">
            How long have you actually got?
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            The real number, not the one you wish you had. A session planned for
            an hour you do not have becomes twenty minutes of the first block
            and nothing else. Everything stays in this browser.
          </p>

          <div className="mt-8 max-w-xs">
            <label
              htmlFor="session-minutes"
              className="block text-sm font-semibold text-indigo-deep"
            >
              Minutes available
            </label>
            <input
              id={MINUTES_ID}
              name="minutes"
              type="number"
              inputMode="numeric"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              step={1}
              value={minutesField}
              onChange={(event) => changeMinutes(event.target.value)}
              aria-invalid={minutesInvalid ? true : undefined}
              aria-describedby={
                minutesInvalid ? `session-minutes-hint ${ERROR_ID}` : "session-minutes-hint"
              }
              className={`mt-2 ${FIELD_CLASSES}`}
            />
            <p id="session-minutes-hint" className="mt-2 text-sm text-ink/60">
              Whole minutes, from {MIN_SESSION_MINUTES} to {MAX_SESSION_MINUTES}.
            </p>
          </div>

          <ul className="mt-5 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <li key={preset}>
                <button
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`inline-flex min-h-11 items-center rounded-full border border-indigo-deep/15 bg-cream-soft px-4 py-2 text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`}
                >
                  {preset} min
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="mt-12 border-0 p-0">
          <legend className="font-display text-3xl text-indigo-deep">
            What is this session for?
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            One answer. The focus decides which block gets the largest share of
            the time, and at short lengths it decides which blocks exist at all.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {SESSION_FOCUSES.map((option) => {
              const selected = focus === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer gap-3 rounded-2xl border p-5 motion-safe:transition ${
                    selected
                      ? "border-violet/40 bg-violet-soft/10"
                      : "border-indigo-deep/10 bg-white/85 hover:border-indigo-deep/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="focus"
                    value={option.value}
                    checked={selected}
                    onChange={() => changeFocus(option.value)}
                    aria-labelledby={`focus-${option.value}-label`}
                    aria-describedby={`focus-${option.value}-blurb`}
                    className={`mt-1 h-5 w-5 shrink-0 accent-violet ${PILL_FOCUS}`}
                  />
                  <span className="min-w-0">
                    <span
                      id={`focus-${option.value}-label`}
                      className="block font-semibold text-indigo-deep"
                    >
                      {option.label}
                    </span>
                    <span
                      id={`focus-${option.value}-blurb`}
                      className="mt-1 block text-sm leading-relaxed text-ink/70"
                    >
                      {option.blurb}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <div
            id={ERROR_ID}
            role="alert"
            className="mt-8 rounded-2xl border border-violet/25 bg-violet-soft/10 p-5"
          >
            <p className="font-medium text-indigo-deep">{error.message}</p>
            {error.suggestedMinutes !== undefined ? (
              <button
                type="button"
                onClick={() => applySuggestion(error)}
                className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-indigo-deep/20 px-5 py-2.5 text-sm font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`}
              >
                Use {error.suggestedMinutes} minutes <span aria-hidden>→</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {pendingRebuild ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-violet/25 bg-violet-soft/10 p-5"
          >
            <p className="font-medium text-indigo-deep">
              This rebuild changes{" "}
              {pendingRebuild.dropped === 1
                ? "one block you checked"
                : `${pendingRebuild.dropped} blocks you checked`}
              , so {pendingRebuild.dropped === 1 ? "that tick is" : "those ticks are"}{" "}
              cleared. Every block that stays the same keeps its tick.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => commitRebuild(pendingRebuild.plan)}
                className={`${SMALL_PILL} border-violet/40 bg-violet-soft/15`}
              >
                Rebuild and clear {pendingRebuild.dropped === 1 ? "it" : "them"}
              </button>
              <button type="button" onClick={keepPlan} className={SMALL_PILL}>
                Keep my current session
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105 ${PILL_FOCUS}`}
          >
            {plan ? "Rebuild the session" : "Build the session"}{" "}
            <span aria-hidden>→</span>
          </button>
          {/* Two steps, the pattern the practice log uses: the plan and its
              checked blocks have no other copy and no undo. */}
          {plan ? (
            pendingClear ? (
              <>
                <button
                  type="button"
                  onClick={clearPlan}
                  className={`${SMALL_PILL} border-violet/40 bg-violet-soft/15`}
                >
                  Delete the session for good
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
                Clear this browser&apos;s session
              </button>
            )
          ) : null}
        </div>

        {pendingClear && plan ? (
          <p className="mt-4 max-w-2xl rounded-2xl border border-violet/25 bg-violet-soft/10 p-5 text-ink/80">
            This deletes the session plan and the {minutesDone} of {plan.minutes}{" "}
            minutes marked done. There is no other copy and no undo.
          </p>
        ) : null}

        {/* Only the notice and the progress count are live: each checkbox tick
            announces "n of m minutes marked done" instead of re-reading the
            summary. The span is present from first paint so the change is
            announced rather than mounted alongside the result and missed. */}
        <p className="mt-4 text-sm text-ink/60">
          {plan ? `${plan.summary} ` : ""}
          <span role="status">
            {notice ? `${notice} ` : ""}
            {plan ? `${minutesDone} of ${plan.minutes} minutes marked done.` : ""}
          </span>
        </p>
      </form>

      {plan ? (
        <section
          className={`mt-14 border-t border-ink/10 pt-12 motion-safe:transition-opacity ${stale ? "opacity-50" : ""}`}
          aria-labelledby="session-plan"
          aria-describedby={stale ? "session-stale" : undefined}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            Your session
          </p>
          {stale ? (
            <p id="session-stale" className="mt-2 text-sm font-semibold text-indigo-deep">
              This is the session you built before. It does not reflect the form
              until you rebuild.
            </p>
          ) : null}
          <h2
            id="session-plan"
            tabIndex={-1}
            className="mt-3 text-4xl text-indigo-deep md:text-5xl"
          >
            {plan.minutes} minutes to{" "}
            <em className="font-display italic">
              {plan.focusLabel.toLowerCase()}
            </em>
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink/70">{plan.summary}</p>

          <div className="mt-10">
            <div className="flex items-center justify-between text-sm font-semibold text-indigo-deep">
              <span>Minutes marked done</span>
              <span>{percent}%</span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-indigo-deep/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`${percent}% of the session's minutes marked done`}
            >
              <span
                className="block h-full w-full origin-left rounded-full bg-linear-to-r from-violet to-violet-soft motion-safe:transition-transform motion-safe:duration-300"
                style={{ transform: `scaleX(${percent / 100})` }}
              />
            </div>
            <p className="mt-3 text-sm text-ink/60">
              Progress is counted in minutes, not in boxes, so a long block
              moves the bar further than a short one.
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
              {plan.blocks.map((block) => {
                const done = completedBlockIds.includes(block.id);

                return (
                  <li
                    key={block.id}
                    className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4"
                  >
                    <div
                      className={`z-10 grid h-10 w-10 place-items-center rounded-full border-4 border-cream text-xs font-extrabold ${BLOCK_BUBBLE[block.kind]}`}
                      aria-hidden
                    >
                      {block.position}
                    </div>

                    <div
                      className={`rounded-2xl border p-5 sm:p-6 ${
                        done
                          ? "border-violet/35 bg-violet-soft/10"
                          : "border-indigo-deep/10 bg-white/85"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-xs font-semibold uppercase tracking-widest text-violet">
                          Block {block.position} · {block.shortName}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-ink/50">
                          {block.minutes} min
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep sm:text-2xl">
                        {block.name}
                      </h3>
                      <p className="mt-3 text-ink/70">{block.purpose}</p>

                      <p className="mt-4 rounded-xl bg-cream-soft px-4 py-3 text-sm leading-relaxed text-indigo-deep">
                        <strong className="font-semibold">Do this:</strong>{" "}
                        {block.doThis}
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
                          onChange={(event) => setBlockDone(block.id, event.target.checked)}
                          className={`h-5 w-5 accent-violet ${PILL_FOCUS}`}
                        />
                        <span>
                          Done — {block.minutes} minutes
                          <span className="sr-only"> on {block.name}</span>
                        </span>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {plan.dropped.length > 0 ? (
            <div className="mt-12 rounded-2xl border border-indigo-deep/10 bg-cream-soft p-6">
              <h3 className="font-display text-xl text-indigo-deep">
                Left out at {plan.minutes} minutes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                These blocks were not shortened to fit. A block under its
                workable size costs the setup time and returns nothing, so its
                minutes went to the blocks above instead.
              </p>
              <ul className="mt-5 grid gap-3">
                {plan.dropped.map((block) => (
                  <li
                    key={block.kind}
                    className="rounded-xl bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink/75"
                  >
                    <strong className="font-semibold text-indigo-deep">
                      {block.name}.
                    </strong>{" "}
                    {block.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
