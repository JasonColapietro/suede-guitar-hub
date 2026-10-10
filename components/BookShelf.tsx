import Image from "next/image";
import { STRUMLY } from "@/lib/site";

/**
 * The Signal Chain on the shelf: the complete and final edition, which is the
 * book for sale (on Strumly), and the two halves it is made of.
 *
 * The two volumes are shown as what is inside the complete edition, not as
 * separate products: they are not sold on their own, so every cover links to
 * the one book page. Covers are 900x1350 WebPs of 40-50 KB rendered from the
 * book's own cover art (the-signal-chain-book, art.py). They go through
 * next/image with `sizes` for the same reason as the Field Guides: the halves
 * show at 96 px and the complete edition at most 384 px. Lazy, never
 * preloaded: the shelf sits far below the fold.
 */

const COMPLETE = {
  cover: "/books/the-signal-chain-complete-and-final-edition.webp",
  kicker: "The complete & final edition",
  title: "The Signal Chain",
  subtitle: "The Tone Is in the Hands: 111 Lessons on Learning to Play, and All the Gear Between",
  body:
    "66 chapters and 111 song lessons with full tablature: the history of the amps, pedals and players, with every lesson set beside the chapter it comes from.",
} as const;

const HALVES = [
  {
    cover: "/books/the-signal-chain-a-history-of-tone.webp",
    title: "The Signal Chain: A History of Tone",
    body: "The history: amplifiers, effects, and the players who bent electricity into a voice.",
  },
  {
    cover: "/books/the-tone-is-in-the-hands-part-two.webp",
    title: "The Tone Is in the Hands, Part Two",
    body: "The lessons: 111 songs, each with its rig, tone recipe, theory and tab, from starter to stage.",
  },
] as const;

function Cover({ src, sizes, className = "" }: { src: string; sizes: string; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={900}
      height={1350}
      sizes={sizes}
      loading="lazy"
      className={`h-auto w-full rounded-xl shadow-lg ring-1 ring-ink/10 ${className}`}
    />
  );
}

export function BookShelf({ id = "book" }: { id?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-violet">The book</p>
      <h2 id={`${id}-title`} className="mt-3 text-4xl text-indigo-deep md:text-5xl">
        The Signal Chain, <em className="font-display italic">complete.</em>
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
        The book behind the song lessons above: the whole history of guitar tone and every lesson in
        it, in one edition.
      </p>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <a
          href={STRUMLY.book}
          className="group mx-auto block w-full max-w-sm transition motion-safe:hover:-translate-y-1"
          aria-label={`${COMPLETE.title}, ${COMPLETE.kicker}: see the book on Strumly`}
        >
          <Cover
            src={COMPLETE.cover}
            sizes="(min-width: 432px) 384px, calc(100vw - 48px)"
            className="group-hover:shadow-2xl"
          />
        </a>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet">
            {COMPLETE.kicker}
          </p>
          <h3 className="mt-2 font-display text-3xl leading-tight text-indigo-deep">{COMPLETE.title}</h3>
          <p className="mt-2 font-display text-lg italic leading-snug text-ink/70">{COMPLETE.subtitle}</p>
          <p className="mt-5 max-w-xl leading-relaxed text-ink/75">{COMPLETE.body}</p>
          <a
            href={STRUMLY.book}
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo-deep px-7 py-3.5 font-semibold text-cream transition hover:bg-indigo-mid"
          >
            Get the book on Strumly <span aria-hidden>→</span>
          </a>

          <p className="mt-12 text-[11px] font-semibold uppercase tracking-widest text-violet">
            Inside the complete edition
          </p>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2">
            {HALVES.map((half) => (
              <li key={half.title}>
                <a href={STRUMLY.book} className="group flex gap-4" aria-label={`${half.title}: inside the complete edition, on Strumly`}>
                  <span className="w-24 shrink-0 transition motion-safe:group-hover:-translate-y-0.5">
                    <Cover src={half.cover} sizes="96px" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg leading-snug text-indigo-deep group-hover:text-violet">
                      {half.title}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-ink/70">{half.body}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
