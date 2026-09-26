import type { Metadata } from "next";
import { ToolShell, toolApplication, toolMetadata } from "@/components/tools/ToolShell";
import { SlowDowner } from "@/components/tools/SlowDowner";

const HREF = "/tools/slow-downer";
const TITLE = "Song Slow-Downer and A–B Looper for Guitar | GuitarHub";
const DESCRIPTION = "Slow a song from your own device to 25–125% speed without changing the pitch, loop the bar you are learning, and speed it up pass by pass.";
export const metadata: Metadata = toolMetadata(HREF, TITLE, DESCRIPTION);

export default function SlowDownerPage() {
  return <ToolShell
    href={HREF}
    eyebrow="Pro tool · free"
    heading={<>Slow it down.<br />Loop the hard bar.</>}
    intro="Open a song from your device, set the speed, and mark the passage you are learning with A and B. Turn on the speed-up loop to add a little speed after each pass until you are back at full tempo."
    jsonLd={toolApplication(HREF, DESCRIPTION, "Requires JavaScript and a browser that can play the audio file. The waveform also needs Web Audio.")}
    privacy="The file you open stays on your device. Your browser plays it from memory and reads it once to draw the waveform; nothing is uploaded, and the file is not saved. This page remembers only your last speed, tape-mode and speed-up settings in this browser. Starting another audio tool pauses the song, and hiding the tab or leaving the page pauses it too."
    limits={[
      "It does not separate the guitar from the rest of the mix, and it cannot remove other instruments.",
      "Pitch-preserving slow-down is done by your browser, and quality varies between browsers. Very slow settings can sound smeared or watery.",
      "It plays files you already have on your device. It cannot open streaming services or video links.",
      "Tape mode changes pitch and speed together, so it cannot transpose a song without changing its tempo.",
      "Very large files still play, but the waveform is skipped above 150 MB.",
    ]}
    related={[
      { href: "/tools/speed-trainer", label: "Speed trainer" },
      { href: "/practicing-guitar-with-a-metronome", label: "Practicing with a metronome" },
      { href: "/why-cant-i-play-guitar-fast", label: "Why you can’t play fast yet" },
      { href: "/tone/levels-and-latency", label: "Levels and latency" },
    ]}
  >
    <SlowDowner />
  </ToolShell>;
}
