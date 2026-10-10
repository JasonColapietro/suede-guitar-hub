"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  PLACEMENT_QUESTIONS,
  PLACEMENT_RESULTS,
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
 * The five-question placement on /start. Nothing is stored or sent: the
 * answers live in component state and the result is computed by `placeLevel`.
 */
export default function LevelCheck() {
  const [answers, setAnswers] = useState<Draft>({});
  const baseId = useId();
  const answered = PLACEMENT_QUESTIONS.filter((question) => answers[question.id] !== undefined).length;
  const result = complete(answers) ? placeLevel(answers) : null;
  const level = result ? levelById(result) : null;
  const copy = result ? PLACEMENT_RESULTS[result] : null;

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
        {level && copy ? (
          <section aria-labelledby={`${baseId}-result`} className="rounded-3xl bg-indigo-deep p-6 text-cream sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-pale">Your starting point</p>
            <h2 id={`${baseId}-result`} className="mt-2 font-display text-3xl text-cream sm:text-4xl">
              {copy.heading}
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/85">{copy.firstFocus}</p>
            {result !== "advanced" && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                The guided lessons unlock with lifetime access, {LIFETIME.oneTime} in GuitarHub for iPhone.
                Start the first module free in the app.{" "}
                <a href={APP_STORE.ios} className="font-semibold text-peach underline underline-offset-4">
                  {LIFETIME.cta}
                </a>
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={level.href}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-peach px-6 py-3 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                {level.cta} <span aria-hidden>→</span>
              </Link>
              <Link
                href={copy.freeStep.href}
                className="inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 font-semibold text-cream ring-1 ring-white/40 transition hover:bg-white/10"
              >
                {copy.freeStep.label}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setAnswers({})}
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
