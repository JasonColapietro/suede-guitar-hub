#!/usr/bin/env bash
set -euo pipefail

# Disposable PostgreSQL only. Explicit socket selection and disabled TCP make
# inherited provider URLs irrelevant. This script never contacts Supabase.
account_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/guitarhub-account-ledger.XXXXXX")
account_repo_dir=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$account_test_dir/socket"
finish_account_test() {
  pg_ctl -D "$account_test_dir/data" -m immediate stop >/dev/null 2>&1 || true
}
trap finish_account_test EXIT
initdb -D "$account_test_dir/data" -A trust --no-locale > "$account_test_dir/initdb.log"
pg_ctl -D "$account_test_dir/data" -l "$account_test_dir/server.log" \
  -o "-c listen_addresses='' -k $account_test_dir/socket -p 55497" start >/dev/null
psql -X -h "$account_test_dir/socket" -p 55497 -d postgres -v ON_ERROR_STOP=1 \
  -f "$account_repo_dir/tests/account-ledger.sql"
