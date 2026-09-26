"use client";
import { useState } from "react";
import styles from "./Interactive.module.css";

export type StepCard = { title: string; body: string; lookCheck?: string; listenCheck?: string };

/**
 * Lesson steps one at a time, with Back and Next, the way the lesson apps
 * walk through a technique. "All steps" shows the full list for reading
 * ahead or printing.
 */
export function StepCards({ steps }: { steps: readonly StepCard[] }) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  if (steps.length === 0) return null;
  const go = (next: number) => { setIndex(next); setSeen(previous => new Set(previous).add(next)); };
  const card = (step: StepCard, number: number) => <article className={styles.stepCard} key={step.title}>
    <p className={styles.eyebrow}>Step {number + 1} of {steps.length}</p>
    <h4>{step.title}</h4>
    <p>{step.body}</p>
    {step.lookCheck && <p className={styles.check}><strong>Look:</strong> {step.lookCheck}</p>}
    {step.listenCheck && <p className={styles.check}><strong>Listen:</strong> {step.listenCheck}</p>}
  </article>;
  return <div className={styles.steps}>
    {all ? steps.map(card) : card(steps[index], index)}
    <div className={styles.row} style={{ justifyContent: "space-between" }}>
      {all ? <span /> : <button type="button" className={styles.button} onClick={() => go(index - 1)} disabled={index === 0}>Back</button>}
      {!all && <div className={styles.dots} aria-label="Steps">{steps.map((step, i) => <button key={step.title} type="button" aria-label={`Step ${i + 1}: ${step.title}`} aria-current={i === index ? "step" : undefined} data-seen={seen.has(i)} onClick={() => go(i)} />)}</div>}
      {all ? <button type="button" className={styles.button} onClick={() => setAll(false)}>One at a time</button> : index < steps.length - 1 ? <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => go(index + 1)}>Next</button> : <button type="button" className={styles.button} onClick={() => setAll(true)}>All steps</button>}
    </div>
  </div>;
}
