/**
 * Converts server-rendered page markup into the Markdown that makes up
 * /llms-full.txt. The pages are rendered from their real components by
 * scripts/build-llms-full.mts, so the full-text file quotes exactly what a
 * reader sees and cannot drift from the site.
 *
 * Only the main column is kept. Navigation, breadcrumbs, forms, buttons,
 * scripts and anything marked `data-print="hide"` (related-link grids and
 * the practice call to action) are dropped, as they are on the printable
 * Field Guides.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rarr: "→",
  larr: "←",
  middot: "·",
  times: "×",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
}

/** Removes every element of `tag` (with nesting) whose opening tag matches `when`. */
function stripElements(html: string, tag: string, when: (openTag: string) => boolean = () => true): string {
  const open = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
  let out = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = open.exec(html))) {
    if (match.index < cursor || !when(match[0])) continue;
    // Walk forward counting nested elements of the same tag.
    const any = new RegExp(`<(/?)${tag}(\\s[^>]*)?>`, "gi");
    any.lastIndex = match.index + match[0].length;
    let depth = 1;
    let end = html.length;
    let inner: RegExpExecArray | null;
    while ((inner = any.exec(html))) {
      depth += inner[1] ? -1 : 1;
      if (depth === 0) {
        end = inner.index + inner[0].length;
        break;
      }
    }
    out += html.slice(cursor, match.index);
    cursor = end;
    open.lastIndex = end;
  }
  return out + html.slice(cursor);
}

function absolute(href: string, origin: string): string {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (href.startsWith("/")) return `${origin}${href}`;
  return href;
}

/** Block-level and separately styled pieces read as separate words. */
const SEPARATE = /<\/?(div|p|h[1-6]|li|ul|ol|dl|dt|dd|span|section|article|header|footer|time)(\s[^>]*)?>/gi;

function inline(html: string, origin: string): string {
  return decodeEntities(
    html
      .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => {
        const label = text.replace(SEPARATE, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!label) return "";
        if (href.startsWith("#")) return label;
        return `[${label}](${absolute(decodeEntities(href), origin)})`;
      })
      .replace(/<(strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "**$3**")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(SEPARATE, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\)\[/g, ") [")
    .trim();
}

/** Markdown for the main column of one rendered page. */
export function mainToMarkdown(html: string, { origin }: { origin: string }): string {
  const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)?.[1] ?? html;
  let body = main
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  for (const tag of ["nav", "form", "button", "select", "textarea", "figure", "noscript"]) {
    body = stripElements(body, tag);
  }
  for (const tag of ["section", "div", "aside"]) {
    body = stripElements(body, tag, (open) => /data-print="hide"/.test(open));
  }

  const blocks: string[] = [];
  const pattern = /<(h[1-6]|p|li|dt|dd|blockquote)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const tag = match[1].toLowerCase();
    // A list item holding its own block content is read through its children.
    if (tag === "li" && /<(p|h[1-6])[\s>]/i.test(match[3])) {
      pattern.lastIndex = match.index + match[0].indexOf(">") + 1;
      continue;
    }
    const text = inline(match[3], origin);
    if (!text) continue;
    if (tag[0] === "h") blocks.push(`${"#".repeat(Math.min(6, Number(tag[1]) + 1))} ${text}`);
    else if (tag === "li") blocks.push(`- ${text}`);
    else if (tag === "dt") blocks.push(`**${text}**`);
    else if (tag === "blockquote") blocks.push(`> ${text}`);
    else blocks.push(text);
  }

  const deduped = blocks.filter((block, index) => block !== blocks[index - 1]);
  return deduped
    .map((block, index) => {
      if (index === 0) return block;
      const tight = block.startsWith("- ") && deduped[index - 1].startsWith("- ");
      return (tight ? "\n" : "\n\n") + block;
    })
    .join("")
    .trim();
}

export type FullTextPage = { url: string; html: string };

/** The whole file: a title, a summary, the shared intro, then one section per page. */
export function buildLlmsFull({
  title,
  summary,
  intro,
  pages,
  origin,
}: {
  title: string;
  summary: string;
  intro: readonly string[];
  pages: readonly FullTextPage[];
  origin: string;
}): string {
  const sections = pages.map(({ url, html }) => {
    const blocks = mainToMarkdown(html, { origin }).split("\n\n");
    // The page's H1 (demoted to ##) heads its section, whatever eyebrow text
    // the page prints above it.
    const at = blocks.findIndex((block) => block.startsWith("## "));
    const heading = at >= 0 ? blocks[at] : `## ${url}`;
    const rest = at >= 0 ? [...blocks.slice(0, at), ...blocks.slice(at + 1)] : blocks;
    return [heading, `Source: ${url}`, ...rest].join("\n\n");
  });
  return [`# ${title}`, `> ${summary}`, ...intro, ...sections].join("\n\n") + "\n";
}
