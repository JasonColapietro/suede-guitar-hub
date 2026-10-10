"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  MAX_SONGS,
  READINESS_CRITERIA,
  READINESS_STORAGE_KEY,
  READINESS_TOTAL_WEIGHT,
  addSong,
  removeSong,
  restoreReadinessState,
  scoreReadiness,
  setCriterion,
  summarizeRepertoire,
  type ReadinessSong,
} from "@/lib/readiness";
import { createStoredValue, subscribeToStoredKey } from "@/lib/shared-storage";

/**
 * The Song Readiness Score tool.
 *
 * Every rule lives in `lib/readiness.ts`; this file owns state, the DOM, and
 * the literal localStorage calls. No account, no network, no upload: the
 * repertoire is written to this browser and nowhere else.
 *
 * Every change is applied to the repertoire as it is stored now, and a write
 * from another tab is re-read as it happens, so two open tabs cannot overwrite
 * each other's songs.
 */

const NAME_INPUT_ID = "readiness-song-name";
const RESULT_HEADING_ID = "readiness-result";

const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-[3px] focus-visible:outline-violet-soft";
const HAS_FOCUS_RING =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-violet-soft";
// `max-w-full` and `overflow-wrap:anywhere` because one of these buttons
// carries the song's name, and a long name with no spaces would otherwise push
// the page wider than the screen.
const SMALL_BUTTON =
  `inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-left text-xs font-semibold text-indigo-deep [overflow-wrap:anywhere] motion-safe:transition hover:bg-cream-soft ${FOCUS_RING}`;

/** An empty repertoire removes the key rather than storing an empty list. */
const readinessStore = createStoredValue<ReadinessSong[]>({
  key: READINESS_STORAGE_KEY,
  restore: restoreReadinessState,
  serialize: (songs) => ({ songs }),
});

export default function Readiness() {
  const [songs, setSongs] = useState<ReadinessSong[]>([]);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [notice, setNotice] = useState("");

  // The latest songs, for callbacks that outlive the render they were made in.
  const songsRef = useRef<ReadinessSong[]>([]);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  // Read once, on mount, never during render — that is what keeps the server
  // HTML and the first client render identical. Then follow other tabs.
  useEffect(() => {
    const restored = readinessStore.read();
    if (restored.available && restored.value) {
      setSongs(restored.value);
      setActiveSongId(restored.value[0]?.id ?? null);
    }
    setHydrated(true);

    return subscribeToStoredKey(READINESS_STORAGE_KEY, () => {
      const latest = readinessStore.read();
      if (!latest.available) return;
      const next = latest.value ?? [];
      const ids = new Set(next.map((song) => song.id));
      setSongs(next);
      setPendingRemoveId((current) => (current && ids.has(current) ? current : null));
      if (next.length === 0) setPendingClear(false);
    });
  }, []);

  /**
   * Apply one change to the repertoire as stored now and show the result. The
   * songs on screen are only the fallback for storage that cannot be read.
   */
  function commit(change: (latest: ReadinessSong[]) => ReadinessSong[]) {
    const { value } = readinessStore.update(songsRef.current, (latest) => {
      const next = change(latest ?? []);
      return next.length > 0 ? next : null;
    });
    const next = value ?? [];
    songsRef.current = next;
    setSongs(next);
    return next;
  }

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
      // addSong throws on a refusal, which leaves storage untouched.
      const next = commit((latest) => addSong(latest, draftName));
      const added = next[next.length - 1];
      setActiveSongId(added.id);
      setDraftName("");
      setError("");
      setNotice("");
      setPendingClear(false);
      setFocusTarget(RESULT_HEADING_ID);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Check the song name.",
      );
    }
  }

  function handleCheck(criterionId: string, checked: boolean) {
    if (!activeSong) return;
    const songId = activeSong.id;
    const next = commit((latest) => setCriterion(latest, songId, criterionId, checked));
    setNotice(
      next.some((song) => song.id === songId)
        ? ""
        : "That song was removed in another tab, so the check was not saved.",
    );
  }

  function handleRemove(songId: string) {
    const name = songs.find((song) => song.id === songId)?.name ?? "The song";
    const next = commit((latest) => removeSong(latest, songId));
    setActiveSongId(next[0]?.id ?? null);
    setPendingRemoveId(null);
    setError("");
    setNotice(`${name} removed.`);
    setFocusTarget(NAME_INPUT_ID);
  }

  // Deletes the songs the confirmation counted. A song added in another tab
  // after the player agreed is kept, and the notice says so.
  function handleClear() {
    const shown = new Set(songs.map((song) => song.id));
    const next = commit((latest) => latest.filter((song) => !shown.has(song.id)));
    setActiveSongId(next[0]?.id ?? null);
    setPendingClear(false);
    setPendingRemoveId(null);
    setDraftName("");
    setError("");
    setNotice(
      next.length === 0
        ? "Every song was cleared from this browser."
        : `Cleared the songs shown. Kept ${next.length} added in another tab.`,
    );
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
      {notice ? (
        <p role="status" className="mt-4 text-sm text-ink/60 [overflow-wrap:anywhere]">
          {notice}
        </p>
      ) : null}

      {activeSong && assessment ? (
        <div className="mt-10 border-t border-ink/10 pt-10">
          <h3
            id={RESULT_HEADING_ID}
            tabIndex={-1}
            className="font-display text-3xl leading-snug text-indigo-deep [overflow-wrap:anywhere] md:text-4xl"
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
                      onChange={(event) => handleCheck(criterion.id, event.target.checked)}
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

          {/* Two steps each, the pattern the practice log uses: a song's checks
              and the whole repertoire have no other copy and no undo. */}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/10 pt-6">
            {pendingRemoveId === activeSong.id ? (
              <>
                <button
                  type="button"
                  onClick={() => handleRemove(activeSong.id)}
                  className={`${SMALL_BUTTON} border-violet/40 bg-violet-soft/15`}
                >
                  Remove {activeSong.name} for good
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRemoveId(null)}
                  className={SMALL_BUTTON}
                >
                  Keep it
                </button>
              </>
            ) : pendingClear ? (
              <>
                <button
                  type="button"
                  onClick={handleClear}
                  className={`${SMALL_BUTTON} border-violet/40 bg-violet-soft/15`}
                >
                  Delete all {songs.length} {songs.length === 1 ? "song" : "songs"} for good
                </button>
                <button
                  type="button"
                  onClick={() => setPendingClear(false)}
                  className={SMALL_BUTTON}
                >
                  Keep them
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPendingClear(false);
                    setPendingRemoveId(activeSong.id);
                  }}
                  className={SMALL_BUTTON}
                >
                  Remove {activeSong.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingRemoveId(null);
                    setPendingClear(true);
                  }}
                  className={SMALL_BUTTON}
                >
                  Clear this browser&apos;s songs
                </button>
              </>
            )}
          </div>
          {pendingRemoveId === activeSong.id || pendingClear ? (
            <p className="mt-4 max-w-2xl rounded-2xl border border-violet/25 bg-violet-soft/10 p-5 text-ink/80 [overflow-wrap:anywhere]">
              {pendingClear
                ? `This deletes every song in this browser and all of their checks. There is no other copy and no undo.`
                : `This deletes ${activeSong.name} and its ${activeSong.checkedIds.length === 1 ? "one answered check" : `${activeSong.checkedIds.length} answered checks`}. There is no undo.`}
            </p>
          ) : null}
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
