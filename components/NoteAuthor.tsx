import { SUEDE_NETWORK } from "@/lib/site";

/**
 * The author box at the foot of every note in /notes. Server Component.
 * Rendered inside the Article prose column, so its paragraphs and links pick
 * up the house prose styles.
 */
export default function NoteAuthor() {
  return (
    <aside
      aria-label="About the author"
      className="mt-14 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-ink/5"
    >
      <p className="!mt-0 !text-xs font-semibold uppercase tracking-widest !text-violet">
        About the author
      </p>
      <p className="!mt-3">
        <strong>Jason Colapietro</strong>, Founder and CEO, Suede AI, West Palm
        Beach, Florida. Jason is the engineer behind GuitarHub and the founder
        of Suede AI, an agentic platform company that also builds websites and
        AI search visibility for businesses across Palm Beach County.
      </p>
      <p className="!mt-3 !text-base">
        <a href={SUEDE_NETWORK.founder}>Founder profile on suedeai.ai</a>
        {" · "}
        <a href={SUEDE_NETWORK.jason}>jasoncolapietro.com</a>
      </p>
    </aside>
  );
}
