"use client";
import { useEffect, useId, useRef, useState } from "react";
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
  const [levelName, setLevelName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const searchable = track === "guitar";
  const entries = search && searchable ? search.searchGuitarLessons(filter, query, levelName) : [];
  const loading = searchable && !search && !failed;
  const clearSearch = () => { setQuery(""); searchRef.current?.focus(); };
  return <section className={styles.library} aria-label="Lesson library">
    <h2>{track === "guitar" ? "Find your next lesson or song." : "Explore your voice path."}</h2>
    <p>Choose a guided lesson, a song study, or a focused microphone exercise.</p>
    <div className={styles.libraryControls}>
      <label className={styles.librarySearch}>Song, artist, chord or skill<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Oasis, chord changes, or pentatonic" autoCapitalize="none" autoCorrect="off" aria-describedby={statusId} /></label>
      <label className={styles.librarySearch}>Stage or collection<select value={levelName} onChange={event => setLevelName(event.target.value)} disabled={!search} aria-describedby={statusId}><option value="">All stages and songs</option>{search?.guitarLessonLevels.map(level => <option key={level} value={level}>{level}</option>)}</select></label>
    </div>
    <div className={styles.actions} role="group" aria-label="Lesson filters">{Object.entries(lessonFilters).map(([key, label]) => <button key={key} type="button" className={filter === key ? styles.primary : styles.secondary} aria-pressed={filter === key} onClick={() => setFilter(key as LessonFilter)}>{label}{search && <span className={styles.filterCount}> ({search.searchGuitarLessons(key as LessonFilter, query, levelName).length})</span>}</button>)}</div>
    {query && <button type="button" className={`${styles.secondary} ${styles.libraryClear}`} onClick={clearSearch}>Clear search</button>}
    <p id={statusId} className={styles.small} role="status" aria-atomic="true">{loading ? "Loading the lesson library…" : failed ? "The lesson library could not load. Every lesson is listed in the stages below." : `${entries.length} ${entries.length === 1 ? "result" : "results"} · ${lessonFilters[filter]}${levelName ? ` · ${levelName}` : ""}${query.trim() ? ` for “${query.trim()}”` : ""}`}</p>
    {filter === "songs" && <p className={styles.notice}>Popular-song companions pair original in-app drills with external full-song tutorials. Microphone results measure the drill&apos;s pitch or attack timing; check chords and song performance by ear.</p>}
    {searchable && search && entries.length === 0 && <div className={styles.panel}><h3>No matching lessons</h3><p>Try a shorter search or choose another filter.</p>{(filter !== "all" || levelName) && <button type="button" className={styles.secondary} onClick={() => { setFilter("all"); setLevelName(""); searchRef.current?.focus(); }}>Search all stages and topics</button>}</div>}
    <ol className={styles.libraryResults} aria-busy={loading}>{entries.map(lesson => <li key={lesson.id}><Link href={lessonHref(track, lesson.id)}><h3>{lesson.title}</h3><p className={styles.small}>{lesson.levelName} · {lesson.moduleName}</p><p>{lesson.summary}</p><span className={styles.badge}>{lesson.mic ? "Mic exercise" : lesson.isGuided ? "Guided self-check" : "Preview outline"}</span><span className={styles.badge}>{!lesson.isGuided && !lesson.mic ? "Curriculum outline" : canOpenModule(track, lesson.moduleId, access) ? "Available" : "Lesson preview"}</span>{(lesson.isGuided || lesson.mic) && <span className={styles.small}>{lesson.minutes} min</span>}</Link></li>)}</ol>
  </section>;
}
