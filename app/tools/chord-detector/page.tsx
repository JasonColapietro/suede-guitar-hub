import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { ChordDetector } from "@/components/tools/ChordDetector";

const HREF = "/tools/chord-detector";
const TITLE = "Guitar Chord Detector: Name the Chord You Play | GuitarHub";
const DESCRIPTION = "Strum a chord into your microphone and see which chord its notes best fit, with close alternatives and the pitch classes heard. Free, in your browser.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function ChordDetectorPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Strum a chord.<br />See what it spells.</>}
    intro="Start listening, strum one chord and let it ring. The detector finds the notes in the sound, matches them against common chord shapes and shows the best fit, the closest alternatives and the notes it heard."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript, Web Audio, a secure connection and microphone permission.")}
    privacy="The detector asks for microphone access only when you press Start listening. Audio is analysed in this browser and is not uploaded, recorded or saved. Stopping, leaving the page or hiding the tab turns the microphone off, and starting another audio tool stops this one."
    limits={[
      "It estimates which chord the sounding notes fit best. It cannot tell voicings or inversions apart, or hear which strings you fretted.",
      "Chords that share notes, such as Am7 and C6, or Csus2 and Gsus4, can be confused. Check the alternatives.",
      "A chord with a missing tone, a loud melody note or other sound in the room can be misread.",
      "It is not a lesson score and does not judge your timing or technique.",
    ]}
    related={[
      { href: "/practice", label: "Tune up first" },
      { href: "/tools/fretboard", label: "Fretboard explorer" },
      { href: "/tools/intonation-checker", label: "Intonation checker" },
      { href: "/tone/how-pickups-work", label: "How pickups work" },
    ]}
  >
    <ChordDetector />
  </ToolShell>;
}
