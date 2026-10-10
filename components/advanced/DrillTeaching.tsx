import Link from "next/link";
import type { Drill } from "@/lib/advanced/drills";
import { drillHref, getDrill } from "@/lib/advanced/drills";
import type { DrillTeaching as Teaching } from "@/lib/advanced/teaching";
import { drillGoalBpm, drillTempoPresets, type TempoPresetId } from "@/lib/advanced/tempo-presets";
import { GUIDES } from "@/lib/site";
import styles from "./Advanced.module.css";

/** What each tempo rung is for. Learn, Build and Goal carry the drill's own focus. */
function rungFocus(id: TempoPresetId, teaching: Teaching, passScore: number): string {
  switch (id) {
    case "learn": return teaching.tempo.learn;
    case "build": return teaching.tempo.build;
    case "push": return "Switch to Play · full check here. Two clean passes in a row earn the next rung.";
    case "goal": return `${teaching.tempo.goal} A pass at ${passScore}% accuracy or better clears the drill.`;
    case "stretch": return "Run a few passes here, then return to the goal. Time above the goal makes the goal feel settled.";
  }
}

/**
 * The drill page's teaching sections: common mistakes, a tempo plan built from
 * the drill's own presets, how to use it in real playing, and related practice.
 * Headings start at h2 under the page h1 and step to h3 inside each section.
 */
export function DrillTeaching({ drill, teaching }: { drill: Drill; teaching: Teaching }) {
  const goal = drillGoalBpm(drill);
  const drills = teaching.relatedDrills.map(id => getDrill(id)).filter((item): item is Drill => item !== undefined);
  const guides = teaching.relatedGuides.map(href => GUIDES.find(guide => guide.href === href)).filter(guide => guide !== undefined);
  return <>
    <section className={styles.teach} aria-labelledby="mistakes-title">
      <h2 id="mistakes-title">Common mistakes</h2>
      <ol className={styles.mistakes}>
        {teaching.mistakes.map(item => <li key={item.mistake}>
          <h3>{item.mistake}</h3>
          <p><strong>Fix:</strong> {item.fix}</p>
        </li>)}
      </ol>
    </section>
    <section className={styles.teach} aria-labelledby="tempo-plan-title">
      <h2 id="tempo-plan-title">Tempo plan</h2>
      <p>100% is the goal tempo, {goal} BPM. Each rung sits about 10% above the one before it, so every step up is one you can hold. The speed presets in the player above use the same rungs.</p>
      <ol className={styles.rungs}>
        {drillTempoPresets(drill).map(preset => <li key={preset.id}>
          <span className={styles.rung}><strong>{preset.label}</strong> {preset.bpm} BPM · {preset.percent}%</span>
          <span>{rungFocus(preset.id, teaching, drill.spec.passScore)}</span>
        </li>)}
      </ol>
      <p><Link className={styles.textLink} href="/tempo">Build a full ladder to your goal</Link> with holds and back-off sessions, starting from the tempo you can play today.</p>
    </section>
    <section className={styles.teach} aria-labelledby="music-title">
      <h2 id="music-title">Make it music</h2>
      <p>{teaching.music}</p>
      <h3>Variation</h3>
      <p>{teaching.variation}</p>
    </section>
    <section className={styles.teach} aria-labelledby="related-title">
      <h2 id="related-title">Related practice</h2>
      <div className={styles.related}>
        <div>
          <h3>Drills</h3>
          <ul>{drills.map(item => <li key={item.id}><Link href={drillHref(item.id)}>{item.title}</Link></li>)}</ul>
        </div>
        <div>
          <h3>Guides</h3>
          <ul>{guides.map(guide => <li key={guide.href}><Link href={guide.href}>{guide.title}</Link></li>)}</ul>
        </div>
      </div>
    </section>
  </>;
}
