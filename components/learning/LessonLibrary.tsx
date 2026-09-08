"use client";
import { useState } from "react";
import Link from "next/link";
import { browseLessons, lessonFilters, type LessonFilter } from "@/lib/learning/library";
import { lessonHref, type TrackId } from "@/lib/learning/curriculum";
import styles from "./Learning.module.css";
import { canOpenModule } from "@/lib/learning/access";
import { useLearningAccess } from "./LearningAccessProvider";

export function LessonLibrary({ track }: { track: TrackId }) {
  const access = useLearningAccess();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LessonFilter>("guided");
  const entries = browseLessons(track, filter, query);
  return <section className={styles.library} aria-label="Lesson library">
    <h2>{track === "guitar" ? "Find your next song." : "Explore your voice path."}</h2>
    <p>Choose a guided lesson, a song study, or a focused microphone exercise.</p>
    <label className={styles.librarySearch}>Song, artist, chord or skill<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Oasis, chord changes, or pentatonic" autoCapitalize="none" autoCorrect="off" /></label>
    <div className={styles.actions} role="group" aria-label="Lesson filters">{Object.entries(lessonFilters).map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.primary : styles.secondary} aria-pressed={filter === key} onClick={() => setFilter(key as LessonFilter)}>{label}</button>)}</div>
    <p className={styles.small} role="status">{entries.length} {entries.length === 1 ? "result" : "results"} · {lessonFilters[filter]}</p>
    {filter === "songs" && <p className={styles.notice}>Popular-song companions pair original in-app drills with external full-song tutorials. Microphone results measure the drill&apos;s pitch or attack timing; check chords and song performance by ear.</p>}
    {entries.length === 0 && <div className={styles.panel}><h3>No matching lessons</h3><p>{track === "voice" && filter === "guided" ? "Voice currently has curriculum previews. Choose Previews to explore the planned topics." : "Try a shorter search or choose another filter."}</p><button type="button" className={styles.secondary} onClick={() => { setQuery(""); setFilter("all"); }}>Show all topics</button></div>}
    <ol className={styles.libraryResults}>{entries.map(({ lesson, module, isGuided }) => <li key={lesson.id}><Link href={lessonHref(track, lesson.id)}><h3>{lesson.title}</h3><p className={styles.small}>{module.name}</p><p>{lesson.summary}</p><span className={styles.badge}>{lesson.practiceSpec ? "Mic exercise" : isGuided ? "Guided self-check" : "Preview outline"}</span><span className={styles.badge}>{!isGuided && !lesson.practiceSpec ? "Curriculum outline" : canOpenModule(track, module.id, access) ? "Available" : "Lesson preview"}</span>{(isGuided || lesson.practiceSpec) && <span className={styles.small}>{lesson.minutes} min</span>}</Link></li>)}</ol>
  </section>;
}
