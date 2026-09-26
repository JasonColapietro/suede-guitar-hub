import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { PedalLab } from "@/components/tools/PedalLab";

const HREF = "/tools/pedal-lab";
const TITLE = "Pedal Lab: Hear Guitar Effects and Pedal Order | GuitarHub";
const DESCRIPTION = "Build a guitar pedalboard in your browser, reorder it, and hear what compression, drive, modulation, delay and reverb do to a riff or your own guitar.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function PedalLabPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Build a pedalboard.<br />Hear what each pedal does.</>}
    intro="Load a preset or add pedals, then play the built-in riff or your own guitar through them into an amp and cab. Switch pedals on and off, turn the knobs, and move pedals earlier or later to hear why order matters."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript and Web Audio. Live input needs microphone permission.")}
    privacy="All sound is made and processed in your browser. The demo riff is generated on this device. If you turn on live input, the microphone or interface signal is processed as it arrives and is not recorded, stored or uploaded. The input closes when you press Stop, switch tabs or leave the page."
    limits={[
      "The pedals and amp are teaching approximations of each effect family. They are not models of any product and are not tuned to match one.",
      "The tone stack treats bass, mid and treble as separate bands. On a real amp those controls interact.",
      "The cab is a few filters, not an impulse response of a real speaker, so it will not sound like a miked cabinet.",
      "Live input adds some delay, which depends on your device and browser. It is fine for hearing tones, but may feel late for tight playing.",
      "It does not record, save boards to an account, or export settings.",
    ]}
    related={[
      { href: "/tone/pedal-order", label: "Pedal order" },
      { href: "/tone/pedal-families", label: "Pedal families" },
      { href: "/tone/overdrive-distortion-fuzz", label: "Overdrive, distortion and fuzz" },
      { href: "/tone/delay-and-reverb", label: "Delay and reverb" },
      { href: "/tone", label: "The tone course" },
    ]}
  >
    <PedalLab />
  </ToolShell>;
}
