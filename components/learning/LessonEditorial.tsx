import styles from "@/components/learning/Learning.module.css";
import type { LessonEditorial } from "@/lib/learning/voice-editorial";

/**
 * The reading and the repertoire block on a voice lesson page. Server Component,
 * no client JavaScript.
 *
 * Everything visible here belongs to Suede Sing except the reason each item is
 * cited, which belongs to the curriculum. Titles, abstracts, keys, ranges and
 * URLs all come out of the vendored contract through `voice-editorial.ts`, so
 * this component holds no chapter prose and no hand-written link.
 *
 * The gate line is not decoration. Most of Sing's book and atlas is behind Pro,
 * the first two voice levels here are free, and a free lesson that sends a singer
 * at a paywall it did not mention has spent the singer's goodwill to save a
 * sentence. Where `gate` is set the page says so before the click.
 *
 * Plain anchors rather than `next/link`: every target is on another origin.
 */
export function LessonEditorialPanel({ editorial }: { editorial: LessonEditorial | undefined }) {
  if (!editorial) return null;
  const { reading, songs, repertoireWhy } = editorial;

  return (
    <section className={styles.panel} aria-labelledby="lesson-editorial">
      <h2 id="lesson-editorial">Read and sing this on Suede Sing</h2>

      {reading.length > 0 && (
        <>
          <h3>The reading</h3>
          <ul>
            {reading.map((citation) => (
              <li key={citation.href}>
                <a href={citation.href}>{citation.title}</a>
                {citation.gate ? <span className={styles.badge}>{citation.gate}</span> : null}
                <p className={styles.small}>{citation.why}</p>
                <p className={styles.muted}>{citation.summary}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {songs.length > 0 && (
        <>
          <h3>Songs that fit this module</h3>
          {repertoireWhy && <p className={styles.small}>{repertoireWhy}</p>}
          <ul>
            {songs.map((song) => (
              <li key={song.href}>
                <a href={song.href}>{song.title}</a> · {song.artist} · {song.key} ·{" "}
                {song.rangeLabel} · {song.difficulty}
              </li>
            ))}
          </ul>
          <p className={styles.small}>
            The key and the range are the figures publishers and fans circulate, not
            measurements of a recording, and they describe the original. Suede Sing says
            so on every one of these pages.
          </p>
        </>
      )}
    </section>
  );
}
