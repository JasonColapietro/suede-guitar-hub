"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RIFFS, driveCurve, openRig, type Rig } from "@/lib/tone/rig";
import { EMPTY_STATS, LEVELS, bandFor, nextBand, octavesApart, score, type EarStats } from "@/lib/tone/ear";
import styles from "./Tone.module.css";

const STORAGE = "guitarhub:ear-eq:best";

export default function EqEarTrainer() {
  const [levelId, setLevelId] = useState<(typeof LEVELS)[number]["id"]>("easy");
  const [sourceId, setSourceId] = useState<"clean" | "crunch">("crunch");
  const [target, setTarget] = useState<number | null>(null);
  const [boosted, setBoosted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [answer, setAnswer] = useState<{ guess: number; right: boolean } | null>(null);
  const [stats, setStats] = useState<EarStats>(EMPTY_STATS);
  const [savedBest, setSavedBest] = useState(0);
  const [error, setError] = useState("");
  const rig = useRef<Rig | null>(null);
  const eq = useRef<BiquadFilterNode | null>(null);
  const shaper = useRef<WaveShaperNode | null>(null);
  const level = LEVELS.find(item => item.id === levelId) ?? LEVELS[0];

  useEffect(() => { try { setSavedBest(Number(localStorage.getItem(STORAGE)) || 0); } catch {} }, []);

  const stop = useCallback(() => { rig.current?.stop(); rig.current = null; eq.current = null; shaper.current = null; setPlaying(false); }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stop(); };
  }, [stop]);

  // Keep the filter in step with the question and the A/B switch.
  useEffect(() => {
    const filter = eq.current, context = rig.current?.context;
    if (!filter || !context || target === null) return;
    filter.frequency.setValueAtTime(target, context.currentTime);
    filter.gain.setTargetAtTime(boosted ? level.gainDb : 0, context.currentTime, .015);
  }, [target, boosted, level.gainDb, playing]);

  useEffect(() => {
    const node = shaper.current;
    if (node) node.curve = driveCurve(sourceId === "crunch" ? .35 : 0);
    if (playing) rig.current?.playRiff(RIFFS.find(r => r.id === (sourceId === "crunch" ? "power" : "arpeggio")) ?? RIFFS[0]);
  }, [sourceId, playing]);

  const newQuestion = useCallback(() => { setTarget(prev => nextBand(level, prev)); setAnswer(null); setBoosted(true); }, [level]);

  const start = async () => {
    setError("");
    try {
      const opened = await openRig(() => { rig.current = null; setPlaying(false); });
      const { context } = opened;
      const drive = context.createWaveShaper(), filter = context.createBiquadFilter(), cab = context.createBiquadFilter();
      drive.curve = driveCurve(sourceId === "crunch" ? .35 : 0);
      filter.type = "peaking"; filter.Q.value = 1.4; filter.gain.value = 0;
      cab.type = "lowpass"; cab.frequency.value = 9000;
      opened.input.connect(drive); drive.connect(filter); filter.connect(cab); cab.connect(opened.output);
      rig.current = opened; eq.current = filter; shaper.current = drive;
      if (target === null) newQuestion();
      setPlaying(true);
    } catch { setError("Sound could not start. Check your volume and silent switch, then tap again."); }
  };

  const guess = (hz: number) => {
    if (target === null || answer) return;
    const right = hz === target;
    setAnswer({ guess: hz, right });
    setBoosted(true);
    setStats(prev => {
      const next = score(prev, right);
      if (next.best > savedBest) { setSavedBest(next.best); try { localStorage.setItem(STORAGE, String(next.best)); } catch {} }
      return next;
    });
  };

  const correctBand = target === null ? null : bandFor(target);

  return (
    <div className={styles.lab}>
      <div className={styles.transport}>
        <button type="button" className={styles.play} onClick={playing ? stop : start} aria-pressed={playing}>{playing ? "■ Stop" : "▶ Start listening"}</button>
        <label className={styles.select}>Difficulty
          <select value={levelId} onChange={e => { setLevelId(e.target.value as typeof levelId); setTarget(null); setAnswer(null); setStats(EMPTY_STATS); }}>
            {LEVELS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className={styles.select}>Guitar sound
          <select value={sourceId} onChange={e => setSourceId(e.target.value as typeof sourceId)}>
            <option value="crunch">Crunchy rhythm</option>
            <option value="clean">Clean arpeggio</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <p className={styles.vibe}>Headphones help a lot here: phone speakers barely reproduce the two lowest bands.</p>

      <div className={styles.abSwitch} role="group" aria-label="Compare boosted and flat">
        <button type="button" aria-pressed={!boosted} onClick={() => setBoosted(false)} disabled={!playing}>Flat</button>
        <button type="button" aria-pressed={boosted} onClick={() => setBoosted(true)} disabled={!playing}>Boosted +{level.gainDb} dB</button>
      </div>

      <p className={styles.prompt}>{playing ? "Flip between Flat and Boosted. Which band got louder?" : "Press Start. One frequency band will be boosted; your job is to name it."}</p>
      <div className={styles.bands}>
        {level.bands.map(hz => {
          const band = bandFor(hz);
          const state = !answer ? "" : hz === target ? "right" : hz === answer.guess ? "wrong" : "";
          return (
            <button key={hz} type="button" className={styles.band} data-state={state} disabled={!playing || !!answer} onClick={() => guess(hz)}>
              <span className={styles.bandWord}>{band.word}</span>
              <span className={styles.bandHz}>{band.label}</span>
            </button>
          );
        })}
      </div>

      {answer && correctBand && (
        <div className={styles.result} aria-live="polite">
          <p className={styles.resultHead}>{answer.right ? `Yes: ${correctBand.label}, ${correctBand.word.toLowerCase()}.` : `It was ${correctBand.label} (${correctBand.word.toLowerCase()}). ${octavesApart(answer.guess, correctBand.hz) <= 1.01 ? "You were one step away." : ""}`}</p>
          <p>{correctBand.hint}</p>
          <button type="button" className={styles.play} onClick={newQuestion}>Next sound →</button>
        </div>
      )}

      <dl className={styles.stats}>
        <div><dt>Answered</dt><dd>{stats.answered}</dd></div>
        <div><dt>Correct</dt><dd>{stats.answered ? Math.round((stats.correct / stats.answered) * 100) : 0}%</dd></div>
        <div><dt>Streak</dt><dd>{stats.streak}</dd></div>
        <div><dt>Best streak</dt><dd>{savedBest}</dd></div>
      </dl>
    </div>
  );
}
