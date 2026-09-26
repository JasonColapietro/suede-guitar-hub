"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useGuitarVoice } from "@/components/interactive/useGuitarVoice";
import {
  EMPTY_QUIZ_STATS,
  SCALES,
  TUNINGS,
  averageResponseMs,
  checkQuizAnswer,
  fretboardGrid,
  makeQuizQuestion,
  pitchName,
  positionLabel,
  positionWindows,
  positionsFor,
  quizAnswerCells,
  quizBestKey,
  recordQuizAnswer,
  rootLabel,
  scaleById,
  scaleOctaveMidi,
  spellScale,
  tuningById,
  type Cell,
  type QuizQuestion,
  type QuizSettings,
  type QuizStats,
} from "@/lib/tools/fretboard";
import styles from "./Tools.module.css";
import board from "./FretboardExplorer.module.css";

type Labels = "notes" | "degrees" | "none";
type Mode = "explore" | "quiz";
type Answer = { cell: Cell; correct: boolean };

const BEST_KEY = "guitarhub:fretboard-quiz-best";
const STRING_GAP = 44, TOP = 10, OPEN_WIDTH = 56, RIGHT_PAD = 10, LABEL_ROW = 26;
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
const NOTE_STEP_SECONDS = .34;

/** Fret wire positions: a gentle taper like a real neck, never narrower than a tap target. */
function fretLines(frets: number) {
  const lines = [OPEN_WIDTH];
  for (let fret = 1; fret <= frets; fret++) lines.push(lines[fret - 1] + Math.max(48, Math.round(84 * 2 ** (-(fret - 1) / 24))));
  return lines;
}

const octaveName = (midi: number, flats: boolean) => `${pitchName(midi, flats)}${Math.floor(midi / 12) - 1}`;

/** Clock reads live outside the component so render stays pure. */
const millisecondsSince = (start: number) => performance.now() - start;

function readBest(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch { return {}; }
}
function writeBest(best: Record<string, number>) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch {}
}

export function FretboardExplorer() {
  const [mode, setMode] = useState<Mode>("explore");
  const [root, setRoot] = useState(9);
  const [scaleId, setScaleId] = useState("minor-pentatonic");
  const [tuningId, setTuningId] = useState("standard");
  const [labels, setLabels] = useState<Labels>("notes");
  const [frets, setFrets] = useState<12 | 22>(12);
  const [leftHanded, setLeftHanded] = useState(false);
  const [highlightRoot, setHighlightRoot] = useState(true);
  const [windowIndex, setWindowIndex] = useState(-1);
  const [status, setStatus] = useState("Tap a dot to hear it. Nothing plays until you tap.");
  const { get, error: voiceError } = useGuitarVoice();

  const scale = scaleById(scaleId);
  const tuning = tuningById(tuningId);
  const spelled = useMemo(() => spellScale(root, scale), [root, scale]);
  const positions = useMemo(() => positionsFor(root, scale, tuning, frets), [root, scale, tuning, frets]);
  const windows = useMemo(() => positionWindows(root, scale, tuning, frets), [root, scale, tuning, frets]);
  const activeWindow = windowIndex >= 0 ? windows[windowIndex] ?? null : null;
  const lines = useMemo(() => fretLines(frets), [frets]);
  const flats = spelled.notes.some(note => note.name.includes("♭"));

  // Geometry. Strings are drawn high E at the top, as you see the neck when you look down at it.
  const stringCount = tuning.midi.length;
  const width = lines[frets] + RIGHT_PAD;
  const height = TOP + stringCount * STRING_GAP + LABEL_ROW;
  const flipX = useCallback((x: number) => leftHanded ? width - x : x, [leftHanded, width]);
  const centreX = useCallback((fret: number) => flipX(fret === 0 ? OPEN_WIDTH / 2 : (lines[fret - 1] + lines[fret]) / 2), [flipX, lines]);
  const cellWidth = (fret: number) => fret === 0 ? OPEN_WIDTH - 6 : lines[fret] - lines[fret - 1];
  const rowY = (stringIndex: number) => TOP + (stringCount - 1 - stringIndex) * STRING_GAP + STRING_GAP / 2;

  const pluck = useCallback(async (midi: number) => {
    try { const voice = await get(); voice.pluck(midi); } catch {}
  }, [get]);

  const playScale = async () => {
    const midis = scaleOctaveMidi(root, scale, tuning, frets);
    if (midis.length === 0) return;
    try {
      const voice = await get();
      const start = voice.context.currentTime + .05;
      midis.forEach((midi, index) => voice.pluck(midi, start + index * NOTE_STEP_SECONDS, .7));
      setStatus(`Playing ${spelled.rootName} ${scale.name.toLowerCase()}, one octave up from ${octaveName(midis[0], flats)}.`);
    } catch {}
  };

  const choose = (update: () => void) => { update(); setWindowIndex(-1); };

  // ---------------------------------------------------------------- quiz
  const [naturalOnly, setNaturalOnly] = useState(true);
  const [quizString, setQuizString] = useState<number | null>(6);
  const [playTaps, setPlayTaps] = useState(true);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [stats, setStats] = useState<QuizStats>(EMPTY_QUIZ_STATS);
  const [best, setBest] = useState<Record<string, number>>({});
  const [focus, setFocus] = useState({ stringIndex: 0, fret: 0 });
  const askedAt = useRef(0);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef(new Map<string, SVGGElement>());
  const settings: QuizSettings = useMemo(() => ({ naturalOnly, string: quizString, stringCount }), [naturalOnly, quizString, stringCount]);
  const bestKey = quizBestKey(settings);

  useEffect(() => { setBest(readBest()); }, []);
  useEffect(() => () => { if (advance.current) clearTimeout(advance.current); }, []);

  const ask = useCallback((previous: QuizQuestion | null) => {
    if (advance.current) { clearTimeout(advance.current); advance.current = null; }
    const next = makeQuizQuestion(settings, Math.random, previous);
    setQuestion(next);
    setAnswer(null);
    askedAt.current = millisecondsSince(0);
    const where = next.string === null ? "anywhere on the neck" : `on string ${next.string}`;
    setStatus(`Find ${next.name} ${where}.`);
    if (next.string !== null) setFocus(current => ({ stringIndex: stringCount - next.string!, fret: current.stringIndex === stringCount - next.string! ? current.fret : 0 }));
  }, [settings, stringCount]);

  const startQuiz = () => { setStats(EMPTY_QUIZ_STATS); ask(null); };
  const resetQuiz = () => {
    if (advance.current) { clearTimeout(advance.current); advance.current = null; }
    setQuestion(null); setAnswer(null); setStats(EMPTY_QUIZ_STATS);
  };

  const tapCell = (cell: Cell) => {
    if (playTaps) void pluck(cell.midi);
    if (!question || answer) return;
    if (question.string !== null && cell.string !== question.string) return;
    const correct = checkQuizAnswer(question, cell);
    const elapsed = millisecondsSince(askedAt.current);
    const nextStats = recordQuizAnswer(stats, correct, elapsed);
    setStats(nextStats);
    setAnswer({ cell, correct });
    if (nextStats.bestStreak > (best[bestKey] ?? 0)) {
      const updated = { ...best, [bestKey]: nextStats.bestStreak };
      setBest(updated); writeBest(updated);
    }
    const tapped = `${pitchName(cell.pc, question.name.includes("♭"))}, string ${cell.string} fret ${cell.fret}`;
    if (correct) {
      setStatus(`Correct: ${tapped}. ${(elapsed / 1000).toFixed(1)} seconds. Next note coming.`);
      advance.current = setTimeout(() => ask(question), 900);
    } else {
      const places = quizAnswerCells(question, tuning, frets).filter(c => question.string === null || c.string === question.string);
      const list = places.slice(0, 4).map(c => `string ${c.string} fret ${c.fret}`).join(", ");
      setStatus(`Not quite: you tapped ${tapped}. ${question.name} is at ${list}${places.length > 4 ? " and more" : ""}.`);
      requestAnimationFrame(() => nextButton.current?.focus());
    }
  };

  const nextQuestion = () => {
    ask(question);
    requestAnimationFrame(() => cellRefs.current.get(`${focus.stringIndex}:${focus.fret}`)?.focus());
  };

  // Roving focus: one quiz cell is in the tab order, arrows move between cells.
  const moveFocus = (event: KeyboardEvent<SVGGElement>, cell: Cell) => {
    let { stringIndex, fret } = { stringIndex: cell.stringIndex, fret: cell.fret };
    const toward = leftHanded ? -1 : 1;
    switch (event.key) {
      case "ArrowRight": fret += toward; break;
      case "ArrowLeft": fret -= toward; break;
      case "ArrowUp": stringIndex += 1; break;
      case "ArrowDown": stringIndex -= 1; break;
      case "Home": fret = 0; break;
      case "End": fret = frets; break;
      case "Enter": case " ": event.preventDefault(); tapCell(cell); return;
      default: return;
    }
    event.preventDefault();
    fret = Math.max(0, Math.min(frets, fret));
    stringIndex = Math.max(0, Math.min(stringCount - 1, stringIndex));
    if (question?.string !== null && question?.string !== undefined) stringIndex = stringCount - question.string;
    setFocus({ stringIndex, fret });
    cellRefs.current.get(`${stringIndex}:${fret}`)?.focus();
  };

  const grid = useMemo(() => fretboardGrid(tuning, frets), [tuning, frets]);
  const answerCells = useMemo(() => answer && !answer.correct && question ? new Set(quizAnswerCells(question, tuning, frets).filter(c => question.string === null || c.string === question.string).map(c => `${c.stringIndex}:${c.fret}`)) : new Set<string>(), [answer, question, tuning, frets]);
  const average = averageResponseMs(stats);

  // ---------------------------------------------------------------- drawing
  const neck = <>
    <rect className={board.wood} x={Math.min(flipX(OPEN_WIDTH), flipX(lines[frets]))} y={TOP} width={lines[frets] - OPEN_WIDTH} height={stringCount * STRING_GAP} rx={4} />
    {activeWindow && mode === "explore" && (() => {
      const left = activeWindow.start === 0 ? 4 : lines[activeWindow.start - 1];
      const right = lines[activeWindow.end];
      return <rect className={board.window} x={Math.min(flipX(left), flipX(right))} y={TOP - 4} width={right - left} height={stringCount * STRING_GAP + 8} rx={8} />;
    })()}
    {INLAYS.filter(fret => fret <= frets).map(fret => <circle key={fret} className={board.inlay} cx={centreX(fret)} cy={TOP + stringCount * STRING_GAP / 2} r={7} />)}
    {frets >= 12 && [2, 4].map(k => <circle key={k} className={board.inlay} cx={centreX(12)} cy={TOP + k * STRING_GAP} r={7} />)}
    {lines.slice(1).map((x, index) => <line key={index} className={board.fret} x1={flipX(x)} x2={flipX(x)} y1={TOP} y2={TOP + stringCount * STRING_GAP} />)}
    <line className={board.nut} x1={flipX(OPEN_WIDTH)} x2={flipX(OPEN_WIDTH)} y1={TOP} y2={TOP + stringCount * STRING_GAP} />
    {tuning.midi.map((_, stringIndex) => <line key={stringIndex} className={board.string} x1={flipX(8)} x2={flipX(lines[frets])} y1={rowY(stringIndex)} y2={rowY(stringIndex)} strokeWidth={2.6 - stringIndex * .32} />)}
    {[0, 3, 5, 7, 9, 12, 15, 17, 19, 21].filter(fret => fret <= frets).map(fret => <text key={fret} className={board.fretNumber} x={centreX(fret)} y={TOP + stringCount * STRING_GAP + 17}>{fret}</text>)}
  </>;

  const dotLabel = (note: string, degree: string) => labels === "notes" ? note : labels === "degrees" ? degree : "";

  return <div className={styles.tool}>
    <section className={styles.panel} aria-labelledby="fretboard-controls">
      <h2 id="fretboard-controls">Fretboard explorer</h2>
      <div className={styles.segmented} role="group" aria-label="Mode">
        <button type="button" aria-pressed={mode === "explore"} onClick={() => { setMode("explore"); resetQuiz(); setStatus("Tap a dot to hear it. Nothing plays until you tap."); }}>Explore scales</button>
        <button type="button" aria-pressed={mode === "quiz"} onClick={() => { setMode("quiz"); resetQuiz(); setStatus("Choose a difficulty, then start the quiz."); }}>Find the note</button>
      </div>

      {mode === "explore" && <>
        <fieldset style={{ border: 0, padding: 0, margin: "1rem 0 0" }}>
          <legend className={styles.field}>Root</legend>
          <div className={board.roots}>
            {Array.from({ length: 12 }, (_, pc) => <button key={pc} type="button" aria-pressed={root === pc} onClick={() => choose(() => setRoot(pc))}>{rootLabel(pc)}</button>)}
          </div>
        </fieldset>
        <div className={styles.fields}>
          <label className={styles.field}>Scale or arpeggio
            <select value={scaleId} onChange={event => choose(() => setScaleId(event.target.value))}>
              <optgroup label="Scales and modes">{SCALES.filter(s => s.kind === "scale").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
              <optgroup label="Arpeggios">{SCALES.filter(s => s.kind === "arpeggio").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            </select>
          </label>
          <label className={styles.field}>Tuning
            <select value={tuningId} onChange={event => choose(() => setTuningId(event.target.value))}>
              {TUNINGS.map(t => <option key={t.id} value={t.id}>{t.name} ({t.notes})</option>)}
            </select>
          </label>
          <label className={styles.field}>Position
            <select value={windowIndex} onChange={event => setWindowIndex(Number(event.target.value))}>
              <option value={-1}>Whole neck</option>
              {windows.map(w => <option key={w.index} value={w.index}>{w.label}</option>)}
            </select>
          </label>
        </div>
      </>}

      {mode === "quiz" && <div className={styles.fields}>
        <label className={styles.field}>Notes
          <select value={naturalOnly ? "natural" : "all"} onChange={event => { setNaturalOnly(event.target.value === "natural"); resetQuiz(); }}>
            <option value="natural">Natural notes only</option>
            <option value="all">All twelve notes</option>
          </select>
        </label>
        <label className={styles.field}>Where
          <select value={quizString ?? "neck"} onChange={event => { setQuizString(event.target.value === "neck" ? null : Number(event.target.value)); resetQuiz(); }}>
            {tuning.midi.map((open, index) => { const string = stringCount - index; return <option key={string} value={string}>String {string} ({pitchName(open)})</option>; }).reverse()}
            <option value="neck">Whole neck</option>
          </select>
        </label>
        <label className={styles.field}>Tuning
          <select value={tuningId} onChange={event => { setTuningId(event.target.value); resetQuiz(); }}>
            {TUNINGS.map(t => <option key={t.id} value={t.id}>{t.name} ({t.notes})</option>)}
          </select>
        </label>
      </div>}

      <div className={styles.row}>
        {mode === "explore" && <div className={styles.segmented} role="group" aria-label="Dot labels">
          {(["notes", "degrees", "none"] as const).map(value => <button key={value} type="button" aria-pressed={labels === value} onClick={() => setLabels(value)}>{value === "notes" ? "Note names" : value === "degrees" ? "Degrees" : "No labels"}</button>)}
        </div>}
        <div className={styles.segmented} role="group" aria-label="Frets shown">
          {([12, 22] as const).map(value => <button key={value} type="button" aria-pressed={frets === value} onClick={() => { choose(() => setFrets(value)); setFocus(f => ({ ...f, fret: Math.min(f.fret, value) })); }}>{value} frets</button>)}
        </div>
      </div>
      <div className={styles.row}>
        <label className={board.check}><input type="checkbox" checked={leftHanded} onChange={event => setLeftHanded(event.target.checked)} /> Left-handed</label>
        {mode === "explore" && <label className={board.check}><input type="checkbox" checked={highlightRoot} onChange={event => setHighlightRoot(event.target.checked)} /> Highlight the root</label>}
        {mode === "quiz" && <label className={board.check}><input type="checkbox" checked={playTaps} onChange={event => setPlayTaps(event.target.checked)} /> Play the note I tap</label>}
      </div>
    </section>

    <section className={styles.panel} aria-labelledby="fretboard-neck">
      {mode === "explore" && <>
        <h2 id="fretboard-neck">{spelled.rootName} {scale.name.toLowerCase()} in {tuning.name.toLowerCase()} tuning</h2>
        <div className={styles.row}>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void playScale()}>Play scale</button>
          <span className={styles.caption}>One octave up from the lowest {spelled.rootName} on the neck.</span>
        </div>
      </>}
      {mode === "quiz" && <>
        <h2 id="fretboard-neck">Find the note</h2>
        <div className={styles.readout} aria-live="off">
          {question
            ? <div className={board.question}><strong>{question.name}</strong><span>{question.string === null ? "anywhere on the neck" : `on string ${question.string} (${pitchName(tuning.midi[stringCount - question.string])})`}</span></div>
            : <div className={board.question}><strong>Ready</strong><span>Start when you are.</span></div>}
        </div>
        <dl className={board.stats}>
          <div><dt>Score</dt><dd>{stats.correct}/{stats.answered}</dd></div>
          <div><dt>Streak</dt><dd>{stats.streak}</dd></div>
          <div><dt>Average time</dt><dd>{average === null ? "–" : `${(average / 1000).toFixed(1)} s`}</dd></div>
          <div><dt>Best streak</dt><dd>{best[bestKey] ?? 0}</dd></div>
        </dl>
        <div className={styles.row}>
          {!question && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={startQuiz}>Start quiz</button>}
          {question && answer && !answer.correct && <button ref={nextButton} type="button" className={`${styles.button} ${styles.primary}`} onClick={nextQuestion}>Next note</button>}
          {question && <button type="button" className={styles.button} onClick={resetQuiz}>End quiz</button>}
        </div>
        <p className={styles.caption}>Tap the fret, or use the arrow keys to move along the neck and Enter to answer. Average time counts correct answers only.</p>
      </>}

      <div className={`${styles.scroller} ${board.board}`}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={mode === "explore" ? `Fretboard showing ${spelled.rootName} ${scale.name}` : "Fretboard for the quiz"}>
          {neck}
          {mode === "explore" && positions.map(position => {
            const inWindow = !activeWindow || (position.fret >= activeWindow.start && position.fret <= activeWindow.end);
            const x = centreX(position.fret), y = rowY(position.stringIndex), w = cellWidth(position.fret);
            const text = dotLabel(position.note, position.degree);
            return <g key={`${position.stringIndex}:${position.fret}`} className={board.dot} role="button" tabIndex={0}
              aria-label={positionLabel(position)} data-root={highlightRoot && position.isRoot} data-dim={!inWindow}
              onClick={() => { void pluck(position.midi); setStatus(`${positionLabel(position)}.`); }}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void pluck(position.midi); setStatus(`${positionLabel(position)}.`); } }}>
              <rect className={board.hit} x={x - w / 2} y={y - STRING_GAP / 2} width={w} height={STRING_GAP} />
              <circle className={board.ring} cx={x} cy={y} r={20} />
              <circle className={board.disc} cx={x} cy={y} r={15} />
              {text && <text x={x} y={y}>{text}</text>}
            </g>;
          })}
          {mode === "quiz" && grid.map(cell => {
            const key = `${cell.stringIndex}:${cell.fret}`;
            const x = centreX(cell.fret), y = rowY(cell.stringIndex), w = cellWidth(cell.fret);
            const disabled = !question || !!answer || (question.string !== null && cell.string !== question.string);
            const state = answer && answer.cell.stringIndex === cell.stringIndex && answer.cell.fret === cell.fret ? (answer.correct ? "right" : "wrong") : answerCells.has(key) ? "answer" : null;
            const isFocus = focus.stringIndex === cell.stringIndex && focus.fret === cell.fret;
            return <g key={key} ref={node => { if (node) cellRefs.current.set(key, node); else cellRefs.current.delete(key); }}
              className={board.cell} role="button" tabIndex={isFocus ? 0 : -1} aria-disabled={disabled}
              aria-label={`String ${cell.string}, fret ${cell.fret}${state === "answer" ? `, ${question?.name}` : ""}`} data-state={state ?? undefined}
              onFocus={() => setFocus({ stringIndex: cell.stringIndex, fret: cell.fret })}
              onClick={() => tapCell(cell)} onKeyDown={event => moveFocus(event, cell)}>
              <rect className={board.hit} x={x - w / 2} y={y - STRING_GAP / 2} width={w} height={STRING_GAP} rx={6} />
              {state && <><circle className={board.mark} cx={x} cy={y} r={15} /><text x={x} y={y}>{state === "wrong" ? pitchName(cell.pc, question?.name.includes("♭")) : question?.name}</text></>}
            </g>;
          })}
        </svg>
      </div>
      <p className={styles.status} role="status">{voiceError || status}</p>

      {mode === "explore" && <>
        <h3 id="scale-notes">Notes in {spelled.rootName} {scale.name.toLowerCase()}</h3>
        <ol className={board.notes} aria-labelledby="scale-notes">
          {spelled.notes.map(note => <li key={note.degree}><strong>{note.name}</strong><span>{note.degree} · {note.interval}</span></li>)}
        </ol>
        <p className={styles.caption}>Each note is spelled on its own letter, so a ♭3 is always a third. Roots on black keys use whichever spelling needs fewer sharps or flats.</p>
      </>}
    </section>
  </div>;
}
