// Previously public URLs enforce exactly the same verification as new download links.
export { GET, HEAD } from "@/app/account/downloads/[filename]/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
