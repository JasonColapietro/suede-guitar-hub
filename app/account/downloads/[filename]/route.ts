import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { accountConfiguration } from "@/lib/learning-auth/config";
import { resolveAccount } from "@/lib/learning-auth/server";
import { createFieldGuideDownload } from "@/lib/field-guide-downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const download = createFieldGuideDownload({
  enabled: () => accountConfiguration() !== null,
  resolveAccount,
  readPdf: (filename) => readFile(join(process.cwd(), "private/field-guides", filename)),
});

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  return download(request, (await params).filename);
}
export const HEAD = GET;
