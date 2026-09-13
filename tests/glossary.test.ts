import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  GLOSSARY_CONTRACT,
  GLOSSARY_DOMAINS,
  GLOSSARY_HREF,
  GLOSSARY_TERMS,
  GUITAR_TERMS,
  SING_PUBLISHED_TERMS,
  definitionHref,
  glossaryKey,
  publisherFor,
  spellings,
  termAnchor,
  usageHref,
} from "../lib/glossary.ts";
import {
  CURRICULUM_JARGON,
  curriculumUses,
  definitionOf,
  lessonGlossary,
  lessonProse,
  trackGlossary,
} from "../lib/learning/jargon.ts";
import { allLessons, type TrackId } from "../lib/learning/curriculum.ts";
import { HUBS, SITE_URL, STRUMLY } from "../lib/site.ts";

const TRACKS: readonly TrackId[] = ["guitar", "voice"];

register("./component-render-hooks.mjs", import.meta.url);
const { LessonGlossary } = await import("../components/learning/LessonGlossary.tsx");

// ── The vendored contract ────────────────────────────────────────────────────

test("vendors a glossary contract in the shape the publishing repository emits", () => {
  assert.equal(GLOSSARY_CONTRACT.contract, "suede-glossary");
  assert.equal(GLOSSARY_CONTRACT.version, 1);
  assert.ok(GLOSSARY_TERMS.length >= 40, `only ${GLOSSARY_TERMS.length} terms vendored`);

  for (const entry of GLOSSARY_TERMS) {
    const where = `glossary entry ${entry.term}`;
    for (const field of ["term", "definition", "where", "href"] as const) {
      assert.equal(typeof entry[field], "string", `${where}: ${field} must be a string`);
      assert.ok(entry[field].length > 0, `${where}: ${field} must not be empty`);
    }
    assert.ok(
      GLOSSARY_DOMAINS.includes(entry.domain),
      `${where}: ${entry.domain} is not a glossary domain`,
    );
    assert.ok(entry.href.startsWith("/"), `${where}: href must be a path, not ${entry.href}`);
    if (entry.aka !== undefined) {
      assert.ok(Array.isArray(entry.aka), `${where}: aka must be an array`);
    }
    // One sentence, definition only. A definition carrying advice is the
    // glossary taking over the teaching the rooms and the books do.
    assert.ok(
      entry.definition.trim().endsWith("."),
      `${where}: definition must be one finished sentence`,
    );
  }
});

/**
 * The publisher is a rule, not a field. A contract that disagrees with the rule
 * would move a term's structured data to the wrong site silently, so the field is
 * recomputed and compared rather than trusted.
 */
test("agrees with the publisher rule: guitar here, everything else in sing", () => {
  assert.equal(publisherFor("guitar"), "guitarHub");
  assert.equal(publisherFor("voice"), "sing");
  assert.equal(publisherFor("music"), "sing");

  for (const entry of GLOSSARY_TERMS) {
    if (entry.publishedBy === undefined) continue;
    assert.equal(
      entry.publishedBy,
      publisherFor(entry.domain),
      `${entry.term} (${entry.domain}) claims publishedBy ${entry.publishedBy}`,
    );
  }

  assert.equal(GUITAR_TERMS.length + SING_PUBLISHED_TERMS.length, GLOSSARY_TERMS.length);
  assert.ok(GUITAR_TERMS.length > 0, "this site must have guitar terms to render");
});

/**
 * A term string is not unique across the set — `register` is defined twice, once
 * per instrument. What must be unique is the domain-qualified key, and the anchor
 * within one publishing site, because that is what a URL fragment is scoped to.
 */
test("keys every term uniquely, and every anchor uniquely within its own site", () => {
  const keys = GLOSSARY_TERMS.map(glossaryKey);
  assert.equal(new Set(keys).size, keys.length, "a domain-qualified key is duplicated");

  for (const group of [GUITAR_TERMS, SING_PUBLISHED_TERMS]) {
    const anchors = group.map((entry) => termAnchor(entry.term));
    assert.equal(
      new Set(anchors).size,
      anchors.length,
      `two terms share one anchor: ${anchors.filter((a, i) => anchors.indexOf(a) !== i)}`,
    );
  }

  // Pinned, because it is the slug function that builds the outbound links into
  // sing's glossary page: a different spelling here lands the reader nowhere.
  assert.equal(termAnchor("Scientific pitch notation"), "scientific-pitch-notation");
  assert.equal(termAnchor("Singer's formant"), "singers-formant");
  assert.equal(termAnchor("Singer’s formant"), "singers-formant");
  assert.equal(termAnchor("A440"), "a440");
  assert.equal(termAnchor("  Mix?  "), "mix");
});

test("resolves a definition to the publishing site, never to the other one", () => {
  for (const entry of GUITAR_TERMS) {
    assert.equal(definitionHref(entry), `${GLOSSARY_HREF}#${termAnchor(entry.term)}`);
    assert.equal(usageHref(entry), entry.href);
  }

  for (const entry of SING_PUBLISHED_TERMS) {
    assert.equal(
      definitionHref(entry),
      `${STRUMLY.singGlossary}#${termAnchor(entry.term)}`,
      `${entry.term} must be defined in sing, not here`,
    );
    assert.ok(usageHref(entry).startsWith(STRUMLY.sing));
  }

  // The external host belongs to the registry, which is the only file allowed to
  // name one. A hand-written sing URL anywhere else is the defect this prevents.
  assert.equal(STRUMLY.singGlossary, `${STRUMLY.sing}/glossary`);
});

/** A guitar term's `href` is a path in THIS repository, so it must render here. */
test("points every guitar term at a page this repository actually serves", () => {
  for (const entry of GUITAR_TERMS) {
    assert.ok(
      routeExists(entry.href),
      `${entry.term} links to ${entry.href}, which no page.tsx under app/ renders`,
    );
  }
});

function routeExists(path: string): boolean {
  const segments = path.split("/").filter(Boolean);

  function walk(dir: URL, index: number): boolean {
    if (index === segments.length) return existsSync(new URL("page.tsx", dir));
    const literal = new URL(`${segments[index]}/`, dir);
    if (existsSync(literal) && walk(literal, index + 1)) return true;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!/^\[[^[\]]+\]$/.test(entry.name)) continue;
      if (walk(new URL(`${entry.name}/`, dir), index + 1)) return true;
    }
    return false;
  }

  return walk(new URL("../app/", import.meta.url), 0);
}

// ── The word-level fix ──────────────────────────────────────────────────────

/**
 * The whole point. `passaggio`, `mix`, `twang` and `pressed phonation` shipped to
 * beginners in `lib/learning/data/voice.json` with no definition anywhere, and
 * this is the assertion that makes that state a build failure rather than a
 * reading.
 */
test("defines every jargon word the curriculum ships", () => {
  const undefinedWords = CURRICULUM_JARGON.filter(
    ({ word, track }) => definitionOf(word, track) === null,
  );

  assert.deepEqual(
    undefinedWords,
    [],
    `the curriculum ships these words with no definition in contracts/glossary.json: ` +
      `${undefinedWords.map(({ word }) => word).join(", ")}. Either the glossary contract has ` +
      `to define them, or the curriculum has to stop using them.`,
  );

  // Named one by one as well, because the four are the defect this was built
  // for and a shortened list would otherwise pass as a shorter glossary.
  for (const word of ["passaggio", "mix", "twang", "pressed phonation"]) {
    assert.ok(
      CURRICULUM_JARGON.some((entry) => entry.word === word),
      `${word} must stay on the jargon list`,
    );
  }
});

/** Keeps the hand-kept list from rotting into words the curriculum dropped. */
test("lists no jargon word the curriculum has stopped using", () => {
  for (const { word, track } of CURRICULUM_JARGON) {
    assert.ok(
      curriculumUses(word, track),
      `${word} is on the jargon list but no longer appears in the ${track} curriculum`,
    );
  }
});

/**
 * Derived from the curriculum rather than listed: every glossary word a lesson's
 * own prose uses has to be reachable from that lesson. This is the half that
 * grows on its own as sing adds terms.
 */
test("makes every glossary word a lesson uses reachable from that lesson", () => {
  let withWords = 0;

  for (const track of TRACKS) {
    for (const { lesson } of allLessons(track)) {
      const terms = lessonGlossary(track, lesson.id);
      if (terms.length === 0) continue;
      withWords += 1;

      const prose = lessonProse(track, lesson.id);
      for (const entry of terms) {
        assert.ok(
          spellings(entry).some((name) => foldForTest(prose).includes(name)),
          `${lesson.id} offers ${entry.term}, which its own prose does not use`,
        );
      }

      const markup = renderToStaticMarkup(createElement(LessonGlossary, { terms }));
      for (const entry of terms) {
        assert.ok(
          markup.includes(`href="${definitionHref(entry)}"`),
          `${lesson.id} must link ${entry.term} to ${definitionHref(entry)}`,
        );
      }
    }
  }

  assert.ok(withWords > 50, `only ${withWords} lessons resolve a glossary word`);

  // The block has to be on the page, and on it unconditionally. Every voice
  // lesson takes the outline branch rather than the LessonSession one, so a
  // glossary rendered inside the available branch would reach no singer at all —
  // which is how TRACK_SAFETY_NOTE came to never render once. Asserted by
  // position: between the end of the branching section and the lesson nav.
  const lessonPage = pageSource("app/learn/[track]/[lessonId]/page.tsx");
  const afterBranches = lessonPage.slice(
    lessonPage.indexOf("</section>}"),
    lessonPage.indexOf("styles.lessonNavigation"),
  );
  assert.ok(
    afterBranches.includes("<LessonGlossary"),
    "the lesson page must render LessonGlossary outside the available/outline branches",
  );
  assert.match(lessonPage, /lessonGlossary\(track, lesson\.id\)/);

  // The four words the defect named, each on the lesson pages that ship it.
  const jargonReach = new Map<string, number>();
  for (const { lesson } of allLessons("voice")) {
    for (const entry of lessonGlossary("voice", lesson.id)) {
      jargonReach.set(entry.term, (jargonReach.get(entry.term) ?? 0) + 1);
    }
  }
  for (const term of ["Passaggio", "Mix", "Twang", "Pressed phonation"]) {
    assert.ok(
      (jargonReach.get(term) ?? 0) > 0,
      `no voice lesson page resolves ${term}, so a beginner still meets it bare`,
    );
  }
});

function foldForTest(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

test("renders nothing at all on a lesson whose prose uses no jargon", () => {
  assert.equal(renderToStaticMarkup(createElement(LessonGlossary, { terms: [] })), "");
});

// ── The glossary surface ────────────────────────────────────────────────────

test("registers the glossary as a free, indexable page in the route registry", () => {
  const entry = HUBS.find((hub) => hub.href === GLOSSARY_HREF);
  assert.ok(entry, "the glossary must be in HUBS so the sitemap and footer find it");
  assert.ok(entry.title.length > 0 && entry.blurb.length > 0);

  const source = pageSource("app/glossary/page.tsx");
  assert.match(source, new RegExp(`\\$\\{SITE_URL\\}${GLOSSARY_HREF}|GLOSSARY_CANONICAL`));
  assert.match(source, /alternates: \{ canonical: CANONICAL \}/);
  assert.match(source, /images: \[OG_IMAGE\]/);
  assert.match(source, /crumbs=\{CRUMBS\}/);

  // A reference page has no access gate, so it must not carry the lesson pages'
  // robots gate either. `canOpenModule` governs what opens; nothing here opens.
  assert.doesNotMatch(source, /robots:/);
  assert.equal(SITE_URL, "https://guitarhub.org");

  // Linked from the footer, which every page renders, so it is not reachable
  // from the XML sitemap alone.
  assert.match(
    pageSource("components/SiteFooter.tsx"),
    new RegExp(`href: "${GLOSSARY_HREF}"`),
  );
});

test("defines the guitar senses on the page and links the rest out, never both", () => {
  const source = pageSource("app/glossary/page.tsx");

  for (const entry of GUITAR_TERMS) {
    assert.ok(
      source.includes("GUITAR_TERMS"),
      "the page must render the guitar terms from the contract",
    );
    assert.ok(entry.definition.length > 0);
  }

  // The definitions of sing-published words must not be restated in this
  // repository's own source. Compared against the contract's actual sentences
  // with case and punctuation folded, so a paste that was recapitalised or
  // rewrapped across JSX lines is caught as readily as a verbatim one.
  const singDefinitions = SING_PUBLISHED_TERMS.map((entry) => ({
    entry,
    folded: foldForTest(entry.definition),
  }));

  for (const file of sourceFiles()) {
    // The vendored contract is where those sentences legitimately live.
    if (file.pathname.endsWith("contracts/glossary.json")) continue;
    const folded = foldForTest(readFileSync(file, "utf8"));
    for (const { entry, folded: definition } of singDefinitions) {
      assert.ok(
        !folded.includes(definition),
        `${file.pathname} restates sing's definition of ${entry.term}; link to ` +
          `${definitionHref(entry)} instead`,
      );
    }
  }
});

// ── The anti-competition guard ──────────────────────────────────────────────

/**
 * The rule that makes Suede Sing the single definitional source for this
 * vocabulary: this repository emits no schema.org term markup, for any term, in
 * any file. Two sites marking up one term compete for the one thing the markup
 * exists to win.
 *
 * The token is searched for literally rather than only inside an `@type`, so a
 * second emission shaped differently is caught too. That is also why no file
 * outside `tests/` may mention it even in a comment: the guard is only as strong
 * as the absence it asserts.
 */
test("emits no schema.org term markup anywhere, for any term", () => {
  const banned = ["Defined" + "Term", "Defined" + "TermSet"];
  const offenders: string[] = [];

  for (const file of sourceFiles()) {
    const text = readFileSync(file, "utf8");
    for (const token of banned) {
      if (text.includes(token)) offenders.push(`${file.pathname}: ${token}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Suede Sing is the single definitional source for the shared glossary, so this repository ` +
      `must emit no term markup:\n${offenders.join("\n")}`,
  );

  // Proven against output, not only source: the rendered glossary page is the
  // one place the markup would be most tempting to add.
  assert.ok(!readFileSync(glossaryPageFile(), "utf8").includes(banned[0]));
});

test("still publishes the page-level structured data a reference page should", () => {
  const source = pageSource("app/glossary/page.tsx");
  assert.match(source, /application\/ld\+json/);
  assert.match(source, /"@type": "WebPage"/);
  assert.match(source, /breadcrumbList\(CANONICAL, CRUMBS\)/);
});

// ── Vendoring ───────────────────────────────────────────────────────────────

test("wires the glossary contract into the checks that can actually run", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(
    packageJson.scripts["contracts:check"],
    /sync-sing-glossary\.mjs --check/,
    "contracts:check must verify the glossary contract alongside the vocal one",
  );
  assert.match(packageJson.scripts["contracts:check"], /sync-sing-vocal\.mjs --check/);

  const workflow = readFileSync(
    new URL("../.github/workflows/verify.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /sync-sing-glossary\.mjs --check/);
  assert.match(workflow, /sync-sing-vocal\.mjs --check/);

  const script = readFileSync(
    new URL("../scripts/sync-sing-glossary.mjs", import.meta.url),
    "utf8",
  );
  // The reference is sing's default branch and nothing else. A vendored copy
  // taken from a branch in flight is the drift the contract exists to prevent.
  assert.doesNotMatch(script, /BRANCH\s*=/, "the branch is the shared helper's to decide");

  const helper = readFileSync(
    new URL("../scripts/lib/vendor-sing-contract.mjs", import.meta.url),
    "utf8",
  );
  assert.match(helper, /BRANCH = "main"/);
  // A fetch that did not succeed must never be reported as a comparison.
  assert.match(helper, /throw new Error\(\s*`Could not read/);
  // And the comparison's own failure path has to be able to report: a byte diff
  // over a contract this size took the process out with SIGKILL while formatting.
  assert.match(helper, /vendored\.equals\(reference\)/);
});

function glossaryPageFile(): URL {
  return new URL("../app/glossary/page.tsx", import.meta.url);
}

function pageSource(relative: string): string {
  const file = new URL(`../${relative}`, import.meta.url);
  assert.equal(existsSync(file), true, `${relative} must exist`);
  return readFileSync(file, "utf8");
}

/** Every authored source file outside `tests/`, which is where the guard lives. */
function sourceFiles(): URL[] {
  const found: URL[] = [];
  const roots = ["app", "components", "lib", "contracts", "scripts"];

  function walk(dir: URL) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, dir));
        continue;
      }
      if (!/\.(ts|tsx|mjs|js|json|css|md)$/.test(entry.name)) continue;
      found.push(new URL(entry.name, dir));
    }
  }

  for (const root of roots) walk(new URL(`../${root}/`, import.meta.url));
  return found;
}

/** Guards the scan itself: a scanner that matches nothing proves nothing. */
test("scans a real set of source files and a real curriculum vocabulary", () => {
  assert.ok(sourceFiles().length > 50, "the source scan must cover the codebase");
  for (const track of TRACKS) {
    assert.ok(
      trackGlossary(track).length >= 10,
      `${track}: only ${trackGlossary(track).length} glossary words found in the curriculum`,
    );
  }
});
