# Draft sender implementation and activation hold

Pinned hub revision: `0b33f45a0bdde87b8e7746666d6200c17d0c4b82`,
`src/lib/intake/contract.ts`, `docs/intake/CONTRACT-v1.md` and
`docs/intake/CONFORMANCE-v1.md`. This is draft-code conformance, not stable contract
or activation approval. The source schema did not change from `b13442a…`.

`tests/fixtures/intake-owner-v1-signing.json` is the unchanged hub-owned official
signing vector. `tests/fixtures/intake-contract-v1.json` is the unchanged shared
positive/negative/ACK supplement from `b13442a…`, SHA256
`2c234a33b0b6d8e42bae8a4aba9f7fcce12580ee9f7816d98b9ea4315047b734`.
Local tests reproduce both HMAC vectors and reject unsupported field examples.

## Implemented dormant path

- Explicit application builder emits only normalized contact details, receipt identity and a fixed application
  category under approved application_id/interest keys. Freeform goal and
  experience remain confined to the existing application email path. It
  omits unknown request keys and credential-like free text, strips credentials, query and fragment from every URI scheme, and never claims newsletter/signup consent.
- Immutable Apple purchase acceptance uses one original-purchase/environment
  correlation key for purchase, notification and restore/reconciliation paths.
  Its content excludes mutable entitlement/refund status, observation time,
  account tokens and notification UUIDs. Sandbox acceptance occupies the separate
  canary quota and cannot use genuine purchase capacity.
- Signed transport binds the proposed source `guitarhub` to `guitarhub.org`, has a
  fixed HTTPS destination and refuses redirects. Deadline covers fetch and bounded
  acknowledgement reads. Only 202 with accepted=true and boolean duplicate means
  stored. 400/401/403/413 retain blocked records for explicit repair. Retryable
  errors retain original identities and content, with jitter and Retry-After.
- Hosted RPC adapter propagates its deadline AbortSignal to the actual PostgREST
  request and also bounds uncooperative promises. It has four bounded methods: enqueue, claim, finish and repair.
  Prepared SQL uses a private table, invoker functions, atomic lane admission,
  SKIP LOCKED claims and lease-token-fenced completion. No anonymous/browser role
  privileges, RLS statements or auth triggers are included. No target SQL ran.
- SQLite is exclusively a local durable preparation/test adapter, never Vercel
  production durability. Actual local restart, ambiguity/retry, lease fencing,
  capacity and repair tests exercise it. A separate disposable network-isolated
  PostgreSQL runner tests the prepared SQL with synthetic data only.
- Production route seams are called after authoritative purchase ledger writes
  (purchase, notification, access reconciliation), and after application validation.
  Both production capture functions are deliberately hard-disabled with no env
  switch. They perform no storage/network work. Existing entitlement, refund and
  application email responses remain authoritative. Capture failures cannot undo
  purchase fulfillment. No team-notified customer assurance is added.

## Protocol and activation dependencies

The draft hub creates a ticket per new event ID and never updates duplicate
content. It has no lifecycle-update/correlation or failure-alert protocol. Later
Apple snapshots and failure alerts are therefore retained internally with explicit
blocked reasons, never tunneled through note/message or dispatched under invented
kinds/new purchase ticket IDs. The original purchase ticket intentionally contains
no mutable status. A revised approved lifecycle/failure protocol is required.

The hosted adapter targets **proposed, currently unprovisioned** RPCs
`guitarhub_intake_enqueue`, `guitarhub_intake_claim`, `guitarhub_intake_finish`, and
`guitarhub_intake_repair` in the authoritative purchase-ledger project. Schema
readback, role mapping, backup/retention/erasure and source assignment remain
operator gates. No production credentials, privileges, schema, RLS, auth triggers,
schedules or forwarding configuration are created. All capture remains disabled.
The proposal enforces bounded total lane storage including delivered identities;
operators must monitor capacity and approve retention without replaying erased
contact data. Spam/canary lanes have their own caps.

Before activation, attach the hosted adapter to the disabled capture seams, verify
persistence/readback and consent/disclosure boundaries, and provide a durable
application receipt identity before acceptance. Purchase source ledger rows remain
the recovery authority; `recoverPurchaseCaptures` replays authoritative rows with
the same acceptance key. There is no automatic ledger scan or delivery schedule.
Auth login/signup paths are unchanged and no independent user records are created.

## Local verification

`npm test`, `npm run lint`, `npx tsc --noEmit`, and
`node scripts/test-intake-postgres.mjs`. The last command creates and removes its
own `postgres:17-alpine` container with `--network none` and no published ports;
it cannot accept a target DB URL or credentials. Image tested: SHA256
`eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb`.
It validates idempotency/conflicts, 401 blocked repair, Retry-After retention,
lease expiry/stale workers, quotas, concurrent claims and restart durability.
