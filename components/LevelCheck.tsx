"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics/tracker";
import { FREE_MODULES } from "@/lib/learning/free-module";
import { adoptServerFreeModule, browserStorage, chooseFreeModule, putAccountFreeModule } from "@/lib/learning/free-module-store";
import {
  PLACEMENT_QUESTIONS,
  PLACEMENT_RESULTS,
  freeModuleStartHref,
  levelById,
  placeLevel,
  type PlacementAnswers,
  type PlacementQuestionId,
  type PlacementScore,
} from "@/lib/placement";
import { APP_STORE, LIFETIME } from "@/lib/site";

type Draft = { [K in PlacementQuestionId]?: PlacementScore };

function complete(answers: Draft): answers is PlacementAnswers {
  return PLACEMENT_QUESTIONS.every((question) => answers[question.id] !== undefined);
}

/**
 * The five-question placement on /start. The answers live in component state
 * and the result is computed by `placeLevel`. The first result fixes the
 * visitor's free module in this browser, and the result leads straight to it.
 * `moduleNames` maps each free module id to its name.
 */
export default function LevelCheck({ moduleNames }: { moduleNames: Readonly<Record<string, string>> }) {
  const [answers, setAnswers] = useState<Draft>({});
  const [freeModuleId, setFreeModuleId] = useState<string | null>(null);
  // Set when a signed-in account already holds a free module other than the one this placement would pick.
  const [accountModuleId, setAccountModuleId] = useState<string | null>(null);
  const firstAnswer = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const answered = PLACEMENT_QUESTIONS.filter((question) => answers[question.id] !== undefined).length;
  const result = complete(answers) ? placeLevel(answers) : null;
  const level = result ? levelById(result) : null;
  const copy = result ? PLACEMENT_RESULTS[result] : null;
  // Until the browser answers, the placement's own module; after, the one this browser keeps.
  const startModuleId = result ? freeModuleId ?? FREE_MODULES[result] : null;

  useEffect(() => {
    if (!result) return;
    const storage = browserStorage();
    const chosen = chooseFreeModule(storage, result).moduleId;
    setFreeModuleId(chosen);
    setAccountModuleId(null);
    try { track({ name: "placement_completed", placement: result }); } catch { /* Measurement never blocks the result. */ }
    // A signed-in account holds one free module for good; when it differs, the result leads to that one.
    let cancelled = false;
    void putAccountFreeModule((url, init) => fetch(url, init), chosen).then(held => {
      if (cancelled || held === null || held === chosen) return;
      adoptServerFreeModule(storage, held);
      setFreeModuleId(held);
      setAccountModuleId(held);
    });
    return () => { cancelled = true; };
  }, [result]);

  return (
    <div>
      <ol className="space-y-4">
        {PLACEMENT_QUESTIONS.map((question, index) => (
          <li key={question.id}>
            <div className="rounded-3xl bg-white p-5 ring-1 ring-ink/10 sm:p-6">
            <fieldset>
              <legend className="font-display text-xl leading-snug text-indigo-deep">
                <span className="mr-2 text-violet">{index + 1}.</span>
                {question.prompt}
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {question.options.map((option, score) => {
                  const id = `${baseId}-${question.id}-${score}`;
                  const checked = answers[question.id] === score;
                  return (
                    <label
                      key={option}
                      htmlFor={id}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm leading-snug ring-1 transition ${checked ? "bg-indigo-deep text-cream ring-indigo-deep" : "bg-cream-soft text-ink ring-ink/10 hover:ring-violet"}`}
                    >
                      <input
                        id={id}
                        ref={index === 0 && score === 0 ? firstAnswer : undefined}
                        type="radio"
                        name={`${baseId}-${question.id}`}
                        value={score}
                        checked={checked}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: score as PlacementScore }))}
                        className="h-4 w-4 shrink-0 accent-violet"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            </div>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="mt-8">
        {level && copy && startModuleId ? (
          <section aria-labelledby={`${baseId}-result`} className="rounded-3xl bg-indigo-deep p-6 text-cream sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-pale">Your starting point</p>
            <h2 id={`${baseId}-result`} className="mt-2 font-display text-3xl text-cream sm:text-4xl">
              {copy.heading}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/85">{copy.firstFocus}</p>
            {result !== "advanced" && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                The guided lessons unlock with lifetime access, {LIFETIME.oneTime} in GuitarHub for iPhone.{" "}
                <a href={APP_STORE.ios} className="font-semibold text-peach underline underline-offset-4">
                  {LIFETIME.cta}
                </a>
              </p>
            )}
            {accountModuleId && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                Your account already has its free module, {moduleNames[accountModuleId]}. Start there.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={freeModuleStartHref(startModuleId)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-peach px-6 py-3 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                {copy.freeStep.label}: {moduleNames[startModuleId]} <span aria-hidden>→</span>
              </Link>
              <Link
                href={level.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-semibold text-cream ring-1 ring-white/40 transition hover:bg-white/10"
              >
                {level.cta}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => { setAnswers({}); firstAnswer.current?.focus(); }}
              className="mt-6 min-h-11 text-sm font-semibold text-violet-pale underline underline-offset-4"
            >
              Answer again
            </button>
          </section>
        ) : (
          <p className="text-sm text-ink/70">
            {answered === 0
              ? `Answer all ${PLACEMENT_QUESTIONS.length} questions for your starting point.`
              : `${answered} of ${PLACEMENT_QUESTIONS.length} answered.`}
          </p>
        )}
      </div>
    </div>
  );
}
