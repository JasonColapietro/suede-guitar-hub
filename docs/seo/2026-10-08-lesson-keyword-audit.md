# GuitarHub lesson and practice intent audit — 2026-10-08

## Verified scope

Canonical property: https://guitarhub.org. Source: `lib/site.ts`, current remote `main` at `93d3595`, and public homepage / guitar curriculum fetched on October 8. Open PRs at audit time: #58 PDF account verification, #59 signup, #60 lifetime checkout, #61 scoped billing database. This change does not alter those flows.

The current source requires verified lifetime access for every guitar lesson, including former samplers. Voice lessons redirect to Suede Sing. Free practice tools, the A/D routine, and public Advanced Lab drills are separate surfaces. The old guest-lesson sitemap count is no longer an appropriate baseline.

## Prioritized query ownership

Public search observations below are **intent and competition proxies**, not search volume, ranking estimates, or proof of demand size. No GuitarHub query-level Search Console data was available to this audit. The A/D recommendation follows exact product fit, not an invented traffic forecast.

| Priority | Query theme / intent | Owning URL | Evidence and useful implementation |
| --- | --- | --- | --- |
| 1 | Guitar lessons and practice tools; product discovery | `/` | Existing homepage supports ordered lessons, public drills, and tools. Name those in the title, H1, and opening copy; identify GuitarHub by Suede AI; retain lifetime/free boundary. Link directly to the chord routine. |
| 1 | Beginner guitar lessons; browse a sequential curriculum | `/learn/guitar` | Current curriculum covers first notes, open chords, strumming, and songs. [JustinGuitar's beginner curriculum discussions](https://community.justinguitar.com/c/beginner-guitar-course-grade-three/37) show distinct stage and lesson topics in public search. Clarify the H1 and description, keep paid lesson previews excluded, and point learners to the free routine and session builder. |
| 1 | A-to-D chord changes / beginner chord practice routine; run a practice session | `/learn/guitar/routine` | Existing seven-block, 21-minute default routine directly fulfills this task. [JustinGuitar's Module 2 practice discussion](https://community.justinguitar.com/t/module-2-practice/2091) includes concrete questions about chord-change practice and limited practice time. Give the existing URL a descriptive title, H1, social metadata, and sitemap entry. Do not position it as a complete chord lesson. |
| 2 | Guitar curriculum and voice learning paths; choose a destination | `/learn` | Make the hub's routing role clear and identify Suede Sing as the voice destination. Avoid duplicating the track page's beginner lesson intent. |
| 2 | Guitar practice routine generator; allocate available minutes | `/session` | Existing tool already solves this broader planning task. [OpenFret's practice routine guide](https://openfret.com/learn/guitar-practice-routine-for-beginners) and [Riff Quest's routine guide](https://riff.quest/blog/guitar-practice-routine-builder) surfaced for the sampled routine query. Preserve this distinct tool instead of creating another generic routine landing page. Link to it from the lesson track. |
| Retain | Intermediate guitar practice routine; weekly training guidance | `/guitar-practice-routine-intermediate` | Existing guide is a different audience and format. Preserve its URL and existing query-ownership register. |

## Changes and claim boundaries

- Removed stale “learn guitar online free” / “learn guitar free” metadata from the paid guitar discovery pages. Existing meta-keyword machinery is preserved for compatibility, but this is not represented as a Google ranking lever.
- Added the already public routine to the route registry, which feeds the sitemap. It is a static public tool under a lesson-looking path, not a gated lesson. Updated only modification dates for edited public pages.
- Kept all lesson IDs, drills, timers, microphone behavior, account storage, purchase checks, redirects, canonicals, and index exclusions intact.
- Updated the shared WebSite description to describe the actual guitar offering and Suede AI. No review/rating, Course, Offer, or FAQ rich-result claims were added.
- Routine page social metadata now describes its own task and includes the existing share-card asset.

## Measurement and limitations

After review and deployment, compare impressions, clicks, CTR, and landing-page queries for the four changed public routes over comparable windows. Treat indexing and audience acquisition as separate questions. Routine starts and curriculum visits should be measured only through existing consent-respecting instrumentation; this change adds no tracking.

No search volumes, difficulty scores, ranking improvements, conversion gains, or indexing guarantees are asserted. Public search output can be incomplete and is not a localized Google ranking report. No deployment, sitemap submission, credential change, or outreach is included.

## Verification

- `npm test`: 1,225 passed, zero failures. Existing access, routine/account isolation, redirects, catalog, and SEO tests included.
- Scoped ESLint across the nine changed implementation files: passed.
- `tsc --noEmit --incremental false`: passed with the existing compatible Next 16.3.3 dependency installation reused read-only.
- SEO route tests after adding the explicit routine assertion: 9 passed. The date assertion distinguishes authored registry pages from undated catalog entries rather than assuming every `/learn/guitar/*` URL is a lesson.
- Generated sitemap: 59 URLs (previous 58 plus the existing public routine); zero paid guitar lesson URLs; 23 public drills. Canonical origin remains `https://guitarhub.org`.
- `git diff --check`: passed.
- Structural server-render smoke: `/learn`, `/learn/guitar`, and `/learn/guitar/routine` each render one H1; both discovery pages include the routine link. Routine canonical, Open Graph title, Twitter title, and image URL agree. This check does not run browser effects or establish visual/interaction quality.
- Production build and browser smoke were not run: available disk dropped to approximately 1.4 GiB during shared work. No build artifacts were generated for this change.

## Search guidance

[Google title-link guidance](https://developers.google.com/search/docs/appearance/title-link) supports descriptive, concise, page-specific titles and consistent prominent headings. A 50–60 character target is only an editorial heuristic, not a guaranteed display width or ranking rule.

[Google's helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) informs the focus on existing useful curriculum and exercises. [Structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) inform the decision to describe visible offerings accurately without adding unearned reviews, outcomes, or rich-result claims. [AI-feature guidance](https://developers.google.com/search/docs/appearance/ai-features) does not require new AI-specific markup; this change concentrates on ordinary crawlable content and links.
