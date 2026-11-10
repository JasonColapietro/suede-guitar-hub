# GuitarHub launch setup: Supabase and Vercel

Owner steps to make `sell-first-web` live. Do them in this order. The
site and the iPhone 1.1 update ship together.

Variable names below were read from the code on `sell-first-web`.

## Status (checked live, end of session)

Done by Claude through the connectors:
- Supabase: `20261110000000_guitarhub_sell_first` applied to project
  `drzuelosizfllruocmly`. The four new GuitarHub tables exist (empty).
  The earlier `guitarhub_account_learning_ledger` migration was already
  applied. The `hosted-outbox-proposal.sql` script and the sign-up /
  email-confirmation settings were NOT checked or changed.
- Vercel project `suede-guitar-hub` (serves guitarhub.org), production:
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set.

Already present in Vercel, not used by this code (safe to ignore):
`GUITARHUB_STRIPE_MODE`, `GUITARHUB_STRIPE_ACCOUNT_ID`,
`GUITARHUB_STRIPE_LIFETIME_PRODUCT_ID`, `GUITARHUB_STRIPE_LIFETIME_PRICE_ID`,
`GUITARHUB_CHECKOUT_ORIGIN`. The code reads `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET`, which are not set yet.

**Problem found: `RESEND_API_KEY` exists in Vercel but its value is EMPTY.**
Set the real key, or the plan and lead emails will fail.

Still needed from the owner (secrets; Claude does not handle them):
- `RESEND_API_KEY` (value)
- `STRIPE_SECRET_KEY`, live key of the Florida account
- `GUITARHUB_SUPABASE_SERVICE_ROLE_KEY`
- `GUITARHUB_APPLE_ENVIRONMENT` = `Production`, `GUITARHUB_APPLE_ISSUER_ID`,
  `GUITARHUB_APPLE_KEY_ID`, `GUITARHUB_APPLE_SIGNING_KEY`
- `GUITARHUB_LEADS_UNSUBSCRIBE_SECRET` and `CRON_SECRET`: run
  `openssl rand -hex 32` twice and paste each output
- `GUITARHUB_ACCOUNTS_ENABLED` = `true`, last, after the deploy
- Supabase dashboard: allow sign-ups; require email confirmation; email
  template shows the numeric code (`{{ .Token }}`)
- Firewall rate limit (Vercel), Resend check (`plan@guitarhub.org`,
  open/click tracking off)

## 1. Supabase (project `drzuelosizfllruocmly`)

1. **Run the migrations**, in order, in the SQL editor:
   - `supabase/migrations/20260908044358_guitarhub_account_learning_ledger.sql`
     (skip if it is already applied)
   - `supabase/migrations/20261110000000_guitarhub_sell_first.sql`
   - `docs/intake/hosted-outbox-proposal.sql` (so sales reach the
     internal log)

   The second one must be applied before the new site code is live, or
   access checks fail for existing Apple buyers.
2. **Authentication settings:**
   - Allow new users to sign up.
   - Email sign-in on, with the emailed one-time code.
   - Email confirmation required on every sign-up path. A web purchase
     unlocks for whoever signs in with the checkout email, so an
     unconfirmed email must never count.
   - The email template must include the numeric code (`{{ .Token }}`).
   - Keep the built-in rate limits on.
3. **Copy three values** from Project Settings, API:
   - Project URL: `https://drzuelosizfllruocmly.supabase.co`
   - Publishable key
   - Service role key (secret; never put it in the iPhone repo)

## 2. Vercel (the guitarhub.org project, Production environment)

Set these. Leave `GUITARHUB_ACCOUNTS_ENABLED` for last.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://drzuelosizfllruocmly.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `GUITARHUB_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Live secret key of the Florida Stripe account |
| `STRIPE_WEBHOOK_SECRET` | Set in step 4, after the deploy |
| `GUITARHUB_APPLE_ENVIRONMENT` | `Production` |
| `GUITARHUB_APPLE_ISSUER_ID` | App Store Connect API issuer id |
| `GUITARHUB_APPLE_KEY_ID` | App Store Connect in-app purchase key id |
| `GUITARHUB_APPLE_SIGNING_KEY` | Contents of that key's `.p8` file |
| `RESEND_API_KEY` | Already set; confirm it is still there |
| `GUITARHUB_LEADS_UNSUBSCRIBE_SECRET` | 32 random bytes, for example from `openssl rand -hex 32` |
| `CRON_SECRET` | Another 32 random bytes |
| `GUITARHUB_ACCOUNTS_ENABLED` | `true` (set last) |

Without `GUITARHUB_APPLE_ENVIRONMENT`, even Stripe buyers stay locked.

Also in Vercel:
- **Firewall:** add a per-IP rate limit on `POST /api/leads`,
  `/api/checkout` and `/checkout/success`.
- **Cron:** the daily email job (`/api/leads/dispatch`, 15:00 UTC) is in
  `vercel.json` and starts by itself after the deploy.

In Resend: confirm `plan@guitarhub.org` can send, and that open and click
tracking is off for the domain.

## 3. Deploy

Merge `sell-first-web` into `main`. Every push to `main` deploys
production. The variables must be set first, because some pages read the
checkout setting when they are built.

## 4. Stripe webhook (after the deploy)

Create a webhook endpoint in the Florida Stripe account:
- URL: `https://guitarhub.org/api/stripe/webhook`
- Events: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `charge.refunded`

Copy its signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`, then
redeploy so the site picks it up. Do not create the endpoint before the
deploy: every delivery would fail. (A Claude session with the Stripe
connector can create it; the secret still has to be pasted into Vercel
by hand.)

## 5. Prove it works

1. Open guitarhub.org in a private window. Take the quiz at `/start` and
   open the free module.
2. Finish the module, or tap a locked lesson. The paywall shows
   "Launch price $79. Goes to $99 on December 1, 2026."
3. Buy with a real card.
4. On the success page, sign in with the receipt email and the emailed
   code. Every lesson and locked tool opens.
5. In Stripe, refund the payment in full. Reload: the lessons lock again.
6. Submit an email on `/breakthrough`. The plan email arrives with the
   chart pack link, and its unsubscribe link works.

If step 4 or 5 fails, check the webhook's delivery log in Stripe first.

## 6. Later

- On or after 1 December 2026, redeploy so pre-built pages show $99.
  Checkout charges the right price either way.
- Stripe Tax is already active with the Florida registration; nothing to
  do there.
