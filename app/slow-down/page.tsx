import type { Metadata } from "next";
import SlowDowner from "@/components/tone/SlowDowner";
import ToolShell from "@/components/tone/ToolShell";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const CANONICAL = `${SITE_URL}/slow-down`;
const TITLE = "Slow Down Music Without Changing Pitch: Song Looper | GuitarHub";
const DESCRIPTION = "Load a song from your device, slow it to 25 percent without changing pitch, loop the hard bar, and let the speed trainer bring it back up to tempo. Free, private.";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
};

export default function SlowDownPage() {
  return (
    <ToolShell
      href="/slow-down" name="Song Slow-Downer and Looper" kicker="Slow-Downer · free"
      headline={<>Learn the solo.{" "}<em className="font-display italic text-peach">At half speed first.</em></>}
      intro="Load any song file on your device. Slow it down without the pitch dropping, loop the two bars you cannot get, and switch on the speed trainer to climb back to full tempo a few percent at a time."
      description="Plays an audio file from the user's device at 25 to 150 percent speed with pitch preserved, with an A-B loop, fine loop nudging, a waveform view and an automatic speed trainer. The file is never uploaded."
      features={["Speed from 25 to 150 percent with pitch preserved", "A-B looping with 0.1 second nudges", "Clickable waveform", "Speed trainer that climbs after clean passes", "Files stay on the device"]}
      steps={[
        { title: "Loop less than you think", body: "Loop one or two bars, not the whole solo. Short loops get more repetitions per minute." },
        { title: "Start slow enough to be clean", body: "If you cannot play it cleanly at the loop speed, the loop is too fast. Accuracy first, then speed." },
        { title: "Let the trainer push you", body: "Set the trainer to climb every two clean passes. Stop and drop back if it gets sloppy." },
      ]}
      lessons={["tone-is-in-your-hands", "tone-recipes"]} guide="fretboard-atlas"
    >
      <SlowDowner />
    </ToolShell>
  );
}
