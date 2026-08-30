import type { Metadata } from "next";
import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import SiteFooter from "@/components/SiteFooter";
import SiteNav from "@/components/SiteNav";
import { DIAGNOSTIC_BLOCKERS, DIAGNOSTIC_QUESTIONS } from "@/lib/diagnose";
import { OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Practice Plateau Diagnostic | GuitarHub",
  description:
    "Answer nine questions about how you actually practice guitar and find the one habit holding your progress. Free, no account, stays in your browser.",
  openGraph: {
    title: "Practice Plateau Diagnostic | GuitarHub",
    description:
      "Nine questions about how you practice. Five blockers scored. One thing to change in the next session.",
    url: "https://guitarhub.org/diagnose",
    siteName: "GuitarHub",
    type: "website",
    // Required, not decorative: a page-level `openGraph` block replaces the
    // root layout's resolved object, taking the file-convention card with it.
    // See OG_IMAGE in lib/site.ts.
    images: [OG_IMAGE],
  },
  alternates: { canonical: "https://guitarhub.org/diagnose" },
};

// These @ids are defined by the graph in `app/layout.tsx`, which renders on
// every route. Google resolves @id within a single page, so referencing them
// here attaches the tool to the existing Suede Labs entities rather than
// minting duplicate Organization and Person nodes for the same things.
const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";
const SITE_ID = "https://guitarhub.org/#website";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://guitarhub.org/diagnose#tool",
      name: "Practice Plateau Diagnostic",
      url: "https://guitarhub.org/diagnose",
      description:
        "A nine-question diagnostic that scores five named practice blockers and returns the one a guitarist's answers point at hardest, with a written prescription and a first action.",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript.",
      isAccessibleForFree: true,
      // Genuinely free: there is no payment step, no account, and no upsell
      // gate anywhere in the tool.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      featureList: [
        "Nine multiple-choice questions about current practice habits",
        "Five named practice blockers, each scored against its own maximum",
        "A ranked result with a written prescription and one first action",
        "Answers saved in the browser, with no account and no upload",
      ],
      inLanguage: "en-US",
      isPartOf: { "@id": SITE_ID },
      publisher: { "@id": SUEDE_ORG_ID },
      author: { "@id": JASON_PERSON_ID },
    },
    {
      "@type": "HowTo",
      "@id": "https://guitarhub.org/diagnose#howto",
      name: "How to find what stalled your guitar practice",
      description:
        "Use the Practice Plateau Diagnostic to narrow five common practice blockers down to the one worth acting on this week.",
      inLanguage: "en-US",
      isPartOf: { "@id": SITE_ID },
      author: { "@id": JASON_PERSON_ID },
      // Text, not a node reference: schema.org gives `tool` the range
      // HowToTool | Text, so pointing it at the SoftwareApplication @id is a
      // range violation. That node is already attached to this page via
      // isPartOf, so nothing is lost by naming the tool here.
      tool: "Practice Plateau Diagnostic",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Answer the nine questions",
          text: "Choose the option closest to how you practice now, not how you intend to practice. Answering for the better version of your routine returns a diagnosis of a routine you do not have.",
          url: "https://guitarhub.org/diagnose#diagnostic",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Read the ranked result",
          text: "The diagnostic names the blocker your answers point at hardest and shows every blocker's score, so you can see how close the ranking was.",
          url: "https://guitarhub.org/diagnose#diagnostic",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Run the first move in your next session",
          text: "Each blocker comes with one concrete action small enough to do in a single session, plus the guide that explains why it is the lever.",
          url: "https://guitarhub.org/diagnose#blockers",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Prove the change with a recording",
          text: "Record the passage before the change and again a week later. The comparison, not the feeling, is what settles whether the action worked.",
          url: "https://guitarhub.org/diagnose#how-it-works",
        },
      ],
    },
  ],
};

const METHOD_NOTES: readonly { title: string; body: string }[] = [
  {
    title: "Nine questions, five blockers",
    body: "Every option carries fixed weights across five named blockers. The weights are the same for everyone and do not change with how you feel about the answer.",
  },
  {
    title: "Scored against its own ceiling",
    body: "A blocker asked about in six questions would out-score one asked about in three. So each is measured against the most its own questions could give it, and that share is what ranks them.",
  },
  {
    title: "Ties break the same way every time",
    body: "When two blockers land level, the earlier one in a fixed list takes it. Nothing is random. The same answers produce the same result on every run, on every device.",
  },
  {
    title: "A self-report, not a measurement",
    body: "The diagnostic knows what you told it and nothing else. Its job is to narrow five possibilities to one worth acting on this week. A recording is what settles whether the action worked.",
  },
];

const READING_LINKS: readonly { href: string; label: string }[] = [
  { href: "/guitar-practice-plateau", label: "Why guitar practice plateaus" },
  {
    href: "/how-to-practice-guitar-effectively",
    label: "How to practice effectively",
  },
  { href: "/method", label: "The GuitarHub method" },
];

export default function DiagnosePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SiteNav />

      <main>
        <section className="px-3 pt-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center text-cream md:py-24">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-soft">
              GuitarHub tool
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl text-4xl leading-tight md:text-5xl">
              Something in your practice{" "}
              <em className="font-display italic text-peach">stopped working.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
              Answer {DIAGNOSTIC_QUESTIONS.length} questions about how you
              actually practice. This scores five common blockers, names the one
              your answers point at hardest, and gives you one thing to do in
              the next session.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-white/60">
              No account. No email. Your answers stay in this browser.
            </p>
          </div>
        </section>

        <section id="diagnostic" className="mx-auto max-w-4xl px-6 py-20">
          <Diagnostic />
        </section>

        <section id="blockers" className="bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
              What it looks for
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
              Five ways practice stops{" "}
              <em className="font-display italic">producing change.</em>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
              A plateau is rarely a lack of effort. It is usually one of these,
              running quietly underneath an hour that felt productive.
            </p>

            <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-indigo-deep/10 md:grid-cols-2">
              {DIAGNOSTIC_BLOCKERS.map((blocker) => (
                <li key={blocker.id} className="bg-cream p-7">
                  <h3 className="font-display text-2xl leading-snug text-indigo-deep">
                    {blocker.name}
                  </h3>
                  <p className="mt-3 leading-relaxed text-ink/70">
                    {blocker.summary}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-ink/60">
                    <strong className="font-semibold text-indigo-deep">
                      First move:
                    </strong>{" "}
                    {blocker.firstMove}
                  </p>
                  <Link
                    href={blocker.guide.href}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-indigo-deep underline underline-offset-4 transition hover:text-violet"
                  >
                    {blocker.guide.label} <span aria-hidden>&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet">
            How this works
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-snug text-indigo-deep md:text-5xl">
            You should know how it{" "}
            <em className="font-display italic">reached the answer.</em>
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {METHOD_NOTES.map((note) => (
              <div
                key={note.title}
                className="h-full rounded-3xl bg-white p-7 shadow-sm ring-1 ring-ink/5"
              >
                <h3 className="font-display text-xl leading-snug text-indigo-deep">
                  {note.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink/70">{note.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ink/70">
            If you would rather read than answer questions, these three cover
            the same ground in longer form.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {READING_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cream-soft px-5 py-2.5 text-sm font-semibold text-indigo-deep transition hover:bg-peach"
              >
                {link.label} <span aria-hidden>&rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="px-3 pb-3">
          <div className="hero-backdrop rounded-[2rem] px-6 py-20 text-center md:py-24">
            <h2 className="mx-auto max-w-2xl text-4xl text-cream md:text-5xl">
              Now give it{" "}
              <em className="font-display italic text-peach">four weeks.</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/75">
              Knowing the blocker changes nothing on its own. Turn it into a
              plan you can run this month, or apply to the founding room and
              have a crew read your evidence. Applying starts a fit
              conversation. It takes no payment.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/breakthrough"
                className="inline-flex items-center gap-2 rounded-full bg-peach px-7 py-3.5 font-semibold text-indigo-deep transition hover:brightness-105"
              >
                Build my 30-day plan <span aria-hidden>&rarr;</span>
              </Link>
              <Link
                href="/#apply"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-peach/40 px-7 py-3.5 font-semibold text-cream transition hover:bg-white/5"
              >
                Apply to the room <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
