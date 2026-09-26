"use client";
import { useState } from "react";
import type { ToneQuestion } from "@/lib/tone/types";
import { useToneProgress } from "./useToneProgress";
import styles from "./Tone.module.css";

/**
 * The end-of-lesson check. Answers are marked only when the learner asks, each
 * with the reason; a perfect check records the lesson as passed in this
 * browser. "Mark as read" is the honest alternative for anyone who does not
 * want the check, and the saved record says which of the two happened.
 */
export function LessonCheck({ lessonId, quiz }: { lessonId: string; quiz: readonly ToneQuestion[] }) {
  const { progress, loaded, recordQuiz, markRead, reset } = useToneProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.map(() => null));
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState("");
  const record = progress[lessonId];
  const correct = answers.filter((answer, index) => answer === quiz[index].answer).length;
  const complete = answers.every(answer => answer !== null);

  function choose(question: number, option: number) {
    if (checked) return;
    setAnswers(previous => previous.map((value, index) => index === question ? option : value));
  }
  function check() {
    setChecked(true);
    if (correct === quiz.length) {
      const saved = recordQuiz(lessonId, correct, quiz.length);
      setMessage(saved ? `All ${quiz.length} right. Lesson passed and saved in this browser.` : `All ${quiz.length} right. Browser storage is unavailable, so this result lasts only while the page is open.`);
    } else {
      setMessage(`${correct} of ${quiz.length} right. Read why for the ones marked, then try the check again.`);
    }
  }
  function retry() {
    setAnswers(quiz.map(() => null));
    setChecked(false);
    setMessage("");
  }
  function read() {
    const saved = markRead(lessonId);
    setMessage(saved ? "Marked as read in this browser. You can take the check any time." : "Browser storage is unavailable, so this cannot be saved.");
  }
  function clear() {
    reset(lessonId);
    retry();
    setMessage("Cleared. This lesson is no longer marked in this browser.");
  }

  return <section className={styles.panel} aria-labelledby="lesson-check">
    <h2 id="lesson-check">Check what stuck</h2>
    <p className={styles.status}>{quiz.length} questions. Get them all right to mark the lesson passed. Your answers stay on this page.</p>
    <form className={styles.quiz} onSubmit={event => { event.preventDefault(); if (complete && !checked) check(); }}>
      {quiz.map((question, index) => <fieldset key={question.q} className={styles.question}>
        <legend>{index + 1}. {question.q}</legend>
        {question.options.map((option, optionIndex) => {
          const chosen = answers[index] === optionIndex;
          const state = !checked ? undefined : optionIndex === question.answer && chosen ? "right" : chosen ? "wrong" : undefined;
          return <label key={optionIndex} className={styles.option} data-state={state}>
            <input type="radio" name={`${lessonId}-q${index}`} checked={chosen} disabled={checked} onChange={() => choose(index, optionIndex)} />
            <span>{option}{state === "right" ? " (correct)" : state === "wrong" ? " (not quite)" : ""}</span>
          </label>;
        })}
        {checked && <p className={styles.why}>{answers[index] === question.answer ? "Right. " : `The answer is “${question.options[question.answer]}”. `}{question.why}</p>}
      </fieldset>)}
      <div className={styles.actions}>
        {!checked
          ? <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!complete}>{complete ? "Check my answers" : `Answer all ${quiz.length} to check`}</button>
          : <button type="button" className={styles.button} onClick={retry}>Try the check again</button>}
        {loaded && !record && <button type="button" className={styles.button} onClick={read}>Mark as read without the check</button>}
        {loaded && record && <button type="button" className={styles.button} onClick={clear}>Clear this lesson&rsquo;s mark</button>}
      </div>
    </form>
    <p role="status" className={styles.status}>{message || (loaded && record ? (record.how === "quiz" ? "Passed: you answered every question in this check correctly." : "Marked as read by you. The check is still here when you want it.") : "")}</p>
  </section>;
}
