import type { Metadata } from "next";
import PedalLab from "@/components/tone/PedalLab";
import ToolShell from "@/components/tone/ToolShell";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const CANONICAL = `${SITE_URL}/pedal-lab`;
const TITLE = "Pedal Lab: Build a Guitar Pedal Chain by Ear | GuitarHub";
const DESCRIPTION = "Switch on six pedal families, reorder them, turn the knobs and hear the result through a virtual amp. Learn pedal order by ear. Free, in your browser.";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
};

export default function PedalLabPage() {
  return (
    <ToolShell
      href="/pedal-lab" name="Pedal Lab" kicker="Pedal Lab · free"
      headline={<>Build a pedalboard.{" "}<em className="font-display italic text-peach">Hear every choice.</em></>}
      intro="A synthesized guitar plays a riff through compressor, fuzz, overdrive, chorus, delay and reverb, into an amp and speaker. Switch pedals on, move them around, turn the knobs. The lab tells you what your order is doing."
      description="A browser pedalboard: six pedal families, a virtual amp with gain and three-band EQ, a switchable speaker cabinet, tone recipe presets and plain-language notes on the chosen pedal order."
      features={["Six pedal families with working knobs", "Reorderable signal chain with live notes on the order", "Virtual amp with gain, bass, mid, treble and speaker cab", "Tone recipe presets from the Tone course", "No microphone, account or upload"]}
      steps={[
        { title: "Start from a recipe", body: "Pick a tone recipe, press play, and listen to the whole chain before changing anything." },
        { title: "Change one thing", body: "Bypass one pedal or move it one slot, then switch back. Single changes train your ear; five at once teach nothing." },
        { title: "Break the rules on purpose", body: "Put reverb before the overdrive, or turn the speaker cab off. Hearing why the convention exists makes it stick." },
      ]}
      lessons={["pedals", "signal-chain", "tone-recipes"]} guide="pedalboard-blueprint"
    >
      <PedalLab />
    </ToolShell>
  );
}
