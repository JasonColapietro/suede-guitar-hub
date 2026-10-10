"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { lessonFilters, type LessonFilter } from "@/lib/learning/lesson-filter";
import { lessonHref } from "@/lib/learning/track";
import type { TrackId } from "@/lib/learning/models";
import styles from "./Learning.module.css";
import { canOpenModule } from "@/lib/learning/access";
import { useLearningAccess } from "./LearningAccessProvider";

type Search = typeof import("@/lib/learning/lesson-search");

/**
 * Mounted when the search panel first opens. The titles and summaries it
 * searches load then, as their own chunk, rather than with the learning path.
 */
export function LessonLibrary({ track }: { track: TrackId }) {
  const [search, setSearch] = useState<Search | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (track !== "guitar") return;
    let live = true;
    import("@/lib/learning/lesson-search").then(module => { if (live) setSearch(module); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [track]);
  return <LessonLibraryView track={track} search={search} failed={failed} />;
}

/** The library for an already loaded search module (null while it loads). */
export function LessonLibraryView({ track, search, failed = false }: { track: TrackId; search: Search | null; failed?: boolean }) {
  const access = useLearningAccess();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LessonFilter>("guided");
  const searchable = track === "guitar";
  const entries = search && searchable ? search.searchGuitarLessons(filter, query) : [];
  const loading = searchable && !search && !failed;
  return <section className={styles.library} aria-label="Lesson library">
    <h2>{track === "guitar" ? "Find your next song." : "Explore your voice path."}</h2>
    <p>Choose a guided lesson, a song study, or a focused microphone exercise.</p>
    <label className={styles.librarySearch}>Song, artist, chord or skill<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Oasis, chord changes, or pentatonic" autoCapitalize="none" autoCorrect="off" /></label>
    <div className={styles.actions} role="group" aria-label="Lesson filters">{Object.entries(lessonFilters).map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.primary : styles.secondary} aria-pressed={filter === key} onClick={() => setFilter(key as LessonFilter)}>{label}</button>)}</div>
    <p className={styles.small} role="status">{loading ? "Loading the lesson library…" : failed ? "The lesson library could not load. Every lesson is listed in the stages above." : `${entries.length} ${entries.length === 1 ? "result" : "results"} · ${lessonFilters[filter]}`}</p>
    {filter === "songs" && <p className={styles.notice}>Popular-song companions pair original in-app drills with external full-song tutorials. Microphone results measure the drill&apos;s pitch or attack timing; check chords and song performance by ear.</p>}
    {searchable && search && entries.length === 0 && <div className={styles.panel}><h3>No matching lessons</h3><p>Try a shorter search or choose another filter.</p><button type="button" className={styles.secondary} onClick={() => { setQuery(""); setFilter("all"); }}>Show all topics</button></div>}
    <ol className={styles.libraryResults}>{entries.map(lesson => <li key={lesson.id}><Link href={lessonHref(track, lesson.id)}><h3>{lesson.title}</h3><p className={styles.small}>{lesson.moduleName}</p><p>{lesson.summary}</p><span className={styles.badge}>{lesson.mic ? "Mic exercise" : lesson.isGuided ? "Guided self-check" : "Preview outline"}</span><span className={styles.badge}>{!lesson.isGuided && !lesson.mic ? "Curriculum outline" : canOpenModule(track, lesson.moduleId, access) ? "Available" : "Lesson preview"}</span>{(lesson.isGuided || lesson.mic) && <span className={styles.small}>{lesson.minutes} min</span>}</Link></li>)}</ol>
  </section>;
}
