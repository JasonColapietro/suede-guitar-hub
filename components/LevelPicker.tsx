import Link from "next/link";
import { PLAYER_LEVELS } from "@/lib/levels";

/** The three front doors. `tone` switches the palette for dark or light backgrounds. */
export default function LevelPicker({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <ul className="grid gap-3 text-left sm:grid-cols-3">
      {PLAYER_LEVELS.map((level, index) => (
        <li key={level.id}>
          <Link
            href={level.href}
            className={`group flex h-full flex-col rounded-3xl p-6 transition ${dark ? "bg-indigo-deep/70 ring-1 ring-white/20 hover:bg-indigo-deep/90 hover:ring-peach/60" : "bg-white ring-1 ring-ink/10 hover:ring-violet"}`}
          >
            <span className={`text-xs font-semibold uppercase tracking-widest ${dark ? "text-violet-soft" : "text-violet"}`}>
              {index === 2 ? "Advanced" : `Stages ${level.stages[0]}–${level.stages[1]}`}
            </span>
            <span className={`mt-2 font-display text-2xl ${dark ? "text-cream" : "text-indigo-deep"}`}>{level.label}</span>
            <span className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/75" : "text-ink/65"}`}>{level.canAlready}</span>
            <span className={`mt-3 text-sm leading-relaxed ${dark ? "text-white/90" : "text-ink/80"}`}>{level.next}</span>
            <span className={`mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold ${dark ? "text-peach" : "text-violet"}`}>
              {level.cta} <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
