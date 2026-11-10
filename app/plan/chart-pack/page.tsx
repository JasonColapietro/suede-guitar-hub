import type { Metadata } from "next";
import { ChordDiagram } from "@/components/learning/LessonInstructionAssets";
import { noteName } from "@/lib/audio/dsp";
import { PROMISE_GOAL, createBreakthroughPlan } from "@/lib/breakthrough";
import { allLessons, getLesson } from "@/lib/learning/curriculum";
import { getInstructionAsset, getLessonInstructions, type InstructionAsset } from "@/lib/learning/instructions";
import { routineChordAssets } from "@/lib/learning/routine-assets";
import { OFFER } from "@/lib/site";

/**
 * The print source for public/plan/guitarhub-chord-and-pentatonic-chart-pack.pdf,
 * the chart pack every plan email links. Not a page for readers:
 * scripts/field-guide-art/build-chart-pack.mjs prints it from a running build.
 *
 * Everything on it is read from the curriculum: the open chords are the A/D
 * routine's diagrams plus every chord diagram in the week 1 and week 2 modules,
 * and box one is the authored route of lesson g-l4-m1-02.
 */
export const metadata: Metadata = {
  title: "Chord and Pentatonic Chart Pack | GuitarHub",
  robots: { index: false, follow: false },
};

type ChordAsset = Extract<InstructionAsset, { kind: "chord" }>;

/** The modules that teach the plan's open chords: week 1 and week 2. */
const WEEK_ONE_MODULE = "g-l2-m1";
const WEEK_TWO_MODULE = "g-l3-m2";
const BOX_ONE_LESSON = "g-l4-m1-02";
const BLUES_FORM_ASSET = "advanced-a-blues-form";

const PLAN = createBreakthroughPlan({ goal: PROMISE_GOAL, experience: "advanced-beginner", daysPerWeek: 4, minutesPerSession: 20 });

function moduleLessonAssets(moduleId: string): InstructionAsset[][] {
  return allLessons("guitar")
    .filter(({ module }) => module.id === moduleId)
    .map(({ lesson }) => getLessonInstructions(lesson.id)?.assets ?? []);
}

/**
 * Each open chord once, grouped the way the path teaches them: the A/D
 * routine's chords and week 1's, the chords week 2's first lesson adds, and
 * the rest of the open eight that week 2's later lessons and checkpoint use.
 */
function pathChords(): { weekOne: ChordAsset[]; weekTwo: ChordAsset[]; openEight: ChordAsset[] } {
  const seen = new Set<string>();
  const fresh = (assets: readonly InstructionAsset[]) => assets.flatMap((asset) => {
    if (asset.kind !== "chord") return [];
    const shape = asset.frets.join(",");
    if (seen.has(shape)) return [];
    seen.add(shape);
    return [asset];
  });
  const [weekTwoFirst = [], ...weekTwoRest] = moduleLessonAssets(WEEK_TWO_MODULE);
  return {
    weekOne: fresh([...Object.values(routineChordAssets()), ...moduleLessonAssets(WEEK_ONE_MODULE).flat()]),
    weekTwo: fresh(weekTwoFirst),
    openEight: fresh(weekTwoRest.flat()),
  };
}

type BoxNote = { string: number; fret: number; name: string; root: boolean };

type RouteStep = { string: number; fret: number; midi: number };

/** Box one as the lesson authors it: every distinct string and fret of the route. */
function boxOne(): { notes: BoxNote[]; route: RouteStep[] } {
  const route = (getLesson("guitar", BOX_ONE_LESSON)?.lesson.practiceSpec?.targets ?? []).flatMap((target) =>
    target.guitarString && target.fret !== undefined && target.midi !== undefined ? [{ string: target.guitarString, fret: target.fret, midi: target.midi }] : [],
  );
  if (route.length === 0) throw new Error(`${BOX_ONE_LESSON} has no authored route`);
  const notes = new Map<string, BoxNote>();
  for (const target of route) {
    notes.set(`${target.string}-${target.fret}`, {
      string: target.string,
      fret: target.fret,
      name: noteName(target.midi).replace(/-?\d+$/, ""),
      root: target.midi % 12 === 9,
    });
  }
  return { notes: [...notes.values()].sort((a, b) => b.string - a.string || a.fret - b.fret), route };
}

/** The chord symbol a player reads: "E minor" is Em, "C major" is C. */
function symbol(name: string): string {
  return name.replace(/ major$/, "").replace(/ minor$/, "m");
}

function BoxOneDiagram({ notes }: { notes: BoxNote[] }) {
  const first = Math.min(...notes.map((note) => note.fret));
  const last = Math.max(...notes.map((note) => note.fret));
  const rows = last - first + 1;
  const x = (string: number) => 40 + (6 - string) * 48;
  const y = (fret: number) => 60 + (fret - first) * 56 + 28;
  const bottom = 60 + rows * 56;
  const label = `A minor pentatonic box one, frets ${first} to ${last}. Strings 6 to 1 from left to right. ${[6, 5, 4, 3, 2, 1]
    .map((string) => `String ${string}: ${notes.filter((note) => note.string === string).map((note) => `fret ${note.fret} ${note.name}${note.root ? " (root)" : ""}`).join(", ")}`)
    .join(". ")}.`;
  return (
    <svg viewBox={`0 0 340 ${bottom + 40}`} role="img" aria-label={label} className="chart-box">
      {[6, 5, 4, 3, 2, 1].map((string) => (
        <g key={string}>
          <text x={x(string)} y="22" textAnchor="middle" fontSize="13">{string}</text>
          <line x1={x(string)} y1="60" x2={x(string)} y2={bottom} stroke="currentColor" strokeWidth="1.2" />
        </g>
      ))}
      {Array.from({ length: rows + 1 }, (_, row) => (
        <line key={row} x1={x(6)} y1={60 + row * 56} x2={x(1)} y2={60 + row * 56} stroke="currentColor" strokeWidth="1.2" />
      ))}
      {Array.from({ length: rows }, (_, row) => (
        <text key={row} x="10" y={y(first + row) + 5} fontSize="13">{first + row}</text>
      ))}
      {notes.map((note) => (
        <g key={`${note.string}-${note.fret}`}>
          <circle cx={x(note.string)} cy={y(note.fret)} r="17" fill={note.root ? "#6d28d9" : "#ffffff"} stroke="#6d28d9" strokeWidth="2.5" />
          <text x={x(note.string)} y={y(note.fret) + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={note.root ? "#ffffff" : "#251152"}>
            {note.name}
          </text>
        </g>
      ))}
      <text x="170" y={bottom + 30} textAnchor="middle" fontSize="13">Strings 6 → 1 · frets {first}–{last} run downward</text>
    </svg>
  );
}

/** The route up to its highest note as six-line tab, high E on top. */
function routeTab(route: RouteStep[]): string {
  const highest = route.reduce((top, step, index) => (step.midi > route[top].midi ? index : top), 0);
  const up = route.slice(0, highest + 1);
  const names = ["e", "B", "G", "D", "A", "E"];
  return names
    .map((name, index) => {
      const string = index + 1;
      const cells = up.map((step) => (step.string === string ? String(step.fret).padEnd(3, "-") : "---"));
      return `${name}|-${cells.join("")}|`;
    })
    .join("\n");
}

export default function ChartPackPage() {
  const { weekOne: weekOneChords, weekTwo: weekTwoChords, openEight } = pathChords();
  const { notes, route } = boxOne();
  const roots = notes.filter((note) => note.root).map((note) => `string ${note.string} fret ${note.fret}`);
  const blues = getInstructionAsset(BLUES_FORM_ASSET);
  const bars = blues.kind === "panels" ? blues.panels.filter((panel) => panel.label.startsWith("Bars")) : [];
  const [weekOne, weekTwo, weekThree, weekFour] = PLAN.weeks;

  return (
    <main id="main-content" tabIndex={-1} className="chart-pack">
      <style>{`
        .chart-pack { max-width: 7.4in; margin: 0 auto; padding: 0.3in 0; color: #251152; background: #fff; font-size: 13px; }
        .chart-pack h1 { font-size: 30px; line-height: 1.15; }
        .chart-pack h2 { font-size: 19px; margin-top: 18px; }
        .chart-pack .promise { font-size: 15px; margin-top: 6px; color: #3b1f7e; }
        .chart-pack .legend { margin-top: 10px; font-size: 12px; color: #1c1233; }
        .chart-pack .chords { display: grid; grid-template-columns: repeat(3, 1.9in); gap: 4px 0.45in; margin-top: 8px; }
        .chart-pack figure { margin: 0; break-inside: avoid; }
        .chart-pack figure > p { display: none; }
        .chart-pack figcaption { font-weight: 700; font-size: 15px; text-align: center; margin-bottom: 2px; }
        .chart-pack figure svg { width: 100%; height: auto; color: #251152; }
        .chart-pack .symbol { display: block; text-align: center; font-size: 12px; color: #3b1f7e; }
        .chart-pack .page { break-before: page; }
        .chart-pack .box-wrap { display: grid; grid-template-columns: 3.1in 1fr; gap: 24px; align-items: start; margin-top: 8px; }
        .chart-pack .chart-box { width: 100%; height: auto; color: #251152; }
        .chart-pack pre { font-size: 12px; line-height: 1.35; background: #f7f3ee; padding: 10px 12px; border-radius: 8px; overflow: hidden; }
        .chart-pack ul { margin-top: 6px; padding-left: 18px; list-style: disc; }
        .chart-pack li { margin-top: 4px; }
        .chart-pack .colophon { margin-top: 18px; padding-top: 8px; border-top: 1px solid rgba(37,17,82,.2); font-size: 11px; color: #3b1f7e; }
        @media screen { .chart-pack { padding: 24px 16px; } }
      `}</style>

      <h1>Chord and Pentatonic Chart Pack</h1>
      <p className="promise">Your 30-Day Chords-to-First-Solo Plan. {OFFER.promise}</p>
      <p className="legend">
        Read each chord as if the guitar faces you upright: strings 6 to 1 run left to right, the thick top line is the nut and frets run downward. X = keep the string silent. O = play it open. Numbers in the dots are fingers: 1 index, 2 middle, 3 ring, 4 pinky.
      </p>

      <h2>Week {weekOne.week} · {weekOne.title}</h2>
      <div className="chords">
        {weekOneChords.map((asset) => <div key={asset.id}><ChordDiagram asset={asset} />{symbol(asset.name) !== asset.name ? <span className="symbol">{symbol(asset.name)}</span> : null}</div>)}
      </div>

      <h2>Week {weekTwo.week} · {weekTwo.title}</h2>
      <div className="chords">
        {weekTwoChords.map((asset) => <div key={asset.id}><ChordDiagram asset={asset} />{symbol(asset.name) !== asset.name ? <span className="symbol">{symbol(asset.name)}</span> : null}</div>)}
      </div>

      {openEight.length > 0 ? (
        <>
          <h2>The rest of the open eight</h2>
          <p>Week {weekTwo.week}&apos;s checkpoint plays all eight open chords. These three complete the set.</p>
          <div className="chords">
            {openEight.map((asset) => <div key={asset.id}><ChordDiagram asset={asset} />{symbol(asset.name) !== asset.name ? <span className="symbol">{symbol(asset.name)}</span> : null}</div>)}
          </div>
        </>
      ) : null}

      <section className="page">
        <h2>Week {weekThree.week} · {weekThree.title}: A minor pentatonic</h2>
        <div className="box-wrap">
          <BoxOneDiagram notes={notes} />
          <div>
            <p>
              Five notes, A C D E G, two on every string. The filled dots are A, the root: {roots.join(", ")}. Land a phrase on any of them and it sounds finished.
            </p>
            <p style={{ marginTop: 10 }}>The route up, low string to high, one note per click at 60 BPM with alternate picking. Then play the same notes back down.</p>
            <pre>{routeTab(route)}</pre>
          </div>
        </div>

        <h2>Week {weekFour.week} · {weekFour.title}: the A blues form</h2>
        <p>One chord per bar, four beats in every bar, in 4/4:</p>
        <ul>
          {bars.map((panel) => <li key={panel.number}><strong>{panel.label}:</strong> {panel.action}</li>)}
        </ul>
        <p style={{ marginTop: 10 }}>
          {weekFour.focus} Play a short phrase from box one, leave space, then answer it. Four bars is one musical sentence.
        </p>

        <p className="colophon">
          GuitarHub chart pack for the 30-day chords-to-first-solo plan. Your plan, its guided lessons and the schedule builder live at guitarhub.org/breakthrough.
        </p>
      </section>
    </main>
  );
}
