"use client";
import { useCallback, useEffect, useState } from "react";
import { daysThisWeek, parsePracticeLog, PRACTICE_LOG_KEY, streak, withPractice, type PracticeLog, type Stars } from "@/lib/learning/rewards";
import styles from "./Interactive.module.css";

const EVENT = "guitarhub:practice-log";
function read(): PracticeLog { try { return parsePracticeLog(window.localStorage.getItem(PRACTICE_LOG_KEY)); } catch { return parsePracticeLog(null); } }

/** Record that the learner practised (a saved result) and read the log back. */
export function usePracticeLog() {
  const [log, setLog] = useState<PracticeLog | null>(null);
  useEffect(() => {
    const sync = () => setLog(read());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(EVENT, sync); };
  }, []);
  const record = useCallback((seconds: number) => {
    const next = withPractice(read(), new Date(), seconds);
    try { window.localStorage.setItem(PRACTICE_LOG_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const setGoal = useCallback((goal: number) => {
    const next = { ...read(), weeklyGoal: goal };
    try { window.localStorage.setItem(PRACTICE_LOG_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { log, record, setGoal };
}

export function StarRating({ stars, label }: { stars: Stars; label?: string }) {
  return <span className={styles.stars} role="img" aria-label={`${stars} of 3 stars${label ? `, ${label}` : ""}`}>
    {[1, 2, 3].map(n => <span key={n} className={n <= stars ? undefined : styles.off} aria-hidden="true">★</span>)}
  </span>;
}

/**
 * Streak and weekly goal in one quiet line. Renders nothing until the
 * learner has saved a first result, so a new visitor is not greeted by zeros.
 */
export function PracticeStats({ tone = "light", editable = false }: { tone?: "light" | "dark"; editable?: boolean }) {
  const { log, setGoal } = usePracticeLog();
  if (!log || Object.keys(log.days).length === 0) return null;
  const today = new Date();
  const run = streak(log, today), week = daysThisWeek(log, today);
  return <div className={styles.stats} data-tone={tone}>
    <span><strong>{run}</strong> day{run === 1 ? "" : "s"} in a row</span>
    <span className={styles.week} aria-label={`${week} of ${log.weeklyGoal} practice days this week`}>
      <span className={styles.weekBar}><span style={{ width: `${Math.min(100, (week / log.weeklyGoal) * 100)}%` }} /></span>
      <span><strong>{Math.min(week, 7)}</strong> of {log.weeklyGoal} days this week</span>
    </span>
    {editable && <label className={styles.goal}>Goal <select value={log.weeklyGoal} onChange={event => setGoal(Number(event.target.value))} aria-label="Weekly practice goal in days">{[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} days</option>)}</select></label>}
  </div>;
}
