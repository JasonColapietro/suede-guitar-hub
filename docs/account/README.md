# GuitarHub accounts, purchases and access

GuitarHub accounts are switched on for the sell-first launch. One lifetime purchase, made on guitarhub.org (Stripe) or in the iPhone app (Apple), opens every guitar lesson on the web and in the app for an account signed in with the same email. Accounts are optional: guests keep their free module and practice history in the browser.

The code is complete and tested. It runs in production once the owner steps below are done; until then `accountConfiguration()` and `checkoutConfiguration()` return null, the account page says account services are unavailable, and the buy button falls back to the App Store link.

## Owner steps

These are owner steps. No code change does them, and the site sells on the web only after all of them are done.

1. **Database migration.** Apply `supabase/migrations/20261110000000_guitarhub_sell_first.sql` to the shared Suede Supabase project (`drzuelosizfllruocmly`) before the branch goes live. It extends `20260908044358_guitarhub_account_learning_ledger` (already deployed; see [deployment evidence](deployment-2026-09-08.md)). Without it, Apple buyers' access checks fail. Also deploy `docs/intake/hosted-outbox-proposal.sql` so sales reach the internal log.
2. **Supabase Auth.** In the shared project: allow sign-ups, require email confirmation on every sign-up path (a web purchase unlocks by confirmed email), make the email template send the numeric code, and set rate limits.
3. **Vercel environment.** Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `GUITARHUB_SUPABASE_SERVICE_ROLE_KEY`, the Apple server credentials (`GUITARHUB_APPLE_ENVIRONMENT=Production`, `GUITARHUB_APPLE_ISSUER_ID`, `GUITARHUB_APPLE_KEY_ID`, `GUITARHUB_APPLE_SIGNING_KEY`), `STRIPE_SECRET_KEY` (a live `sk_live_` key in production), `STRIPE_WEBHOOK_SECRET`, the email keys `RESEND_API_KEY` and `GUITARHUB_LEADS_UNSUBSCRIBE_SECRET`, `CRON_SECRET`, and last of all `GUITARHUB_ACCOUNTS_ENABLED=true`.
4. **Resend.** Confirm `plan@guitarhub.org` can send, and turn open and click tracking off for the domain.
5. **Rate limits.** Add a Vercel Firewall per-IP rate limit on `POST /api/leads`, `/api/checkout` and `/checkout/success`.
6. **Stripe webhook.** After the merge to `main` deploys production, create the webhook for `https://guitarhub.org/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`. Creating it before the deploy makes every delivery fail.
7. **Live check.** Make one live purchase, sign in with the receipt email, confirm lessons open, refund it, and confirm they lock.
8. **Price change.** Redeploy on or after 1 December 2026 so pages built ahead of time show the $99 regular price. Checkout and the lesson gate price each request and change on their own.

## Sign-in and account creation

Sign-in is a code sent by email. `/auth/email/send` calls Supabase `signInWithOtp` with `shouldCreateUser: true`, so signing in creates an account when the email has none. Send returns the same response whether or not the email exists and for provider errors, so it never discloses an account. `/auth/email/verify` checks the code and then a fresh, non-anonymous `getUser` result. The sign-in email comes from the Supabase template (owner step 2). `/auth/sign-out` ends the session.

The durable identity is the verified `auth.users.id`, never an email in a request body, a wallet JWT, or `public.users.id`. Lifetime access from Stripe is matched by the account's **verified** email (`account.verifiedEmail`); an unconfirmed email unlocks nothing.

## Identity and request boundaries

- Resolve browser cookies or native Supabase bearer tokens on the server with fresh provider verification. Reject anonymous Supabase identities for account linking. Never accept an account ID from the body as authorization.
- Issue or load the server-owned `guitarhub_account_tokens.app_account_token` UUID for that verified account. Native new purchases pass this UUID through StoreKit `.appAccountToken`.
- Guard cookie-authenticated mutations against cross-site requests (`isSameOriginMutation`), limit request sizes, use private/no-store account responses, and return generic error codes without provider exceptions or signed transaction bodies.
- Queued attempts have an explicit owner. `assertAccountScope` rejects signed-out uploads, silent anonymous adoption, and uploads after account changes.
- Queues also carry the server's `sync_epoch`. `assertSyncScope` and the append RPC reject a stale epoch after history reset.

## The purchase ledger: two sources

`getVerifiedLearningAccess()` in `lib/learning-auth/access.ts` answers `{enabled, accountId, tracks, status}` for server-rendered lessons. It combines both sources on every request and never caches a grant or reads a purchase flag from browser storage. Any provider outage returns `unavailable` and no grants.

### Stripe (web)

`POST /api/checkout` creates a Stripe Checkout session for lifetime access, priced by `lifetimeOfferAt(now)` in `lib/site.ts` ($79 through 30 November 2026, $99 from 1 December 2026), with Stripe Tax on. Checkout runs only when `checkoutConfiguration()` finds accounts on, a Stripe secret key and a webhook secret; production accepts live keys only.

`POST /api/stripe/webhook` verifies the Stripe signature, records each event once in `guitarhub_stripe_events`, and:

- on `checkout.session.completed` or `checkout.session.async_payment_succeeded` for a paid GuitarHub sale, records the purchase through `guitarhub_record_stripe_purchase` in `guitarhub_stripe_purchases` (checkout session id, payment intent id, email, livemode, amount, currency, purchase date);
- on a full `charge.refunded` of a GuitarHub charge, sets `refunded_at` through `guitarhub_refund_stripe_purchase`. A refund ends access on the web and on iPhone. Refunds of other charges are ignored.

The success page (`/checkout/success`) can record the purchase first if it loads before the webhook arrives; the webhook then acknowledges it as a duplicate. The buyer signs in with the receipt email and the purchase opens every lesson. Web purchases carry the 90-day guarantee; refunds are issued in Stripe by the owner.

### Apple (iPhone)

`createAppleLearningVerifier` uses pinned `@apple/app-store-server-library@3.1.0`. Apple G3 is vendored as a public certificate in `lib/learning-account/AppleRootCA-G3.pem`; its SHA-256 fingerprint is pinned in code. `SignedDataVerifier` always uses online certificate checks, the exact bundle, the configured Apple app ID, and one explicit Production or Sandbox environment.

`verifyPurchase(signedTransaction, {accountId, appAccountToken})` verifies the submitted JWS, checks the signed binding, retrieves current transaction information through Apple's server API, verifies that JWS too, and checks that identity and binding remain identical. All failures stop fulfillment. There is no decoded-JWT fallback.

The supported cross-device product is exactly `org.guitarhub.app.complete.lifetime`, type `Non-Consumable`. Legacy subscriptions remain native restore behavior outside this adapter.

Two ways an Apple purchase reaches an account:

- **Bound purchase** (`POST /api/learning/purchases/apple`): a purchase made while signed in carries the account's `appAccountToken`.
- **Claim** (`POST /api/learning/purchases/apple/claim`): an existing Apple buyer signs in on iPhone and the app sends its signed purchase. The server verifies it and links it to the account through `guitarhub_claim_apple_purchase`, storing the verified email as `owner_email` and marking the row `claimed`. One Apple purchase links to one account. A refunded purchase answers 400 `purchase_revoked`.

The database permanently binds each `(environment, original_transaction_id)` to its owner. Newer signed events update revocation state; older events cannot resurrect access. `POST /api/learning/notifications/apple` verifies App Store notifications and reconciles refunds for bound and claimed purchases. Sandbox rows never grant production access.

## The free module

Each player gets one free guitar module, chosen by the placement at `/start`: `g-l2-m1` (D and A), `g-l4-m1` (Box One) or `g-l5-m4` (First Solo), from the shared `freeModules` contract key. Guests keep the choice in browser storage. A signed-in account holds one free module for good: `PUT /api/learning/free-module` with `{moduleId}` calls `guitarhub_set_free_module`, which keeps the first choice and returns the module the account holds. The access answer carries `freeModuleId`.

## Plan and guide emails

`POST /api/leads` (same-origin only, honeypot, strict email check) stores an email from the 30-day plan or a PDF guide form in `guitarhub_leads` with its source, placement or guide id. A daily Vercel cron calls `GET /api/leads/dispatch` (authorized by `CRON_SECRET`) and sends the five-email sequence over ten days from `plan@guitarhub.org` through Resend. Every email carries a signed unsubscribe link (`/api/leads/unsubscribe`, keyed by `GUITARHUB_LEADS_UNSUBSCRIBE_SECRET`) and a one-click `List-Unsubscribe` header; unsubscribing sets `unsubscribed_at`. Addresses the provider rejects are retired.

## Tables and functions

Migration `20260908044358_guitarhub_account_learning_ledger` (deployed):

| Object | Purpose |
| --- | --- |
| `guitarhub_account_tokens` | Server-owned `app_account_token` and `sync_epoch` per account |
| `guitarhub_apple_purchases` | Verified Apple purchases and revocation state |
| `guitarhub_attempts` | Immutable synced lesson attempts |
| `guitarhub_get_account_token`, `guitarhub_record_apple_purchase`, `guitarhub_append_attempts`, `guitarhub_clear_history` | Service-only RPCs |

Migration `20261110000000_guitarhub_sell_first` (owner step 1):

| Object | Purpose |
| --- | --- |
| `guitarhub_stripe_purchases` | Web purchases keyed by checkout session id, matched by email |
| `guitarhub_stripe_events` | Processed Stripe event ids, so each event applies once |
| `guitarhub_free_modules` | One free module per account |
| `guitarhub_leads` | Plan and guide emails, sequence position and unsubscribe date |
| `guitarhub_apple_purchases.claimed`, `.owner_email` | Claimed Apple purchases and the email that can re-claim them |
| `guitarhub_record_stripe_purchase`, `guitarhub_refund_stripe_purchase` | Webhook writes |
| `guitarhub_set_free_module`, `guitarhub_claim_apple_purchase` | Account writes |
| `guitarhub_delete_account`, `guitarhub_identity_in_use` | Account deletion |

Every table has RLS on. Mutating functions are `SECURITY INVOKER` and executable only by `service_role`; client roles cannot mint access, change ownership or write progress.

## Endpoints

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/checkout` | Same-origin; optional `{email}` | `{url}` of the Stripe Checkout session |
| `POST /api/stripe/webhook` | Stripe-signed event | `{received:true}` |
| `POST /api/learning/binding` | Verified account; no body required | `{accountId, appAccountToken, syncEpoch}` |
| `GET /api/learning/access` | Verified account | `{accountId, tracks, environment, freeModuleId, purchaseSource}` after Apple and Stripe reconciliation |
| `PUT /api/learning/free-module` | `{moduleId}` | `{freeModuleId}`, the module the account holds |
| `POST /api/learning/purchases/apple` | `{accountId, signedTransaction}` and existing server binding | `{accountId, tracks, environment}` |
| `POST /api/learning/purchases/apple/claim` | `{signedTransaction}` | `{accountId, tracks, environment}`; 400 `purchase_revoked` for a refunded purchase |
| `POST /api/learning/notifications/apple` | `{signedPayload}` | `{received:true}` only after verification |
| `POST /api/learning/attempts` | `{accountId, syncEpoch, attempts}` | `{accountId, syncEpoch, acknowledged:[{attempt_id, sequence}]}` |
| `GET /api/learning/attempts?after=0&syncEpoch=...` | Expected epoch required when cursor is nonzero | `{accountId, syncEpoch, attempts, cursor, nextCursor}` |
| `DELETE /api/learning/attempts` | `{accountId, syncEpoch, confirmation:"DELETE_GUITARHUB_CLOUD_HISTORY"}` | `{accountId, syncEpoch}` with new epoch |
| `DELETE /api/learning/account` | Session only; no body is read | 204 after the account data is deleted; the account page then posts `/auth/sign-out` |
| `POST /api/leads` | `{email, source, placement?, guideId?}` | Stored; the first email goes out on the next run |
| `GET /api/leads/dispatch` | `Authorization: Bearer $CRON_SECRET` | Sends the emails due today |
| `GET`/`POST /api/leads/unsubscribe?token=...` | Signed token | Unsubscribed |

Cursors and sequence acknowledgements are decimal strings, preserving PostgreSQL bigint precision. Error responses contain only `{error:code}` and use private/no-store cache headers. Invalid or missing sessions are 401, origin errors 403, malformed content 400/413/415, account, epoch or identity conflicts 409, and provider failures 503.

## Deletion boundary

`DELETE /api/learning/account` acts only on the session's account. `guitarhub_delete_account` removes the account's synced attempts, its free-module choice and its lead row (matched by verified email); the account page then signs the session out (`/auth/sign-out`) and reloads. Purchases are kept and stay tied to the email:

- Stripe purchase rows are untouched; signing in again with the same email opens them.
- Apple purchase rows keep `owner_email`, so a later sign-in with that email can claim them again; the binding token stays while any Apple purchase references it, with a fresh `sync_epoch` so a device holding the old epoch cannot write.

The shared Suede sign-in is kept for the other Suede products: `guitarhub_identity_in_use` reports the identity as in use until the other products' schema is checked, so GuitarHub deletion never deletes the shared `auth.users` row. The existing Suede `/api/account/delete` and `/api/social/account/delete` endpoints are not GuitarHub deletion endpoints and are not wired in.

`guitarhub_clear_history` is a separate, product-scoped history reset that keeps the account and purchases and changes the sync epoch under the same row lock as appends.

## SQL and progress

`parseLearningAttempt(input, allowedLessons)` validates stable UUIDs, lesson and track correspondence, revision, duration, score and tempo bounds, distinct evidence types, and bounded JSON details. Self-reports and legacy imports cannot become measured scores. Client timestamps and measured results remain client evidence, not proof of purchase. Attempts are immutable: identical retries acknowledge the original row, and reusing an ID with changed evidence fails the whole batch. Keep local data until the server confirms the matching IDs.

## Validation

The account, checkout, webhook, claim, deletion and lead handlers are covered by `npm test` with isolated provider doubles (no real emails, accounts or purchases): `tests/account-*.test.ts`, `tests/checkout.test.ts`, `tests/stripe-webhook.test.ts`, `tests/free-module*.test.ts`, `tests/leads.test.ts` and `tests/account-ledger.sql`. The live purchase and refund in owner step 7 is the production check.
