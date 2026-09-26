/**
 * The free PDF field guides. The cover art is illustration only: it sets the
 * mood for the guide and does not depict its pages. Every file listed here is
 * built by `scripts/build-field-guides.mjs` into `public/guides/`.
 */

export type CoverArt = "amp" | "pedalboard" | "knobs" | "neck";

export type FieldGuide = {
  slug: string;
  title: string;
  subtitle: string;
  /** Volume number on the spine. */
  volume: number;
  art: CoverArt;
  /** Cover colors: background top, background bottom, accent. */
  palette: readonly [string, string, string];
  /** One line that makes a guitarist want it. */
  hook: string;
  inside: readonly string[];
  file: string;
};

export const FIELD_GUIDES: readonly FieldGuide[] = [
  {
    slug: "tone-field-manual", volume: 1, art: "amp",
    title: "The Tone Field Manual", subtitle: "Dial in a great sound on any amp in five minutes",
    palette: ["#2a1458", "#0f0826", "#f5a25d"],
    hook: "The five-minute dial-in routine that works on any amp, including the one at the rehearsal room.",
    inside: ["The five-minute dial-in routine", "What every amp knob really does", "The guitar EQ map, band by band", "Fixes for thin, muddy, harsh and buried tones"],
    file: "/guides/guitarhub-tone-field-manual.pdf",
  },
  {
    slug: "pedalboard-blueprint", volume: 2, art: "pedalboard",
    title: "Pedalboard Blueprint", subtitle: "Order, power and cabling without the hum",
    palette: ["#0e3b3a", "#061918", "#7ee0c3"],
    hook: "The pedal order most players settle on, the exceptions worth breaking it for, and a power worksheet that stops the hum.",
    inside: ["The conventional order, and when to break it", "The effects loop explained", "Power supply worksheet", "The noise-hunting checklist"],
    file: "/guides/guitarhub-pedalboard-blueprint.pdf",
  },
  {
    slug: "amp-recipes", volume: 3, art: "knobs",
    title: "Amp Recipes", subtitle: "Twelve starting settings for the sounds you already love",
    palette: ["#5a1717", "#1e0707", "#ffd08a"],
    hook: "Twelve knob settings for the sounds you already know, from glassy clean to wall of fuzz.",
    inside: ["Twelve recipes with guitar, pedal and amp settings", "How to adapt a recipe to your amp", "Knob-position diagrams", "Room and volume notes"],
    file: "/guides/guitarhub-amp-recipes.pdf",
  },
  {
    slug: "fretboard-atlas", volume: 4, art: "neck",
    title: "Fretboard Atlas", subtitle: "Every note, five pentatonic shapes, and the CAGED map",
    palette: ["#23305e", "#0b1026", "#a78bfa"],
    hook: "Every note on the neck, the five pentatonic shapes and the CAGED map, on pages you can print and pin up.",
    inside: ["Full note chart, frets 0 to 12", "The five minor pentatonic shapes", "The five CAGED major shapes", "A two-week memorization plan"],
    file: "/guides/guitarhub-fretboard-atlas.pdf",
  },
];

export function fieldGuide(slug: string): FieldGuide | undefined {
  return FIELD_GUIDES.find(guide => guide.slug === slug);
}
