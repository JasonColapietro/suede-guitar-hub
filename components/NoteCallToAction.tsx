import { SUEDE_NETWORK } from "@/lib/site";

/**
 * The closing call to action on every note: the Suede AI assessment and the
 * founder page. Passed to `Article` as `callToAction`, in place of the
 * practice-planner block the guides use.
 */
export default function NoteCallToAction({ heading, body }: { heading: string; body: string }) {
  return (
    <section data-print="hide" className="px-3 pb-3">
      <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
        <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">{heading}</h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/75">{body}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={SUEDE_NETWORK.assessment}
            className="inline-flex items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
          >
            Book a Suede AI assessment <span aria-hidden>↗</span>
          </a>
          <a
            href={SUEDE_NETWORK.founder}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
          >
            Meet Jason Colapietro <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
