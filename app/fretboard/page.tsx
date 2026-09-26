import type { Metadata } from "next";
import FretboardExplorer from "@/components/tone/FretboardExplorer";
import ToolShell from "@/components/tone/ToolShell";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

const CANONICAL = `${SITE_URL}/fretboard`;
const TITLE = "Interactive Guitar Fretboard: Scales, Modes, Arpeggios | GuitarHub";
const DESCRIPTION = "See any scale, mode or arpeggio across the whole neck in five tunings, with note names or scale degrees. Tap to hear notes, then quiz yourself. Free.";

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION, alternates: { canonical: CANONICAL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: CANONICAL, siteName: "GuitarHub", type: "website", images: [OG_IMAGE] },
};

export default function FretboardPage() {
  return (
    <ToolShell
      href="/fretboard" name="Fretboard Explorer" kicker="Fretboard Explorer · free"
      headline={<>The whole neck,{" "}<em className="font-display italic text-peach">finally mapped.</em></>}
      intro="Pick a key and a scale, mode or arpeggio and see it on every string up to the 15th fret, as note names or as scale degrees. Tap a fret to hear it. Then switch to the quiz and prove you know where the notes are."
      description="An interactive guitar fretboard that shows 15 scales, modes and arpeggios in any key across five tunings, plays tapped notes, and quizzes note names."
      features={["15 scales, modes and arpeggios in all 12 keys", "Five tunings including drop D, DADGAD and open G", "Note names, scale degrees or dots", "Tap any fret to hear it", "Note-naming quiz"]}
      steps={[
        { title: "Think in degrees", body: "Switch the labels to scale degrees. Knowing where the root, 3rd and 5th sit is what lets you target chord tones in a solo." },
        { title: "One area at a time", body: "Learn a scale in one five-fret region before connecting it to the next." },
        { title: "Quiz daily", body: "Five minutes of the note quiz a day and the neck stops being a grid of shapes." },
      ]}
      lessons={["tone-is-in-your-hands"]} guide="fretboard-atlas"
    >
      <FretboardExplorer />
    </ToolShell>
  );
}
