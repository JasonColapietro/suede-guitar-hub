# Voice curriculum: decided policy and staged migration

Decision date: 2026-09-14. Jason Colapietro delegated these product decisions and approved implementation.

## Decisions that apply now

- **Classification:** Six automatic labels remain: bass, baritone, tenor, contralto, mezzo and soprano. Bass-baritone and countertenor retain their reference bands and passaggio pages. Adding a label requires evidence that the classifier distinguishes it accurately; overlapping range endpoints alone are not that evidence.
- **Imports:** Sing sessions are history-only. A valid range scan can preserve duration and provenance, but the legacy transport forces `repeat`, null score and no imported XP, streak or achievements. A later lesson-aware integration needs evidence against the actual checkpoint; do not promote these legacy attempts retroactively.
- **Location:** Sing owns the catalog and discovery hub at `https://sing.suedeai.ai/learn`. GuitarHub remains the canonical lesson renderer during this phase. Existing lifetime access, identities, browser-local progress and account attempts do not change.

## Contract ownership

`contracts/suede-voice-curriculum.json` is published by `JasonColapietro/sing` and vendored here unchanged. It wraps the existing public voice catalog, including all seven levels, 34 modules and 102 actual lessons. `lessonsTotal` is historical authored metadata, not permission to invent additional lessons.

Our runtime continues to load `lib/learning/data/voice.json`, which remains pinned to the native learning contract. The new parity test compares the entire local voice catalog to the Sing contract's `curriculum` value. Catalog changes must coordinate Sing, this renderer and the native parity source; changing ownership does not override the native contract.

Publishing order: merge the Sing hub/contract PR first, then verify this dependent PR against Sing main. The fourth vendor check intentionally fails until that file is published. There is no provisional or branch-based CI bypass.

```sh
# Production reference: fetch and compare against published Sing main.
npm run contracts:check

# Explicit local integration check before the publisher merges.
node scripts/sync-sing-curriculum.mjs --check --sing=/absolute/path/to/sing
```

A local comparison is evidence of coordinated branch bytes, not evidence of publication. No source is fetched at request time.

## Before redirects are allowed

The full migration remains blocked until all of these have recorded evidence:

- Sing serves all complete lesson bodies and their assets, not only the catalog hub.
- Identity mapping verifies the same learner without exposing or copying authentication secrets.
- Existing GuitarHub lifetime entitlements continue to grant equivalent access. Sing Pro alone must not substitute for the existing purchase rights.
- Existing progress and attempts survive import/export, rollback and re-import without duplication, loss, or legacy attempts becoming passed checkpoints.
- Every old URL has a tested permanent destination; canonicals, sitemap entries and internal links change together. No paid body becomes public accidentally.
- Advanced belt, weight, range-extension and effects guidance has qualified vocal-pedagogy and clinical-safety review.
- The release candidate has the real-device evidence in [audio-release-checklist.md](audio-release-checklist.md).

Until then, preserve GuitarHub lesson URLs, canonicals, sitemap eligibility and access gates. No redirects or entitlement transfer ship in this phase.
