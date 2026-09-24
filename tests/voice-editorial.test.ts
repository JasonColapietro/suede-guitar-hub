/**
 * Holds the voice track's citations to Suede Sing's library through the
 * contract, rather than through hope.
 *
 * The track teaches registers, the passaggio, breath, resonance, belt safety and
 * vocal health and writes none of it down, and its three repertoire modules are
 * called "First Song", "Tenth Song" and "Twelfth Song" while naming no song at
 * all. Sing has 31,738 words of book across twenty-three chapters, 72,394 of
 * atlas across twenty-seven, and a catalogue of twenty-four popular songs with a
 * key and a cited range. So this repository cites, and `voice-editorial.ts` does
 * it the way `voice-proof.ts` already cites rooms: through
 * `contracts/suede-vocal.json`, so that a renamed or withdrawn chapter fails
 * here instead of turning into a dead link on a lesson page.
 *
 * The tests below are therefore about failure rather than about coverage. A
 * citation naming a chapter Sing no longer publishes must throw. A free lesson
 * citing a paid chapter must carry the disclosure. A module handing over a song
 * must hand over one whose published range actually satisfies the requirement it
 * stated. And the five mappings the integration spec settled must still be there
 * by name, because a decision recorded only in a document is a decision that gets
 * edited out.
 */
import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import contract from "../contracts/suede-vocal.json" with { type: "json" };
import voiceCurriculum from "../lib/learning/data/voice.json" with { type: "json" };
import {
  VOICE_MODULE_EDITORIAL,
  editorialUrl,
  repertoireHubUrl,
  repertoireMatches,
  resolveCitation,
  resolveRepertoire,
  voiceEditorialForLesson,
} from "../lib/learning/voice-editorial.ts";
import { voiceModuleIds } from "../lib/learning/voice-proof.ts";

register("./component-render-hooks.mjs", import.meta.url);
const { LessonEditorialPanel } = await import("../components/learning/LessonEditorial.tsx");

const BOOK = new Map(contract.editorial.book.chapters.map((c) => [c.slug, c]));
const ATLAS = new Map(contract.editorial.atlas.chapters.map((c) => [c.slug, c]));

test("the contract publishes the library this repository intends to cite", () => {
  assert.ok(contract.version >= 2, "the editorial section arrived in version 2");
  assert.equal(contract.editorial.book.chapters.length, 23);
  assert.equal(contract.editorial.atlas.chapters.length, 27);
  assert.equal(contract.editorial.repertoire.songs.length, 24);
  assert.equal(contract.editorial.singers.count, 636);
  // Every singer record carries a written technique paragraph, which is the fact
  // that makes the library worth citing rather than merely large.
  assert.equal(contract.editorial.singers.withTechnique, contract.editorial.singers.count);

  // And it must carry no prose this repository would then be tempted to copy.
  for (const chapter of [...BOOK.values(), ...ATLAS.values()]) {
    assert.equal("body" in chapter, false, `${chapter.slug} leaked a body into the contract`);
  }
});

test("every citation names a chapter Suede Sing still publishes", () => {
  let cited = 0;
  for (const [moduleId, entry] of Object.entries(VOICE_MODULE_EDITORIAL)) {
    for (const citation of entry.reading) {
      cited += 1;
      // Throws on an unknown slug or an unknown reference table, which is the
      // whole point: a chapter that goes away takes this suite down with it.
      const resolved = resolveCitation(citation);
      assert.ok(
        resolved.href.startsWith(contract.deepLinks.origin),
        `${moduleId} built a citation outside Sing's origin`,
      );
      assert.ok(resolved.title.length > 0, `${moduleId} resolved a titleless citation`);
      assert.ok(resolved.summary.length > 0, `${moduleId} resolved a citation with no abstract`);
      assert.ok(resolved.why.length > 60, `${moduleId} does not say why it cites ${resolved.title}`);
    }
  }
  assert.ok(cited > 10, "the citation table is vacuous");
});

test("a citation to a withdrawn chapter throws rather than linking nowhere", () => {
  assert.throws(
    () => resolveCitation({ target: { shelf: "book", slug: "no-such-chapter" }, why: "x" }),
    /not in contracts\/suede-vocal\.json/,
  );
  assert.throws(
    () => resolveCitation({ target: { shelf: "atlas", slug: "registers" }, why: "x" }),
    /not in contracts\/suede-vocal\.json/,
    "a book chapter cited off the atlas shelf must not silently resolve",
  );
});

/**
 * The five mappings the integration spec settled, asserted by name. Recorded in
 * a document they are an intention; recorded here they are a constraint.
 */
test("the spec's module-to-chapter mapping is the mapping that ships", () => {
  const targets = (moduleId: string): string[] =>
    (VOICE_MODULE_EDITORIAL[moduleId]?.reading ?? []).map((citation) =>
      citation.target.shelf === "referenceTable"
        ? `referenceTable:${citation.target.id}`
        : `${citation.target.shelf}:${citation.target.slug}`,
    );

  // Range and voice type to the atlas band table. Note the table is a page and
  // not a chapter: the voice-types chapter refuses to print the grid on purpose,
  // so citing the chapter here would send a reader somewhere that declines to
  // answer them.
  assert.ok(targets("v-l1-m2").includes("referenceTable:vocalRangeByVoiceType"));
  assert.ok(targets("v-l1-m3").includes("book:breath"), "breath to the breath chapter");
  assert.ok(targets("v-l3-m1").includes("book:registers"), "registers to the registers chapter");
  assert.ok(
    targets("v-l5-m4").includes("atlas:the-safety-rail"),
    "belt safety to the safety-rail chapter",
  );
  assert.ok(
    targets("v-l7-m1").includes("book:stamina-and-health"),
    "vocal health to stamina and health",
  );
});

/**
 * The disclosure. Nineteen of the book's twenty-three chapters and twenty-four
 * of the atlas's twenty-seven are behind Pro, and voice levels one and two are
 * free here, so most free lessons cite paid reading. That is allowed — it is the
 * right reading — and it has to be said out loud before the click.
 */
test("a citation behind Suede Sing Pro says so, and an open one does not", () => {
  let gated = 0;
  let open = 0;
  for (const [moduleId, entry] of Object.entries(VOICE_MODULE_EDITORIAL)) {
    for (const citation of entry.reading) {
      const resolved = resolveCitation(citation);
      const chapter =
        citation.target.shelf === "referenceTable"
          ? { free: contract.editorial.referenceTables[citation.target.id].free }
          : citation.target.shelf === "book"
            ? BOOK.get(citation.target.slug)!
            : ATLAS.get(citation.target.slug)!;

      if (chapter.free) {
        open += 1;
        assert.equal(resolved.gate, null, `${moduleId} gates an open chapter`);
      } else {
        gated += 1;
        assert.match(
          resolved.gate ?? "",
          /Pro/,
          `${moduleId} cites paid reading without disclosing the gate`,
        );
      }
    }
  }
  // Both outcomes have to occur, or the branch that matters is untested.
  assert.ok(gated > 0, "no gated citation, so the disclosure is never exercised");
  assert.ok(open > 0, "no open citation, so the absence of a gate is never exercised");
});

test("every module handing over a song hands over one the catalogue really has", () => {
  const songs = new Map(contract.editorial.repertoire.songs.map((s) => [s.title, s]));
  let withRepertoire = 0;

  for (const [moduleId, entry] of Object.entries(VOICE_MODULE_EDITORIAL)) {
    if (!entry.repertoire) continue;
    withRepertoire += 1;
    const resolved = resolveRepertoire(entry.repertoire);
    assert.ok(
      resolved.length > 0,
      `${moduleId} states a repertoire requirement no song in Sing's catalogue meets`,
    );

    for (const song of resolved) {
      const published = songs.get(song.title);
      assert.ok(published, `${moduleId} handed over a song not in the catalogue`);
      assert.equal(song.href, editorialUrl(published.path));
      assert.equal(song.key, published.key, `${moduleId} restated ${song.title}'s key`);
      assert.equal(song.rangeLabel, published.rangeLabel);

      // The requirement is the curriculum's judgment; the range is Sing's fact.
      // A song that fails the module's own bounds is the failure this guards.
      const { spanAtLeast, spanAtMost } = entry.repertoire;
      if (spanAtLeast !== undefined) {
        assert.ok(
          published.spanSemitones >= spanAtLeast,
          `${moduleId} handed over ${song.title}, ${published.spanSemitones} semitones, under its own floor of ${spanAtLeast}`,
        );
      }
      if (spanAtMost !== undefined) {
        assert.ok(
          published.spanSemitones <= spanAtMost,
          `${moduleId} handed over ${song.title}, ${published.spanSemitones} semitones, over its own ceiling of ${spanAtMost}`,
        );
      }
    }
  }

  // The three repertoire modules are the three the curriculum names "song"
  // modules. If a fourth appears, it needs a requirement rather than silence.
  assert.equal(withRepertoire, 3);
});

/**
 * The filter itself, exercised where each bound actually binds. The
 * per-module check above cannot do this: a module's difficulty ceiling often
 * excludes the wide songs before the span bound is consulted, so dropping the
 * span filter altogether left that check green.
 */
test("a repertoire requirement excludes the songs it says it excludes", () => {
  const all = contract.editorial.repertoire.songs;
  const why = "a bound stated so the filter has something to do";

  const narrow = repertoireMatches({ spanAtMost: 17, why });
  assert.ok(narrow.length > 0);
  assert.ok(
    all.some((song) => song.spanSemitones > 17),
    "the catalogue must contain a song over the ceiling, or the ceiling is untested",
  );
  for (const song of narrow) {
    assert.ok(song.spanSemitones <= 17, `${song.title} is over the ceiling`);
  }

  const wide = repertoireMatches({ spanAtLeast: 23, why });
  assert.ok(wide.length > 0);
  assert.ok(all.some((song) => song.spanSemitones < 23), "the floor is untested");
  for (const song of wide) {
    assert.ok(song.spanSemitones >= 23, `${song.title} is under the floor`);
  }

  const easy = repertoireMatches({ hardest: "Easy", why });
  assert.ok(easy.length > 0);
  assert.ok(all.some((song) => song.difficulty !== "Easy"), "the difficulty ceiling is untested");
  for (const song of easy) {
    assert.equal(song.difficulty, "Easy", `${song.title} is harder than the module allows`);
  }

  // Narrowest first, then alphabetical, so a build cannot reorder the list.
  const spans = repertoireMatches({ spanAtMost: 19, why }).map((song) => song.spanSemitones);
  assert.deepEqual([...spans].sort((a, b) => a - b), spans);
});

test("the track that named no repertoire now names some", () => {
  const named = new Set<string>();
  for (const entry of Object.values(VOICE_MODULE_EDITORIAL)) {
    if (!entry.repertoire) continue;
    for (const song of resolveRepertoire(entry.repertoire)) named.add(song.title);
  }
  assert.ok(named.size >= 4, `only ${named.size} songs reach the curriculum`);
  assert.match(repertoireHubUrl(), /^https:\/\/[^/]+\/can-you-sing$/);
});

test("every cited module is a module the curriculum actually has", () => {
  const ids = new Set(voiceModuleIds());
  for (const moduleId of Object.keys(VOICE_MODULE_EDITORIAL)) {
    assert.ok(ids.has(moduleId), `${moduleId} is not a voice module`);
  }
});

test("a lesson resolves its module's reading, and a guitar lesson resolves none", () => {
  // v-l3-m1 is the registers module; every one of its lessons gets the chapter.
  const registers = voiceCurriculum.levels
    .flatMap((level) => level.modules)
    .find((entry) => entry.id === "v-l3-m1");
  assert.ok(registers);
  for (const lesson of registers.lessons) {
    const editorial = voiceEditorialForLesson(lesson.id);
    assert.ok(editorial, `${lesson.id} resolved no reading`);
    assert.ok(editorial.reading.some((c) => /Registers/i.test(c.title)));
  }

  assert.equal(voiceEditorialForLesson("g-l1-m1-01"), undefined);
  assert.equal(voiceEditorialForLesson("v-l1-m1-01"), undefined, "a module citing nothing resolves nothing");
});

test("the panel renders the chapter, its gate and the songs a reader can click", () => {
  const editorial = voiceEditorialForLesson("v-l5-m4-01");
  assert.ok(editorial, "the belt-safety module must cite the safety rail");
  const markup = renderToStaticMarkup(createElement(LessonEditorialPanel, { editorial }));

  const rail = ATLAS.get("the-safety-rail");
  assert.ok(rail);
  assert.match(markup, new RegExp(`href="${contract.deepLinks.origin}${rail.path}"`));
  assert.match(markup, /The safety rail/);
  // Gated, and the page has to say it before the click.
  assert.equal(rail.free, false);
  assert.match(markup, /Suede Sing Pro/);

  const first = voiceEditorialForLesson("v-l2-m4-01");
  assert.ok(first, "the first-song module must hand over a song");
  const songMarkup = renderToStaticMarkup(createElement(LessonEditorialPanel, { editorial: first }));
  for (const song of first.songs) {
    assert.ok(songMarkup.includes(`href="${song.href}"`), `${song.title} is not clickable`);
    assert.ok(songMarkup.includes(song.key), `${song.title} renders without its key`);
  }
  assert.match(songMarkup, /not measurements of a recording/);

  // And nothing at all for a module that cites nothing.
  assert.equal(renderToStaticMarkup(createElement(LessonEditorialPanel, { editorial: undefined })), "");
});
