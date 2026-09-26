import type { Metadata } from "next";
import EqEarTrainer from "@/components/tone/EqEarTrainer";
import ToolShell from "@/components/tone/ToolShell";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const CANONICAL = `${SITE_URL}/eq-ear-trainer`;
const TITLE = "EQ Ear Trainer for Guitarists | GuitarHub";
const DESCRIPTION = "Hear one frequency band boosted on a guitar riff and name it: boom, mud, boxy, honk, push, bite or fizz. Three levels, streaks, free in your browser.";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
};

export default function EqEarTrainerPage() {
  return (
    <ToolShell
      href="/eq-ear-trainer" name="EQ Ear Trainer" kicker="EQ Ear Trainer · free"
      headline={<>Mud, honk or bite?{" "}<em className="font-display italic text-peach">Learn to hear it.</em></>}
      intro="Players who can name a frequency dial in tone in seconds. This plays a guitar riff with one band boosted. Flip between flat and boosted, pick the band, and build the map in your ears."
      description="An ear-training game for guitar EQ: one band of a synthesized guitar riff is boosted and the player names it, across three difficulty levels, with streak tracking stored in the browser."
      features={["Seven guitar-relevant bands, named in players' words", "Three difficulty levels", "Instant flat and boosted comparison", "Clean and crunchy guitar sources", "Best streak saved in this browser only"]}
      steps={[
        { title: "Use headphones", body: "Phone and laptop speakers barely play the lowest bands. Headphones make the game fair." },
        { title: "Flip, do not stare", body: "Switch between Flat and Boosted several times. The ear hears change far better than a fixed sound." },
        { title: "A few minutes a day", body: "Short daily rounds beat one long session. Move up a level when you are right most of the time." },
      ]}
      lessons={["eq-and-the-mix", "amps"]} guide="tone-field-manual"
    >
      <EqEarTrainer />
    </ToolShell>
  );
}
