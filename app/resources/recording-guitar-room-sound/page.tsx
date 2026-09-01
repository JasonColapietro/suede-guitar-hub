import type { Metadata } from "next";
import Article, { type RelatedLink } from "@/components/Article";
import { OG_IMAGE, SITE_URL, STRUMLY } from "@/lib/site";

const CANONICAL = `${SITE_URL}/resources/recording-guitar-room-sound`;
const PUBLISHED = "2026-08-31";
const TITLE = "How to Hear the Room in a Guitar Recording";
const DESCRIPTION =
  "A practical guitar room-sound experiment comparing close, distant and simulated ambience while keeping the performance and playback level controlled.";

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
    href: "/resources/jeff-buckley-hallelujah-guitar-tone",
    title: "What Hallelujah teaches about tone",
    blurb:
      "Study an exposed clean part where space and dynamics remain audible.",
  },
  {
    href: "/resources/nam-a2-open-tone-format",
    title: "NAM A2 and portable tone",
    blurb:
      "See what a captured signal can preserve and what provenance still needs to say.",
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

export default function RecordingGuitarRoomSoundPage() {
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
            Hear what the room is doing to{" "}
            <em className="font-display italic text-peach">your guitar.</em>
          </>
        }
        dek="A room changes the first reflection, decay and low-frequency balance before a plugin enters the chain. This experiment separates those effects from the performance."
        updated={PUBLISHED}
        related={RELATED}
        relatedTitle="Follow the signal"
      >
        <p>
          <strong>By Jason Colapietro, writing as Johnny Suede.</strong>
        </p>

        <p>
          A guitar recording contains more than the guitar. The sound reaches a
          wall, floor and ceiling before some of it returns to the microphone.
          Those early reflections affect apparent size and tone. Later
          reflections form the audible decay most players call reverb.
        </p>

        <p>
          The essay{" "}
          <a href={STRUMLY.printTheQuietEssays.room}>
            The Room as Instrument
          </a>{" "}
          follows that idea through rooms such as Bearsville, Sound City,
          Electric Lady and Abbey Road. This GuitarHub version removes the
          studio tour and gives you a controlled test that works in a bedroom,
          rehearsal space or live room.
        </p>

        <h2>Do not compare three different performances</h2>

        <p>
          A player changes touch in response to what comes back from the room.
          That interaction is musically valuable, but it can confuse a technical
          comparison. Begin with one recorded performance so microphone
          position and simulated ambience are the variables you are testing.
        </p>

        <p>
          A reamped electric guitar is ideal if you have a safe line-level
          reamping setup. If you do not, use a small speaker, acoustic guitar or
          phone playback at a moderate level. Protect your hearing and do not
          connect a line output directly to an amplifier input unless the
          equipment is designed for it.
        </p>

        <h2>Build three versions</h2>

        <h3>Version A: close and dry</h3>

        <p>
          Place the microphone close enough that the direct sound clearly
          dominates. For an amplifier, start near the speaker and slightly off
          the center of the cone. For an acoustic guitar, start around the
          twelfth fret rather than directly at the sound hole. Record ten
          seconds and note the position.
        </p>

        <h3>Version B: farther into the room</h3>

        <p>
          Move the same microphone several feet back while keeping its height
          and direction consistent. Record the same source at the same playback
          level. The distant version will usually contain more room, but it may
          also lose direct detail or gain uneven bass because of the room&apos;s
          dimensions.
        </p>

        <h3>Version C: close with simulated room</h3>

        <p>
          Return to Version A and add a short room or convolution reverb. Do not
          change EQ or compression yet. Adjust the wet level until Version C
          feels roughly as spacious as Version B.
        </p>

        <h2>Level-match before you decide</h2>

        <p>
          Louder examples often feel fuller and more exciting. Reduce the
          playback gain of the loudest version until switching among A, B and C
          does not create an obvious jump. You do not need laboratory precision.
          You need a comparison that is not being won by level alone.
        </p>

        <p>Then score each version on four questions:</p>

        <ol>
          <li>
            Can you hear the beginning of each note without strain?
          </li>
          <li>
            Does the decay support the phrase or overlap the next chord?
          </li>
          <li>
            Does one bass note boom or disappear compared with the others?
          </li>
          <li>
            Does the sound feel connected to a physical space, and does that
            help the part?
          </li>
        </ol>

        <p>
          There is no automatic winner. A dry close sound may be right for a
          dense arrangement. A distant microphone may give a sparse clean part
          believable scale. A simulated room may offer the best control in an
          untreated space.
        </p>

        <h2>Find the useful position, not the perfect room</h2>

        <p>
          If Version B is harsh, move the microphone away from the nearest
          reflective wall or lower it below ear height. If the bass changes
          wildly, move the source or microphone rather than reaching for EQ
          immediately. Even a shift of a foot can move both away from a strong
          room mode.
        </p>

        <p>
          If Version C sounds detached, shorten the pre-delay or decay and
          reduce the wet level. If it sounds too small, increase early
          reflections before extending a long reverb tail. Size and duration
          are related, but they are not the same control.
        </p>

        <h2>Turn the result into a repeatable note</h2>

        <p>
          Save the winning clip with five facts: the room, source position,
          microphone position, playback level and any added ambience. A phrase
          such as “large room sound” is not reproducible. “Amp two feet from the
          short wall, microphone four feet back at speaker height, short room at
          twelve percent wet” gives the next session a starting point.
        </p>

        <p>
          Retest on another day before treating the setup as solved. Rooms change
          when furniture, doors, people and volume change. The note is a useful
          hypothesis, not a permanent law.
        </p>

        <h2>Guitar room-sound questions</h2>

        <h3>Can a plugin reproduce a real room?</h3>

        <p>
          A good room or convolution reverb can reproduce important parts of a
          room&apos;s response and may be the best choice for the record. It does
          not recreate every interaction among speaker, floor, microphone and
          player. Compare the result instead of arguing from the tool category.
        </p>

        <h3>Is a distant microphone always more natural?</h3>

        <p>
          No. Distance adds room and changes frequency balance. In a poor
          position it can add comb filtering, noise or uneven bass. Natural does
          not automatically mean useful.
        </p>

        <h3>What if I only have a phone?</h3>

        <p>
          Put the phone in one fixed location and record the same phrase with
          the source close, then farther away. The phone limits fidelity but can
          still reveal changes in attack, decay and room balance.
        </p>

        <p>
          <strong>
            The room is not decoration. It is one more variable you can test.
          </strong>
        </p>
      </Article>
    </>
  );
}
