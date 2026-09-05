"use client";

import { useEffect, useId, useRef, useState } from "react";
import { playReference } from "@/lib/audio/capture";
import { frequencyForMIDI, noteName } from "@/lib/audio/dsp";
import { readingQuizResult, type InstructionAsset, type InstructionQuiz, type InstructionQuizItem, type ReadingQuizAttempt } from "@/lib/learning/instructions";
import styles from "./InstructionAssets.module.css";

type ChordAsset = Extract<InstructionAsset, { kind: "chord" }>;
type RhythmAsset = Extract<InstructionAsset, { kind: "rhythm" }>;

function useReferenceSound() {
  const controller = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  function stop() { controller.current?.abort(); controller.current = null; setPlaying(false); }
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") { controller.current?.abort(); controller.current = null; setPlaying(false); } };
    document.addEventListener("visibilitychange", hidden);
    return () => { controller.current?.abort(); controller.current = null; document.removeEventListener("visibilitychange", hidden); };
  }, []);
  async function play(midi: number, centsOffset = 0) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPlaying(true); setError("");
    try { await playReference(frequencyForMIDI(midi) * 2 ** (centsOffset / 1200), request.signal); }
    catch { if (!request.signal.aborted) setError("The reference sound could not play. Check your device audio and try again."); }
    finally { if (controller.current === request) { controller.current = null; setPlaying(false); } }
  }
  return { play, stop, playing, error };
}

function SoundNote({ playing, error, stop }: { playing: boolean; error: string; stop: () => void }) {
  return <><p className={styles.caption}>Synthesized reference pitch. Playing a reference stops microphone capture; let the sound fade before playing your own note.</p>{playing && <button type="button" className={styles.button} onClick={stop}>Stop reference</button>}{error && <p role="alert">{error}</p>}</>;
}

function StringReferences({ asset }: { asset: Extract<InstructionAsset, { kind: "strings" }> }) {
  const [selected, setSelected] = useState(6);
  const sound = useReferenceSound();
  const target = asset.strings.find(item => item.string === selected) ?? asset.strings[0];
  const selectId = useId();
  return <section className={styles.asset} aria-label="Open-string reference sounds">
    <h3>Find a string. Hear its pitch.</h3>
    <label className={styles.selectLabel} htmlFor={selectId}>Reference string</label>
    <select id={selectId} value={selected} disabled={sound.playing} onChange={event => setSelected(Number(event.target.value))}>{asset.strings.map(item => <option key={item.string} value={item.string}>String {item.string} · {item.name} · {item.note}</option>)}</select>
    <div className={styles.strings} aria-hidden="true">{asset.strings.map(item => <div key={item.string} className={styles.stringRow} data-selected={item.string === target.string}><span>{item.string}</span><span className={styles.stringLine} style={{ height: `${Math.max(1, item.string / 1.5)}px` }} /><span>{item.note}</span></div>)}</div>
    <p><strong>String {target.string} · {target.note} · open (fret 0)</strong></p>
    <p className={styles.caption}>String 6 is the thick low E. String 1 is the thin high E. Reference tuning: A4 = {asset.referenceAHz} Hz.</p>
    <button type="button" className={styles.button} disabled={sound.playing} onClick={() => void sound.play(target.midi)}>{sound.playing ? "Reference playing or fading…" : `Hear ${target.note}`}</button>
    <SoundNote {...sound} />
  </section>;
}

function PitchComparison({ asset }: { asset: Extract<InstructionAsset, { kind: "pitchComparison" }> }) {
  const sound = useReferenceSound();
  return <section className={styles.asset}><h3>Hear below, on, and above the target</h3><p>Listen to {noteName(asset.baseMidi)} first, then choose a comparison. These examples are deliberately separated by 50 cents to make the direction audible.</p><div className={styles.actions}>{asset.examples.map(example => <button key={example.label} type="button" className={styles.button} disabled={sound.playing} onClick={() => void sound.play(asset.baseMidi, example.centsOffset)}>{example.label}</button>)}</div><SoundNote {...sound} /></section>;
}

export function ChordDiagram({ asset, hideName = false }: { asset: ChordAsset; hideName?: boolean }) {
  const accessible = `${hideName ? "Chord diagram" : `${asset.name} chord diagram`}. Strings 6 to 1 from left to right. ${asset.frets.map((fret, i) => `String ${6 - i}: ${fret === null ? "X, silent" : fret === 0 ? "O, open" : `fret ${fret}${asset.fingers[i] ? `, finger ${asset.fingers[i]}` : ""}`}`).join(". ")}.`;
  return <figure className={styles.chord}>
    <figcaption>{hideName ? "Read this shape" : `${asset.name} chord`}</figcaption>
    <svg viewBox="0 0 300 218" role="img" aria-label={accessible}>
      {[1, 2, 3, 4].map(fret => <g key={fret}><line x1="38" y1={65 + (fret - 1) * 40} x2="263" y2={65 + (fret - 1) * 40} stroke="currentColor" strokeWidth={fret === 1 ? 5 : 1} />{fret <= 3 && <text x="10" y={93 + (fret - 1) * 40} fontSize="12">{fret}</text>}</g>)}
      {asset.frets.map((fret, i) => <g key={i}><text x={38 + i * 45} y="17" textAnchor="middle" fontSize="12">{6 - i}</text><text x={38 + i * 45} y="48" textAnchor="middle" fontSize="17" fontWeight="700">{fret === null ? "X" : fret === 0 ? "O" : ""}</text><line x1={38 + i * 45} y1="65" x2={38 + i * 45} y2="185" stroke="currentColor" strokeWidth="1" />{fret !== null && fret > 0 && <><circle cx={38 + i * 45} cy={45 + fret * 40} r="15" fill="#6d28d9" /><text x={38 + i * 45} y={50 + fret * 40} textAnchor="middle" fill="white" fontSize="14" fontWeight="650">{asset.fingers[i] ?? "●"}</text></>}</g>)}
      <text x="150" y="211" textAnchor="middle" fontSize="12">Strings 6 → 1</text>
    </svg>
    <p className={styles.caption}>X = silent · O = open. Dots contain finger numbers. The thick top line is the nut; frets 1–3 run downward.</p>
  </figure>;
}

function ChordReference({ asset }: { asset: ChordAsset }) {
  const [hidden, setHidden] = useState(false);
  const sound = useReferenceSound();
  return <section className={styles.asset}>
    <ChordDiagram asset={asset} hideName={hidden} />
    <button type="button" className={styles.button} aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? "Reveal chord name" : "Hide chord name"}</button>
    <details><summary>Hear each written pitch</summary><p className={styles.caption}>Read from the lowest sounding string to the highest. Each button plays one pitch, not a recording of a guitar chord.</p><div className={styles.actions}>{asset.soundingMidi.map((midi, index) => <button type="button" className={styles.button} key={`${midi}-${index}`} disabled={sound.playing} onClick={() => void sound.play(midi)}>{index + 1}. {noteName(midi)}</button>)}</div><SoundNote {...sound} /></details>
  </section>;
}

export function TabDiagram({ string = 1, fret = 0 }: { string?: number; fret?: number }) {
  const names = ["E4", "B3", "G3", "D3", "A2", "E2"];
  return <figure className={styles.tab}>
    <figcaption>Guitar tab</figcaption>
    <svg viewBox="0 0 340 185" role="img" aria-label={`Six tab lines. String 1, high E, is at the top; string 6, low E, is at the bottom. The number ${fret} is on string ${string}, identifying fret ${fret}${fret === 0 ? ", an open string" : ""}.`}>
      {names.map((name, i) => <g key={name}><text x="3" y={21 + i * 28} fontSize="12">{i + 1} · {name}</text><line x1="62" x2="326" y1={17 + i * 28} y2={17 + i * 28} stroke="currentColor" /><line x1="62" x2="62" y1="17" y2="157" stroke="currentColor" />{i + 1 === string && <><rect x="170" y={4 + i * 28} width="26" height="25" fill="#f7f3ee" /><text x="183" y={23 + i * 28} textAnchor="middle" fontSize="20" fontWeight="700">{fret}</text></>}</g>)}
    </svg>
    <p className={styles.caption}>The line names the string. The number names the fret, not the finger.</p>
  </figure>;
}

export function BeatDiagram({ asset }: { asset: RhythmAsset }) {
  return <figure className={styles.beats}><figcaption>{asset.meter.numerator}/{asset.meter.denominator} · read the written beats</figcaption><div role="img" aria-label={`${asset.eventBeats.length} quarter-note slashes on beats ${asset.eventBeats.map(beat => beat + 1).join(", ")}.`} className={styles.beatBar}>{Array.from({ length: asset.meter.numerator }, (_, beat) => <span key={beat} aria-hidden="true"><small>{beat + 1}</small><strong>{asset.eventBeats.includes(beat) ? "╱" : "—"}</strong></span>)}</div><p className={styles.caption}>One stroke for each slash. Say the beat numbers evenly. This reading diagram does not measure your timing.</p></figure>;
}

function SetupDiagram() {
  return <section className={styles.asset}><h3>Support the guitar. Free your fretting hand.</h3><div className={styles.setup}><div><strong>Body and thigh</strong><p>Rest the guitar body on your thigh and lightly against your torso.</p></div><div><strong>Picking forearm</strong><p>Let your forearm rest over the body edge without clamping your shoulder.</p></div><div><strong>Pick grip</strong><p>Meet the thumb pad with the side of a gently curled index finger. Leave a small pick tip showing.</p></div></div><p className={styles.caption}>Your fretting hand should be able to move without carrying the guitar.</p></section>;
}

export function LessonInstructionAssets({ assets, startCollapsed = false }: { assets: InstructionAsset[]; startCollapsed?: boolean }) {
  return <details className={styles.references} open={!startCollapsed}><summary>Lesson references · sounds and diagrams</summary><div className={styles.assetList}>{assets.map(asset => {
    if (asset.kind === "strings") return <StringReferences key={asset.id} asset={asset} />;
    if (asset.kind === "pitchComparison") return <PitchComparison key={asset.id} asset={asset} />;
    if (asset.kind === "chord") return <ChordReference key={asset.id} asset={asset} />;
    if (asset.kind === "rhythm") return <section key={asset.id} className={styles.asset}><BeatDiagram asset={asset} /></section>;
    if (asset.id === "notation-legend") return <section key={asset.id} className={styles.asset}><TabDiagram /><p className={styles.caption}>In a chord box, X and O sit above the strings; dots show fretting fingers. Compare the chord and beat diagrams below.</p></section>;
    if (asset.id === "support-and-pick") return <SetupDiagram key={asset.id} />;
    if (asset.id === "tuner-directions") return <section key={asset.id} className={styles.asset}><h3>Tuning direction · string 5, A2</h3><div className={styles.setup}><div><strong>Below target</strong><p>Pitch is low. Make a small adjustment that raises it.</p></div><div><strong>In tune</strong><p>Check the string number and octave, then recheck your note.</p></div><div><strong>Above target</strong><p>Pitch is high. Make a small adjustment that lowers it.</p></div></div><p className={styles.caption}>Peg layouts differ. Follow the pitch change rather than a fixed clockwise direction.</p></section>;
    return asset.kind === "diagram" ? <p key={asset.id} className={styles.caption}>{asset.textAlternative ?? "This reference diagram is not available yet."}</p> : null;
  })}</div></details>;
}

const kindNames: Record<string, string> = { tab: "Tab and fret numbers", chord_symbol: "X and O symbols", chord_name: "Chord names", rhythm: "Written beats", chord_start: "Lowest sounding string" };
function QuestionDiagram({ item, assets }: { item: InstructionQuizItem; assets: InstructionAsset[] }) {
  const asset = assets.find(asset => asset.id === item.demoAssetId);
  if (asset?.kind === "chord") return <ChordDiagram asset={asset} hideName={item.hideAssetName} />;
  if (asset?.kind === "rhythm") return <BeatDiagram asset={asset} />;
  if (item.kind === "tab") return <TabDiagram string={item.id === "read-03" ? 2 : 1} fret={item.id === "read-03" ? 2 : item.id === "read-04" ? 3 : 0} />;
  return null;
}

export function ReadingQuiz({ quiz, assets, attempts, currentAttempt, onStart, onAnswer, storageWarning }: {
  quiz: InstructionQuiz; assets: InstructionAsset[]; attempts: ReadingQuizAttempt[]; currentAttempt?: ReadingQuizAttempt;
  onStart: () => void; onAnswer: (questionId: string, optionIndex: number) => void; storageWarning: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const quizId = useId();
  const result = currentAttempt ? readingQuizResult(quiz, currentAttempt) : null;
  const answered = currentAttempt ? Object.keys(currentAttempt.answers).length : 0;
  return <section className={styles.quiz} aria-label="Reading checkpoint">
    <h3>Read it, then choose</h3>
    <p>{quiz.passingCorrectCount} correct first responses out of {quiz.items.length} completes this reading check. There is no time bonus. Each submitted answer is locked for that attempt; a new attempt keeps your earlier results.</p>
    <p className={styles.caption}>This checks notation recognition. It does not listen to your instrument or assess playing technique.</p>
    {storageWarning && <p role="status" className={styles.warning}>Browser storage is unavailable. Answers are kept for this open page only and may be lost when you close or reload it.</p>}
    {!currentAttempt ? <button type="button" className={styles.button} onClick={onStart}>Start reading check</button> : <>
      <p className={styles.progress} role="status">Attempt {attempts.findIndex(attempt => attempt.id === currentAttempt.id) + 1} · {answered} of {quiz.items.length} answered</p>
      {quiz.items.map((item, index) => {
        const answer = currentAttempt.answers[item.id];
        const correct = answer?.optionIndex === item.correctOptionIndex;
        const selectionKey = `${currentAttempt.id}:${item.id}`;
        return <div key={selectionKey} className={styles.question}>
          <fieldset disabled={!!answer}><legend>{index + 1}. {item.prompt}</legend>
            <QuestionDiagram item={item} assets={assets} />
            {item.options.map((option, optionIndex) => <label className={styles.option} key={optionIndex}><input type="radio" name={`${quizId}-${item.id}`} checked={(answer?.optionIndex ?? selected[selectionKey]) === optionIndex} onChange={() => setSelected(previous => ({ ...previous, [selectionKey]: optionIndex }))} />{option}</label>)}
          </fieldset>
          {!answer && <button type="button" className={styles.button} disabled={selected[selectionKey] === undefined} onClick={() => onAnswer(item.id, selected[selectionKey])}>Check answer {index + 1}</button>}
          {answer && <div className={correct ? styles.correct : styles.review} role="status"><strong>{correct ? "Correct on the first response." : "Review this one."}</strong><p>{item.explanation}</p>{!correct && <p>Correct answer: {item.options[item.correctOptionIndex]}</p>}</div>}
        </div>;
      })}
      {result && <div className={result.passed ? styles.correct : styles.review} role="status"><h4>{result.correctCount} of {result.total} · {result.passed ? "Reading check passed" : "Another reading pass will help"}</h4><p>{result.missedKinds.length ? `Revisit: ${result.missedKinds.map(kind => kindNames[kind] ?? kind).join(", ")}.` : "Every written prompt was answered correctly on this attempt."}</p><p className={styles.caption}>This reading result is saved separately from microphone practice and your self-checks.</p><button type="button" className={styles.button} onClick={onStart}>Try a new reading attempt</button></div>}
    </>}
    {attempts.some(attempt => readingQuizResult(quiz, attempt)) && <details className={styles.history}><summary>Reading attempt history</summary><ol>{attempts.map((attempt, index) => {
      const score = readingQuizResult(quiz, attempt);
      return score ? <li key={attempt.id}>Attempt {index + 1}: {score.correctCount}/{score.total} · {score.passed ? "passed" : "review"}{index === 0 ? " · first attempt" : ""}</li> : null;
    })}</ol></details>}
  </section>;
}
