# Complete Lifetime web checkout — proposed activation

The approved offer is **$79 USD once**, GuitarHub Complete Lifetime, merchant **JC INVESTMENT GROUP LLC**, Stripe account `acct_1SHG7dRdcsaZ58FL`. This draft does not activate billing, create a product/price, apply SQL, provision credentials, change paid/legal terms, or make a charge.

## Behavior and scope

The server owns the amount, price and product. Signed-in free members use Stripe-hosted Checkout; cancellation returns to their account upgrade page, retries reuse the reserved session, and the return page verifies current provider evidence before showing paid access. An already verified Apple or web lifetime owner cannot start another checkout. Payment-processing, failures, foreign sessions and provider outages cannot grant access. Existing paid access continues when new sales are paused.

A durable order reservation and Stripe idempotency key avoid duplicate sessions. Webhooks verify Stripe's raw-body signature, retrieve current session/payment/charge/dispute evidence, and reconcile the same order as the return page. Repeat deliveries do not add entitlements. Refund/dispute denial evidence overrides out-of-order requests; full refunds are terminal; disputed access restores only on a strictly newer verified winning outcome read from the current ledger revision; paid requests already in flight before a denial cannot restore access. Partial refunds retain access, matching the implemented full-refund revocation boundary; confirm that operational policy before activation. No refund operation is exposed by this app.

Web and Apple ownership feed the existing account access contract. Stripe outages preserve independently verified Apple ownership. Restoring a revoked Apple receipt does not hide a separately verified web purchase. Local native-source inspection confirms the client consumes account `verifiedTracks`; the shipped app's server configuration and a real cross-platform restore remain unverified. Do not promise Suede Sing Pro: web voice links lead to the separately billed Sing product. The upgrade page describes the 135 ready guitar lessons (21 free, 114 paid) and existing practice tools, without changing other subscriptions or products.

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
| `GUITARHUB_SUPABASE_SERVICE_ROLE_KEY` | Existing backend adapter authority for the proposed web-order ledger and existing Apple ledger. This is broader shared-database authority and requires explicit approval before copying/activation. Free PDF auth does not need it. |
| `GUITARHUB_AUTH_REDIS_REST_URL`, `GUITARHUB_AUTH_REDIS_REST_TOKEN`, `GUITARHUB_AUTH_RATE_LIMIT_SALT` | Existing approved signup protection configuration; checkout/restore also use 10 requests/account/minute with HMAC keys. Resource/ACL inventory remains incomplete. |

No public Stripe key or signed download URL is needed. No real key was read or copied. The server verifies the key's **own account** via `GET /v1/account`, not a connected account lookup.

Proposed restricted Stripe scope: own-account read, Products/Prices read, Checkout Sessions read/write, Payment Intents/Charges/Disputes read. Exact restricted-key permission availability must be checked in the approved account; the key can still expose other resources in that account, and code-level product checks are not a provider ACL. Do not add refund, customer mutation, product/price mutation or unrelated permission merely to make an error disappear.

The new [web-orders-proposal.sql](web-orders-proposal.sql) creates only `guitarhub_web_orders` and three scoped RPCs, denies anon/authenticated access and grants the existing service role. It is tested locally and **not applied to shared Supabase**. A dedicated narrower database credential would require separate adapter/schema design and explicit authority; no credential or persistent grant is provisioned here.

Webhook path: `/api/billing/webhook`, API version pinned to `2026-08-26.dahlia` through Stripe SDK 22.6.0. Required events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`. The handler ignores unrelated events and acknowledges repeated accepted events. No event email or additive grant side effect exists.

## Verified inventory and remaining action-time gates

Read-only catalog enumeration returned 52 products, `has_more=false`, with no GuitarHub product, including inactive products. Only the live merchant account is connected; no authorized sandbox connection or test credential is available. No product, price, Checkout Session, webhook or test/live credential was created.

Before activation:

1. Review exact stacked PR heads, obtain approval for the concrete shared-service scopes, and resolve SMTP/template/signup/captcha plus Redis resource/ACL details from the free-account checklist. Existing Vercel environment metadata has only `RESEND_API_KEY`; no account/payment configuration was copied.
2. Connect an authorized Stripe sandbox and provision the approved test offer, scoped credentials and test webhook through the secure secret flow. Test actual hosted checkout, successful/delayed/failed payments, cancel, repeated delivery, tampered signature, refund, dispute and restore. Synthetic browser tests below do not prove Stripe sandbox integration.
3. Approve the exact SQL/new service authority, apply only that proposal, and verify client-role denial and concurrent reservation behavior in an approved nonproduction database. Do not change shared auth triggers, tables, policies or global settings.
4. Verify the native shipped configuration with designated test accounts and purchases; make no persistent paid grant to compensate for a failing test.
5. Review production merchant identity, $79 one-time price/product, webhook scope, secret placement and publication authority at action time. Do not enable live flags or deploy before that approval and independent review. A green Vercel check currently means the configured build was skipped.

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
