# Account ledger deployment — September 8, 2026

The shared Suede project `drzuelosizfllruocmly` has migration
`20260908044358_guitarhub_account_learning_ledger`. The local file was created
with Supabase CLI 2.117.0, then its version was aligned to the actual remote
migration returned by the authenticated provider.

Only three new GuitarHub tables and four GuitarHub functions were added. No
existing product tables or customer records were modified. The new tables are
empty: zero account bindings, zero purchases, zero practice attempts.

Verified after deployment:

- RLS enabled on all three tables.
- Anonymous roles have no table access. Authenticated users have read-only
  grants with own-account policies, and no direct mutation grants.
- All four functions use SECURITY INVOKER with an empty search path; only
  service_role can execute them.
- Security advisors: zero new findings; zero GuitarHub findings. The shared
  project retains its earlier 53 informational and 29 warning findings.

Local PostgreSQL tests cover own/other-account reads, denied client writes,
immutable transaction ownership, environment isolation, replay, refunds,
account-deletion tombstones and concurrent reset/append semantics. Live checks
inspected metadata and empty counts; they did not create real users, purchases
or learning records.

The account feature remains disabled. Production authentication settings,
managed server credentials, Apple server verification and native account-linked
purchases still need end-to-end verification before enabling it.
