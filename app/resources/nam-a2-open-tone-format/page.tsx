import type { Metadata } from "next";
import Article, { type RelatedLink } from "@/components/Article";
import { OG_IMAGE, SITE_URL, STRUMLY } from "@/lib/site";

const CANONICAL = `${SITE_URL}/resources/nam-a2-open-tone-format`;
const PUBLISHED = "2026-08-31";

const TITLE = "NAM A2 Turns Guitar Tone Into an Open Format";
const DESCRIPTION =
  "NAM A2 makes neural amp captures more efficient and portable. See what Full and Lite mean, where compatibility breaks, and why provenance matters.";

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
    href: STRUMLY.signalChain,
    title: "Signal-chain topology",
    blurb:
      "Map the order, splits and routing that make a guitar rig reproducible before you capture it.",
  },
  {
    href: "/about",
    title: "About GuitarHub",
    blurb:
      "Who built GuitarHub, what the site does and how it fits into the wider Suede guitar estate.",
  },
];

const SUEDE_ORG_ID = "https://suedeai.ai/#organization";
const JASON_PERSON_ID = "https://suedeai.ai/founder#person";

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
  author: { "@id": JASON_PERSON_ID },
  publisher: { "@id": SUEDE_ORG_ID },
  mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
};

export default function NamA2OpenTonePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <Article
        eyebrow="GuitarHub editorial"
        title={
          <>
            NAM A2 turns guitar tone into an{" "}
            <em className="font-display italic text-peach">open format.</em>
          </>
        }
        dek="Architecture 2 makes captured tone more efficient and portable. Its larger contribution may be a tone file that can move across software and hardware without being rebuilt for every box."
        updated={PUBLISHED}
        related={RELATED}
        relatedTitle="Keep exploring"
      >
        <p>
          <strong>By Jason Colapietro, founder of Suede Labs.</strong>
        </p>

        <p>
          Neural Amp Modeler Architecture 2, or A2, is the current open-source
          NAM architecture for capturing the sound and response of amps, pedals,
          studio gear and full signal chains. Often called NAM v2, it replaces
          A1 as the default for new captures on TONE3000 and lets one trained
          model run at A2-Full or A2-Lite size. The{" "}
          <a href="https://www.tone3000.com/guides/nam-a2-the-complete-guide">
            official A2 guide
          </a>{" "}
          documents the architecture, benchmarks and migration path.
        </p>

        <p>
          The benchmark gains matter because they push captured tone beyond the
          computer. The larger opportunity is portability: a musician can keep
          one open NAM file while software and hardware hosts choose the model
          size they can run.
        </p>

        <h2>A2 fixes a computer-sized assumption</h2>

        <p>
          The original NAM architecture was designed around computers and
          digital audio workstations. A2 was developed by Steve Atkinson and
          TONE3000 around a wider range of processing budgets, including the
          limits inside compact pedals and amps. Steve Atkinson&apos;s{" "}
          <a href="https://www.neuralampmodeler.com/post/a2-is-released">
            A2 release note
          </a>{" "}
          points builders to the open-source trainer, core DSP library and
          plugin versions that added official support.
        </p>

        <p>
          A2-Full targets maximum accuracy in a DAW or a device with enough
          processing headroom. A2-Lite runs the same model at a smaller width for
          constrained hardware. Creators do not need to train two separate
          files. Slimmable training lets one model run at either size, and the
          host chooses the width it can support.
        </p>

        <p>
          TONE3000 reports that A2-Full uses 30 to 40 percent less CPU than
          A1-Standard and that A2-Lite runs at 50 percent CPU on a 600 MHz ARM
          Cortex-M7. Its quantitative evaluation covered 39 tones. The published
          listening dataset contains 105,842 ratings from 1,184 participants,
          collected from April 18 through May 29, 2026, across 37 tones. The{" "}
          <a href="https://github.com/tone-3000/a2-mushra-data">
            raw MUSHRA data and test notes
          </a>{" "}
          are public, so engineers and skeptical musicians can inspect the
          evidence rather than relying on a marketing summary.
        </p>

        <p>
          Those are company-published results, not the final word on how every
          capture feels under a player&apos;s hands. Recorded evaluations can
          measure similarity, but they cannot reproduce every interaction among
          a player, an instrument and a responsive amp. The practical result
          still matters: a capture that once assumed a computer-sized host can
          now run natively on smaller hardware without conversion into a closed
          model format.
        </p>

        <h2>Open source changes who can build the next device</h2>

        <p>
          The official NAM training code, C++ inference core and reference plugin
          are MIT-licensed. A developer can inspect the code and add native A2
          support without inventing a new capture architecture or paying a NAM
          format license. TONE3000 describes A2 as an open protocol for tone,
          closer in spirit to an impulse-response or MIDI file than a preset
          locked to one manufacturer&apos;s product.
        </p>

        <p>
          A proprietary capture system can be excellent and still leave the
          musician dependent on one company&apos;s hardware, software, account
          system and product roadmap. An open NAM file can move wherever native
          NAM support exists. A software developer can add it to a plugin. A
          pedal maker can add it to a device. A musician can keep the file when
          the playback hardware changes.
        </p>

        <p>
          The open NAM format and the TONE3000 catalog are separate things.
          TONE3000&apos;s{" "}
          <a href="https://www.tone3000.com/api/terms">
            API terms, effective July 7, 2026
          </a>
          , say A1 and A2 are open source and free to implement in any product.
          The same terms place separate conditions on catalog access, creator
          content and commercial API integrations. Supporting the format does
          not grant permission to mirror the catalog or repackage its contents.
        </p>

        <h2>A portable tone still needs provenance</h2>

        <p>Open code does not settle every rights question around a capture.</p>

        <p>
          The software can be MIT-licensed while an individual tone carries a
          creator-selected license, attribution requirements or platform rules.
          TONE3000&apos;s current{" "}
          <a href="https://www.tone3000.com/policy">Tone Sharing Policy</a>{" "}
          permits captures of analog gear, commercial software captured with
          explicit permission, and original tones built from software chains.
          It prohibits unauthorized direct captures of commercial software.
          Its API terms also say tones and models belong to their creators and
          that integrations must preserve the license attached to each tone.
        </p>

        <p>
          Creators should treat each NAM file as a media asset with a history. A
          useful provenance note should identify:
        </p>

        <ul>
          <li>who made the capture</li>
          <li>
            the amp, pedal, cabinet, microphone or signal chain that was used
          </li>
          <li>the capture date, input level and calibration method</li>
          <li>whether the file uses A1 or A2</li>
          <li>any edits or conversions applied after capture</li>
          <li>the license and terms for sharing or commercial use</li>
        </ul>

        <p>
          That record does not prove legal ownership or clear a file for every
          use. It gives collaborators and product builders enough context to
          evaluate the asset before they load, share or package it. The model
          file carries the sound. The provenance record carries the facts needed
          to use that sound responsibly.
        </p>

        <h2>The A2 migration has one real catch</h2>

        <p>
          A2 is not backward compatible with an A1-only host. Existing A1
          captures still work in software and hardware that support A1, but a
          host must update its NAM integration before it can load A2 natively.
          A NAM logo by itself does not prove native A2 playback, so musicians
          should check the architecture a device actually loads.
        </p>

        <p>
          TONE3000 says it retrained its existing A1 library except for
          zero-download models older than 60 days and models with malformed
          training data. When original training recordings were available, the
          platform used them to produce new A2 models. Otherwise, it generated
          synthetic training data from the A1 model. TONE3000 labels those
          synthetic retrains as <strong>Convert</strong> in the tone pack&apos;s
          Models section.
        </p>

        <p>
          That label matters. A converted model does not have the same history
          as a fresh A2 capture trained from the original recording. The
          transition will remain uneven while hosts add A2 support, and some
          devices may continue converting NAM files into their own internal
          format.
        </p>

        <h2>The next step is machine-readable tone</h2>

        <p>A2 makes a tone portable. Structured metadata can make it legible.</p>

        <p>
          Imagine a session tool that can find a clean bass capture, confirm the
          architecture, read the signal chain, check the creator&apos;s license
          and load the correct model size for the available processor. The tool
          does not need to own the tone or make a legal decision. It needs the
          file and its provenance to be readable.
        </p>

        <p>
          Open audio models can become durable creative objects instead of
          disposable presets. Musicians can preserve the sound of a rare rig.
          Engineers can document the exact chain behind a record. Builders can
          support the same capture without forcing its creator to rebuild it for
          every box. NAM A2 provides the technical layer. The creator community
          still has to build the trust layer around it.
        </p>

        <h2>How to test NAM A2 now</h2>

        <p>
          Start with one capture. Load an A2 model in the current{" "}
          <a href="https://www.neuralampmodeler.com/users">
            NAM Gateway plugin
          </a>
          . Compare it with the original gear or an A1 version at matched
          levels. Test how it reacts to different guitars, pickups and playing
          dynamics. Then save a provenance note beside the model before you
          share it.
        </p>

        <p>
          NAM earns trust when musicians know what a tone is, who captured it,
          where it can run and what they are allowed to do with it. That matters
          more than claiming every listener will hear no difference.
        </p>

        <h2>NAM A2 questions</h2>

        <h3>What is NAM v2?</h3>

        <p>
          NAM v2 is the informal name many people use for Neural Amp Modeler
          Architecture 2, officially called A2. It is the current NAM
          architecture and the default for new captures trained on TONE3000.
        </p>

        <h3>Is NAM A2 backward compatible with A1 software and hardware?</h3>

        <p>
          No. Existing A1 captures remain usable in A1-compatible hosts, but
          software and hardware need an updated NAM integration to load A2
          natively.
        </p>

        <h3>Does open source mean every NAM capture is free to use?</h3>

        <p>
          No. The NAM code and A2 format are open source, but individual captures
          can carry separate licenses, sharing terms and platform rules. Open
          architecture does not replace permission, attribution or provenance.
        </p>

        <h2>NAM A2 in one paragraph</h2>

        <p>
          Neural Amp Modeler Architecture 2, often called NAM v2, is an
          open-source architecture for capturing the sound and response of amps,
          pedals, studio gear and signal chains. It supports Full and Lite
          playback from one model and can run in software or constrained
          hardware. Its larger importance is portability: a NAM A2 tone can move
          across products that support the open format. Creators should pair
          each capture with provenance and clear sharing terms because
          open-source software does not automatically clear every tone file for
          every use.
        </p>

        <p>
          <strong>Test one A2 capture and document its provenance.</strong>
        </p>
      </Article>
    </>
  );
}
