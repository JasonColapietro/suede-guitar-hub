"use client";

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { startVocalReference, type VocalReferencePlayback } from "@/lib/audio/vocal-reference";
import { hasWebAudio } from "@/lib/audio/capture";
import { midiNoteName, vocalStudyTimeline, type VocalLibraryMaterial, type VocalModuleMaterial, type VocalStudy } from "@/lib/learning/vocal-material";
import { VocalRecorder } from "./VocalRecorder";
import styles from "./VocalMaterial.module.css";

function Study({ study }: { study: VocalStudy }) {
  const [transpose, setTranspose] = useState(-12), [speed, setSpeed] = useState(1), [playing, setPlaying] = useState(false), [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null), playback = useRef<VocalReferencePlayback | null>(null), finish = useRef<number | null>(null);
  const keyId = useId(), speedId = useId();
  const timeline = vocalStudyTimeline(study, transpose, speed);
  function stop(nextMessage = "") {
    request.current?.abort(); request.current = null; playback.current?.stop(); playback.current = null;
    if (finish.current !== null) window.clearTimeout(finish.current);
    finish.current = null; setPlaying(false); if (nextMessage) setMessage(nextMessage);
  }
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop("Reference stopped while this page was hidden."); };
    const leave = () => stop();
    document.addEventListener("visibilitychange", hidden); window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", leave); request.current?.abort(); playback.current?.stop(); if (finish.current !== null) window.clearTimeout(finish.current); };
  }, [study.id]);
  async function play() {
    stop();
    if (document.hidden || !hasWebAudio()) { setMessage("Return to this page in a browser with Web Audio before starting the reference."); return; }
    const controller = new AbortController(); request.current = controller; setPlaying(true); setMessage("Starting synthesized pitch reference. The microphone is off.");
    try {
      const active = await startVocalReference(study, transpose, speed, () => { setPlaying(false); setMessage("Reference stopped because another GuitarHub audio tool started."); }, controller.signal);
      if (controller.signal.aborted || document.hidden || request.current !== controller) { active.stop(); return; }
      playback.current = active;
      setMessage("Synthesized reference playing. Stop it before singing.");
      finish.current = window.setTimeout(() => { if (playback.current === active) { playback.current = null; request.current = null; setPlaying(false); setMessage("Reference finished."); } }, active.durationSeconds * 1000 + 150);
    } catch { if (!controller.signal.aborted) { setPlaying(false); setMessage("The reference could not play. Check your device audio and try again."); } }
  }
  return <details className={styles.item} onToggle={event => { if (!(event.currentTarget as HTMLDetailsElement).open) stop(); }}>
    <summary><span>{study.title}</span><small>{study.kind === "song" ? "Song study" : "Warm-up"} · {study.form === "full" ? "Full arrangement" : "Practice phrase"}</small></summary>
    <div className={styles.itemBody}>
      <p>{study.description}</p><p className={styles.tip}>{study.tip}</p>
      <div className={styles.controls}>
        <label htmlFor={keyId}>Comfortable key <strong>{transpose > 0 ? "+" : ""}{transpose} semitones</strong><input id={keyId} type="range" min="-24" max="12" step="1" value={transpose} onChange={event => { stop(); setTranspose(Number(event.target.value)); }} /></label>
        <label htmlFor={speedId}>Reference speed<select id={speedId} value={speed} onChange={event => { stop(); setSpeed(Number(event.target.value)); }}><option value="0.5">Half · 0.5×</option><option value="0.75">Three quarters · 0.75×</option><option value="1">Original · 1×</option></select></label>
      </div>
      <p className={styles.meta}>{Math.round(study.bpm * speed)} BPM · {study.beatsPerBar} beats per bar · {study.countInBeats}-beat count-in. Move the key until every note feels comfortable. Gaps shown below are rests.</p>
      <button type="button" onClick={playing ? () => stop("Reference stopped.") : () => void play()}>{playing ? "Stop reference" : "Hear reference"}</button>
      <p className={styles.status} role="status">{message}</p>
      <ol className={styles.notes} aria-label={`${study.title} notes and words`}>
        {timeline.map(note => <li key={note.index}>{note.restBeforeBeats > 0 && <span className={styles.rest}>Rest {Number(note.restBeforeBeats.toFixed(2))} beats</span>}<strong>{note.lyric.trim() || "Reference note"}</strong><span>{midiNoteName(note.midi)}{note.glideEndMidi !== note.midi ? ` → ${midiNoteName(note.glideEndMidi)}` : ""} · {Number(study.notes[note.index].durBeats.toFixed(2))} beats · bar {Math.floor(study.notes[note.index].startBeat / study.beatsPerBar) + 1}</span></li>)}
      </ol>
      <p className={styles.provenance}>{study.provenance}</p>
      <p className={styles.meta}>This reference demonstrates written pitches and rhythm. It does not demonstrate vocal technique or score your singing.</p>
    </div>
  </details>;
}

function inlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function VocalReadingContent({ body }: { body: string }) {
  const nodes: ReactNode[] = [];
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  let paragraph: string[] = [], list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length > 0) nodes.push(<p key={`p-${nodes.length}`}>{inlineMarkdown(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length > 0) nodes.push(<ul key={`ul-${nodes.length}`}>{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</ul>);
    list = [];
  };
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    const item = line.match(/^[-*+]\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      nodes.push(<h3 key={`h-${nodes.length}`}>{inlineMarkdown(heading[1])}</h3>);
    } else if (item) {
      flushParagraph(); list.push(item[1]);
    } else if (line.trim() === "") {
      flushParagraph(); flushList();
    } else {
      flushList(); paragraph.push(line.trim());
    }
  }
  flushParagraph(); flushList();
  return <>{nodes}</>;
}

function Reading({ title, body }: { title: string; body: string }) {
  return <details className={styles.item}><summary><span>{title}</span><small>Included reading</small></summary><div className={`${styles.itemBody} ${styles.reading}`}><p className={styles.meta}>From The Measured Voice and the Suede Sing vocal atlas. References to Sing scores describe that companion product; GuitarHub does not automatically score this reading or your singing.</p><VocalReadingContent body={body} /></div></details>;
}

export function VocalMaterial({ lessonId, material, accountId, libraryHref }: { lessonId: string; material: VocalModuleMaterial; accountId: string | null; libraryHref?: string }) {
  return <section className={styles.material} aria-labelledby="voice-material-heading">
    <p className={styles.eyebrow}>Practice material</p><h2 id="voice-material-heading">Notes, demonstrations, and reading</h2>
    <p>These studies and readings are included with this lesson. Listen to a synthesized reference in a comfortable key, stop it before singing, and use the written notes and rests as your guide.</p>
    {libraryHref && <p><Link className={styles.libraryLink} href={libraryHref}>Browse all 70 studies and 26 readings</Link></p>}
    {material.studies.length > 0 ? <div className={styles.list}>{material.studies.map(study => <Study key={study.id} study={study} />)}</div> : <p className={styles.meta}>This module uses its included reading and lesson exercises without a pitch study.</p>}
    <div className={styles.list}>{material.readings.map(reading => <Reading key={reading.id} {...reading} />)}</div>
    <VocalRecorder lessonId={lessonId} accountId={accountId} />
  </section>;
}

export function VocalLibrary({ material }: { material: VocalLibraryMaterial }) {
  const warmups = material.studies.filter(study => study.kind === "warmup");
  const songs = material.studies.filter(study => study.kind === "song");
  return <section className={styles.material} aria-labelledby="full-voice-material-heading">
    <p className={styles.eyebrow}>Complete practice library</p>
    <h1 id="full-voice-material-heading">All voice studies and readings</h1>
    <p>Complete Lifetime access includes every authored study and reading. Choose a comfortable key, use the synthesized pitch reference before you sing, and stop if your voice feels painful, strained, or hoarse.</p>
    <h2>{warmups.length} warmups</h2><div className={styles.list}>{warmups.map(study => <Study key={study.id} study={study} />)}</div>
    <h2>{songs.length} public-domain song and melody studies</h2><div className={styles.list}>{songs.map(study => <Study key={study.id} study={study} />)}</div>
    <h2>{material.readings.length} included readings</h2><div className={styles.list}>{material.readings.map(reading => <Reading key={reading.id} {...reading} />)}</div>
  </section>;
}
