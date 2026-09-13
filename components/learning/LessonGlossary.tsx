import Link from "next/link";
import { GLOSSARY_HREF, definitionHref, publisherFor, type GlossaryTerm } from "@/lib/glossary";
import styles from "@/components/learning/Learning.module.css";

/**
 * The vocabulary block on a lesson page. Server Component, no client JavaScript.
 *
 * `terms` comes from `lessonGlossary`, which scans this lesson's own authored
 * prose against the vendored glossary — so the block lists the words the reader
 * can actually see on the page, and lists nothing when the page uses no jargon.
 *
 * A guitar word links to this site's glossary anchor. A voice or music word links
 * to Suede Sing's, because Sing defines those and restating one here would make
 * two sites claim one word. Neither link carries a definition in the markup: no
 * schema.org term markup is emitted anywhere in this repository, and
 * `tests/glossary.test.ts` fails if any appears.
 *
 * The definitions themselves are the vendored contract's, not this component's,
 * which is what keeps the voice entries honest about measurement. The glossary's
 * own sentence for "pressed phonation" says that nothing in Suede measures it;
 * this block adds no verdict of its own on top of it.
 */
export function LessonGlossary({ terms }: { terms: readonly GlossaryTerm[] }) {
  if (terms.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="lesson-glossary">
      <h2 id="lesson-glossary">Words on this page</h2>
      <p className={styles.small}>
        {terms.length === 1 ? "One term" : `${terms.length} terms`} this lesson uses,
        defined in one sentence each.
      </p>
      <ul>
        {terms.map((entry) => {
          const href = definitionHref(entry);
          return (
            <li key={`${entry.domain}:${entry.term}`}>
              {publisherFor(entry.domain) === "guitarHub" ? (
                <Link href={href}>{entry.term}</Link>
              ) : (
                <a href={href}>{entry.term}</a>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.small}>
        <Link href={GLOSSARY_HREF}>The full glossary</Link>
      </p>
    </section>
  );
}
