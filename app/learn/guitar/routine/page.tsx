import type { Metadata } from "next";
import { PracticeRoutine } from "@/components/learning/PracticeRoutine";
export const metadata: Metadata = {
  title: "Your first A/D practice routine | GuitarHub",
  description: "A seven-block guitar practice companion: tune, check D and A, move with an anchor, count changes, and play songs. Editable timers and local practice history.",
  alternates: { canonical: "/learn/guitar/routine" },
};
export default function RoutinePage() { return <PracticeRoutine />; }
