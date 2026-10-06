# GuitarHub account downloads and product audit — 2026-10-05

## Scope and current state

Verified `https://guitarhub.org`, repository `JasonColapietro/suede-guitar-hub`, remote default branch `main`, base `bb898d2206b68549089cec5747d4090b6b1fa406`. No open PRs at intake. Original local checkout was clean at older `4022b97` and was not modified. Work is isolated under task-8/guitarhub on `codex/free-pdf-account`.

The requested outcome is free-account PDF downloads plus a usable learning product. This draft completes the site-side download protection and selected-guide return flow. **It is not ready for production activation:** production `/account` reports accounts unavailable; the existing provider integration intentionally supports existing accounts only (`shouldCreateUser: false`). No credentials, provider configuration, signup policy, paid pricing, purchase grants, or legal terms were changed. No merge/deploy or real purchase took place.

## Implemented design

- All 15 PDFs move from public static assets to server assets. Both new `/account/downloads/:filename` and old `/field-guides/:filename` URLs run the same handler.
- A filename must exactly match the catalog. Disabled accounts, rejected sessions and provider failures cannot reach the file read. Identity comes from the existing fresh Supabase `getUser` verification, which rejects anonymous/invalid users. Paid access is not consulted.
- Successful GET responses are PDF attachments; HEAD authenticates without returning bytes. All responses use private/no-store browser caching, no-store CDN and Vercel CDN caching, identity variation, and noindex. Range/conditional requests do not bypass authentication. No signed URL is generated or disclosed.
- Public guide cards open `/account?next=<exact PDF path>` without a `download` attribute, avoiding accidentally downloading sign-in HTML. The account page retains the selected guide, offers its public reading link, and provides the exact file after verification. A successful email-code login returns to that guide's account page; binary routes are never sent to the React router.
- Signed-in accounts have a library containing every free PDF. Auth-disabled visitors keep their selected guide and can read it online.
- Covers, public articles, lesson previews, canonical metadata, and sitemaps remain public. Only download copy changes. PDF generation now writes server assets, and a CI bundle check ensures both download routes carry every PDF and the public directory carries none.
- Guitar lesson previews now offer an existing free Advanced Lab drill path, so intermediate visitors have an immediately playable alternative to returning to the first beginner lesson.
- Required contract drift verification discovered an upstream correction to Anti-Hero's vocal range (C#3–B4). The canonical vendored contract was refreshed. No entitlement or price changed.

## Priority findings and next implementation slices

| Priority | Finding | Small next slice | Release proof required |
|---|---|---|---|
| P0 | New free users cannot register; existing-account integration is disabled in production. Shipping this gate today would make all website PDFs unavailable. | Approve free email-code signup in a separate reviewed auth slice; retain production enable flag until provider delivery/rate limits and account-management scope are verified. | New and existing synthetic accounts sign in, retry, sign out, and return to exact downloads; expired/anonymous sessions fail; no email-existence disclosure. |
| P0 | PDFs were already public, including GitHub source and deployment snapshots. | Accept that released copies cannot be recalled; for future access-controlled originals, approve private artifact storage outside the public repository. Keep authenticated streaming and no signed URL exposure. | Review old deployment aliases/access and invalidate owned CDN entries during authorized release; anonymous GET/HEAD/Range on both old/new URLs must never return PDF bytes. |
| P1 | Stage 3–7 web lessons are previews; shared purchase access is not activated. No web checkout exists. | Finish existing Apple sandbox ownership/revocation and account integration before advertising paid web access. A separate web billing feature needs product/pricing approval. | Sandbox paid user opens owned lessons; unowned/refunded/wrong-account users do not; failures preserve local work. No real purchase or paid grant. |
| P1 | Saved learning, planner, tempo and practice evidence live in separate browser stores; a member has no unified next-session view. | Propose a member practice home that resumes the existing lesson, selected goal, and last exercise; reuse records rather than inventing a new curriculum. Confirm cross-device sync/import scope before building. | Return visit picks a relevant next action; account switching cannot adopt another person's or guest records silently. |
| P2 | Microphone scoring needs physical-device verification. | Run synthetic-audio fixtures and a consented iPhone/Safari hardware pass after account launch work. | Pitch/timing accuracy, interruption, denied permission, backgrounding, and headset behavior. Browser UI checks alone cannot prove musical scoring. |

The largest value gap is activation and continuity: learners can practice now, but cannot currently become functioning web members or use verified paid access. A cosmetic redesign would not resolve that.

## Browser audit and state matrix

One isolated Playwright profile, no user Chrome session, no real email or microphone access. Desktop 1440px and mobile 390px / narrow 320px checks are recorded in task-local evidence. Browser-local test progress belongs only to the disposable profile.

| Journey/state | Evidence and result | Limit |
|---|---|---|
| Signed out onboarding | `/start` renders beginner/intermediate/advanced paths; stage-3 hash opens the correct accordion. | Intermediate path reaches preview until paid access activates. |
| Guest lesson completion/resume | First lesson marked done; reload shows 1/21 free lessons and Continue → Six Open Strings. | Self-check was exercised; no fabricated microphone score. |
| Guest preview | Stage-3 lesson shows summary/goals and preserves public content; paid lesson session is absent. | New free-drill CTA locally verified after change. |
| Metronome/reference tones | Start changes to Stop; starting E2 reference stops metronome with explanatory status. | UI/audio engine controls checked; listening quality not claimed. |
| Advanced Lab | 23-drill catalog and representative legato drill render; tab playback enters Stop state. Synthetic microphone denial produces recovery text and unscored alternative. | No real recording; successful pitch-scored pass not browser-verified. |
| Saved plan | Created four-week song plan; checked action survives reload. Mobile width fits. | Browser-local persistence only. |
| New free account | Blocked: no signup flow and accounts disabled. | Requires new auth-scope approval and provider activation. |
| Existing free account | Production handler fixtures verify free downloads, exact return path, provider outage, and no paid dependency. | Live provider end-to-end not verified; integration intentionally disabled. |
| Paid account | Existing synthetic access/purchase tests validate owned/unowned track and sandbox/production boundaries. PDF downloads use identity only. | Paid browser journey blocked by inactive integration. |
| Upgrade/checkout/cancel/return | No web checkout exists in repository. | Not a passing flow; proposed separately. |
| Account/library/downloads | Local disabled-account state preserves exact selected guide and public reading alternative; guarded endpoints tested over HTTP. | Signed-in library needs browser verification against an approved auth sandbox. |
| Accessibility/navigation | Labeled controls, keyboard focus and mobile fit inspected on selected routes; planner moves focus to its new heading. | Not a full WCAG audit. |

## Cache and public-copy inventory

Pre-change production PDF example: `/field-guides/guitarhub-field-guide-01-the-method.pdf` returned HTTP 200, `Content-Type: application/pdf`, `Cache-Control: public, max-age=0, must-revalidate`, ETag, byte ranges, and Vercel cache MISS. It is not a long-lived fresh browser-cache entry, but previously saved bytes cannot be revoked.

The new site routes do not emit ETags/Last-Modified/304 or cacheable PDF responses. Existing asset paths are handled by authenticated server routes instead of merely changing buttons. Generated covers remain public and contain no PDF bytes. No service-worker PDF cache was found.

**Public source caveat:** the GitHub repository is PUBLIC. `private/` means outside Next's public web root, not confidential GitHub storage. Current source and old commit raw URLs remain available. This draft does not claim universal file secrecy or erase public Git history. Private hosting for future originals and any decision to retire old public deployment snapshots are separate release decisions; no repository visibility change, history rewrite, or deployment deletion was attempted.

**Authorized release checklist:** do not merge this draft under today's disabled configuration. After account and publication approval, verify new/existing account flows and signed-out file responses on preview, inspect historical production/deployment aliases, invalidate owned CDN PDF entries as needed, deploy, and recheck old/new paths using GET, HEAD, Range, and old ETags. Reject any signed-out 200/206/304 serving PDF content. Confirm public `/method`, `/guides`, lessons, covers, and their metadata remain indexable. Retain the reading fallback during provider outages.

## Verification

- 1,221 Node tests passed, including six new handler/return-path regressions; RED failures captured before implementation.
- TypeScript `tsc --noEmit` and ESLint passed.
- Next 16.3.3 production build passed; 212 static pages generated. Sandbox build stalled; terminated only that build and reran successfully with approved process/network access.
- All five upstream contract drift checks passed after the canonical vocal-range correction.
- Apple trust-anchor bundle check passed. Both PDF routes' file traces include all 15 PDFs, and public static PDFs are absent.
- Local production HTTP checks return 503/no-store for all 30 old/new PDF URLs, including GET/HEAD with Range and an old ETag on representative routes. The private filesystem URL and unknown files return 404; public covers return 200. Verified/signed-out handler behavior is covered with synthetic dependencies.
- Final browser checks passed across 1440px, 390px, and 320px guide/account/preview pages: no overflow, no application errors, exact selected-guide navigation and public-reading fallback. The first audit script asserted immediately after a client navigation and reported a premature failure; waiting for the destination URL verified the successful round trip. No product change was needed.
- No merge, deploy, paid purchase, paid entitlement grant, production account creation, real email, or microphone recording.

Task-local logs: `tests.log`, `pdf-red.log`, `return-red.log`, `pdf-green.log`, `typecheck.log`, `lint.log`, `build.log`, `bundle.log`, `contract-sync.log`, browser snapshots, and `output/playwright/`. These are not committed because they include machine-specific paths.

## Follow-up implementation — 2026-10-06

The table above records the initial audit. Stacked drafts now implement protected free signup/recovery and the separately approved $79 USD one-time Complete Lifetime checkout. Credential-free browser fixtures cover new/existing free accounts, paid access, cancel/return, restore, refunds/disputes, logout, mobile layouts and the actual free PDF responses. See [free signup activation](../account/free-signup-activation.md) and [web checkout activation/evidence](../account/web-checkout-activation.md). These close the missing account and purchase paths in code; production remains inactive pending scoped provider/database approval and actual sandbox acceptance.

The largest remaining retention gap is continuity across the web's browser-local plans/progress and the account/native cloud record. Local plan/resume flows work, but account sync activation and shipped native interoperability remain unverified. Unifying the planning tools and lesson progress into a single cross-device next-practice flow is a separate proposed product change, not silently included in this checkout draft. Public source-history/PDF limitations above still apply.
