# GuitarHub sitemap discovery audit — 2026-10-03

Repository: `JasonColapietro/suede-guitar-hub`, audited from main `28659c8`.
Canonical public origin: https://guitarhub.org (confirmed in the route registry,
root metadata, live response and repository launch documentation).
No `.agents/skills` or product-marketing context file is present in this checkout.
The historical `docs/launch/press-kit.md` was read; its 2026-08-29 counts/account
claims predate the current application and were not used as current evidence.

## Live evidence before the change

Public GETs of the following URLs returned these results during this audit.
No authenticated requests were made.

| URL | Status | Canonical | Robots |
| --- | --- | --- | --- |
| https://guitarhub.org/ | 200 | https://guitarhub.org | index, follow |
| https://guitarhub.org/learn/guitar/g-l1-m1-01 | 200 | self | index, follow |
| https://guitarhub.org/advanced/three-note-legato-g-major | 200 | self | index, follow |
| https://guitarhub.org/learn/guitar/g-l7-m1-01 | 200 | self | noindex, follow |
| https://guitarhub.org/account | 200 | homepage (inherited) | noindex, nofollow |
| https://guitarhub.org/ai-instructions | 200 | self | no robots meta |

The existing public sitemap at https://guitarhub.org/sitemap.xml contains 35
URLs, with no lesson or individual drill URLs. The free lesson and drill pages
are already linked from their hubs; this fixes incomplete sitemap discovery,
not a proven inability to crawl them. No claim of search-engine indexing is made.

## Change and expected output

Generate lesson URLs from `accessibleLessonIds("guitar", guestLearningAccess)`
and drills from `DRILLS`, using the existing route helpers. The sitemap now
contains 79 unique canonical URLs: the existing 35 plus 21 ready lessons a guest
can read and 23 free drills. Paid previews, unfinished outlines, account pages,
private recording/material pages and voice lessons redirected to Sing remain
excluded. Auth, page robots metadata and robots.txt are unchanged.

New entries omit `lastModified` because the catalogs have no verified per-page
editorial dates. No current-date or guessed timestamps were added.

## Validation and limits

- Regression test failed first for missing `g-l1-m1-01`, then passed after the fix.
- 24 focused tests passed: SEO routes, learning access, voice curriculum ownership,
  legacy Social redirects and Advanced Lab.
- `git diff --check` passed.
- Local sitemap function output: 79 unique URLs, including all 44 below.
- Live HTML was sampled, not exhaustively fetched for all catalog entries;
  tests verify catalog membership, generated route params and guest visibility.
- Prepared for a draft PR; no production deployment is authorized.
- Build/lint were not run: this isolated checkout has no installed dependencies;
  the suggested reusable installation is Next 15.5.23, whereas this checkout
  requires Next ^16.3.3, and has no ESLint executable. Run the repository's
  verification workflow against the lockfile before merge. That workflow also
  checks account bundling and vendored Sing contracts.
- AGENTS.md requests bundled Next docs, but the reusable installation has no
  `next/dist/docs`; official Next sitemap documentation was consulted instead.

References checked:
[Next sitemap metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
and [Google canonicalization and sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
Sitemap inclusion is a discovery/canonical signal, not an indexing guarantee.

## Newly included URLs

- https://guitarhub.org/learn/guitar/g-l1-m1-01
- https://guitarhub.org/learn/guitar/g-l1-m1-02
- https://guitarhub.org/learn/guitar/g-l1-m1-04
- https://guitarhub.org/learn/guitar/g-l1-m2-01
- https://guitarhub.org/learn/guitar/g-l1-m2-02
- https://guitarhub.org/learn/guitar/g-l1-m2-04
- https://guitarhub.org/learn/guitar/g-l1-m3-01
- https://guitarhub.org/learn/guitar/g-l1-m3-02
- https://guitarhub.org/learn/guitar/g-l1-m3-04
- https://guitarhub.org/learn/guitar/g-l2-m1-01
- https://guitarhub.org/learn/guitar/g-l2-m1-03
- https://guitarhub.org/learn/guitar/g-l2-m1-06
- https://guitarhub.org/learn/guitar/g-l2-m3-01
- https://guitarhub.org/learn/guitar/g-l2-m3-02
- https://guitarhub.org/learn/guitar/g-l2-m3-06
- https://guitarhub.org/learn/guitar/g-l2-m2-01
- https://guitarhub.org/learn/guitar/g-l2-m2-04
- https://guitarhub.org/learn/guitar/g-l2-m2-06
- https://guitarhub.org/learn/guitar/g-l2-m4-01
- https://guitarhub.org/learn/guitar/g-l2-m4-03
- https://guitarhub.org/learn/guitar/g-l2-m4-06
- https://guitarhub.org/advanced/three-note-legato-g-major
- https://guitarhub.org/advanced/a-minor-sweep
- https://guitarhub.org/advanced/octave-string-skipping
- https://guitarhub.org/advanced/bends-in-tune
- https://guitarhub.org/advanced/ii-v-i-arpeggios
- https://guitarhub.org/advanced/guide-tones
- https://guitarhub.org/advanced/aeolian-vs-dorian
- https://guitarhub.org/advanced/funk-sixteenths
- https://guitarhub.org/advanced/quarter-note-triplets
- https://guitarhub.org/advanced/triplet-sixteenth-shift
- https://guitarhub.org/advanced/dotted-eighth-displacement
- https://guitarhub.org/advanced/intervals-from-a
- https://guitarhub.org/advanced/phrase-by-ear
- https://guitarhub.org/advanced/musical-alphabet-low-e
- https://guitarhub.org/advanced/movable-shape-roots
- https://guitarhub.org/advanced/every-c
- https://guitarhub.org/advanced/blues-landing-notes
- https://guitarhub.org/advanced/enclosures
- https://guitarhub.org/advanced/dorian-color
- https://guitarhub.org/advanced/night-drive-etude
- https://guitarhub.org/advanced/alternating-bass-etude
- https://guitarhub.org/advanced/controlled-vibrato
- https://guitarhub.org/advanced/pick-dynamics
