"use client";

import { useMemo, useState } from "react";
import { useGuitarVoice } from "@/components/interactive/useGuitarVoice";
import { INLAYS, NOTE_NAMES, PATTERNS, TUNINGS, cells, degree, inPattern, noteName, pitchClass, quizCell, type Cell } from "@/lib/tone/fretboard";
import styles from "./Tone.module.css";

const FRETS = 15;
type Label = "notes" | "degrees" | "none";

export default function FretboardExplorer() {
  const [tuningId, setTuningId] = useState("standard");
  const [root, setRoot] = useState(9); // A
  const [patternId, setPatternId] = useState("minor-pent");
  const [label, setLabel] = useState<Label>("degrees");
  const [mode, setMode] = useState<"explore" | "quiz">("explore");
  const [quiz, setQuiz] = useState<Cell | null>(null);
  const [quizResult, setQuizResult] = useState<string>("");
  const [tally, setTally] = useState({ right: 0, total: 0 });
  const voice = useGuitarVoice();

  const tuning = TUNINGS.find(item => item.id === tuningId) ?? TUNINGS[0];
  const pattern = PATTERNS.find(item => item.id === patternId) ?? PATTERNS[0];
  const grid = useMemo(() => cells(tuning, FRETS), [tuning]);
  const rows = [...grid].reverse(); // high E on top, as a player looks down at the neck

  const pluck = async (midi: number) => { try { (await voice.get()).pluck(midi); } catch {} };
  const playPattern = async () => {
    try {
      const v = await voice.get();
      const low = tuning.strings[0];
      let first = low; while (pitchClass(first) !== root) first++;
      const notes = [...pattern.intervals.map(i => first + i), first + 12];
      notes.forEach((midi, i) => v.pluck(midi, v.context.currentTime + .05 + i * .28));
    } catch {}
  };
  const newQuiz = () => { setQuiz(quizCell(tuning, 12)); setQuizResult(""); };
  const answerQuiz = (pc: number) => {
    if (!quiz || quizResult) return;
    const right = pitchClass(quiz.midi) === pc;
    setTally(prev => ({ right: prev.right + (right ? 1 : 0), total: prev.total + 1 }));
    setQuizResult(right ? `Right: ${noteName(quiz.midi)}.` : `That was ${noteName(quiz.midi)}.`);
    void pluck(quiz.midi);
  };

  return (
    <div className={styles.lab}>
      <div className={styles.transport}>
        <div className={styles.abSwitch} role="group" aria-label="Mode">
          <button type="button" aria-pressed={mode === "explore"} onClick={() => setMode("explore")}>Explore scales</button>
          <button type="button" aria-pressed={mode === "quiz"} onClick={() => { setMode("quiz"); newQuiz(); }}>Name that note</button>
        </div>
        <label className={styles.select}>Tuning
          <select value={tuningId} onChange={e => setTuningId(e.target.value)}>{TUNINGS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </label>
        {mode === "explore" && <>
          <label className={styles.select}>Key
            <select value={root} onChange={e => setRoot(Number(e.target.value))}>{NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
          </label>
          <label className={styles.select}>Pattern
            <select value={patternId} onChange={e => setPatternId(e.target.value)}>
              {(["Scales", "Modes", "Arpeggios"] as const).map(group => <optgroup key={group} label={group}>{PATTERNS.filter(p => p.group === group).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}
            </select>
          </label>
          <label className={styles.select}>Show
            <select value={label} onChange={e => setLabel(e.target.value as Label)}><option value="degrees">Scale degrees</option><option value="notes">Note names</option><option value="none">Dots only</option></select>
          </label>
          <button type="button" className={styles.play} onClick={playPattern}>▶ Hear it</button>
        </>}
      </div>
      {voice.error && <p role="alert" className={styles.error}>{voice.error}</p>}

      <div className={styles.neckScroll}>
        <div className={styles.neck} style={{ ["--frets" as string]: FRETS + 1 }} role="grid" aria-label={mode === "explore" ? `${NOTE_NAMES[root]} ${pattern.name} on the fretboard` : "Fretboard quiz"}>
          {rows.map(row => (
            <div key={row[0].string} className={styles.string} role="row">
              {row.map(cell => {
                const inside = mode === "explore" && inPattern(cell.midi, root, pattern);
                const isRoot = inside && pitchClass(cell.midi) === root;
                const isQuiz = mode === "quiz" && quiz?.string === cell.string && quiz?.fret === cell.fret;
                const text = label === "notes" ? noteName(cell.midi) : label === "degrees" ? degree(cell.midi, root) : "";
                return (
                  <button key={cell.fret} type="button" role="gridcell" className={styles.fret} data-open={cell.fret === 0}
                    onClick={() => void pluck(cell.midi)} aria-label={`${noteName(cell.midi)}, string ${6 - cell.string}, fret ${cell.fret}`}>
                    {inside && <span className={styles.dot} data-root={isRoot}>{text}</span>}
                    {isQuiz && <span className={styles.dot} data-quiz="true">?</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <div className={styles.fretNumbers} aria-hidden>
            {Array.from({ length: FRETS + 1 }, (_, fret) => <span key={fret} data-inlay={INLAYS.includes(fret)}>{fret}</span>)}
          </div>
        </div>
      </div>

      {mode === "explore" ? (
        <p className={styles.vibe}>
          <strong>{NOTE_NAMES[root]} {pattern.name}:</strong> {pattern.intervals.map(i => NOTE_NAMES[(root + i) % 12]).join(" · ")}. Filled dots are the root. Tap any fret to hear it.
        </p>
      ) : (
        <div className={styles.result}>
          <p className={styles.resultHead}>{quizResult || "Which note is under the question mark?"}</p>
          <div className={styles.bands}>
            {NOTE_NAMES.map((n, pc) => <button key={n} type="button" className={styles.band} disabled={!!quizResult} data-state={quizResult && quiz && pitchClass(quiz.midi) === pc ? "right" : ""} onClick={() => answerQuiz(pc)}><span className={styles.bandWord}>{n}</span></button>)}
          </div>
          <p className={styles.small}>{tally.right} of {tally.total} right this session.</p>
          {quizResult && <button type="button" className={styles.play} onClick={newQuiz}>Next note →</button>}
        </div>
      )}
    </div>
  );
}
