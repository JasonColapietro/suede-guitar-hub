# GuitarHub dormant lead-intake sender

Status: dormant implementation and local preparation; activation is on hold.
See [draft implementation pin](./DRAFT-CONTRACT-PIN.md) for current scope and gates.

## Baseline and scope

Baseline: main `82aaca7`; selectively inspect, never merge wholesale, source
`d0f0ec60d054595c4823c3b17325f61eac2d01d8`.
The source forwards applications and verified Apple purchases, and assumes
signup/login database triggers exist. Current main has no intake sender.
Existing auth/account, purchase verification, refund reconciliation and application
email behavior must continue unchanged. No GuitarHub feature-release work belongs
in this change.

## Contract dependency

The hub owner must publish a versioned repository artifact and fixtures containing
the event envelope, per-event allowlists, signature format, response semantics,
body bounds, lifecycle correlation, idempotency retention and consent handling.
The read-only historical hub artifact at
`7caec4e5b13ff593ca1e4addf372d6ac8ee635c7` (`docs/intake/CONTRACT.md`)
is unversioned: it has no purchase lifecycle correlation semantics, failure-alert
kind, or separately reserved spam/canary capacity. It therefore does not satisfy
this dependency. A stale branch's `IntakeEvent` interface is not this approval. Until that artifact
is approved, activation stays blocked. Draft-only application and immutable
purchase-acceptance envelopes now pin `0b33f45a…`; lifecycle and failure-alert
protocols remain absent. Production capture seams perform no I/O.

## Sender invariants

- Forwarding defaults disabled even when credentials happen to exist. Enabling
  requires separately approved hub prerequisites and durable storage.
- Construct events from explicit allowlists. Never spread submitted JSON, signed
  Apple JWS, passwords, auth tokens, app-account tokens, service keys or raw errors
  into payloads. Apple operational events need no email or account UUID.
- Applications retain only normalized name, email, goal and experience within
  their disclosed follow-up purpose; no mailing-list or signup consent inferred.
- Signup/login reuse existing shared auth identity and consent. This branch adds
  neither parallel user records nor live auth triggers.
- Apple purchase route, restores and notifications correlate by environment,
  bundle/product and original transaction identity. A notification UUID is an
  observation identifier, never a second purchase-ticket identity. Distinct
  revocation/reinstatement lifecycle events correlate to that same purchase.
- A successful purchase ledger write is the acceptance boundary. Intake failure
  cannot undo an entitlement, refund decision or legitimate signup.
- Accepted business events require a durable, replayable outbox before delivery.
  In-process retries and `after()` alone do not provide durability. Existing
  purchase ledger permits purchase reconstruction, but applications need an
  approved durable store before they may be acknowledged as queued.
- Spam and canary observations use separately bounded capacity and cannot claim
  genuine lead slots. Unaccepted spam body keys are never stored or forwarded.
- Network attempts and response-body reads are bounded. Timeouts, 429/5xx,
  malformed acknowledgements and connection loss retain a retryable event.
  401/403 and invalid configuration are observable blocked states that operators
  can retry after repair; they never mark delivery successful.
- Stable event IDs survive process restarts and retries. Workers require atomic
  claims, ownership fencing, bounded backoff and status retention. An ambiguous
  timeout may be replayed safely using the same event ID.

## Implementation approach

Prefer a narrow pure event builder, storage interface and injected delivery
transport, followed by a separately approved durable adapter. This permits local
failure injection without adding migrations, RLS, live triggers or credentials.
Reject the stale branch's direct-fire-and-forget sender: it drops failed purchases
and uses different IDs for purchase and notification paths. Do not claim a local
in-memory or filesystem test adapter is production durable storage.

## Validation and rollout gates

Use synthetic fixtures only, with mocked network and persistence. Test shared
Apple identity, lifecycle distinctions, arbitrary/secret key removal, disabled
configuration, persistence-before-send, replay after outage, wrong-secret recovery,
lease expiry/concurrent claims and spam/canary isolation. Existing account/refund
and application behavior tests remain green. Independent review and current-head
CI precede merging dormant code. No actual purchases, refunds or messages.

Activation requires a pinned hub contract and fixtures, approved durable storage
and consent/disclosure review, then separately authorized credentials/configuration.
This branch does not create credentials, configure production secrets, apply
migrations, modify RLS, add live auth triggers or enable forwarding.

## Prepared local component

`lib/intake/apple-identity.ts` is a pure projection of an authoritative verified
ledger row. It hashes environment, bundle, product and original transaction into
a stable local correlation key; purchase, restore and notification ingress can
share that key. It emits only product/environment, normalized purchase and
observation times, revocation time and active/revoked state. No raw transaction
identity, account UUID, notification UUID or token is emitted.

This projection is not a hub event schema and performs no I/O.
The separate sender builds immutable acceptance envelopes; unsupported lifecycle
snapshots remain internal blocked records and do not infer reinstatement. It does not solve persistence, worker fencing, delivery,
application acceptance or purchase-to-ticket deduplication until integrated
against the revised approved contract.
