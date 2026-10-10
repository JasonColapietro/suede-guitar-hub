import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { cardFor } from "@/lib/og-cards";

/* Share card for /how-to-change-chords-faster. Title and subtitle are read from the route registry
   in lib/site.ts, so retitling the page there retitles the card too. */
const card = cardFor("/how-to-change-chords-faster");

export const alt = card.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard(card);
}
