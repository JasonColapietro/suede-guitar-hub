# GuitarHub sender implementation plan

Goal: prepare safely dormant application and Apple purchase intake.
Spec: [SENDER-SPEC.md](./SENDER-SPEC.md).

- [x] Inspect current main and source branch without merging stale work.
- [x] Document scope, acceptance boundaries, privacy and activation gates.
- [x] Prepare pure local Apple correlation/snapshot helper and six focused tests;
      no production imports or wire format.
- [ ] Pin hub owner's versioned contract SHA and copy shared synthetic fixtures.
- [ ] Write failing tests for exact event schema/allowlists, canonical Apple
      identity and purchase/revocation lifecycle correlation.
- [ ] Implement narrow builders that strip all unknown keys and personal secrets.
- [ ] Write failure-injection tests for persistence-before-send, lease fencing,
      retries, 401/config blocked recovery and isolated spam/canary capacity.
- [ ] Implement disabled-by-default dispatcher with injected durable store and
      bounded transport; do not install a production storage adapter yet.
- [ ] Integrate only where acceptance durability is satisfied; otherwise leave
      route activation explicitly blocked without changing current behavior.
- [ ] Run focused and existing tests, lint/typecheck/build as applicable.
- [ ] Independent review; fetch/rebase current main and repeat applicable checks.
- [ ] Create repository-specific PR, inspect current-head CI and merge reviewed
      dormant code only. Record merged SHA and remaining activation dependencies.

Review focus: duplicate Apple ingress; stale refund responses; unknown/secret
payload keys; outages after acceptance; wrong-secret recovery; disabled no-I/O;
spam/canary partition; existing signup and application responses.
