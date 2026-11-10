# Phase 1 shared contract (web server and iPhone app)

Both phase 1 plans build against this. The server is `suede-guitar-hub`
(guitarhub.org). Spec:
`docs/superpowers/specs/2026-11-10-sell-first-funnel-design.md`.

## Free module

One free module per player, fixed once chosen.

| Placement | Module id | Name |
|---|---|---|
| beginner | `g-l2-m1` | D and A |
| knows open chords | `g-l4-m1` | Box One |
| advanced | `g-l5-m4` | First Solo |

- Shared data: `contracts/learning.json` gains
  `"freeModules": {"beginner":"g-l2-m1","intermediate":"g-l4-m1","advanced":"g-l5-m4"}`.
- A guest's choice is stored on the device (web: localStorage; iPhone:
  UserDefaults). When signed in, the server stores it and the server's
  value wins.
- There is no free voice module.

## Access

`GET /api/learning/access` (signed in) returns, in addition to what it
returns today:

```json
{ "freeModuleId": "g-l2-m1" | null, "purchaseSource": "apple" | "stripe" | null }
```

The existing `tracks` value stays the source of truth for paid access:
`["guitar","voice"]` for a live Apple or Stripe purchase, `[]` otherwise.
A refunded or revoked purchase gives `[]`.

## New endpoints

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /api/checkout` | none | Body `{ "email"?: string }`. Creates a Stripe Checkout session for $79 one time with tax on. Returns `{ "url": string }`. |
| `POST /api/stripe/webhook` | Stripe signature | `checkout.session.completed` records the purchase against the buyer's email. `charge.refunded` marks it refunded. Idempotent on the Stripe event id. |
| `PUT /api/learning/free-module` | signed in | Body `{ "moduleId": string }`. Stores the choice only if none is stored. Returns `{ "freeModuleId": string }` (the stored id). |
| `POST /api/learning/purchases/apple/claim` | signed in | Body `{ "signedTransaction": string }` (StoreKit 2 JWS). Verifies it and links the purchase to the account. One Apple purchase links to one account; a second account gets `409 purchase_already_linked`. |
| `DELETE /api/learning/account` | signed in | Deletes all GuitarHub data and the GuitarHub sign-in. Deletes the shared Suede identity only when no other Suede product holds data for it. Purchases stay recorded against the email so a refund or re-sign-in still resolves. Returns `204`. |
| `POST /api/leads` | none | Body `{ "email": string, "source": "plan" \| "guide", "placement"?: "beginner" \| "intermediate" \| "advanced", "guideId"?: string }`. Stores the lead and sends the first email. Returns `204`. |
| `GET /api/leads/unsubscribe?token=…` | signed token | Marks the lead unsubscribed and shows a confirmation page. A `POST` to the same path does the same for one-click unsubscribe headers. |

A Stripe purchase is matched to an account by verified email: when a
person signs in with the email used at checkout, the purchase is theirs.

## Funnel events

Same names on both platforms, sent to PostHog. Anonymous id until sign-in.

| Event | Properties |
|---|---|
| `screen_viewed` | `name` |
| `magnet_submitted` | `source` |
| `placement_completed` | `placement` |
| `free_module_started` | `module_id` |
| `free_module_completed` | `module_id` |
| `paywall_viewed` | `trigger` (`module_end`, `locked_item`, `onboarding`, `profile`) |
| `checkout_started` | `platform` (`web`, `ios`) |
| `purchase_completed` | `platform`, `source` (`stripe`, `apple`) |
| `sign_in_completed` | `platform` |

Every event also carries `platform`. No name, email or device identifier
is sent as an event property.

## Offer facts

- Price: $79 one time, shown before tax, same on both platforms.
- Guarantee (web purchases): "If after 90 days you are not playing chords
  and improvising, you get a full refund."
- Promise: "Play real chords and improvise your first solo in 30 days."
- Until phase 2 ships, no copy says the app hears or scores chords.
