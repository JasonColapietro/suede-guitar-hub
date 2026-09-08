# GuitarHub shared account and access foundations

These modules are server integration foundations. They do not enable production accounts, purchase sharing, or synchronization by themselves. The reviewed ledger is deployed as migration `20260908044358_guitarhub_account_learning_ledger`; see [deployment evidence](deployment-2026-09-08.md). Provider integration remains disabled. Anonymous sampler access and existing local progress remain independent.

## Verified infrastructure and source

On September 7, 2026, the connected Supabase API reported `drzuelosizfllruocmly` (`Suede-AI's Project`) as `ACTIVE_HEALTHY`, Postgres 17. The initial metadata-only catalog query found no `guitarhub%` tables. On September 8, the scoped ledger migration added three GuitarHub tables and four service-only functions; empty counts, RLS, grants and unchanged security advisors were verified. No user rows or secret values were requested. The current canonical source is [Suede-AI/Suede-AI-App at 916cf7fd](https://github.com/Suede-AI/Suede-AI-App/tree/916cf7fded0e321db5a9d5a8ba5007eb68df4ad5).

The existing Suede browser uses PKCE and the server verifies sessions through `supabase.auth.getUser()`. Its native Apple helper sends a hashed nonce to Apple and the original nonce to Supabase `signInWithIdToken`. The durable identity is verified `auth.users.id`, not email, a wallet JWT, or the possibly different `public.users.id`. Current source changes since the September 4 audit await `cookies()` before passing it to auth helpers and retain host-only cookies outside the configured Suede domain estate. GuitarHub is explicitly recognized as its own cookie root.

The production GuitarHub environment inventory, checked by the parent integration task, contains only `RESEND_API_KEY`. GuitarHub Apple capability/grouping, native audience, Services ID, callback allowlist, deployed account configuration, and App Store Server API credentials still need verification. None is inferred from source configuration comments.

## Identity and request boundaries

- Resolve browser cookies or native Supabase bearer tokens on the server with fresh provider verification. Reject anonymous Supabase identities for account linking. Never accept an account ID from the body as authorization.
- Issue or load the server-owned `guitarhub_account_tokens.app_account_token` UUID for that verified account. Native new purchases pass this UUID through StoreKit `.appAccountToken`.
- Guard cookie-authenticated mutations against cross-site requests, limit request sizes, use private/no-store account responses, and return generic error codes without provider exceptions or signed transaction bodies.
- Queued attempts have an explicit owner. `assertAccountScope` rejects signed-out uploads, silent anonymous adoption, and uploads after account changes. Anonymous imports require a deliberate user action and retain their existing local copy until acknowledged.
- Queues also carry the server's `sync_epoch`. `assertSyncScope` and the append RPC reject a stale epoch after history reset. A client must discard or quarantine the old queue, not retry it with the newly fetched epoch.

An initial integration can use Supabase email OTP with `shouldCreateUser: false` for existing shared Suede accounts while Apple audience configuration is pending. This is a supported provider flow, not a replacement identity service. It still needs verified redirect settings, email delivery and rate-limit behavior, and a complete existing-account sign-out/deletion experience before activation. The UI must not imply that this flow creates new GuitarHub accounts, and must not reveal whether an email belongs to a user. The source-only shell remains disabled until these checks pass. See [Supabase passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Apple verification and ownership

`createAppleLearningVerifier` uses pinned `@apple/app-store-server-library@3.1.0`. Apple G3 is vendored as a public certificate in `lib/learning-account/AppleRootCA-G3.pem`; its SHA-256 fingerprint is pinned in code. A caller cannot add arbitrary trust roots. `SignedDataVerifier` always uses online certificate checks, the exact bundle, the configured Apple app ID, and one explicit Production or Sandbox environment. Xcode and local StoreKit testing are not trusted production environments.

`verifyPurchase(signedTransaction, {accountId, appAccountToken})` verifies the submitted JWS, checks the signed binding, retrieves current transaction information through Apple's server API, verifies that JWS too, and checks that identity/binding remain identical. Certificate revocation and purchase refunds are separate checks. All failures stop fulfillment. There is no decoded-JWT fallback.

The supported cross-device product is exactly `org.guitarhub.app.complete.lifetime`, type `Non-Consumable`, quantity one, bundle `org.guitarhub.app`, purchased ownership, and a signed account token. Legacy subscriptions remain native restore behavior outside this adapter. Unbound or family-shared purchases return `ownership_recovery_required`; they retain whatever valid native StoreKit access exists. No first-claim assignment or reassignment is implemented.

The database permanently binds each `(environment, original_transaction_id)` to its original owner/token. Identical retries succeed; conflicting identities fail atomically. Newer signed events update revocation state; older events cannot resurrect access. `verifyNotification` verifies the notification and contained transaction, then reconciles its latest status. Store notification receipt alone does not trust a client-provided account. Resolve its signed token through the server-owned binding table. Unknown tokens do not create account ownership.

Before returning shared access, the integration must reconcile existing purchases through Apple and fail closed if current ownership cannot be checked. `lifetimeTracks` is only a normalized row helper, not a substitute for that reconciliation. Sandbox rows never grant production access. There is no web checkout, credit ledger, or Stripe fulfillment in this slice.

## SQL and progress

`ledger-proposal.sql` is one transaction with explicit grants, owner-only SELECT policies and RLS on all three tables. Mutating functions are `SECURITY INVOKER` and executable only by `service_role`. Client roles cannot mint access, change ownership, insert arbitrary account progress, or update attempts. The trusted server verifies inputs and chooses the account before using the RPCs:

| RPC | Result |
| --- | --- |
| `guitarhub_get_account_token(p_account_id uuid)` | Stable server-generated binding UUID |
| `guitarhub_record_apple_purchase(p_account_id uuid, p_purchase jsonb)` | Current purchase row after ownership and event-order checks |
| `guitarhub_append_attempts(p_account_id uuid, p_sync_epoch uuid, p_attempts jsonb)` | Acknowledged `{attempt_id, sequence}` rows, maximum 100 per atomic batch |
| `guitarhub_clear_history(p_account_id uuid, p_sync_epoch uuid)` | New sync epoch after deleting GuitarHub attempts; rejects stale/replayed reset and preserves purchase/shared identity |

`parseLearningAttempt(input, allowedLessons)` validates stable UUIDs, lesson/track correspondence, revision, duration, score and tempo bounds, distinct evidence types, and bounded JSON details. Self-reports and legacy imports cannot become measured scores. Unknown duration remains null. Client timestamps and measured results remain client evidence; they are not proof of purchase or server-certified performance. Derive lesson completion separately against the current exercise revision and actual assessment rules. History reads must use an account-filtered server sequence cursor, not client wall clocks.

Attempts are immutable. Identical retries acknowledge the original row. Reusing an ID with changed evidence fails the entire batch, preventing partial acknowledgement and silent overwrites. Keep local data until the server confirms the matching IDs.

## Disabled HTTP integration

The shell now uses existing-account email codes with `shouldCreateUser: false`. It makes no OAuth callback exchange and does not create accounts. `/auth/email/send` and `/auth/email/verify` accept bounded JSON and always require an exact browser Origin; a Bearer header cannot waive this. Send returns the same response for existing/missing accounts and provider errors, so it does not disclose account existence or assert delivery. Verify checks the provider response and then a fresh, non-anonymous `getUser` result. These routes have only been exercised with provider test doubles; no real emails were sent.

`accountConfiguration` requires the explicit enable flag, exact shared project URL, publishable key and server service-role key. This is a minimum configuration guard, not proof that the schema/provider/deletion setup is ready. `GUITARHUB_ACCOUNTS_ENABLED` remains off until all activation gates below are verified. The account page is not advertised from the learning site.

`getVerifiedLearningAccess()` in `lib/learning-auth/access.ts` provides `{enabled, accountId, tracks, status}` to server-rendered lessons. Status is `disabled`, `signedOut`, `verified`, or `unavailable`. It uses request-scoped React memoization and the same current Apple reconciliation as the access API. Any provider outage returns unavailable and no shared grants. It never caches a grant across requests or reads a purchase flag from browser storage.

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/learning/binding` | Verified account; no body required | `{accountId, appAccountToken, syncEpoch}` |
| `GET /api/learning/access` | Verified account | `{accountId, tracks, environment}` after Apple reconciliation |
| `POST /api/learning/purchases/apple` | `{accountId, signedTransaction}` and existing server binding | `{accountId, tracks, environment}`; no mutation before signature acceptance |
| `POST /api/learning/attempts` | `{accountId, syncEpoch, attempts}` | `{accountId, syncEpoch, acknowledged:[{attempt_id, sequence}]}` |
| `GET /api/learning/attempts?after=0&syncEpoch=...` | Expected epoch required when cursor is nonzero | `{accountId, syncEpoch, attempts, cursor, nextCursor}` |
| `DELETE /api/learning/attempts` | `{accountId, syncEpoch, confirmation:"DELETE_GUITARHUB_CLOUD_HISTORY"}` | `{accountId, syncEpoch}` with new epoch |
| `POST /api/learning/notifications/apple` | `{signedPayload}` | `{received:true}` only after verification; unclaimed transactions never assign ownership |

All cursors and sequence acknowledgements are decimal strings, preserving PostgreSQL bigint precision. Reads fetch at most 100 attempts plus one pagination sentinel and check the epoch before and after the query. Error responses contain only `{error:code}` and use private/no-store cache headers. Native bearer requests require fresh Supabase verification; browser writes also require Origin. Invalid/missing sessions are 401, origin errors 403, malformed content 400/413/415, account/epoch/identity conflicts 409 and provider failures 503.

`lib/learning-auth/sync.ts` contains pure web adapters for future lesson records, scoped queues, uploads, acknowledgements and received pages. They do not read storage or perform network I/O. Every queued attempt has an account and sync epoch. Re-read the live current account/epoch **after** an awaited request before accepting its response; a captured request scope is insufficient. Quarantine stale queue data rather than retagging it. Non-UUID historical IDs require explicit persisted import mapping and never enter automatic upload. Routine/tool histories remain in their existing local stores until their own typed migration and sync contract is implemented.

## Deletion boundary

The existing Suede `/api/account/delete` removes shared profile and generated-media records; `/api/social/account/delete` deletes the shared Supabase identity and profile. Neither is a safe GuitarHub-only deletion endpoint. Do not wire these into GuitarHub without a separate, explicit shared-account deletion scope.

Deleting `auth.users` externally cascades GuitarHub attempts and binding rows; purchase rows retain a tombstone with null account ownership so another account cannot claim the same original transaction. `guitarhub_clear_history` is a product-scoped history reset that preserves the shared identity/purchase and changes the sync epoch under the same row lock as appends. A pre-reset batch either finishes before reset and is deleted, or fails its epoch check afterward. Retention and recovery for purchase tombstones must be reflected in the product's final privacy policy. Full account deletion is still a separate integration gate; this history RPC must not be labeled “Delete account.”

## Validation

- The disabled HTTP/auth/sync integration passed 32 account tests, scoped ESLint with no warnings and a full TypeScript check. Handler tests use the production handler functions with isolated provider dependencies; no real emails, accounts or purchases are generated. They cover fresh non-anonymous identity, body/account conflicts, rejected signatures without writes, old refund precedence, epoch-safe reads/reset, exact bigint cursors and scoped queue acknowledgements.
- Eleven Node tests exercise contract validation, account switching/reset, evidence separation, environment access, unsupported/legacy purchases, and actual official-library rejection of unsigned JWS and untrusted roots.
- `bash tests/account-ledger.sh` starts a disposable local PostgreSQL database on a Unix socket, disables TCP, applies the SQL proposal, and exercises real RLS/permissions, atomic batches, duplicate and conflicting purchases/attempts, out-of-order refunds, environment separation, and account deletion. It does not use a production connection.
- The first run passed on PostgreSQL 16.14. The hosted Supabase 17 migration and metadata checks passed. Authenticated hosted API journeys and an Apple-signed positive purchase/notification flow remain required before activation. Test fixtures are synthetic and do not prove a real production purchase.

## Official references

- [Supabase Apple login and nonce/PKCE configuration](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase explicit Data API grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Apple App Store Server Library](https://github.com/apple/app-store-server-library-node)
- [Apple SignedDataVerifier](https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html)
- [Apple getTransactionInfo](https://apple.github.io/app-store-server-library-node/classes/AppStoreServerAPIClient.html#getTransactionInfo)
- [Apple public root certificates](https://www.apple.com/certificateauthority/)
