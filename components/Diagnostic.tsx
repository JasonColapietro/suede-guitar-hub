"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DIAGNOSE_STORAGE_KEY,
  DIAGNOSTIC_QUESTIONS,
  diagnose,
  questionPrompt,
  restoreDiagnosticState,
  type DiagnosticAnswers,
  type QuestionId,
  type ScoredBlocker,
} from "@/lib/diagnose";

/**
 * The Practice Plateau Diagnostic. All rules live in `lib/diagnose.ts`; this
 * file holds state, storage, focus, and markup only.
 *
 * Storage: answers are written to localStorage so a refresh does not lose them.
 * Every read and every write is wrapped, because a browser in private mode
 * throws on access rather than returning null, and a full quota throws on
 * write. Losing persistence is acceptable; crashing the page is not.
 *
 * Announcements: the questions and the result swap places, so an `aria-live`
 * region placed on the result would be new to the accessibility tree at the
 * moment it needs to speak. Instead a single status paragraph is mounted for
 * the life of the component and its text is replaced, which is what actually
 * announces. Focus moves to the result heading as well.
 */

const CARD =
  "rounded-[2rem] border border-ink/10 bg-white/70 p-6 shadow-sm sm:p-8 md:p-12";
const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet";
const PRIMARY_BUTTON =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid ${FOCUS_RING}`;
const QUIET_BUTTON =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-indigo-deep transition hover:bg-white ${FOCUS_RING}`;

function readStored(): { answers: DiagnosticAnswers; revealed: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DIAGNOSE_STORAGE_KEY);
    if (!raw) return null;
    const restored = restoreDiagnosticState(JSON.parse(raw));
    if (restored) return restored;
  } catch {
    // Unreadable storage or unparseable JSON. Fall through and clear the key.
  }
  clearStored();
  return null;
}

function clearStored() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DIAGNOSE_STORAGE_KEY);
  } catch {
    // Nothing to do: storage is unavailable, so there is nothing stored.
  }
}

function optionInputId(questionId: QuestionId, optionId: string): string {
  return `diagnose-${questionId}-${optionId}`;
}

function SignalBar({ blocker, lead }: { blocker: ScoredBlocker; lead?: boolean }) {
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span
          className={
            lead
              ? "font-semibold text-indigo-deep"
              : "font-medium text-ink/75"
          }
        >
          {blocker.name}
        </span>
        <span className="text-sm tabular-nums text-ink/60">
          {blocker.score} of {blocker.maxScore} &middot; {blocker.share}%
        </span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-indigo-deep/10"
        aria-hidden
      >
        <span
          className={`block h-full w-full origin-left rounded-full motion-safe:transition-transform motion-safe:duration-300 ${
            lead ? "bg-violet" : "bg-violet-soft"
          }`}
          style={{ transform: `scaleX(${blocker.share / 100})` }}
        />
      </div>
    </li>
  );
}

function BlockerLinks({ blocker }: { blocker: ScoredBlocker }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={blocker.guide.href}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-cream-soft px-5 py-2.5 text-sm font-semibold text-indigo-deep transition hover:bg-peach ${FOCUS_RING}`}
      >
        {blocker.guide.label} <span aria-hidden>&rarr;</span>
      </Link>
      <a
        href={blocker.strumly.href}
        target="_blank"
        rel="noopener"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-indigo-deep transition hover:bg-white ${FOCUS_RING}`}
      >
        {blocker.strumly.label} <span aria-hidden>&#8599;</span>
      </a>
    </div>
  );
}

export default function Diagnostic() {
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  useEffect(() => {
    const restored = readStored();
    if (restored) {
      setAnswers(restored.answers);
      setRevealed(restored.revealed);
    }
    setHydrated(true);
  }, []);

  // The questions and the result swap places, so focus has to be moved by hand
  // or it falls back to the document. This runs after React has committed the
  // new tree, which is why the target is always in the DOM by the time it runs.
  // An earlier version used requestAnimationFrame; that never fires while the
  // document is hidden, and the focus move was silently dropped.
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      if (Object.keys(answers).length === 0) {
        window.localStorage.removeItem(DIAGNOSE_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(
        DIAGNOSE_STORAGE_KEY,
        JSON.stringify({ answers, revealed }),
      );
    } catch {
      // Private mode or a full quota. The tool keeps working in memory; only
      // surviving a refresh is lost, and nothing here is worth a crash.
    }
  }, [answers, hydrated, revealed]);

  const result = useMemo(() => diagnose(answers), [answers]);
  const total = DIAGNOSTIC_QUESTIONS.length;
  const answered = result.answered;
  const answeredPercent = Math.round((answered / total) * 100);

  function choose(questionId: QuestionId, optionId: string) {
    setError("");
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  function reveal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (result.status === "incomplete") {
      const missing = result.unanswered[0];
      setError(
        `${result.unanswered.length} of ${total} questions still need an answer. The first is: ${questionPrompt(missing)}`,
      );
      const firstOption = DIAGNOSTIC_QUESTIONS.find(
        (question) => question.id === missing,
      )?.options[0];
      if (firstOption) setFocusTarget(optionInputId(missing, firstOption.id));
      return;
    }

    setError("");
    setRevealed(true);
    setAnnouncement(
      result.status === "clear"
        ? "Result ready. Nothing in your answers points at a single blocker."
        : `Result ready. Your answers point hardest at ${result.primary.name}.`,
    );
    setFocusTarget("diagnostic-result");
  }

  function changeAnswers() {
    setRevealed(false);
    setAnnouncement(
      `Back to the ${total} questions. Your answers are still filled in.`,
    );
    setFocusTarget("diagnostic-questions");
  }

  function startOver() {
    clearStored();
    setAnswers({});
    setRevealed(false);
    setError("");
    setAnnouncement(`Cleared. All ${total} questions are blank again.`);
    setFocusTarget("diagnostic-questions");
  }

  return (
    <div>
      {/* Mounted for the life of the component so it can actually announce. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {revealed && result.status !== "incomplete" ? (
        <section className={CARD} aria-labelledby="diagnostic-result">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            What your answers point at
          </p>

          {result.status === "clear" ? (
            <>
              <h2
                id="diagnostic-result"
                tabIndex={-1}
                className="mt-3 text-3xl leading-snug text-indigo-deep md:text-4xl"
              >
                Nothing here points at{" "}
                <em className="font-display italic">one blocker.</em>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
                Every answer went the healthy way. You have a target, you check
                it at tempo, you record it, you work the part that breaks, and
                you finish what you start. That does not mean progress is fast.
                It means the shape of your practice is not what is holding it,
                so the next thing to change is what you are practicing, not how.
              </p>
              <p className="mt-4 max-w-2xl leading-relaxed text-ink/70">
                Pick a harder target and run it for four weeks. If the answers
                above stopped being true somewhere along the way, come back and
                take this again.
              </p>
            </>
          ) : (
            <>
              <h2
                id="diagnostic-result"
                tabIndex={-1}
                className="mt-3 text-3xl leading-snug text-indigo-deep md:text-4xl"
              >
                {result.primary.name}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/70">
                {result.primary.summary}
              </p>

              <div className="mt-8 max-w-xl">
                <ul className="space-y-4">
                  <SignalBar blocker={result.primary} lead />
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  {result.confidence === "faint"
                    ? "These are faint signals. Nothing looks badly broken, so read this as the mildest of five rather than a verdict."
                    : result.confidence === "narrow"
                      ? "Two blockers came out close. At this margin the ranking is not decisive, so read the runner-up as well."
                      : "This one leads by a clear margin. Start here."}
                </p>
              </div>

              <div className="mt-10 rounded-3xl bg-cream-soft p-6 ring-1 ring-ink/5 sm:p-8">
                <h3 className="font-display text-xl text-indigo-deep">
                  What to change
                </h3>
                <p className="mt-4 leading-relaxed text-ink/75">
                  {result.primary.prescription}
                </p>
                <p className="mt-6 border-t border-ink/10 pt-5 leading-relaxed text-indigo-deep">
                  <strong className="font-semibold">First move:</strong>{" "}
                  {result.primary.firstMove}
                </p>
                <BlockerLinks blocker={result.primary} />
              </div>

              {result.runnerUp ? (
                <div className="mt-8 rounded-3xl border border-ink/10 p-6 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                    Runner-up
                  </p>
                  <h3 className="mt-2 font-display text-xl leading-snug text-indigo-deep">
                    {result.runnerUp.name}
                  </h3>
                  <p className="mt-3 leading-relaxed text-ink/70">
                    {result.runnerUp.summary}
                  </p>
                  <p className="mt-4 leading-relaxed text-ink/70">
                    <strong className="font-semibold text-indigo-deep">
                      First move:
                    </strong>{" "}
                    {result.runnerUp.firstMove}
                  </p>
                  <BlockerLinks blocker={result.runnerUp} />
                </div>
              ) : null}
            </>
          )}

          <div className="mt-10">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-violet">
              Every signal, scored
            </h3>
            <ul className="mt-5 max-w-xl space-y-4">
              {result.scores.map((blocker, index) => (
                <SignalBar
                  key={blocker.id}
                  blocker={blocker}
                  lead={result.status === "blocked" && index === 0}
                />
              ))}
            </ul>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink/60">
              Each blocker is scored against the most its own questions could
              contribute, so one asked about more often cannot win on volume.
              This is a self-report: it knows what you told it and nothing else.
              A recording is what settles whether the change worked.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-ink/10 pt-8">
            <button type="button" onClick={changeAnswers} className={QUIET_BUTTON}>
              Change my answers
            </button>
            <button type="button" onClick={startOver} className={QUIET_BUTTON}>
              Start over
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={reveal} className={CARD} aria-busy={!hydrated} noValidate>
          <h2
            id="diagnostic-questions"
            tabIndex={-1}
            className="text-3xl leading-snug text-indigo-deep md:text-4xl"
          >
            Nine questions about how you{" "}
            <em className="font-display italic">practice now.</em>
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
            Answer for the practice you actually do, not the practice you mean
            to do. Nothing is sent anywhere. Your answers stay in this browser.
          </p>

          <div className="mt-8 max-w-md">
            <div className="flex items-center justify-between text-sm font-semibold text-indigo-deep">
              <span>Answered</span>
              <span className="tabular-nums">
                {answered} of {total}
              </span>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-deep/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              aria-label={`${answered} of ${total} questions answered`}
            >
              <span
                className="block h-full w-full origin-left rounded-full bg-violet motion-safe:transition-transform motion-safe:duration-300"
                style={{ transform: `scaleX(${answeredPercent / 100})` }}
              />
            </div>
          </div>

          <ol className="mt-12 space-y-10">
            {DIAGNOSTIC_QUESTIONS.map((question, index) => (
              <li key={question.id}>
                <fieldset>
                  <legend className="font-display text-xl leading-snug text-indigo-deep">
                    <span className="text-violet">{index + 1}.</span>{" "}
                    {question.prompt}
                  </legend>
                  {question.help ? (
                    <p className="mt-2 text-sm text-ink/60">{question.help}</p>
                  ) : null}

                  <div className="mt-4 grid gap-2">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 leading-snug text-ink/75 transition has-[:checked]:border-violet/40 has-[:checked]:bg-violet-soft/15 has-[:checked]:text-indigo-deep"
                      >
                        <input
                          id={optionInputId(question.id, option.id)}
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={answers[question.id] === option.id}
                          onChange={() => choose(question.id, option.id)}
                          className={`size-5 shrink-0 accent-violet ${FOCUS_RING}`}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          {error ? (
            <p
              role="alert"
              className="mt-8 rounded-2xl bg-violet-soft/20 px-5 py-4 font-medium text-indigo-deep"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button type="submit" className={PRIMARY_BUTTON}>
              Show what my answers point at <span aria-hidden>&rarr;</span>
            </button>
            {answered > 0 ? (
              <button type="button" onClick={startOver} className={QUIET_BUTTON}>
                Start over
              </button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
