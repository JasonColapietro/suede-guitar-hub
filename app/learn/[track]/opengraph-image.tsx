import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { cardFor, type OgCard } from "@/lib/og-cards";

type Params = { track: string };

/* Share card for each learning path (today only /learn/guitar). Title and
   subtitle come from the LEARN registry in lib/site.ts. `generateImageMetadata`
   gives each track its own alt text. Lesson pages under this segment set no
   card of their own, so they inherit their path's card instead of the home one. */
function trackCard(track: string): OgCard | undefined {
  try {
    return cardFor(`/learn/${track}`);
  } catch {
    return undefined;
  }
}

export function generateImageMetadata({ params }: { params: Params }) {
  const card = trackCard(params.track);
  if (!card) return [];
  return [{ id: "card", alt: card.alt, size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const card = trackCard((await params).track);
  if (!card) return new Response("Not found", { status: 404 });
  return renderOgCard(card);
}
