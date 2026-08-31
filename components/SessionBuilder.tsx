"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  SESSION_FOCUSES,
  SESSION_STORAGE_KEY,
  buildSessionPlan,
  normalizeSessionProgress,
  restoreSessionState,
  sessionMinutesDone,
  sessionProgressPercent,
  type SessionBlockKind,
  type SessionFocus,
  type SessionPlan,
  type SessionPlanError,
  type StoredSessionState,
} from "@/lib/session";

/**
 * The Practice Session Builder.
 *
 * Every rule about what a session may look like lives in `lib/session.ts`. This
 * file holds state, storage, and markup, and nothing else: when the numbers are
 * refused, the sentence on screen is the one the library wrote.
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

/** Both storage calls can throw on their own in a private window. */
function forgetStored(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage is unavailable, so there is nothing stored to forget.
  }
}

function readStored(): StoredSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const restored = restoreSessionState(JSON.parse(raw));
    if (restored) return restored;
  } catch {
    // Private mode throws on access; corrupt JSON throws on parse. Either way
    // the stored value is unusable, so drop it and start clean.
  }
  forgetStored();
  return null;
}

function writeStored(state: StoredSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A blocked or full store costs the player their saved progress, not the
    // plan they are looking at. Nothing here should interrupt them.
  }
}

export default function SessionBuilder() {
  const [hydrated, setHydrated] = useState(false);
  const [minutesField, setMinutesField] = useState(String(DEFAULT_MINUTES));
  const [focus, setFocus] = useState<SessionFocus>(DEFAULT_FOCUS);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [error, setError] = useState<SessionPlanError | null>(null);
  const [focusResult, setFocusResult] = useState(false);

  useEffect(() => {
    const restored = readStored();
    if (restored) {
      const result = buildSessionPlan(restored.input);
      if (result.ok) {
        setMinutesField(String(restored.input.minutes));
        setFocus(restored.input.focus);
        setPlan(result.value);
        setCompletedBlockIds(restored.completedBlockIds);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !plan) return;
    writeStored({
      input: { minutes: plan.minutes, focus: plan.focus },
      completedBlockIds,
    });
  }, [completedBlockIds, hydrated, plan]);

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

  function attempt(minutes: number, nextFocus: SessionFocus) {
    const result = buildSessionPlan({ minutes, focus: nextFocus });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setPlan(result.value);
    setCompletedBlockIds([]);
    setFocusResult(true);
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

  function toggleBlock(id: string) {
    if (!plan) return;
    setCompletedBlockIds((current) =>
      normalizeSessionProgress(
        plan,
        current.includes(id)
          ? current.filter((blockId) => blockId !== id)
          : [...current, id],
      ),
    );
  }

  function clearPlan() {
    forgetStored();
    setPlan(null);
    setCompletedBlockIds([]);
    setError(null);
  }

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
              id="session-minutes"
              name="minutes"
              type="number"
              inputMode="numeric"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              step={1}
              value={minutesField}
              onChange={(event) => changeMinutes(event.target.value)}
              aria-describedby="session-minutes-hint"
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
                    className={`mt-1 h-5 w-5 shrink-0 accent-violet ${PILL_FOCUS}`}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-indigo-deep">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/70">
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

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep motion-safe:transition hover:brightness-105 ${PILL_FOCUS}`}
          >
            {plan ? "Rebuild the session" : "Build the session"}{" "}
            <span aria-hidden>→</span>
          </button>
          {plan ? (
            <button
              type="button"
              onClick={clearPlan}
              className={`inline-flex min-h-11 items-center rounded-full border border-indigo-deep/20 px-5 py-2.5 text-xs font-semibold text-indigo-deep motion-safe:transition hover:bg-white ${PILL_FOCUS}`}
            >
              Clear this browser&apos;s session
            </button>
          ) : null}
        </div>

        {/* Present from first paint so a screen reader announces the change,
            rather than mounting alongside the result and being missed. */}
        <p role="status" aria-live="polite" className="mt-4 text-sm text-ink/60">
          {plan
            ? `${plan.summary} ${minutesDone} of ${plan.minutes} minutes marked done.`
            : ""}
        </p>
      </form>

      {plan ? (
        <section
          className="mt-14 border-t border-ink/10 pt-12"
          aria-labelledby="session-plan"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            Your session
          </p>
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
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                          Block {block.position} · {block.shortName}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">
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
                          onChange={() => toggleBlock(block.id)}
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
