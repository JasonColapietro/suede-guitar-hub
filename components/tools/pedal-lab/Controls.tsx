"use client";
import { PEDAL_DEFS, formatKnob, type KnobDef, type Pedal } from "@/lib/tools/pedal-lab";
import tools from "../Tools.module.css";
import styles from "../PedalLab.module.css";

/** One knob: a labelled range input with its value read out, or a select for a switch. */
export function Knob({ knob, value, id, onChange }: { knob: KnobDef; value: number; id: string; onChange: (value: number) => void }) {
  if (knob.choices) {
    return <label className={tools.field} htmlFor={id}>
      {knob.label}
      <select id={id} value={Math.round(value)} onChange={event => onChange(Number(event.target.value))}>
        {knob.choices.map((choice, index) => <option key={choice} value={index}>{choice}</option>)}
      </select>
    </label>;
  }
  const text = formatKnob(knob, value);
  return <div className={tools.field}>
    <label htmlFor={id} className={styles.knobLabel}>
      <span>{knob.label}</span>
      <output htmlFor={id} className={tools.value}>{text}</output>
    </label>
    <input id={id} type="range" min={knob.min} max={knob.max} step={knob.step} value={value} aria-valuetext={text}
      onChange={event => onChange(Number(event.target.value))} />
  </div>;
}

type CardProps = {
  pedal: Pedal;
  index: number;
  count: number;
  idPrefix: string;
  onKnob: (knob: string, value: number) => void;
  onToggle: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

/** A pedal on the board: footswitch, knobs, and buttons to move or remove it. */
export function PedalCard({ pedal, index, count, idPrefix, onKnob, onToggle, onMove, onRemove }: CardProps) {
  const def = PEDAL_DEFS[pedal.type];
  const base = `${idPrefix}-${pedal.id}`;
  return <li className={styles.pedal} data-family={def.family} data-on={pedal.on}>
    <div className={styles.pedalHead}>
      <h3 id={`${base}-name`}><span className={styles.position}>{index + 1}</span>{def.name}</h3>
      <button type="button" className={`${tools.button} ${styles.footswitch}`} aria-pressed={pedal.on}
        aria-label={`${def.name} on`} onClick={onToggle}>
        <span className={styles.led} aria-hidden="true" />{pedal.on ? "On" : "Off"}
      </button>
    </div>
    <p className={tools.caption}>{def.summary}</p>
    <div className={styles.knobs}>
      {def.knobs.map(knob => <Knob key={knob.id} knob={knob} id={`${base}-${knob.id}`} value={pedal.settings[knob.id] ?? knob.default}
        onChange={value => onKnob(knob.id, value)} />)}
    </div>
    <div className={styles.pedalActions}>
      <button type="button" id={`${base}-left`} className={tools.button} disabled={index === 0} onClick={() => onMove(-1)}
        aria-label={`Move ${def.name} earlier in the chain`}>← Earlier</button>
      <button type="button" id={`${base}-right`} className={tools.button} disabled={index === count - 1} onClick={() => onMove(1)}
        aria-label={`Move ${def.name} later in the chain`}>Later →</button>
      <button type="button" className={`${tools.button} ${styles.remove}`} onClick={onRemove} aria-label={`Remove ${def.name}`}>Remove</button>
    </div>
  </li>;
}
