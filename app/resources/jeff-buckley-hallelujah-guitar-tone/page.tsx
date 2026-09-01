import type { Metadata } from "next";
import Article, { type RelatedLink } from "@/components/Article";
import { OG_IMAGE, SITE_URL, STRUMLY } from "@/lib/site";

const CANONICAL = `${SITE_URL}/resources/jeff-buckley-hallelujah-guitar-tone`;
const PUBLISHED = "2026-08-31";
const TITLE = "What Hallelujah Teaches About Guitar Tone";
const DESCRIPTION =
  "A close-listening guide to Jeff Buckley's Hallelujah guitar tone, with a practical test for dynamics, space, arpeggio balance and recording restraint.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Jason Colapietro", url: "https://suedeai.ai/founder" }],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: "GuitarHub",
    type: "article",
    publishedTime: `${PUBLISHED}T00:00:00.000Z`,
    modifiedTime: `${PUBLISHED}T00:00:00.000Z`,
    authors: ["Jason Colapietro"],
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

const RELATED: readonly RelatedLink[] = [
  {
    href: "/resources/how-to-practice-clean-guitar-tone",
    title: "How to practice clean guitar tone",
    blurb:
      "Use a seven-day test to make attack, muting and dynamics audible.",
  },
  {
    href: "/resources/recording-guitar-room-sound",
    title: "How to hear the room",
    blurb:
      "Compare a close recording, a distant recording and simulated ambience.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${CANONICAL}#article`,
  headline: TITLE,
  description: DESCRIPTION,
  image: `${SITE_URL}/opengraph-image`,
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  inLanguage: "en-US",
  author: { "@id": "https://suedeai.ai/founder#person" },
  publisher: { "@id": "https://suedeai.ai/#organization" },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
};

export default function HallelujahGuitarTonePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        eyebrow="Print the Quiet field guide"
        title={
          <>
            What Hallelujah teaches about{" "}
            <em className="font-display italic text-peach">guitar tone.</em>
          </>
        }
        dek="Jeff Buckley's recording is useful because the guitar part leaves nowhere for touch, balance or space to hide. You can study those decisions without copying the exact rig."
        updated={PUBLISHED}
        related={RELATED}
        relatedTitle="Continue the listening test"
      >
        <p>
          <strong>By Jason Colapietro, writing as Johnny Suede.</strong>
        </p>

        <p>
          Jeff Buckley&apos;s recording of <em>Hallelujah</em> is a clean-guitar
          lesson before it is a gear lesson. The arpeggio stays exposed for most
          of the performance. Changes in finger attack, note length and vocal
          intensity remain audible because the arrangement does not cover them
          with drums, doubled guitars or heavy gain.
        </p>

        <p>
          This field guide adapts the longer essay{" "}
          <a href={STRUMLY.printTheQuietEssays.hallelujah}>
            Jeff Buckley&apos;s Hallelujah: The Tone That Won the Song
          </a>
          . The original follows the instrument, amplifier, effects, studio and
          mix history. This page narrows the question: what can a guitarist test
          in one practice session after listening closely?
        </p>

        <h2>The rig matters less than the relationship</h2>

        <p>
          Accounts of the session generally place Buckley&apos;s Telecaster into
          a clean Fender-style amplifier with an Alesis Quadraverb contributing
          the wide ambience associated with the recording. Individual gear
          details have been repeated inconsistently over the years, so copying a
          fan-made preset is a weak starting point.
        </p>

        <p>
          The stable lesson is the relationship among four things: a clear
          attack, a long but controlled decay, large dynamic movement and enough
          empty arrangement space for those details to matter. If any one of
          those changes, the part behaves differently.
        </p>

        <h2>Listen in four passes</h2>

        <h3>Pass 1: follow only the loudness arc</h3>

        <p>
          Ignore the chords and follow how the guitar moves from near-silence to
          a firmer attack. The part does not sit at one average intensity. It
          supports the vocal arc while remaining quieter than the voice.
        </p>

        <h3>Pass 2: follow the top note</h3>

        <p>
          Hear each arpeggio as a small melody rather than a chord shape being
          repeated. Notice whether the top note is brought forward or allowed to
          disappear into the pattern. This is a right-hand balance decision.
        </p>

        <h3>Pass 3: listen to the gaps</h3>

        <p>
          The ambience continues after the fingers release a note, but the next
          attack remains readable. Listen for the point where decay becomes
          clutter. That boundary is more useful than the name of the reverb
          preset.
        </p>

        <h3>Pass 4: listen for human evidence</h3>

        <p>
          Small noises, breaths and changes in attack were not erased into a
          perfectly repeated pattern. They are not excuses for careless playing.
          They show that the performance is a continuous decision rather than a
          grid of interchangeable notes.
        </p>

        <h2>Run the Hallelujah restraint test</h2>

        <ol>
          <li>
            Choose any four-chord progression you can arpeggiate without looking
            at a chart.
          </li>
          <li>
            Set a clean sound with enough headroom that a hard pluck is louder
            than a quiet one.
          </li>
          <li>
            Record the progression dry at a fixed tempo. Keep the take even if a
            small noise appears.
          </li>
          <li>
            Add one room or hall effect. Raise the decay until adjacent chords
            begin to blur, then back it down one step.
          </li>
          <li>
            Record three dynamic levels: quiet, conversational and full. Do not
            change the tempo.
          </li>
          <li>
            Play back all versions at matched volume and select the one where
            the top melody stays clear without the part sounding detached.
          </li>
        </ol>

        <p>
          The test is not an attempt to recreate Buckley&apos;s master. It uses
          the same constraint that makes the recording instructive: one exposed
          guitar part must carry harmony, pulse and emotional movement without a
          wall of sound.
        </p>

        <h2>What usually breaks</h2>

        <p>
          If the part feels mechanical, the loudness of every finger may be too
          similar. If it feels vague, the ambience may be masking the start of
          each note. If the top melody vanishes, assign one finger to bring it
          forward rather than turning up the entire guitar. If the quiet take
          loses notes, reduce compression and practice the minimum attack needed
          to make each string speak.
        </p>

        <p>
          Resist adding another effect until you can name which failure it is
          meant to repair. More width will not fix uneven balance. More
          compression will not create a dynamic arc. More gain will make the
          part easier to sustain, but it may replace the relationship you are
          trying to study.
        </p>

        <h2>Hallelujah guitar tone questions</h2>

        <h3>Do I need a Telecaster?</h3>

        <p>
          No. A Telecaster helps explain the recorded context, but the practice
          test works on any guitar that can produce a clear attack and useful
          dynamic range.
        </p>

        <h3>Which reverb preset recreates the recording?</h3>

        <p>
          No preset alone recreates a room, performance, amplifier, microphone
          and mix. Start by finding the longest decay that still leaves the next
          attack readable. That is a repeatable decision on your own rig.
        </p>

        <h3>Should I remove every finger noise?</h3>

        <p>
          Remove noises that interrupt the phrase or reveal weak muting. Keep
          incidental evidence that does not steal attention. The distinction is
          musical, so compare a corrected take with the original instead of
          applying a blanket rule.
        </p>

        <p>
          <strong>
            Study the record for relationships. Test those relationships on the
            instrument you own.
          </strong>
        </p>
      </Article>
    </>
  );
}
