"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BREAKTHROUGH_GOALS,
  BREAKTHROUGH_STORAGE_KEY,
  createBreakthroughPlan,
  normalizeProgress,
  progressPercent,
  restoreBreakthroughState,
  type BreakthroughPlan,
  type BreakthroughProfile,
  type ExperienceLevel,
  type GoalId,
} from "@/lib/breakthrough";
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

export default function BreakthroughPlanner() {
  const [profile, setProfile] = useState<BreakthroughProfile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<BreakthroughPlan | null>(null);
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [focusPlan, setFocusPlan] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BREAKTHROUGH_STORAGE_KEY);
      if (raw) {
        const restored = restoreBreakthroughState(JSON.parse(raw));
        if (restored) {
          const restoredPlan = createBreakthroughPlan(restored.profile);
          setProfile(restored.profile);
          setPlan(restoredPlan);
          setCompletedActionIds(restored.completedActionIds);
        } else {
          window.localStorage.removeItem(BREAKTHROUGH_STORAGE_KEY);
        }
      }
    } catch {
      // Two different failures land here: corrupt JSON, and storage being
      // unavailable at all. The cleanup throws for the second of those, so it
      // needs its own guard — without it, a private window took the throw
      // straight out of this effect and the planner never rendered.
      try {
        window.localStorage.removeItem(BREAKTHROUGH_STORAGE_KEY);
      } catch {
        // Storage is unavailable entirely. There is nothing to clean up.
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !plan) return;
    try {
      window.localStorage.setItem(
        BREAKTHROUGH_STORAGE_KEY,
        JSON.stringify({ profile, completedActionIds }),
      );
    } catch {
      // Private mode throws on access and a full quota throws on write. The
      // planner keeps working in memory; only surviving a refresh is lost, and
      // nothing here is worth crashing the page for.
    }
  }, [completedActionIds, hydrated, plan, profile]);

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

  function buildPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextPlan = createBreakthroughPlan(profile);
      setPlan(nextPlan);
      setCompletedActionIds([]);
      setError("");
      setFocusPlan(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check your practice choices.");
    }
  }

  function toggleAction(actionId: string) {
    if (!plan) return;
    setCompletedActionIds((current) =>
      normalizeProgress(
        plan,
        current.includes(actionId)
          ? current.filter((id) => id !== actionId)
          : [...current, actionId],
      ),
    );
  }

  function clearPlan() {
    try {
      window.localStorage.removeItem(BREAKTHROUGH_STORAGE_KEY);
    } catch {
      // Storage unavailable. The in-memory reset below still happens.
    }
    setProfile(DEFAULT_PROFILE);
    setPlan(null);
    setCompletedActionIds([]);
    setError("");
  }

  if (!plan) {
    return (
      <form onSubmit={buildPlan} className="breakthrough-builder" aria-busy={!hydrated}>
        <fieldset>
          <legend className="font-display text-3xl text-indigo-deep">
            Define one finish line
          </legend>
          <p className="mt-3 max-w-2xl text-ink/70">
            One goal, four weeks, twelve actions. Your plan stays in this browser.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <label className="breakthrough-field md:col-span-2">
              <span>What do you want to prove in 30 days?</span>
              <select
                value={profile.goal}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    goal: event.target.value as GoalId,
                  }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    experience: event.target.value as ExperienceLevel,
                  }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    daysPerWeek: Number(event.target.value),
                  }))
                }
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
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    minutesPerSession: Number(event.target.value),
                  }))
                }
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

        <button type="submit" className="breakthrough-primary mt-8">
          Build my 30-day plan <span aria-hidden>→</span>
        </button>
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
            {plan.experienceLabel} · {plan.cadence}
          </p>
        </div>
        <button type="button" onClick={clearPlan} className="breakthrough-reset">
          Clear this browser&apos;s plan
        </button>
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
                          onChange={() => toggleAction(action.id)}
                        />
                        <span>{action.label}</span>
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
          <a href="/#apply" className="breakthrough-primary">Apply to the room</a>
          {/* STRUMLY.social, not a hand-written suede.social: the registry in
              lib/site.ts holds the one URL this site uses for Suede Social, and
              a second spelling of the same destination is a second thing to
              keep true. */}
          <a href={STRUMLY.social} target="_blank" rel="noopener" className="breakthrough-community">
            Visit Suede Social ↗
          </a>
        </div>
      </div>
    </section>
  );
}
