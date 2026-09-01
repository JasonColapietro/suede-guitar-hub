import type { Metadata } from "next";
import Article, { type RelatedLink } from "@/components/Article";
import { OG_IMAGE, SITE_URL, STRUMLY } from "@/lib/site";

const CANONICAL = `${SITE_URL}/resources/how-to-practice-clean-guitar-tone`;
const PUBLISHED = "2026-08-31";
const TITLE = "How to Practice Clean Guitar Tone";
const DESCRIPTION =
  "A seven-day clean guitar tone test for attack, muting, dynamics and edge of breakup, using matched recordings instead of preset collecting.";

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
    href: "/resources/print-the-quiet",
    title: "Print the Quiet field guides",
    blurb:
      "Use the companion guides to study Hallelujah and compare room sound.",
  },
  {
    href: "/log",
    title: "Practice evidence log",
    blurb:
      "Record the setup, tempo and pass rate from each clean-tone test.",
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

export default function CleanGuitarTonePage() {
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
            Practice clean guitar tone until{" "}
            <em className="font-display italic text-peach">nothing is hiding.</em>
          </>
        }
        dek="Clean tone is not a preset category. It is a test of attack, muting, pitch and dynamics. This seven-day protocol changes one variable at a time and ends with a recording you can compare."
        updated={PUBLISHED}
        related={RELATED}
        relatedTitle="Keep testing"
      >
        <p>
          <strong>By Jason Colapietro, writing as Johnny Suede.</strong>
        </p>

        <p>
          A useful clean guitar tone keeps the note&apos;s attack, pitch and
          decay readable. It may include compression, EQ, reverb or a little
          amplifier color. The practical boundary is simpler: when you play
          harder, the sound should get meaningfully louder and brighter instead
          of collapsing into the same saturated shape.
        </p>

        <p>
          This guide adapts the technique argument from{" "}
          <a href={STRUMLY.printTheQuietEssays.clean}>
            The Lost Art of Clean
          </a>{" "}
          into a GuitarHub practice test. The original essay follows clean tone
          through players such as Mark Knopfler, Jimi Hendrix, Stevie Ray
          Vaughan and Larry Carlton. This version is about what to do in the
          next seven sessions, even if your rig is only a guitar and a small
          interface.
        </p>

        <h2>Set one clean baseline</h2>

        <p>
          Choose a four-bar phrase with three ingredients: a chord, a short
          single-note line and at least one intentional rest. Keep the phrase
          easy enough that you can play it from memory. If the notes themselves
          consume all your attention, the test will measure recall instead of
          tone control.
        </p>

        <p>
          Use one pickup position and one amp or model. Turn off delay and long
          reverb. Lower the gain until a hard strum stays mostly clear, then set
          the output level so the recording does not clip. Record three takes at
          the same tempo. Do not polish the best one. Save the middle take as
          the baseline because it represents the session better than an outlier.
        </p>

        <h2>Listen for four things, not for “good”</h2>

        <ol>
          <li>
            <strong>Attack:</strong> Do repeated notes begin at a similar
            volume, or does one leap forward because the pick dug deeper?
          </li>
          <li>
            <strong>Muting:</strong> Do unused strings speak between notes? Mark
            the exact transition where the noise starts.
          </li>
          <li>
            <strong>Pitch:</strong> Do bends and fretted chords settle in tune,
            or does excess pressure pull them sharp?
          </li>
          <li>
            <strong>Dynamics:</strong> Can the phrase move from quiet to loud
            without changing tempo or losing the smallest notes?
          </li>
        </ol>

        <p>
          Pick the worst of those four categories. That is the only category you
          work on for the week. Tone practice turns vague when the player tries
          to improve the amp, the hands, the part and the mix at once.
        </p>

        <h2>The seven-day clean-tone test</h2>

        <h3>Day 1: match the attacks</h3>

        <p>
          Play the phrase at half speed on one string. Aim for five notes whose
          beginnings sound equally strong. Change pick depth before changing
          equipment. If fingerpicking, listen for whether the thumb and fingers
          produce different levels.
        </p>

        <h3>Day 2: isolate the noise</h3>

        <p>
          Play only the transitions. Stop after each one and let the silence
          reveal any open string. Decide which hand owns each mute. The fretting
          hand can release pressure without leaving the string, while the picking
          hand can cover lower strings. Write down the assignment.
        </p>

        <h3>Day 3: test pressure and tuning</h3>

        <p>
          Tune, fret the chord with your normal pressure and check it again. Then
          repeat with the lightest pressure that produces a clear note. If the
          normal version is sharper, the issue is not the tuner. It is the hand.
        </p>

        <h3>Day 4: build a real dynamic range</h3>

        <p>
          Record the phrase once as quietly as possible without losing notes and
          once as loudly as possible without breaking the tone apart. The two
          waveforms and the two playbacks should be clearly different. If they
          are almost the same level, reduce gain or compression before blaming
          the hands.
        </p>

        <h3>Day 5: find the edge of breakup</h3>

        <p>
          Raise the amp gain or input one small step at a time. At each step,
          play one quiet chord and one hard chord. Stop where the hard chord
          gains a little harmonic density but the quiet chord stays clear. That
          point is a useful edge-of-breakup setting, not a universal ideal.
        </p>

        <h3>Day 6: put space back into the phrase</h3>

        <p>
          Restore a short reverb or room sound if the part needs it. Match the
          dry and effected versions by perceived loudness. An effect that is
          simply louder will often win a casual comparison even when it blurs
          the part.
        </p>

        <h3>Day 7: retest without a warm-up take</h3>

        <p>
          Use the original tempo, pickup and signal chain. Record three takes
          from cold and keep the middle one. Compare it with Day 1 at matched
          playback level. Name one change you can hear and one weakness that
          remains.
        </p>

        <h2>What to change when the test fails</h2>

        <p>
          If attack is still uneven, slow the phrase and reduce pick depth. If
          string noise remains, shrink the test to the single transition that
          produces it. If the phrase sounds flat, confirm that the quiet and
          loud versions are actually different before adding more effects. If
          the recording is harsh, move the microphone or change the speaker
          simulation before cutting a narrow EQ notch by habit.
        </p>

        <p>
          Do not buy a new clean preset because one retest failed. A preset can
          change the sound, but it cannot tell you whether the right hand became
          more consistent. Keep the chain stable long enough for the performance
          variable to become visible.
        </p>

        <h2>Clean guitar tone questions</h2>

        <h3>Does clean tone mean no pedals?</h3>

        <p>
          No. Compression, EQ, modulation and ambience can all belong in a clean
          sound. Start dry enough to hear the performance, then add one effect
          at a time and level-match the comparison.
        </p>

        <h3>Should a clean amp be completely free of breakup?</h3>

        <p>
          Not necessarily. Many useful clean sounds sit just below or at the
          edge of breakup. The test is whether changes in touch remain audible,
          not whether an oscilloscope would show a perfectly unchanged waveform.
        </p>

        <h3>How do I know the practice worked?</h3>

        <p>
          The Day 7 recording should show the selected category improving under
          the same conditions as Day 1. “It felt better” is not enough. Keep the
          claim narrow: cleaner transitions, more even attacks, wider dynamics
          or better pitch under normal fretting pressure.
        </p>

        <p>
          <strong>One chain. One phrase. One audible change.</strong>
        </p>
      </Article>
    </>
  );
}
