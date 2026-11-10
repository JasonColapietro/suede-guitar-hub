# Handoff: GuitarHub sell-first build (updated 2026-11-10)

Phase 1 of the approved design is being built in two repos. Nothing is
live yet: neither branch is merged, and no owner step has been done.

## Where everything is

| What | Where |
|---|---|
| Design (approved) | `docs/superpowers/specs/2026-11-10-sell-first-funnel-design.md` |
| Shared contract (endpoints, events, free modules, offer copy) | `docs/superpowers/plans/2026-11-10-phase1-shared-contract.md` |
| iPhone plan | `docs/superpowers/plans/2026-11-10-phase1-ios.md` |
| Site plan | `docs/superpowers/plans/2026-11-10-phase1-web.md` |
| iPhone code | repo `JasonColapietro/guitarhub-ios`, branch `sell-first-ios` |
| Site code | repo `JasonColapietro/suede-guitar-hub`, branch `sell-first-web` |

The design, contract and site plan are also copied into the site repo
under the same paths. `git log` on the two branches is the durable record
of what was built. The per-task working notes (`.superpowers/sdd/*` in
each repo) are local scratch and do not survive a new container.

## Decisions the owner made

- Buyer: beginner-to-intermediate. Promise: "Play real chords and
  improvise your first solo in 30 days."
- One free module (chosen by placement), then a one-time lifetime
  purchase. No subscriptions. Nothing else in the learning product free.
  The tuner, metronome, plan builder and two quizzes stay free.
- Price: regular $99; launch price $79 through 30 November 2026 (US
  Eastern), $99 from 1 December 2026. Wording: "Launch price $79. Goes to
  $99 on December 1, 2026." Never "usually $99".
- 90-day money-back guarantee on web purchases.
- Stripe: the Florida account (JC INVESTMENT GROUP LLC), tax on.
- Voice on the web links to Suede Sing and is not called free.
- Paywall: the standard pattern (skippable in onboarding, shown at the
  free module's end and on every locked item, closes with one tap).
- Measurement (PostHog, usage events) is deferred until there is a paying
  user. No banners or consent screens.
- The owner does not want effort spent on 1 December handling; the goal
  is working now.

## State of the build

Each task was built by one agent and checked by a second, except small
docs and copy tasks, which wait for the whole-branch review.

**iPhone (`sell-first-ios`): all build tasks written and reviewed.**
Tasks 1–4, 7–12, account configuration, and the launch-price wording.
Tasks 5 and 6 (measurement) were skipped. Version is 1.1.
**None of it has been compiled or run.** See "Blocked" below.

**Site (`sell-first-web`): tasks 1–11 done, tests passing (1,584).**
Done: free-module rules, database migration, access response, account
creation, Stripe Checkout, webhook and refunds, Apple purchase claim,
account deletion, the no-op measurement stub, paywall and buy button with
launch pricing, free module for guests.
In progress when this was written: task 12 (lock the Advanced Lab,
routine, `/session`, `/readiness`, `/log`) and task 13 (email capture,
unsubscribe, five-email sequence). If the branch has no commit for one of
these, it was not finished: redo it from the plan.
Not started: task 14 (magnet page and PDF guides behind an email),
task 15 (one promise and one primary button on every free page),
task 16 (privacy policy, terms, launch docs).

## Blocked

**iPhone CI will not start.** GitHub answered: "The job was not started
because recent account payments have failed or your spending limit needs
to be increased." The owner must fix GitHub billing or raise the Actions
spending limit. Then run:

`gh workflow run verify.yml --repo JasonColapietro/guitarhub-ios --ref sell-first-ios`

and fix whatever fails. Do not release until that run is green. The
checks that do not need a Mac all pass locally.

## Next steps, in order

1. Finish site tasks 12–16.
2. Whole-branch review of each branch; fix what it finds.
3. iPhone: once billing is fixed, get the verify run green.
4. Owner steps below, then launch the site and the app together.
5. Phases 2 (chord hearing, jam mode) and 3 (day-30 proof, reminders)
   each need their own design first.

## What only the owner can do

Site (Vercel and Supabase):
- Set in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the
  Supabase URL, publishable key and service key, the Apple server
  credentials (`GUITARHUB_APPLE_ENVIRONMENT=Production`, issuer id, key
  id, signing key), `GUITARHUB_LEADS_SECRET`, `CRON_SECRET`,
  `RESEND_API_KEY`, and last of all `GUITARHUB_ACCOUNTS_ENABLED=true`.
- Apply `supabase/migrations/20261110000000_guitarhub_sell_first.sql`
  before the branch goes live, or Apple buyers' access checks fail. Also
  deploy `docs/intake/hosted-outbox-proposal.sql` so sales reach the
  internal log.
- In the shared Suede Supabase project: allow sign-ups, require email
  confirmation on every sign-up path (a web purchase unlocks by confirmed
  email), make the email template send the numeric code, set rate limits.
- Add a Vercel Firewall per-IP rate limit on `/api/checkout` and
  `/checkout/success`.
- Merge `sell-first-web` to `main` (this deploys production). Then create
  the Stripe webhook for `https://guitarhub.org/api/stripe/webhook`
  (events `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `charge.refunded`); it must
  not be created before the deploy or every delivery fails. Then make one
  live purchase, sign in with the receipt email, confirm lessons open,
  refund it, confirm they lock.
- Redeploy on or after 1 December 2026 so pre-built pages show $99.

iPhone (GitHub and App Store Connect):
- Fix GitHub billing (see "Blocked").
- Set the `SUPABASE_PUBLISHABLE_KEY` repository variable; `release.yml`
  refuses to build without a valid one.
- App Store Connect: update the privacy answers (email, other user
  content, purchase history: linked, app functionality, no tracking);
  schedule the $99 price for 1 December 2026; remove legacy subscriptions
  from sale; remove "Launch price through November 30." from the
  promotional text on 1 December.
- Test with a real guitar on a real phone, then dispatch `release.yml`.
  Never upload locally; never set `replace_pending` without the owner.

Open questions for the owner:
- The list of other Suede products' data tables. Until then, deleting an
  account removes GuitarHub data and keeps the shared Suede sign-in.
- Chargebacks do not remove access; only refunds do.
- A holder of only the old Voice subscription is not offered the free
  guitar module.
- `/tempo` (tempo ladder tool) was left free.

## Facts worth not re-deriving

- Stripe (checked read-only): one live account, head office West Palm
  Beach FL. Stripe Tax is active with a Florida registration. The account
  is shared with other Suede products, so GuitarHub payments carry a
  product marker and other products' refunds are ignored.
- Every push to `main` of the site repo deploys production.
- iOS is live in the store at 1.0.2 (App ID 6806770875), which locks
  every lesson. The mic scores single notes and timing, not chords, so no
  copy may say the app hears chords.
- Free modules: beginner `g-l2-m1` (D and A), knows open chords
  `g-l4-m1` (Box One), advanced `g-l5-m4` (First Solo).
- Site tests: `npm test` in the site repo. The database test needs a
  local throwaway Postgres (`bash tests/account-ledger.sh`).
- iPhone: no Swift toolchain outside a Mac; all testing is the Verify iOS
  workflow.
