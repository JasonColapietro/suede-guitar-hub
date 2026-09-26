"use client";
import { useState } from "react";
import { PracticeCoach } from "@/components/practice/PracticeCoach";
import { TabPlayer } from "@/components/interactive/TabPlayer";
import { StarRating, usePracticeLog } from "@/components/interactive/PracticeStats";
import { starsForResult } from "@/lib/learning/rewards";
import type { Drill } from "@/lib/advanced/drills";
import { useDrillProgress } from "./useDrillProgress";
import styles from "./Advanced.module.css";

/** The drill's practice coach plus its saved best result. */
export function DrillSession({ drill }: { drill: Drill }) {
  const { progress, record } = useDrillProgress();
  const [message, setMessage] = useState("");
  const practiceLog = usePracticeLog();
  const best = progress[drill.id];
  const goal = drill.spec.completionMinimumBPM ?? drill.spec.bpm;
  return <div className={styles.session}>
    <div className={styles.goal}>
      <div><span className={styles.label}>Goal</span><strong>{goal} BPM · {drill.spec.passScore}%</strong></div>
      <div><span className={styles.label}>Your best</span><strong>{best ? `${best.score}% at ${best.bpm} BPM` : "No result yet"}</strong></div>
      <div><span className={styles.label}>Rating</span><strong>{best ? <StarRating stars={starsForResult(best, goal)} /> : "–"}</strong></div>
    </div>
    <TabPlayer key={`tab-${drill.id}`} bestKey={drill.spec.mode === "rhythm" ? `drill:${drill.id}` : undefined} timeline={drill.spec} title={drill.spec.mode === "rhythm" ? "Hear the rhythm" : "Hear the line"} />
    <PracticeCoach
      key={drill.id}
      spec={drill.spec}
      track="guitar"
      recentAttempts={best ? [{ bpm: best.bpm, score: best.score, disposition: "scored", passed: best.passed, specRevision: drill.spec.revision }] : []}
      onComplete={result => {
        const saved = record(drill.id, result);
        practiceLog.record(Math.max(30, result.practiceSeconds));
        setMessage(saved
          ? result.passed && result.bpm >= goal ? "Cleared and saved in this browser. Try it faster, or move to the next drill." : "Saved in this browser. Keep going until you clear the goal tempo."
          : "Could not save: browser storage is unavailable, so this result lasts only while the page is open.");
      }}
    />
    {message && <p className={styles.saved} role="status">{message}</p>}
  </div>;
}
