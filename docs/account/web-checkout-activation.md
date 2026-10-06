# Complete Lifetime web checkout — proposed activation

The approved offer is **$79 USD once**, GuitarHub Complete Lifetime, merchant **JC INVESTMENT GROUP LLC**, Stripe account `acct_1SHG7dRdcsaZ58FL`. The user authorized live setup/publication on 2026-10-06. The live catalog offer and its nonsecret Vercel configuration now exist; billing flags remain off. No SQL, credentials, checkout session, charge or entitlement was created. A sandbox is not a launch requirement under the latest instruction.

## Behavior and scope

The server owns the amount, price and product. Signed-in free members use Stripe-hosted Checkout; cancellation returns to their account upgrade page, retries reuse the reserved session, and the return page verifies current provider evidence before showing paid access. An already verified Apple or web lifetime owner cannot start another checkout. Payment-processing, failures, foreign sessions and provider outages cannot grant access. Existing paid access continues when new sales are paused.

A durable order reservation and Stripe idempotency key avoid duplicate sessions. Webhooks verify Stripe's raw-body signature, retrieve current session/payment/charge/dispute evidence, and reconcile the same order as the return page. Repeat deliveries do not add entitlements. Refund/dispute denial evidence overrides out-of-order requests; full refunds are terminal; disputed access restores only on a strictly newer verified winning outcome read from the current ledger revision; paid requests already in flight before a denial cannot restore access. Partial refunds retain access, matching the implemented full-refund revocation boundary; confirm that operational policy before activation. No refund operation is exposed by this app.

Web and Apple ownership feed the existing account access contract. Stripe outages preserve independently verified Apple ownership. Restoring a revoked Apple receipt does not hide a separately verified web purchase. Local native-source inspection confirms the client consumes account `verifiedTracks`; the shipped app's server configuration and a real cross-platform restore remain unverified. Do not promise Suede Sing Pro: web voice links lead to the separately billed Sing product. The upgrade page describes all 135 ready guitar lessons across seven stages. Current main requires purchase access for every web lesson; free accounts include the PDF library, and standalone practice tools remain public. Shared native catalog labels, other subscriptions and products are unchanged.

## Exact configuration

All flags default off. Free signup/PDF prerequisites and unresolved shared-service inventory are in [free-signup-activation.md](free-signup-activation.md).

| Name | Purpose |
| --- | --- |
| `GUITARHUB_WEB_BILLING_ENABLED` | Enables verification/restore/webhook/account purchase history. Keep enabled for existing owners when pausing sales. |
| `GUITARHUB_WEB_CHECKOUT_ENABLED` | Independently enables new checkout. |
| `GUITARHUB_STRIPE_MODE` | `test` for every nonproduction deployment; `live` for production only. |
| `GUITARHUB_STRIPE_ACCOUNT_ID` | Approved merchant account; production hard-pins `acct_1SHG7dRdcsaZ58FL`. |
| `GUITARHUB_STRIPE_LIFETIME_PRODUCT_ID` | Exact GuitarHub Complete Lifetime product. |
| `GUITARHUB_STRIPE_LIFETIME_PRICE_ID` | Active, one-time 7900 USD price for that product; checked before checkout. |
| `GUITARHUB_STRIPE_SECRET_KEY` | Server-only mode-matched key. Prefer restricted permissions described below. |
| `GUITARHUB_STRIPE_WEBHOOK_SECRET` | Endpoint's signing secret, server-only. |
| `GUITARHUB_CHECKOUT_ORIGIN` | Exact HTTPS origin; production hard-pins `https://guitarhub.org`. |
| `GUITARHUB_BILLING_DATABASE_URL` | Sensitive connection URI for only the dedicated `guitarhub_billing` role through this project’s us-west-1 transaction pooler, port 6543. No query parameters; verified TLS is mandatory. Enter securely in Vercel, never chat or source. |
| `GUITARHUB_AUTH_REDIS_REST_URL`, `GUITARHUB_AUTH_REDIS_REST_TOKEN`, `GUITARHUB_AUTH_RATE_LIMIT_SALT` | Existing approved signup protection configuration; checkout/restore also use 10 requests/account/minute with HMAC keys. Resource/ACL inventory remains incomplete. |

No public Stripe key or signed download URL is needed. No real key was read or copied. The server verifies the key's **own account** via `GET /v1/account`, not a connected account lookup.

Proposed restricted Stripe scope: own-account read, Products/Prices read, Checkout Sessions read/write, Payment Intents/Charges/Disputes read. Exact restricted-key permission availability must be checked in the approved account; the key can still expose other resources in that account, and code-level product checks are not a provider ACL. Do not add refund, customer mutation, product/price mutation or unrelated permission merely to make an error disappear.

The revised [web-orders-proposal.sql](web-orders-proposal.sql) creates `guitarhub_web_orders`, three invoker RPCs and a dedicated `guitarhub_billing` role with SELECT/INSERT/UPDATE only on this ledger plus those RPCs. It grants no DELETE, TRUNCATE, auth-table, Apple-ledger or other application access. The role has no superuser, role creation, database creation, replication, inheritance or RLS bypass; starts NOLOGIN; and is limited to four connections. Explicit RLS policies apply only to this role and ledger. An in-transaction effective-privilege check aborts if existing PUBLIC grants expose unrelated application tables/views/columns/sequences, schema CREATE, or any callable SECURITY DEFINER routine (including triggers). No shared grants are revoked. Repeat this audit before enabling LOGIN and monitor future PUBLIC grants. The SQL is tested locally and **not applied to shared Supabase**.

The production adapter uses bound parameters, no prepared statement names, verified TLS, two connections per process and bounded connection/query timeouts. Only the exact role/project username and us-west-1 Supabase transaction pooler are accepted. Actual pooler login/TLS still requires secure activation. Free accounts/PDFs need neither this role nor a service-role key.

The web access check reads existing Apple ownership using the signed-in user's Supabase client under the already verified own-account RLS policy. Zero Apple rows permits free web checkout without Apple credentials. Existing Apple rows still require fresh Apple verification and the existing ledger write path; otherwise they fail closed to prevent a duplicate purchase. Native GET `/api/learning/access` retains its existing service-backed Apple path for users without verified web ownership. Cloud sync and Apple restore remain separate, unactivated integrations; do not add a shared service-role key to resolve them silently.

Webhook path: `/api/billing/webhook`, API version pinned to `2026-08-26.dahlia` through Stripe SDK 22.6.0. Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`. The handler ignores unrelated events and acknowledges repeated accepted events. No event email or additive grant side effect exists.

## Verified inventory and remaining action-time gates

Fresh full catalog enumeration found 52 existing products, no GuitarHub offer. The authorized live creation returned product `prod_VO8w6X38hIOGhD`, default price `price_1UNMeYRdcsaZ58FLQqL6wcRZ`, `one_time`, 7900 USD, no recurring schedule. These IDs, live mode, approved account and canonical origin were saved as five nonsecret production variables in the GuitarHub Vercel project; zero failures. Existing RESEND configuration was preserved. No enable flags or secrets were added.

Read-only shared metadata confirmed existing Apple ledger tables and own-account SELECT policies. PUBLIC application-schema usage is limited to `public`; no PUBLIC application-table grants were found. The shared permission inventory currently does not satisfy the new role's guard. PUBLIC grants can confer authority even on a NOINHERIT role; privileged trigger routines must also be considered because PUBLIC TEMPORARY allows caller-owned trigger tables. The final SQL guard intentionally rejects that ambient authority. Exact shared-object findings and the unexecuted permission proposal are retained in the private deployment handoff, rather than publishing unrelated service details here.

Resolving that shared authority requires explicit approval from the database owner. No shared function, trigger, grant or policy was changed. Local synthetic tests demonstrate the boundary and prove that removing PUBLIC EXECUTE prevents new attachment while existing trigger firing continues. Shared migration-role compatibility still needs owner review. Do not substitute a shared service-role key or weaken the guard to bypass this blocker.

Before activation:

1. Review exact stacked PR heads and resolve shared SMTP/template/signup/captcha and Redis resource/ACL details from the free-account checklist. Use the authorized live setup; do not require a sandbox or a purchase test.
2. Approve the exact scoped SQL/role authority and the exact shared-permission proposal in the private deployment handoff. Review affected migration roles, apply the approved scope proposal then ledger proposal, verify role/object grants, then have the user assign the role password and enable LOGIN through a secure provider flow. Enter the connection URI directly as a sensitive GuitarHub production environment variable. No secret should pass through chat or agent tool arguments.
3. Have the user securely configure the approved restricted Stripe runtime key and endpoint signing secret. Verify account, price and required webhook subscriptions without making a payment or granting entitlement. Restricted permissions still cover those resource types across the merchant account; do not imply product-scoped provider ACLs.
4. Configure free signup protection and the verified email-code provider. Publish reviewed production code with free accounts operational, then verify hosted signup/login, exact PDF return, signed-out direct-file denial, public lesson usability, mobile navigation, and signed-in hosted checkout/cancel without payment. Do not deploy a gate that only returns 503 because account prerequisites are missing.
5. Enable new checkout only after all runtime prerequisites and nonpayment checks work. Actual successful payment/refund/dispute provider delivery remains untested under the no-real-payment instruction; local signed-webhook/ledger tests cover application behavior. Preserve this limitation in launch evidence. Apple restore/native sync is independently unactivated.

## Reproducible local evidence

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, both account/PDF bundle checks and `npm run contracts:check`. Run `node scripts/test-web-order-ledger.mjs` with local PostgreSQL binaries on PATH: it starts a disposable loopback-only database, applies the exact proposal, checks eight concurrent reservations, client-role denial, owner binding, reordered/tied observations, dispute restoration and terminal refund, then removes only its own cluster.

`node scripts/prepare-billing-fixture.mjs ../guitarhub-account-fixture-billing-N` creates a new disposable tree using the account fixture safety checks. Only external auth/billing persistence/provider/limiter adapters are synthetic. The production billing engine, evidence decisions, request handlers, official Stripe signature verification, pages, protected PDFs and browser navigation remain in use. The fixture-only `/fixture/payment` state control exists solely in the copied tree. Build and serve it at `http://localhost:3421`; never deploy it. Use the checked-in browser script with an isolated Playwright profile. Its hosted Checkout response is intercepted locally; no request or charge reaches Stripe. Synthetic providers cannot prove real SMTP, Redis, BotID, database or Stripe connectivity.

## Verified draft evidence — 2026-10-06

- 1,251 Node tests pass; TypeScript, ESLint, production build, Apple trust-anchor bundling and both 15-file PDF route bundles pass. All five upstream Sing contracts match current main.
- Exact proposed SQL passes on disposable PostgreSQL 17.11: eight simultaneous reservations produce one active order; anon/authenticated roles are denied; ownership, payment binding, revision-fenced dispute restoration, timestamp ties and terminal refunds pass. The shared database was untouched.
- Isolated browser flow at 1440px, 390px and 320px passes: new-free sign-in returns to the $79 offer; cancel/retry uses one session; unpaid return stays locked; verified payment opens the lesson; repeated signed webhooks remain idempotent; logout blocks the lesson and PDF; same-account sign-in restores; another account cannot restore; dispute suspends, a verified win restores, and refund revokes while free PDFs remain available. Stripe navigation is intercepted locally and all provider data is synthetic.
- Independent review caught and resolved out-of-order dispute restoration and merchant-key identity validation. Follow-up review found no residual security blocker in those fixes, SQL/API revision mapping, or combined Apple/web access. This is code review and local evidence, not production approval.
- Screenshot inspection found the pre-existing account `button` class had no styles. Shared account/download/checkout actions now use the existing lesson-tool colors, visible focus and 44px minimum targets. No pricing, entitlement or legal copy changed as part of that correction.

Machine-local evidence is retained outside the repository in `billing-tests.log`, `billing-typecheck.log`, `billing-lint.log`, `billing-build.log`, `billing-contracts.log`, `billing-ledger.log`, `billing-browser.log`, and `output/playwright/billing-*.png`. The checked-in fixture and SQL scripts reproduce the evidence without secrets.

## Scoped billing adapter follow-up — 2026-10-06

- 1,254 tests, TypeScript, ESLint, production build and account/PDF bundle checks pass. The new database dependency has no reported advisory; npm audit still reports six existing development-tool findings in the ESLint glob dependency chain.
- Exact SQL and the production parameterized query adapter pass on disposable PostgreSQL 17.11. Tests verify a real limited login cannot access unrelated tables, delete/truncate orders, create roles or assume service_role. They cover concurrent reservation, lookup/history, revision fencing, dispute restoration and terminal refunds.
- Public table, column-only, sequence, schema CREATE, privileged ordinary-function and privileged trigger-function grants each abort and roll back setup. Synthetic temporary-table tests reproduce the trigger authority issue and confirm installed trigger firing continues after PUBLIC EXECUTE revocation.
- Independent review covered the adapter and guard. Actual live pooler authentication, TLS, SMTP, Redis and Stripe runtime connectivity remain pending secure configuration; no live purchase, paid grant or shared database mutation was used for verification. Existing desktop/mobile browser evidence from the parent checkout draft still applies to unchanged UI; this follow-up changes database transport and configuration only.
