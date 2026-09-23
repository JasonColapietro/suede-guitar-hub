# Voice curriculum: decided policy and migration

## 2026-09-23: Sing hosts the lessons

Jason Colapietro decided that Suede Sing hosts the voice lessons as well as the
catalog, with every stage free there. This site no longer serves them:

- `/learn/voice`, `/learn/voice/materials` and every `/learn/voice/<lesson-id>`
  redirect permanently (308) to their twins on `https://sing.suedeai.ai/learn/voice`.
  The table is `lib/voice-redirects.ts`, built from
  `contracts/suede-voice-lesson-urls.json`, which Sing generates from the pages
  it serves and this repository vendors
  (`node scripts/sync-sing-lesson-urls.mjs --check`).
- The voice track is gone from `/learn`, the route registry, the sitemap and the
  home and about pages; the guitar path is unchanged.
- `lib/learning/data/voice.json`, `voice-instruction.json` and the voice learning
  material stay in the repository. The native learning contract
  (`contracts/learning.json`, generated from GuitarHubCore) and its parity tests
  still read them, and the iOS app is not part of this change.
- Lesson attempts already in this site's ledger stay here. Sing does not import
  them; it shows practice counts derived from its own room sessions.

What happened to each piece of evidence the 2026-09-14 plan required is recorded
in the vendored contract's `migration.resolution`. Two items remain open: a
qualified vocal-pedagogy and clinical-safety review of the advanced lessons, and
the real-device audio checks in [audio-release-checklist.md](audio-release-checklist.md).

## 2026-09-14: decisions that still apply

- **Classification:** Six automatic labels remain: bass, baritone, tenor, contralto, mezzo and soprano. Bass-baritone and countertenor retain their reference bands and passaggio pages. Adding a label requires evidence that the classifier distinguishes it accurately; overlapping range endpoints alone are not that evidence.
- **Imports:** Sing sessions are history-only. A valid range scan can preserve duration and provenance, but the legacy transport forces `repeat`, null score and no imported XP, streak or achievements.

## Contract ownership

`contracts/suede-voice-curriculum.json` and `contracts/suede-voice-lesson-urls.json`
are published by `JasonColapietro/sing` and vendored here unchanged. Sing's
catalog keeps the same stage, module and lesson IDs as `voice.json`; its titles
and access differ on purpose (unmeasured checkpoints became self-checks, and
every stage is free), so the parity test compares identities, not text.

```sh
npm run contracts:check
node scripts/sync-sing-curriculum.mjs --check --sing=/absolute/path/to/sing
node scripts/sync-sing-lesson-urls.mjs --check --sing=/absolute/path/to/sing
```
