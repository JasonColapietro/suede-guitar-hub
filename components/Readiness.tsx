"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  MAX_SONGS,
  READINESS_CRITERIA,
  READINESS_STORAGE_KEY,
  READINESS_TOTAL_WEIGHT,
  addSong,
  removeSong,
  restoreReadinessState,
  scoreReadiness,
  summarizeRepertoire,
  toggleCriterion,
  type ReadinessSong,
} from "@/lib/readiness";

/**
 * The Song Readiness Score tool.
 *
 * Every rule lives in `lib/readiness.ts`; this file owns state, the DOM, and
 * the literal localStorage calls. No account, no network, no upload: the
 * repertoire is written to this browser and nowhere else.
 */

const NAME_INPUT_ID = "readiness-song-name";
const RESULT_HEADING_ID = "readiness-result";

const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-[3px] focus-visible:outline-violet-soft";
const HAS_FOCUS_RING =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-violet-soft";
const SMALL_BUTTON =
  `inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-indigo-deep motion-safe:transition hover:bg-cream-soft ${FOCUS_RING}`;

export default function Readiness() {
  const [songs, setSongs] = useState<ReadinessSong[]>([]);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  // Read once, on mount, never during render — that is what keeps the server
  // HTML and the first client render identical.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(READINESS_STORAGE_KEY);
      if (raw) {
        const restored = restoreReadinessState(JSON.parse(raw));
        if (restored) {
          setSongs(restored);
          setActiveSongId(restored[0]?.id ?? null);
        } else {
          window.localStorage.removeItem(READINESS_STORAGE_KEY);
        }
      }
    } catch {
      // Private mode throws on access and corrupt JSON throws on parse. The
      // cleanup itself can throw for the first of those, so it needs its own
      // guard or it would escape this handler.
      try {
        window.localStorage.removeItem(READINESS_STORAGE_KEY);
      } catch {
        // Storage is unavailable entirely. There is nothing to clean up.
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  // The `hydrated` gate is load-bearing: without it this effect fires before
  // the read effect has restored, and the empty default overwrites the saved
  // repertoire on every page load.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        READINESS_STORAGE_KEY,
        JSON.stringify({ songs }),
      );
    } catch {
      // Private mode and a full quota both throw on write. The tool keeps
      // working for this session; only persistence is lost.
    }
  }, [hydrated, songs]);

  const activeSong = useMemo(
    () => songs.find((song) => song.id === activeSongId) ?? songs[0] ?? null,
    [activeSongId, songs],
  );

  const assessment = useMemo(
    () => (activeSong ? scoreReadiness(activeSong.checkedIds) : null),
    [activeSong],
  );

  const repertoire = useMemo(() => summarizeRepertoire(songs), [songs]);

  // Adding or removing a song swaps what is on screen, so focus has to be moved
  // by hand or it falls back to the document. Driving it from an effect keyed on
  // the target runs after React has committed the new tree, which is when the
  // element exists. An earlier version used requestAnimationFrame, which never
  // fires while the document is hidden — the move was silently dropped in a
  // backgrounded tab, exactly where the same bug was already fixed in
  // Diagnostic.tsx and TempoLadder.tsx.
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget)?.focus();
    setFocusTarget(null);
  }, [focusTarget]);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = addSong(songs, draftName);
      const added = next[next.length - 1];
      setSongs(next);
      setActiveSongId(added.id);
      setDraftName("");
      setError("");
      setFocusTarget(RESULT_HEADING_ID);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Check the song name.",
      );
    }
  }

  function handleToggle(criterionId: string) {
    if (!activeSong) return;
    const songId = activeSong.id;
    setSongs((current) => toggleCriterion(current, songId, criterionId));
  }

  function handleRemove(songId: string) {
    const next = removeSong(songs, songId);
    setSongs(next);
    setActiveSongId(next[0]?.id ?? null);
    setError("");
    setFocusTarget(NAME_INPUT_ID);
  }

  function handleClear() {
    try {
      window.localStorage.removeItem(READINESS_STORAGE_KEY);
    } catch {
      // Storage unavailable. The in-memory reset below still happens.
    }
    setSongs([]);
    setActiveSongId(null);
    setDraftName("");
    setError("");
    setFocusTarget(NAME_INPUT_ID);
  }

  // One polite live region for the whole result. The score, the band, and the
  // next action all change on a single checkbox click, so announcing them as
  // one sentence beats three regions competing to speak.
  const liveSummary =
    activeSong && assessment
      ? `${activeSong.name}: ${assessment.score} out of 100. ${assessment.band.label}. ${
          assessment.nextAction
            ? `Next action: ${assessment.nextAction.label}`
            : "Every check on this list is done."
        }`
      : "";

  return (
    <section
      aria-labelledby="readiness-heading"
      className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-ink/5 sm:p-10 lg:p-12"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
        Song readiness score
      </span>
      <h2
        id="readiness-heading"
        className="mt-3 text-3xl leading-snug text-indigo-deep md:text-4xl"
      >
        Score one song against ten checks{" "}
        <em className="font-display italic">that break under pressure.</em>
      </h2>
      <p className="mt-4 max-w-2xl text-ink/70">
        Answer each check honestly. Two of the ten carry more weight than any
        other check, because two of them end a performance rather than dent it.
        Your songs stay in this browser.
      </p>

      <form onSubmit={handleAdd} className="mt-8" aria-busy={!hydrated}>
        <label
          htmlFor={NAME_INPUT_ID}
          className="block text-sm font-semibold text-indigo-deep"
        >
          Which song are you scoring?
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id={NAME_INPUT_ID}
            name="song"
            type="text"
            autoComplete="off"
            maxLength={80}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Comfortably Numb"
            aria-describedby="readiness-name-help"
            className={`min-h-11 w-full min-w-0 rounded-2xl border border-indigo-deep/15 bg-white px-4 py-3 text-ink placeholder:text-ink/55 ${FOCUS_RING}`}
          />
          <button
            type="submit"
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-indigo-deep px-6 py-3 font-semibold text-cream motion-safe:transition hover:bg-indigo-mid ${FOCUS_RING}`}
          >
            Score this song <span aria-hidden>→</span>
          </button>
        </div>
        <p id="readiness-name-help" className="mt-2 text-sm text-ink/60">
          Add up to {MAX_SONGS} songs and switch between them. Nothing is sent
          anywhere.
        </p>
        {error ? (
          <p role="alert" className="mt-3 font-medium text-violet">
            {error}
          </p>
        ) : null}
      </form>

      {songs.length > 0 ? (
        <fieldset className="mt-8 border-t border-ink/10 pt-6">
          <legend className="text-[11px] font-semibold uppercase tracking-widest text-violet">
            Your songs
          </legend>
          <ul className="mt-3 flex flex-wrap gap-2">
            {songs.map((song) => {
              const songScore = scoreReadiness(song.checkedIds).score;
              return (
                <li key={song.id}>
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm text-ink/70 motion-safe:transition has-[:checked]:border-indigo-deep has-[:checked]:bg-indigo-deep has-[:checked]:text-cream ${HAS_FOCUS_RING}`}
                  >
                    <input
                      type="radio"
                      name="readiness-active-song"
                      value={song.id}
                      checked={song.id === activeSong?.id}
                      onChange={() => setActiveSongId(song.id)}
                      className="sr-only"
                    />
                    <span className="max-w-[11rem] truncate font-medium">
                      {song.name}
                    </span>
                    <span aria-hidden className="text-xs tabular-nums opacity-70">
                      {songScore}
                    </span>
                    <span className="sr-only">
                      scores {songScore} out of 100
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {songs.length > 1 ? (
            <p className="mt-4 text-sm text-ink/60">
              {repertoire.songCount} songs scored. Average{" "}
              {repertoire.averageScore} out of 100.{" "}
              {repertoire.stageReady === 1
                ? "One is stage-ready."
                : `${repertoire.stageReady} are stage-ready.`}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liveSummary}
      </p>

      {activeSong && assessment ? (
        <div className="mt-10 border-t border-ink/10 pt-10">
          <h3
            id={RESULT_HEADING_ID}
            tabIndex={-1}
            className="font-display text-3xl leading-snug text-indigo-deep md:text-4xl"
          >
            {activeSong.name}
          </h3>

          <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="rounded-3xl bg-cream-soft p-6 ring-1 ring-ink/5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-violet">
                Readiness
              </p>
              <p className="mt-2 flex items-baseline gap-1 text-indigo-deep">
                <span className="font-display text-6xl tabular-nums leading-none">
                  {assessment.score}
                </span>
                {/* ink/65 for the same reason as the weighted-points line
                    below: on cream-soft, ink/50 measures 3.25:1 and this is
                    18px regular, which WCAG does not count as large text. */}
                <span className="text-lg text-ink/65">/100</span>
              </p>
              <div
                role="progressbar"
                aria-label="Readiness score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={assessment.score}
                className="mt-4 h-3 overflow-hidden rounded-full bg-indigo-deep/10"
              >
                <span
                  className="block h-full w-full origin-left rounded-full bg-violet motion-safe:transition-transform motion-safe:duration-300"
                  style={{ transform: `scaleX(${assessment.score / 100})` }}
                />
              </div>
              <p className="mt-4 font-display text-xl text-indigo-deep">
                {assessment.band.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                {assessment.band.summary}
              </p>
              {/* ink/65, not lighter: this sits on cream-soft, where ink/60
                  measures 4.41:1 and misses the 4.5:1 minimum for 12px text. */}
              <p className="mt-4 text-xs uppercase tracking-widest text-ink/65">
                {assessment.earnedWeight} of {READINESS_TOTAL_WEIGHT} weighted
                points
              </p>
            </div>

            <div className="rounded-3xl bg-indigo-deep p-6 text-cream md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-soft">
                {assessment.nextAction ? "Do this next" : "Nothing left on the list"}
              </p>
              {assessment.nextAction ? (
                <>
                  <h4 className="mt-3 font-display text-2xl leading-snug text-cream">
                    {assessment.nextAction.label}
                  </h4>
                  <p className="mt-4 leading-relaxed text-white/80">
                    {assessment.nextAction.instruction}
                  </p>
                  <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-relaxed text-white/60">
                    This is the heaviest check still open. Do it once, then come
                    back and answer it honestly.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="mt-3 font-display text-2xl leading-snug text-cream">
                    Every check is answered.
                  </h4>
                  <p className="mt-4 leading-relaxed text-white/80">
                    That is what this tool can see. It cannot hear your song, so
                    it cannot tell you whether the performance is musical, only
                    that the things which usually break have been tested.
                  </p>
                  <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-relaxed text-white/60">
                    Play it for somebody who will tell you the truth, then start
                    the next song.
                  </p>
                </>
              )}
            </div>
          </div>

          <fieldset className="mt-10">
            <legend className="text-sm font-semibold text-indigo-deep">
              The ten checks
            </legend>
            <ul className="mt-4 grid gap-3">
              {READINESS_CRITERIA.map((criterion) => (
                <li key={criterion.id}>
                  <label
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 p-4 motion-safe:transition has-[:checked]:border-violet/35 has-[:checked]:bg-violet-soft/10 ${HAS_FOCUS_RING}`}
                  >
                    <input
                      type="checkbox"
                      checked={activeSong.checkedIds.includes(criterion.id)}
                      onChange={() => handleToggle(criterion.id)}
                      className="mt-0.5 size-5 shrink-0 accent-violet"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-indigo-deep">
                        {criterion.label}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink/60">
                        {criterion.detail}
                      </span>
                      <span className="mt-2 block text-[11px] font-semibold uppercase tracking-widest text-violet">
                        Weight {criterion.weight}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/10 pt-6">
            <button
              type="button"
              onClick={() => handleRemove(activeSong.id)}
              className={SMALL_BUTTON}
            >
              Remove {activeSong.name}
            </button>
            <button type="button" onClick={handleClear} className={SMALL_BUTTON}>
              Clear this browser&apos;s songs
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-8 border-t border-ink/10 pt-8 text-ink/70">
          Name a song above to start. Pick one you would call finished. The
          checks are most useful on a song you already believe you can play.
        </p>
      )}
    </section>
  );
}
