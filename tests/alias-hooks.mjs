/**
 * ESM resolve hook that teaches Node the one path alias this project uses.
 *
 * `tsconfig.json` maps `@/*` to the project root, and every file under `app/`,
 * `components/`, and `lib/` imports through it. Next resolves that alias at
 * build time; plain `node --test` does not, so any test that imports a module
 * written in the project's own idiom — `tests/seo-routes.test.ts` importing
 * `app/sitemap.ts`, which imports `@/lib/site` — dies with ERR_MODULE_NOT_FOUND.
 *
 * Resolving the alias here rather than rewriting the import in `app/sitemap.ts`
 * keeps the alias consistent across the codebase and stops the next test that
 * reaches into `app/` from hitting the same wall.
 *
 * Node's ESM resolver does no extension guessing, so the alias is expanded to a
 * real file on disk: `@/lib/site` has to become `.../lib/site.ts`. The
 * candidate list mirrors the extensions TypeScript itself would try.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Project root: this file lives in `<root>/tests/`. */
const ROOT = fileURLToPath(new URL("../", import.meta.url));

const ALIAS = "@/";

/** Tried in order, matching the resolution order a bundler uses. */
const EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs"];

/** Also try `<specifier>/index.<ext>`, the way a directory import resolves. */
const INDEXES = EXTENSIONS.filter((ext) => ext !== "").map(
  (ext) => `/index${ext}`,
);

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith(ALIAS)) {
    return nextResolve(specifier, context);
  }

  const base = ROOT + specifier.slice(ALIAS.length);

  for (const suffix of [...EXTENSIONS, ...INDEXES]) {
    const candidate = base + suffix;
    if (suffix !== "" && existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  // Fall through with the absolute path so the failure names a real location
  // instead of the bare alias, which reads as a missing npm package.
  return nextResolve(pathToFileURL(base).href, context);
}
