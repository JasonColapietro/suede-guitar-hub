/** Only the dedicated GuitarHub role through this project's transaction pooler. */
export function billingDatabaseConfiguration(value = process.env.GUITARHUB_BILLING_DATABASE_URL) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgresql:' || url.username !== 'guitarhub_billing.drzuelosizfllruocmly' ||
        !/^aws-\d+-us-west-1\.pooler\.supabase\.com$/.test(url.hostname) || url.port !== '6543' ||
        url.pathname !== '/postgres' || !url.password || url.search || url.hash) return null;
    return {host:url.hostname, port:6543, database:'postgres', user:url.username,
      password:decodeURIComponent(url.password), ssl:{rejectUnauthorized:true},
      max:2, connectionTimeoutMillis:5000, idleTimeoutMillis:10000,
      statement_timeout:5000, query_timeout:8000, application_name:'guitarhub-billing'};
  } catch { return null; }
}
