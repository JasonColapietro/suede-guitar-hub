import { getDrill } from "@/lib/advanced/drills";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";
import { drillCard } from "@/lib/og-cards";

type Params = { drillId: string };

/* One share card per drill, drawn from the drill data in lib/advanced/drills.ts.
   `generateImageMetadata` is what lets the alt text differ per drill: a plain
   `alt` export is a single string for every page under this segment. */
export function generateImageMetadata({ params }: { params: Params }) {
  const drill = getDrill(params.drillId);
  if (!drill) return [];
  return [{ id: "card", alt: drillCard(drill).alt, size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const drill = getDrill((await params).drillId);
  if (!drill) return new Response("Not found", { status: 404 });
  return renderOgCard(drillCard(drill));
}
