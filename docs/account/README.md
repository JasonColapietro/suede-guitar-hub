# GuitarHub shared account and access foundations

These modules are server integration foundations. They do not enable production accounts, purchase sharing, or synchronization by themselves. The SQL is a reviewed proposal and has not been applied to Supabase. Anonymous sampler access and existing local progress remain independent.

## Verified infrastructure and source

On September 7, 2026, the connected Supabase API reported `drzuelosizfllruocmly` (`Suede-AI's Project`) as `ACTIVE_HEALTHY`, Postgres 17. A metadata-only catalog query found no `guitarhub%` tables. No user rows or secret values were requested. The current canonical source is [Suede-AI/Suede-AI-App at 916cf7fd](https://github.com/Suede-AI/Suede-AI-App/tree/916cf7fded0e321db5a9d5a8ba5007eb68df4ad5).

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
| `guitarhub_clear_history(p_account_id uuid)` | New sync epoch after deleting GuitarHub attempts; preserves purchase and shared identity |

`parseLearningAttempt(input, allowedLessons)` validates stable UUIDs, lesson/track correspondence, revision, duration, score and tempo bounds, distinct evidence types, and bounded JSON details. Self-reports and legacy imports cannot become measured scores. Unknown duration remains null. Client timestamps and measured results remain client evidence; they are not proof of purchase or server-certified performance. Derive lesson completion separately against the current exercise revision and actual assessment rules. History reads must use an account-filtered server sequence cursor, not client wall clocks.

Attempts are immutable. Identical retries acknowledge the original row. Reusing an ID with changed evidence fails the entire batch, preventing partial acknowledgement and silent overwrites. Keep local data until the server confirms the matching IDs.

## Deletion boundary

The existing Suede `/api/account/delete` removes shared profile and generated-media records; `/api/social/account/delete` deletes the shared Supabase identity and profile. Neither is a safe GuitarHub-only deletion endpoint. Do not wire these into GuitarHub without a separate, explicit shared-account deletion scope.

Deleting `auth.users` externally cascades GuitarHub attempts and binding rows; purchase rows retain a tombstone with null account ownership so another account cannot claim the same original transaction. `guitarhub_clear_history` is a product-scoped history reset that preserves the shared identity/purchase and changes the sync epoch under the same row lock as appends. A pre-reset batch either finishes before reset and is deleted, or fails its epoch check afterward. Retention and recovery for purchase tombstones must be reflected in the product's final privacy policy. Full account deletion is still a separate integration gate; this history RPC must not be labeled “Delete account.”

## Validation

- Eleven Node tests exercise contract validation, account switching/reset, evidence separation, environment access, unsupported/legacy purchases, and actual official-library rejection of unsigned JWS and untrusted roots.
- `bash tests/account-ledger.sh` starts a disposable local PostgreSQL database on a Unix socket, disables TCP, applies the SQL proposal, and exercises real RLS/permissions, atomic batches, duplicate and conflicting purchases/attempts, out-of-order refunds, environment separation, and account deletion. It does not use a production connection.
- The first run passed on PostgreSQL 16.14. Hosted Supabase 17 migration/API tests and an Apple-signed positive purchase/notification flow remain required before activation. Test fixtures are synthetic and do not prove a real production purchase.

## Official references

- [Supabase Apple login and nonce/PKCE configuration](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase explicit Data API grant change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Apple App Store Server Library](https://github.com/apple/app-store-server-library-node)
- [Apple SignedDataVerifier](https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html)
- [Apple getTransactionInfo](https://apple.github.io/app-store-server-library-node/classes/AppStoreServerAPIClient.html#getTransactionInfo)
- [Apple public root certificates](https://www.apple.com/certificateauthority/)
