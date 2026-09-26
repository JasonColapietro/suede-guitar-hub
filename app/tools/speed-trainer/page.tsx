import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { SpeedTrainer } from "@/components/tools/SpeedTrainer";

const HREF = "/tools/speed-trainer";
const TITLE = "Guitar Speed Trainer: Auto-Ramping Metronome | GuitarHub";
const DESCRIPTION = "A metronome that climbs from your clean tempo to your target by itself, a few BPM every few bars, with count-in, subdivisions and burst mode.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function SpeedTrainerPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Start clean.<br />Let the click climb.</>}
    intro={<>Set a tempo you can play cleanly, a target, and how many bars to spend on each step. The click raises the tempo by itself during this one session, so your hands stay on the guitar. To plan a tempo goal across several days, use the <Link href="/tempo">tempo ladder builder</Link> instead.</>}
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript and Web Audio.")}
    privacy="The speed trainer only plays sound. It never asks for the microphone, and it does not listen to or score your playing. Your last plan is remembered in this browser only. Starting another audio tool stops the click, and hiding the tab or leaving the page stops it too."
    limits={[
      "It does not hear you play, so it cannot tell whether a tempo was clean. Only you can judge that, and it is worth stopping when it is not.",
      "Tempo changes land on bar lines. It does not ramp smoothly within a bar.",
      "Burst mode alternates a fixed working tempo with a faster one; it does not climb.",
    ]}
    related={[
      { href: "/tempo", label: "Tempo ladder builder" },
      { href: "/practice", label: "Tuner and metronome" },
      { href: "/practicing-guitar-with-a-metronome", label: "Practicing with a metronome" },
      { href: "/why-cant-i-play-guitar-fast", label: "Why you can’t play fast yet" },
      { href: "/tools/slow-downer", label: "Song slow-downer" },
    ]}
  >
    <SpeedTrainer />
  </ToolShell>;
}
