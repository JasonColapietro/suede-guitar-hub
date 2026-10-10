import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { cardFor } from "@/lib/og-cards";

/* Share card for /resources/jeff-buckley-hallelujah-guitar-tone. Title and subtitle are read from the route registry
   in lib/site.ts, so retitling the page there retitles the card too. */
const card = cardFor("/resources/jeff-buckley-hallelujah-guitar-tone");

export const alt = card.alt;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard(card);
}
