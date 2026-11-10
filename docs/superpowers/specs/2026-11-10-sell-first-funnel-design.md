# GuitarHub: sell first, then build

Date: 2026-11-10. Covers two repos: `guitarhub-ios` (this one) and
`suede-guitar-hub` (guitarhub.org, Next.js on Vercel).

Lines marked **(owner)** are decisions the owner made. Lines marked
**(call)** are the designer's calls and can be overruled.

## Intent

Make GuitarHub the tool that takes a beginner-to-intermediate guitarist to
playing chords and improvising with scales in 30 days, and make it sell.
**(owner)**

Today nothing can sell well: the app has no free taste (1.0.2 locks every
lesson), the site shows a paywall nobody can unlock, nothing is measured,
no email is collected, and the site and docs tell two different stories.

## Decisions

- Buyer: beginner-to-intermediate players. **(owner)**
- 30-day outcome: play chords and improvise with scales. **(owner)**
- Offer: one free module, then $79 one-time lifetime. No subscriptions, no
  trial. **(owner)**
- Nothing else in the learning product is free. **(owner)**
- Order: sell first (phase 1), then chord hearing and jam mode (phase 2),
  then proof and sharing (phase 3). **(owner)**
- The site funnels visitors to payment and has a lead magnet. **(owner)**
- Rebuilding existing pages and screens is allowed. **(owner)**

## Approaches considered

1. **Sell first, then build (picked).** Fix the funnel and measurement,
   then build the features that back the promise. Small, low-risk, and it
   makes later work measurable.
2. **Build first, then relaunch.** Stronger story on day one, but chord
   hearing is the riskiest piece, needs real-device testing, and sales stay
   blocked meanwhile.
3. **Both at once.** Fastest on paper, but the promise goes live before the
   app can back it if chord hearing slips.

## Goals (phase 1, the scope of this document)

1. One promise everywhere: "Play real chords and improvise your first solo
   in 30 days."
2. A free taste that shows the promise, then a clear path to payment on
   both platforms.
3. The site can take payment, and one purchase unlocks web and iPhone.
4. Every step of the funnel is measured.
5. The site collects email through a magnet and follows up.

## Non-goals (phase 1)

- Chord hearing, jam mode, backing tracks (phase 2, own design).
- Day-30 before-and-after recording, reminders, widgets (phase 3, own
  design).
- Android, iPad, licensed songs, AI coach, new lessons.
- Changing the $79 price.

## Anti-goals

- Any claim the product cannot back. Until phase 2 ships, copy must not say
  the app hears or scores chords. It scores single notes and timing.
- Fake urgency, fake scarcity, fake reviews, hard-to-close paywalls.
- Any existing buyer or legacy subscriber losing access.
- Losing indexed pages or search traffic when content is locked.
- An App Store rejection.

## The design

### The promise and the 30-day path

- Headline on the site home, `/learn`, `/start`, FAQ, `llms.txt`, compare
  pages, the App Store listing and iOS onboarding: the one promise above.
- A named "30-day path" through existing lessons: chords (levels 2–3:
  "D and A" through "E, C and G"), then the pentatonic scale (level 4
  "Box One"), ending at level 5 "First Solo". No new lessons. **(call)**
- Voice stays in the iPhone lifetime purchase. On the web, voice lives on
  Suede Sing and the site links there. **(owner)**
- Retire the stalled-intermediate "breakthrough room" positioning and the
  founding-cohort application from the home page. **(call)**

### What is free

- One free module per player, on both platforms. Placement decides which:
  beginners get "D and A" (first chords), players who already know open
  chords get "Box One" (first scale). The choice is fixed once made. The
  module that is simply first in the catalogue ("Hold, Fret, Pick") would
  not show the promise. **(call)**
- Free tools: tuner, metronome, the 30-day plan builder, and the two
  quizzes that feed the funnel (`/diagnose`, `/start`). They bring search
  traffic and are not lesson content. **(call)**
- Locked behind the purchase: all other lessons, the Advanced Lab, the
  daily routine, the chord-change counter, tap-along and vocal range
  finder; on the web also `/session`, `/readiness` and `/log`. This
  removes things 1.0.2 and `/tools` call free, so the release notes and
  the `/tools` copy ("no account, no email, no locked second half")
  change with it. **(call, follows the owner's "nothing else free")**
- Locked web pages keep an indexable introduction and a preview, with the
  exercise itself gated, so search traffic is kept.

### The funnel

```
search / compare page / free tool
        |
   magnet (email)  ---->  5 emails over 10 days
        |                        |
   free module  <----------------+
        |
   paywall at the module's end  --> Stripe (web) or Apple (iPhone)
        |
   full access on both
```

- Every free page has one primary button: the magnet or the free module.
- The paywall appears when the free module is finished and whenever a
  locked item is tapped. It closes with one tap.
- iOS onboarding ends in the free module, not the paywall.

### The magnet

- "Your 30-Day Chords-to-First-Solo Plan": the existing `/breakthrough`
  plan builder, re-themed to the promise. A summary shows on screen; the
  full plan and a printable chord and pentatonic chart pack are emailed.
  **(call)**
- The 15 PDF guides stay free but ask for an email first.
- Follow-up: five emails over ten days through Resend. They lead to the
  free module, then to the purchase. Each has an unsubscribe link in the
  footer. The form has no consent checkbox; one line under the button says
  they will get the plan and practice tips by email.

### Payment and accounts

- Web: Stripe Checkout, $79 one time, same price as the app. **(call)**
- Pay first, account second: the buyer pays with an email, the Stripe
  webhook records the purchase against that email, and the buyer signs in
  with an email code. This means account creation must be allowed (today
  sign-in only works for existing Suede accounts). **(call)**
- 90-day money-back guarantee on web purchases, see "Settled" below.
  **(owner)**
- Accounts are switched on in both apps (`GUITARHUB_ACCOUNTS_ENABLED`,
  `GuitarHubAccountsEnabled`). The existing purchase ledger gains Stripe
  as a second source next to Apple, and purchase capture is switched on.
- iPhone: sign-in is optional. It is needed only to use a web purchase or
  sync progress. Apple in-app purchase stays the way to buy in the app,
  and the app does not mention or link to web checkout.
- Existing Apple buyers can unlock the web: after signing in on iPhone,
  the app sends its signed purchase to the server, which verifies it and
  links it to the account. One Apple purchase links to one account.
  **(call)**
- The app needs in-app account deletion before accounts go live (Apple
  requires it; none exists today).

### Measurement

**Deferred by the owner on 2026-11-10 until there is a paying user.**
Nothing below is built in phase 1; no usage data is collected yet.

- PostHog for both platforms. The web uses its script; iOS posts events
  over plain HTTPS so the app keeps zero third-party dependencies.
  **(call)**
- Collect usage data with no visible friction. **(owner)** That means no
  cookie banner, no consent pop-up, no in-app disclaimer screen and no
  tracking permission prompt. To make that possible the web runs PostHog
  without cookies (in-memory only), and the app does no cross-app
  tracking. **(call)**
- Three things stay because they are not optional: the App Store privacy
  label and privacy manifest state usage data is collected (a false label
  gets the app pulled), the privacy policy page says the same, and
  marketing emails carry an unsubscribe link (the law and the email
  provider both require it). None of these interrupts the user.
- Funnel events, same names on both platforms: page or screen view, magnet
  submitted, placement done, free module started, free module finished,
  paywall shown, checkout started, purchase completed, sign-in completed.
- No targets are set now. Two weeks of baseline first, then targets.

### Housekeeping that blocks selling

- Make README, CONTEXT, the press kit and the site agree with this
  document.
- Legacy subscriptions are removed from sale; existing subscribers keep
  access.

## Settled on 2026-11-10

- **Guarantee: 90 days, money back on web purchases. (owner)** Worded as:
  if after 90 days you are not playing chords and improvising, you get a
  full refund. A refund removes access on both platforms. Apple handles
  refunds for purchases made in the app. **(the wording and the access
  rule are calls)**
- **Stripe: the Florida account. (owner)** Stripe Tax is switched on and
  collects sales tax where the business is registered, starting with
  Florida. The displayed price stays $79 before tax. **(call)**
- **Voice: link to Suede Sing. (owner)** Suede Sing will stop being free
  soon, so the site links to it as the home for voice on the web and does
  not describe it as free. Voice stays in the iPhone lifetime purchase.
- **Account deletion (call):** deleting in the app removes all GuitarHub
  data and the GuitarHub sign-in. The shared Suede identity is deleted
  too only when no other Suede product holds data for it. Sign-in and
  receipt emails are branded GuitarHub.
- The owner left every other open point to the designer and approved the
  design.

## Constraints

- iOS: SwiftUI, iOS 17, no third-party dependencies, XcodeGen. Releases go
  only through the `release.yml` workflow.
- Web: Next.js 16 (breaking changes, see its `AGENTS.md`), Supabase,
  Vercel. Founder copy rule: lead with what the buyer can achieve.
- Lesson data is shared through `contracts/`; gating rules must stay in
  step on both platforms and be covered by the parity tests.
- The promise is an outcome the lessons teach toward, not a guarantee.

## Needed from the owner

- Stripe account keys and webhook secret, PostHog project key, and the
  Supabase service key, set in Vercel.
- Push access to `suede-guitar-hub` for this session.
- Updating the App Store privacy label, and dispatching the release.
- A real-device check with a guitar before the app update ships.

## Left to the builder

- Screen and page layout, copy beyond the headline, email wording.
- How the email sequence is scheduled.
- How locked web pages render their preview.
- Order of work inside phase 1, as long as the web purchase and the app
  update that honours it ship together.

## Later phases (outline only)

- **Phase 2, make it true:** the app hears chords; a jam mode shows a
  scale on the fretboard, plays a backing track and scores staying in key.
- **Phase 3, make it spread:** day-30 before-and-after recording to share,
  review prompts at the right moment, practice reminders.
