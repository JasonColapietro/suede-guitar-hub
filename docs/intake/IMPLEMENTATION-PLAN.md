# GuitarHub dormant sender implementation plan

Goal: prepare application and immutable Apple purchase intake with replayable storage.
Spec: [SENDER-SPEC.md](./SENDER-SPEC.md).
Current draft scope/gates: [DRAFT-CONTRACT-PIN.md](./DRAFT-CONTRACT-PIN.md).

- [x] Inspect current main and stale source branch without merging it.
- [x] Specify acceptance boundaries, privacy constraints and activation gates.
- [x] Prepare canonical Apple correlation/snapshot projection with focused tests.
- [x] Pin draft hub revision `0b33f45a…`; copy official and shared fixtures unchanged.
- [x] Implement narrow application and immutable purchase-acceptance builders;
      preserve one purchase identity across ingress and retain later state internally.
- [x] Implement bounded signed transport, validated ACK, blocked-auth repair,
      Retry-After and jitter with fixed source/property/destination.
- [x] Prepare hosted RPC storage adapter and private-schema SQL without applying
      target schema, grants, RLS or auth triggers.
- [x] Test SQL in disposable network-isolated PostgreSQL with synthetic rows:
      idempotency/conflicts, atomic quota, claim exclusion, lease fencing,
      blocked repair, retry delay, concurrent claims and restart durability.
- [x] Add local SQLite durability/lease/failure-injection tests; explicitly exclude
      ephemeral serverless disk as production durability.
- [x] Wire hard-disabled capture seams after authoritative purchase writes and
      application validation; existing fulfillment/refund/email responses continue.
- [x] Add authoritative-ledger replay helper for missed purchase capture recovery.
- [x] Run focused tests, existing full suite, lint and TypeScript checks.
- [ ] Independent review and current-head CI; merge dormant code only.
- [ ] Approve a stable hub contract including lifecycle/failure-alert semantics.
- [ ] Operator schema/readback, source assignment, retention/consent and hosted
      persistence verification before separately authorized activation.

Unsupported lifecycle snapshots/failure alerts stay locally blocked. No automatic
scan/schedule, forwarding activation, credentials, target migrations, RLS changes,
live auth triggers or customer messages are introduced.
