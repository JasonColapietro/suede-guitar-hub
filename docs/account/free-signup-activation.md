# Free signup and PDF activation — 2026-10-05

This draft is default off. No production settings, credentials, users, grants, purchases, or shared policies were changed. It stacks on PDF-gate PR #58. It does not activate paid web checkout.

## Verified baseline

- Repository/domain: `JasonColapietro/suede-guitar-hub`, `guitarhub.org`; base main `bb898d2206b68549089cec5747d4090b6b1fa406`, PDF head `b13d855adc03a5d31fa20072f092769b7e85b631`.
- Vercel project `suede-guitar-hub`, team `suede-ai-64d39175`, id `prj_Jb3ofBnzYKiwmLLYNACTsbaAOW8N`. Read-only environment metadata lists only `RESEND_API_KEY` in production. Values were not requested. Preview builds are skipped by the existing Ignored Build Step, so a green Vercel check is not a tested preview.
- Shared Supabase project `drzuelosizfllruocmly`, display name `Suede-AI's Project`, ACTIVE_HEALTHY, Postgres 17.6.1.121. Existing GuitarHub account/purchase/attempt tables have RLS. No user rows were queried.
- Auth metadata includes `on_auth_user_created` → `public.assign_user_handle` and `on_auth_user_created_sync_public_users` → `public.sync_auth_user_to_public_users`. Creating a GuitarHub account therefore participates in the existing shared identity/profile lifecycle. This is not a GuitarHub-only identity database. No trigger was changed.
- The actual SMTP sender, email template, OTP expiry, provider signup setting, rate settings, and captcha configuration were **not verified**: the available connector does not expose auth-settings reads. Do not change global settings to make this draft work without shared-service impact review.
- Upstash installation `icfg_TL1NjETpOgrXixWKogmDD30p` is present on the Vercel team, slug `upstash`, marketplace install, projects `[]`, selection `selected`. Its integration scopes include marketplace/resource read-write. The read-only resource/product lookup returned 401. The underlying database display name and REST credential scope are **not verified**. Integration scope is not Redis ACL evidence. Existing Suede repository docs show Upstash shared by auth, social and artist coordination.

## Exact configuration names and access

| Variable | Required for free auth/PDFs | Intended value/scope |
| --- | --- | --- |
| `GUITARHUB_ACCOUNTS_ENABLED` | yes | `true`, only after preview acceptance |
| `GUITARHUB_FREE_SIGNUP_ENABLED` | yes for new users | `true`; otherwise existing-account sign-in only |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `https://drzuelosizfllruocmly.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Existing project publishable key; public client authority only |
| `GUITARHUB_AUTH_REDIS_REST_URL` | yes | Approved existing/dedicated Redis HTTPS resource, to be identified |
| `GUITARHUB_AUTH_REDIS_REST_TOKEN` | yes | Prefer an ACL token restricted to `guitarhub:auth:*` and the commands used by the rate limiter; do not copy a broad shared token without specific approval |
| `GUITARHUB_AUTH_RATE_LIMIT_SALT` | yes | Dedicated random server-only HMAC secret, at least 32 characters |
| `VERCEL` | platform | Vercel-provided `1`; no non-Vercel fallback in the production guard |
| `GUITARHUB_SUPABASE_SERVICE_ROLE_KEY` | **no** | Existing cloud sync/Apple ledger backend only; omitted for free signup/PDF activation |
| `GUITARHUB_APPLE_ENVIRONMENT`, `GUITARHUB_APPLE_ISSUER_ID`, `GUITARHUB_APPLE_KEY_ID`, `GUITARHUB_APPLE_SIGNING_KEY` | **no** | Existing Apple purchase verification only; separate activation |

The publishable-only requirement is verified by configuration tests, provider API architecture, and credential-free browser fixtures. Actual hosted OTP delivery still needs a designated test user and approved preview configuration. The public key does not bypass RLS. Existing backend mutations independently require the service-role key. Free activation does not grant paid tracks.

BotID is explicitly `basic`; no Deep Analysis or paid provider tier is enabled. Server checks reject bots, non-human results, bypasses and unavailable configuration. Redis outages and timeout-as-success responses fail closed. Send limits: 5 per IP per hour and 1 per normalized email per minute. Verify limits: 10 per IP and email per 10 minutes. Keys contain HMAC digests, never raw email/IP. No analytics or persistent in-process fallback.

Copying an existing broad Redis token would add GuitarHub deployment access to unrelated Redis data even though this code uses a prefix. A prefix is not an ACL. Confirm the database display name, token capabilities, quota/billing impact, and support for a narrower credential before approval. No token was copied or provisioned here.

## Proposed scoped activation request (after remaining inventory and preview review)

Allow the **GuitarHub Vercel project only** to use the existing shared Supabase public URL/publishable key for verified email-code accounts, and an explicitly identified Redis resource with a GuitarHub-only rate-limit credential plus a dedicated HMAC salt. Enable BotID Basic only. Add values through the secure deployment secret flow, initially preview-only, then enable the two flags only after the acceptance checks. No shared service-role key, Apple/Stripe secret, global Supabase auth change, shared Redis broad token, or paid product activation is part of this free-account request.

This request is not ready for approval until the Redis resource/ACL and existing email settings are verified. If existing email settings lack code delivery or signup permission, return the exact proposed global change and affected Suede apps for a separate decision. Do not silently modify shared settings.

## Acceptance before production

1. Independently review exact PR heads; run an actual protected preview despite the repository's current ignore rule.
2. Confirm existing Supabase email template supplies `{{ .Token }}`, OTP lifespan and resend settings, signup permission, sender/domain delivery and any existing captcha requirement. Keep existing shared settings unchanged unless explicitly approved.
3. Verify a designated new and existing test user can receive/verify a code; errors and rate limits remain generic and recoverable. No marketing subscription or paid entitlement is created.
4. Check BotID Basic from a normal browser and reject scripted requests. Verify Redis limits across instances and fail-closed behavior. Do not add a WAF bypass to pass the test.
5. Verify selected PDF and lesson return, all 15 downloads, GET/HEAD/range/old-ETag denial after logout, and narrow/mobile navigation. A downloaded local copy cannot be revoked.
6. Apply the PDF cache and historical-source limitations in `docs/audits/2026-10-05-member-downloads.md`. The public GitHub repository and its history remain public; no history deletion is authorized.
7. Recheck that public pages retain canonical/index metadata and no secrets enter bundles. Confirm email delivery, signup records and provider costs only with approved test identities and quotas.

## Reproducible synthetic evidence

`node scripts/prepare-account-fixture.mjs ../guitarhub-account-fixture-N` copies the tree without `.env*`, `.git`, `.next` or provider credentials and replaces only external provider adapters in the disposable tree. macOS `cp -cR` clones dependencies. It refuses an existing, nested, source, or Vercel destination. Never deploy the resulting `FIXTURE_ONLY_DO_NOT_DEPLOY` tree. Build it and serve on `http://localhost:3420` (Next normalizes its local request origin to localhost).

Synthetic emails: `new@example.test`, `free@example.test`, `paid@example.test`; code `123456`. `delivery@example.test` and `rate@example.test` simulate provider failures. Production auth handlers, account UI, library, download routes, PDF bytes and sign-out are unchanged. Production guard behavior is independently unit tested; fixture success does not prove real Supabase/BotID/Redis/Apple access.

Evidence from this task: 1,227 tests; TypeScript, ESLint, production build (212 static pages), account/PDF bundle checks and five contract checks pass. New free account downloaded all 30 current/legacy URLs as PDF; after logout GET/HEAD with Range/old ETag returned 303/no bytes/no-store. Synthetic existing-free account sees paid lesson preview; paid fixture opens it; logout restores preview. Email/rate/invalid-code recovery retained the selected guide and fit 320px; free library fits 390px. Authenticated paid fixtures are not real grants or purchase validation.

## Framework patch

Separate commit `84de0df` changes `next` and `eslint-config-next` from 16.3.3 to exact 16.3.6, with corresponding `@next/env`, all eight locked `@next/swc-*` platform packages, and `@next/eslint-plugin-next` lockfile entries. This is the smallest patched release for [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), the Node ImageResponse advisory. Current OG code uses hardcoded content, not attacker input; no exploit is claimed. Six existing high dev-tool advisories remain in the glob/ESLint chain; the suggested major downgrade was not applied.

Sources: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [BotID Basic and pricing](https://vercel.com/docs/botid), [Vercel request IP headers](https://vercel.com/docs/headers/request-headers), [Upstash timeout behavior](https://upstash.com/docs/redis/sdks/ratelimit-ts/features).
