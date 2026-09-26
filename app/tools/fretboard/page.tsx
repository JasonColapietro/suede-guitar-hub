import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { FretboardExplorer } from "@/components/tools/FretboardExplorer";

const HREF = "/tools/fretboard";
const TITLE = "Guitar Fretboard Explorer: Scales, Modes, Quiz | GuitarHub";
const DESCRIPTION = "Map any scale, mode or arpeggio across the neck in nine tunings, one position at a time, then test yourself with a find-the-note quiz.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function FretboardPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Every note on the neck.<br />One position at a time.</>}
    intro="Pick a root, a scale or arpeggio and a tuning to see every note it uses, labelled by name or by degree. Narrow it to one position to learn a shape, tap any dot to hear it, then switch to the quiz to find notes without the map."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript. Sound needs Web Audio.")}
    privacy="Everything runs in this browser. The notes you hear are synthesised on your device, nothing is recorded or uploaded, and the only thing stored is your best quiz streak for each difficulty, kept in this browser's local storage."
    limits={[
      "It shows where notes are, not how to finger them. The position windows are four-fret boxes, not a fingering system such as CAGED or three notes per string.",
      "The quiz checks the fret you tap, not what you play. It does not listen to your guitar.",
      "Melodic minor is shown ascending only, as it is usually used in jazz. Some tunings and scales have no single correct spelling, so a few notes may be named differently from a particular book.",
    ]}
    related={[
      { href: "/advanced#fretboard", label: "Fretboard drills" },
      { href: "/tools/chord-detector", label: "Chord detector" },
    ]}
  >
    <FretboardExplorer />
  </ToolShell>;
}
