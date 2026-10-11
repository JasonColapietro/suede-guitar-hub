import { BREAKTHROUGH_STORAGE_KEY, createBreakthroughPlan, progressPercent, restoreBreakthroughState } from "./breakthrough.ts";
import { SESSION_STORAGE_KEY, buildSessionPlan, restoreSessionState, sessionMinutesDone, sessionProgressPercent } from "./session.ts";
import { TEMPO_STORAGE_KEY, buildTempoLadder, restoreTempoState, tempoProgressPercent } from "./tempo.ts";
import { LOG_STORAGE_KEY, recentFirst, restoreLogState } from "./log.ts";

export const WORKSPACE_KEYS = [SESSION_STORAGE_KEY, BREAKTHROUGH_STORAGE_KEY, TEMPO_STORAGE_KEY, LOG_STORAGE_KEY] as const;

export type PracticeCard = {
  href: string;
  label: string;
  title: string;
  detail: string;
  metric: string;
  cta: string;
  saved: boolean;
  complete: boolean;
  percent: number | null;
};

export type PracticeWorkspaceState = {
  cards: PracticeCard[];
  hasSavedWork: boolean;
  storageUnavailable: boolean;
  next: { href: string; label: string };
};

/** Read-only projection of the tools' existing validated data. Visiting the
 * overview never repairs, deletes, or rewrites a player's saved practice. */
export function readPracticeWorkspace(getItem: (key: string) => string | null): PracticeWorkspaceState {
  let storageUnavailable = false;
  function read(key: string): unknown {
    let raw: string | null;
    try { raw = getItem(key); } catch { storageUnavailable = true; return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  const session = restoreSessionState(read(SESSION_STORAGE_KEY));
  const breakthrough = restoreBreakthroughState(read(BREAKTHROUGH_STORAGE_KEY));
  const tempo = restoreTempoState(read(TEMPO_STORAGE_KEY));
  const entries = restoreLogState(read(LOG_STORAGE_KEY)) ?? [];
  const cards: PracticeCard[] = [
    { href: "/session", label: "This session", title: "Give your minutes a job.", detail: "Choose the time you have and the one thing you want to improve.", metric: "5–180 minutes", cta: "Build a session", saved: false, complete: false, percent: null },
    { href: "/breakthrough", label: "Your 30-day plan", title: "One goal. A clear next step.", detail: "Turn a chord change, a whole song, or a solo into a four-week plan.", metric: "One focused goal", cta: "Choose your goal", saved: false, complete: false, percent: null },
    { href: "/tempo", label: "Your tempo ladder", title: "Build speed that holds.", detail: "Start where you can play cleanly. Work up in manageable steps.", metric: "Your pace, your target", cta: "Build a tempo ladder", saved: false, complete: false, percent: null },
    { href: "/log", label: "Your evidence", title: "Make progress visible.", detail: "Keep the number and the short note that tell you what changed.", metric: "Ready for your first entry", cta: "Log a session", saved: false, complete: false, percent: null },
  ];

  if (session) {
    const plan = buildSessionPlan(session.input);
    if (plan.ok) {
      const pending = plan.value.blocks.find((block) => !session.completedBlockIds.includes(block.id));
      cards[0] = { ...cards[0], saved: true, complete: !pending, title: plan.value.focusLabel,
        metric: `${sessionMinutesDone(plan.value, session.completedBlockIds)} of ${plan.value.minutes} min checked`,
        detail: pending ? `Next: ${pending.name} · ${pending.minutes} min. ${pending.doThis}` : "Every block is checked. Log what changed, then build your next session.",
        cta: pending ? "Continue session" : "Review session", percent: sessionProgressPercent(plan.value, session.completedBlockIds) };
    }
  }
  if (breakthrough) {
    const plan = createBreakthroughPlan(breakthrough.profile);
    const pendingWeek = plan.weeks.find((week) => week.actions.some((action) => !breakthrough.completedActionIds.includes(action.id)));
    const pending = pendingWeek?.actions.find((action) => !breakthrough.completedActionIds.includes(action.id));
    const total = plan.weeks.reduce((count, week) => count + week.actions.length, 0);
    cards[1] = { ...cards[1], saved: true, complete: !pending, title: plan.title,
      metric: `${breakthrough.completedActionIds.length} of ${total} actions checked`,
      detail: pending && pendingWeek ? `Week ${pendingWeek.week}: ${pending.label}` : "Every action is checked. Compare your first and final recordings and keep the result in your log.",
      cta: pending ? "Continue your plan" : "Review your plan", percent: progressPercent(plan, breakthrough.completedActionIds) };
  }
  if (tempo) {
    const ladder = buildTempoLadder(tempo.input);
    if (ladder.ok) {
      const pending = ladder.value.rungs.find((rung) => !tempo.completedRungIds.includes(rung.id));
      cards[2] = { ...cards[2], saved: true, complete: !pending, title: `${ladder.value.currentBpm} to ${ladder.value.targetBpm} BPM`,
        metric: `${tempo.completedRungIds.length} of ${ladder.value.rungs.length} steps checked`,
        detail: pending ? `Next: ${pending.bpm} BPM. ${pending.instruction}` : "Every step is checked. Record a clean pass at your target and add the result to your log.",
        cta: pending ? "Continue tempo work" : "Review tempo ladder", percent: tempoProgressPercent(ladder.value, tempo.completedRungIds) };
    }
  }
  const latest = recentFirst(entries)[0];
  if (latest) {
    cards[3] = { ...cards[3], saved: true, title: latest.focus,
      metric: `${entries.length} ${entries.length === 1 ? "session" : "sessions"} logged`,
      detail: `Latest entry: ${latest.date} · ${latest.value}${latest.metric === "tempo" ? " BPM" : "% clean passes"}${latest.note ? `. ${latest.note}` : "."}`,
      cta: "Open your evidence log" };
  }
  const hasSavedWork = cards.some((card) => card.saved);
  const unfinished = cards.slice(0, 3).find((card) => card.saved && !card.complete);
  return { cards, hasSavedWork, storageUnavailable,
    next: unfinished ? { href: unfinished.href, label: unfinished.cta }
      : hasSavedWork ? { href: "/log", label: "Review your practice evidence" }
      : { href: "/session", label: "Build this session" } };
}
