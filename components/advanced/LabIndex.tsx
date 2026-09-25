"use client";
import Link from "next/link";
import { drillHref, drillsForArea, SKILL_AREAS } from "@/lib/advanced/drills";
import { useDrillProgress } from "./useDrillProgress";
import styles from "./Advanced.module.css";

/** Every drill, grouped by skill area, with this browser's saved results. */
export function LabIndex() {
  const { progress } = useDrillProgress();
  return <>
    <nav className={styles.areaNav} aria-label="Skill areas">
      {SKILL_AREAS.map(area => <a key={area.id} href={`#${area.id}`}>{area.name}</a>)}
    </nav>
    {SKILL_AREAS.map(area => <section key={area.id} id={area.id} className={styles.area} aria-labelledby={`${area.id}-title`}>
      <div className={styles.areaHead}><h2 id={`${area.id}-title`}>{area.name}</h2><p>{area.blurb}</p></div>
      <ul className={styles.cards}>
        {drillsForArea(area.id).map(drill => {
          const best = progress[drill.id];
          const goal = drill.spec.completionMinimumBPM ?? drill.spec.bpm;
          const cleared = best?.passed && best.bpm >= goal;
          return <li key={drill.id}>
            <Link className={styles.card} href={drillHref(drill.id)}>
              <h3>{drill.title}</h3>
              <p>{drill.summary}</p>
              <span className={styles.meta}>
                <span className={styles.tier} data-tier={drill.tier}>{drill.tier}</span>
                {cleared ? <span className={styles.cleared}>✓ Cleared at {best.bpm} BPM</span> : best ? <span>Best {best.score}% at {best.bpm} BPM</span> : <span>{drill.spec.mode === "rhythm" ? "Timing" : "Pitch"} · goal {goal} BPM · {drill.minutes} min</span>}
              </span>
            </Link>
          </li>;
        })}
      </ul>
    </section>)}
  </>;
}
