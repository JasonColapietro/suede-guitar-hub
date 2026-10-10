"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BREAKTHROUGH_GOALS,
  BREAKTHROUGH_STORAGE_KEY,
  createBreakthroughPlan,
  normalizeProgress,
  progressPercent,
  rebuildBreakthroughState,
  restoreBreakthroughState,
  sameBreakthroughProfile,
  setBreakthroughActionDone,
  type BreakthroughPlan,
  type BreakthroughProfile,
  type ExperienceLevel,
  type GoalId,
  type StoredBreakthroughState,
} from "@/lib/breakthrough";
import { createStoredValue, subscribeToStoredKey } from "@/lib/shared-storage";
import { STRUMLY } from "@/lib/site";

const DEFAULT_PROFILE: BreakthroughProfile = {
  goal: "complete-song",
  experience: "advanced-beginner",
  daysPerWeek: 4,
  minutesPerSession: 30,
};

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: "advanced-beginner", label: "Advanced beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "returning", label: "Returning after time away" },
];

/**
 * The stored plan. Every change is applied to the plan as it is stored now and
 * a write from another tab is re-read as it happens, so two open tabs cannot
 * overwrite each other's checked actions.
 */
const breakthroughStore = createStoredValue<StoredBreakthroughState>({
  key: BREAKTHROUGH_STORAGE_KEY,
  restore: restoreBreakthroughState,
});

/** A profile change waiting on the player, because it would drop checked actions. */
type PendingRebuild = { profile: BreakthroughProfile; dropped: number };

export default function BreakthroughPlanner() {
  const [profile, setProfile] = useState<BreakthroughProfile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<BreakthroughPlan | null>(null);
  const [planProfile, setPlanProfile] = useState<BreakthroughProfile | null>(null);
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [focusPlan, setFocusPlan] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingRebuild, setPendingRebuild] = useState<PendingRebuild | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [notice, setNotice] = useState("");

  // What is on screen, for callbacks that outlive the render they were made in.
  const shown = useRef<StoredBreakthroughState | null>(null);
  useEffect(() => {
    shown.current = planProfile ? { profile: planProfile, completedActionIds } : null;
  }, [completedActionIds, planProfile]);

  /** Put a stored state on screen. */
  function show(state: StoredBreakthroughState | null) {
    shown.current = state;
    if (!state) {
      setPlan(null);
      setPlanProfile(null);
      setCompletedActionIds([]);
      return;
    }
    const nextPlan = createBreakthroughPlan(state.profile);
    setPlan(nextPlan);
    setPlanProfile(state.profile);
    setCompletedActionIds(normalizeProgress(nextPlan, state.completedActionIds));
  }

  useEffect(() => {
    const restored = breakthroughStore.read();
    if (restored.available && restored.value) {
      show(restored.value);
      setProfile(restored.value.profile);
    }
    setHydrated(true);

    // Another tab ticked, edited or cleared the plan.
    return subscribeToStoredKey(BREAKTHROUGH_STORAGE_KEY, () => {
      const latest = breakthroughStore.read();
      if (!latest.available) return;
      setPendingRebuild(null);
      if (!latest.value) {
        setPendingClear(false);
        setEditing(false);
      }
      show(latest.value);
    });
  }, []);

  const percent = useMemo(
    () => (plan ? progressPercent(plan, completedActionIds) : 0),
    [completedActionIds, plan],
  );

  // Building a plan replaces the form with the plan, so focus has to be moved by
  // hand or it falls back to the document. Driven from an effect rather than
  // requestAnimationFrame: rAF never fires while the document is hidden, so the
  // move was silently dropped in a backgrounded tab. Diagnostic.tsx,
  // TempoLadder.tsx and Readiness.tsx were all moved off rAF for this reason.
  useEffect(() => {
    if (!focusPlan || !plan) return;
    document.getElementById("your-plan")?.focus();
    setFocusPlan(false);
  }, [focusPlan, plan]);

  /** Write the plan for `next`, keeping every checked action it still has. */
  function commitProfile(next: BreakthroughProfile) {
    let dropped = 0;
    const { value } = breakthroughStore.update(shown.current, (latest) => {
      const rebuilt = rebuildBreakthroughState(latest, next);
      dropped = rebuilt.dropped.length;
      return rebuilt.state;
    });
    show(value);
    setPendingRebuild(null);
    setPendingClear(false);
    setEditing(false);
    setError("");
    const kept = value?.completedActionIds.length ?? 0;
    setNotice(
      kept > 0
        ? `Plan updated. Kept ${kept} checked ${kept === 1 ? "action" : "actions"}${dropped > 0 ? `, and cleared ${dropped} the new plan no longer has` : ""}.`
        : "",
    );
    setFocusPlan(true);
  }

  function buildPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      createBreakthroughPlan(profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check your practice choices.");
      return;
    }
    // Ask before an edit throws away actions the player already checked.
    // Changing minutes or experience keeps every action; fewer days or a new
    // goal is what can drop some.
    const latest = breakthroughStore.read();
    const base = latest.available ? latest.value : shown.current;
    const { dropped } = rebuildBreakthroughState(base, profile);
    if (dropped.length > 0) {
      setPendingRebuild({ profile, dropped: dropped.length });
      return;
    }
    commitProfile(profile);
  }

  function setActionDone(actionId: string, done: boolean) {
    if (!planProfile) return;
    const { value } = breakthroughStore.update(shown.current, (latest) =>
      setBreakthroughActionDone(latest, planProfile, actionId, done),
    );
    show(value);
    const replaced = !value || !sameBreakthroughProfile(value.profile, planProfile);
    setNotice(
      replaced
        ? "This plan was changed in another tab. Showing the saved one; check the action again if it still applies."
        : "",
    );
  }

  function startEditing() {
    if (planProfile) setProfile(planProfile);
    setPendingClear(false);
    setNotice("");
    setEditing(true);
  }

  function cancelEditing() {
    if (planProfile) setProfile(planProfile);
    setPendingRebuild(null);
    setError("");
    setEditing(false);
    setFocusPlan(true);
  }

  function clearPlan() {
    breakthroughStore.write(null);
    show(null);
    setProfile(DEFAULT_PROFILE);
    setPendingClear(false);
    setError("");
    setNotice("Plan cleared from this browser.");
  }

  if (!plan || editing) {
    return (
      <form onSubmit={buildPlan} className="breakthrough-builder" aria-busy={!hydrated}>
        <fieldset>
          <legend className="font-display text-3xl text-indigo-deep">
            {editing ? "Adjust your plan" : "Define one finish line"}
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            {editing
              ? "Change the days, minutes or level and your checked actions carry over. A new goal starts a new plan."
              : "One goal, four weeks, one action for every practice day, sized to the minutes you have. Your plan stays in this browser."}
          </p>
          {notice && !editing ? (
            <p role="status" className="mt-3 text-sm text-ink/60">{notice}</p>
          ) : null}

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <label className="breakthrough-field md:col-span-2">
              <span>What do you want to prove in 30 days?</span>
              <select
                value={profile.goal}
                onChange={(event) => {
                  setPendingRebuild(null);
                  setProfile((current) => ({
                    ...current,
                    goal: event.target.value as GoalId,
                  }));
                }}
              >
                {BREAKTHROUGH_GOALS.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="breakthrough-field">
              <span>Where are you now?</span>
              <select
                value={profile.experience}
                onChange={(event) => {
                  setPendingRebuild(null);
                  setProfile((current) => ({
                    ...current,
                    experience: event.target.value as ExperienceLevel,
                  }));
                }}
              >
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="breakthrough-field">
              <span>Practice days each week</span>
              <select
                value={profile.daysPerWeek}
                onChange={(event) => {
                  setPendingRebuild(null);
                  setProfile((current) => ({
                    ...current,
                    daysPerWeek: Number(event.target.value),
                  }));
                }}
              >
                {[3, 4, 5, 6].map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </label>

            <label className="breakthrough-field md:col-span-2">
              <span>Minutes you can protect each session</span>
              <select
                value={profile.minutesPerSession}
                onChange={(event) => {
                  setPendingRebuild(null);
                  setProfile((current) => ({
                    ...current,
                    minutesPerSession: Number(event.target.value),
                  }));
                }}
              >
                {[15, 20, 30, 45, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {error ? <p role="alert" className="mt-5 font-medium text-violet">{error}</p> : null}

        {pendingRebuild ? (
          <div role="alert" className="mt-6 rounded-2xl border border-violet/25 bg-violet-soft/10 p-5">
            <p className="font-medium text-indigo-deep">
              {pendingRebuild.profile.goal !== planProfile?.goal
                ? "A new goal starts a new plan"
                : "Fewer practice days removes extra-day actions"}
              , so{" "}
              {pendingRebuild.dropped === 1
                ? "one action you checked is"
                : `${pendingRebuild.dropped} actions you checked are`}{" "}
              cleared. Every action the new plan keeps stays checked.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => commitProfile(pendingRebuild.profile)}
                className="breakthrough-reset"
              >
                Update and clear {pendingRebuild.dropped === 1 ? "it" : "them"}
              </button>
              <button type="button" onClick={cancelEditing} className="breakthrough-reset">
                Keep my current plan
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="submit" className="breakthrough-primary">
            {editing ? "Update my plan" : "Build my 30-day plan"} <span aria-hidden>→</span>
          </button>
          {editing ? (
            <button type="button" onClick={cancelEditing} className="breakthrough-reset">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <section className="breakthrough-plan" aria-labelledby="your-plan">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            Your 30-day room
          </span>
          <h2 id="your-plan" tabIndex={-1} className="mt-3 font-display text-4xl text-indigo-deep md:text-5xl">
            {plan.title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-ink/70">{plan.finishLine}</p>
          <p className="mt-3 text-sm font-semibold text-indigo-mid">
            {plan.experienceLabel} · {plan.cadence} · {plan.weeklyMinutes} minutes a week
          </p>
          <p className="mt-3 max-w-2xl text-ink/70">{plan.approach}</p>
        </div>
        {/* Two steps, the pattern the practice log uses: the plan and its
            checked actions have no other copy and no undo. */}
        <div className="flex flex-wrap gap-3">
          {pendingClear ? (
            <>
              <button type="button" onClick={clearPlan} className="breakthrough-reset">
                Delete the plan for good
              </button>
              <button
                type="button"
                onClick={() => setPendingClear(false)}
                className="breakthrough-reset"
              >
                Keep it
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEditing} className="breakthrough-reset">
                Change days, minutes or goal
              </button>
              <button
                type="button"
                onClick={() => setPendingClear(true)}
                className="breakthrough-reset"
              >
                Clear this browser&apos;s plan
              </button>
            </>
          )}
        </div>
      </div>

      {pendingClear ? (
        <p className="mt-6 max-w-2xl rounded-2xl border border-violet/25 bg-violet-soft/10 p-5 text-ink/80">
          This deletes the plan and its{" "}
          {completedActionIds.length === 1
            ? "one checked action"
            : `${completedActionIds.length} checked actions`}
          . There is no other copy and no undo. To change days, minutes or
          level instead, keep it and use &ldquo;Change days, minutes or goal&rdquo;.
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="mt-4 text-sm text-ink/60">
        {notice}
      </p>

      <div className="mt-8 rounded-2xl border border-indigo-deep/10 bg-white/70 p-5">
        <p className="text-sm font-semibold text-indigo-deep">
          Every {plan.sessionBlocks.reduce((sum, block) => sum + block.minutes, 0)}-minute session
        </p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {plan.sessionBlocks.map((block) => (
            <li key={block.label} className="text-sm text-ink/70">
              <strong className="block text-indigo-deep">
                {block.label} · {block.minutes} min
              </strong>
              {block.detail}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between text-sm font-semibold text-indigo-deep">
          <span>Actions completed</span>
          <span>{percent}%</span>
        </div>
        {/* The label belongs on the element that carries the role. On a plain
            div it is dropped, and the progress bar is announced unnamed. */}
        <div
          className="breakthrough-progress mt-3"
          role="progressbar"
          aria-label={`${percent}% of plan actions complete`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
        <p className="mt-3 text-sm text-ink/60">
          Checkboxes track work, not mastery. The weekly recording is the evidence.
        </p>
      </div>

      <ol className="breakthrough-timeline mt-12">
        {plan.weeks.map((week) => (
          <li key={week.week} className="breakthrough-week">
            <div className="breakthrough-node" aria-hidden>{week.week}</div>
            <div className="breakthrough-week-card">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet">
                    Week {week.week}
                  </span>
                  <h3 className="mt-2 font-display text-2xl text-indigo-deep">{week.title}</h3>
                  <p className="mt-3 max-w-2xl text-ink/70">{week.focus}</p>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-indigo-mid">
                    {week.tempoTarget}
                  </p>
                </div>
                <a className="breakthrough-resource" href={week.resource.href} target="_blank" rel="noopener">
                  {week.resource.label} <span aria-hidden>↗</span>
                </a>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <fieldset>
                  <legend className="text-sm font-semibold text-indigo-deep">This week&apos;s actions</legend>
                  <div className="mt-3 grid gap-3">
                    {week.actions.map((action) => (
                      <label key={action.id} className="breakthrough-check">
                        <input
                          type="checkbox"
                          checked={completedActionIds.includes(action.id)}
                          onChange={(event) => setActionDone(action.id, event.target.checked)}
                        />
                        <span>
                          <span className="text-xs font-semibold uppercase tracking-widest text-violet">
                            Day {action.day}
                          </span>{" "}
                          {action.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="breakthrough-evidence">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-soft">
                    Proof, then feedback
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-white/85">{week.evidence}</p>
                  <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-relaxed text-white/65">
                    <strong className="text-white/90">Crew prompt:</strong> {week.crewPrompt}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-3xl bg-indigo-deep px-6 py-8 text-cream md:flex md:items-center md:justify-between md:px-10">
        <div>
          <p className="font-display text-2xl">Want the human layer?</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Apply for the founding room: a small crew, one weekly studio, a midpoint review, and a final showcase. Applications are reviewed for fit before any commitment.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 md:mt-0 md:pl-8">
          <Link href="/#apply" className="breakthrough-primary">Apply to the room</Link>
          {/* STRUMLY.social, not a hand-written suede.social: the registry in
              lib/site.ts holds the one URL this site uses for Suede AI Social, and
              a second spelling of the same destination is a second thing to
              keep true. */}
          <a href={STRUMLY.social} target="_blank" rel="noopener" className="breakthrough-community">
            Visit Suede AI Social ↗
          </a>
        </div>
      </div>
    </section>
  );
}
