import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { IntonationChecker } from "@/components/tools/IntonationChecker";

const HREF = "/tools/intonation-checker";
const TITLE = "Guitar Intonation Checker: 12th-Fret Test | GuitarHub";
const DESCRIPTION = "Compare each string's 12th-fret harmonic with the fretted note, see the difference in cents, and learn which way to move the saddle. Free, in your browser.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function IntonationCheckerPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Harmonic, then fretted.<br />Move the saddle the right way.</>}
    intro="Pick a string, capture its 12th-fret harmonic, then capture the same string fretted at the 12th fret. The checker compares the two in cents and tells you whether the saddle should move toward the neck or away from it."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript, Web Audio, a secure connection and microphone permission.")}
    privacy="The checker asks for microphone access only when you press a capture button, and closes it when the capture ends. Audio is analysed in this browser and is not uploaded, recorded or saved. Results stay on this page and are gone when you reload it."
    limits={[
      "It compares the pitch of two notes. It does not measure neck relief, action, nut height or string gauge.",
      "It cannot fix intonation for you, and old strings can give readings no saddle position will correct.",
      "Heavy vibrato, a string touching another or a noisy room can stop a capture from settling. Try again in a quieter spot.",
    ]}
    related={[
      { href: "/practice", label: "Tune up first" },
      { href: "/tone/how-pickups-work", label: "How pickups work" },
      { href: "/tools/chord-detector", label: "Chord detector" },
      { href: "/tools/fretboard", label: "Fretboard explorer" },
    ]}
  >
    <IntonationChecker />
  </ToolShell>;
}
