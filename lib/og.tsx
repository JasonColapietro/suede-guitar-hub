import { ImageResponse } from "next/og";
import type { OgCard } from "./og-cards.ts";

/**
 * The GuitarHub share-card artwork, shared by every `opengraph-image.tsx` and
 * `twitter-image.tsx` on the site.
 *
 * `app/opengraph-image.tsx` (the home card) and `renderOgCard` below both draw
 * from the palette and masthead here, so the per-page cards and the home card
 * cannot drift apart.
 *
 * No `fonts` option is passed on purpose. next/og bundles Noto Sans and
 * registers it as the default family; passing `fonts` REPLACES that default
 * rather than extending it (see render() in @vercel/og), and Satori cannot read
 * woff2, which is the only format next/font/google caches for Fraunces.
 * Fetching a font over the network at build time would put every card one
 * failed request away from breaking, so hierarchy is carried by size, color and
 * spacing instead of by weight or a serif face.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* Palette copied verbatim from the @theme block in app/globals.css.
   next/og renders through Satori, which never sees Tailwind, so the tokens
   cannot be referenced as classes here and have to be repeated as literals.
   If those tokens change in globals.css, change them here too. */
export const OG_COLORS = {
  cream: "#f7f3ee", // --color-cream
  indigoDeep: "#251152", // --color-indigo-deep
  peach: "#f5e2cf", // --color-peach
  string: "rgba(109, 40, 217, 0.45)", // --color-violet, as in .strings-divider
  muted: "rgba(37, 17, 82, 0.72)", // --color-indigo-deep at reading weight
} as const;

/* Low E through high E: the gauge thins as it climbs, the same idea as the
   .strings-divider rule. Rendered as real divs rather than a repeating
   gradient because Satori's repeating-linear-gradient support is not
   something these routes should depend on. */
const STRING_GAUGES = [5, 4, 3, 3, 2, 2];

/** Full-bleed cream card with the indigo top rule. */
export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: OG_COLORS.cream,
        color: OG_COLORS.indigoDeep,
      }}
    >
      {/* Masthead rule. Doubles as a hard top edge so a cream card does not
          dissolve into the white background of Slack, iMessage or X. */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 16,
          backgroundColor: OG_COLORS.indigoDeep,
        }}
      />
      {children}
    </div>
  );
}

/** Wordmark over the string rule, the pairing the site uses under headings. */
export function OgMasthead({
  fontSize = 44,
  letterSpacing = 8,
  stringsWidth = 320,
  stringGap = 9,
}: {
  fontSize?: number;
  letterSpacing?: number;
  stringsWidth?: number;
  stringGap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize, letterSpacing }}>GUITARHUB</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: stringsWidth,
          marginTop: Math.round(fontSize * 0.55),
        }}
      >
        {STRING_GAUGES.map((gauge, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: "100%",
              height: gauge,
              marginTop: i === 0 ? 0 : stringGap,
              backgroundColor: OG_COLORS.string,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Title size steps down with length so long titles stay on two lines. */
function titleSize(title: string): number {
  if (title.length <= 22) return 84;
  if (title.length <= 34) return 72;
  return 62;
}

/** Cut at a word boundary so the subtitle never runs past three lines. */
function clip(text: string, max = 150): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
}

/** The per-page card: masthead, eyebrow pill, title and optional subtitle. */
export function OgCardArtwork({ card }: { card: Pick<OgCard, "eyebrow" | "title" | "subtitle"> }) {
  return (
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          padding: "48px 80px 52px",
        }}
      >
        <OgMasthead fontSize={32} letterSpacing={7} stringsWidth={230} stringGap={6} />

        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "8px 24px",
                borderRadius: 999,
                backgroundColor: OG_COLORS.peach,
                fontSize: 26,
                letterSpacing: 1,
              }}
            >
              {card.eyebrow}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: titleSize(card.title),
              lineHeight: 1.08,
            }}
          >
            {card.title}
          </div>
          {card.subtitle ? (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 29,
                lineHeight: 1.35,
                color: OG_COLORS.muted,
              }}
            >
              {clip(card.subtitle)}
            </div>
          ) : null}
        </div>
      </div>
    </OgFrame>
  );
}

/** Render a card as the 1200x630 PNG an image route returns. */
export function renderOgCard(card: Pick<OgCard, "eyebrow" | "title" | "subtitle">): ImageResponse {
  return new ImageResponse(<OgCardArtwork card={card} />, OG_SIZE);
}
