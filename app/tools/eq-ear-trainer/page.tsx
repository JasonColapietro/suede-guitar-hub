import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { EqEarTrainer } from "@/components/tools/EqEarTrainer";

const HREF = "/tools/eq-ear-trainer";
const TITLE = "EQ Ear Trainer for Guitarists: Name the Band | GuitarHub";
const DESCRIPTION = "Hear a boost or cut on a guitar loop or pink noise, switch between flat and EQ, and name the frequency band, across four levels of difficulty.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function EqEarTrainerPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Hear the band.<br />Then turn the right knob.</>}
    intro="A guitar loop plays through one hidden EQ band. Switch between Flat and EQ, name the band, and hear the answer before the next round. Level 1 uses four wide-apart bands and big boosts; by Level 4 the changes are small and can be cuts."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript and Web Audio. Headphones or full-range speakers recommended.")}
    privacy="Everything runs in this browser. The guitar loop and the pink noise are generated on your device, no microphone is used, nothing is uploaded, and the only thing stored is your best accuracy for each level, kept in this browser's local storage."
    limits={[
      "It trains one peaking band at a time on a synthesised guitar loop, not a real mix, several bands at once, or shelving and high- and low-pass filters.",
      "It cannot hear what your speakers or headphones leave out. On phone or laptop speakers the lowest bands are close to inaudible.",
      "The band descriptions are general guides. Where a guitar's honk, mud or fizz sits depends on the guitar, the amp and the speaker.",
    ]}
    related={[
      { href: "/tone/dialling-the-tone-stack", label: "Dialling the tone stack" },
      { href: "/tone/wah-eq-and-filters", label: "Wah, EQ and filters" },
      { href: "/tone/double-tracking-and-the-mix", label: "Double-tracking and the mix" },
    ]}
  >
    <EqEarTrainer />
  </ToolShell>;
}
