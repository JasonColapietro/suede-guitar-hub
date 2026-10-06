import { Pool } from 'pg';
import { AccountHTTPError } from '../learning-auth/http.ts';
import { billingDatabaseConfiguration } from './database-config.ts';
let pool: Pool | undefined;
export async function billingQuery(text:string, values:unknown[]) {
  const configuration = billingDatabaseConfiguration();
  if (!configuration) throw new AccountHTTPError(503,'purchase_service_unavailable');
  if (!pool) {
    pool = new Pool(configuration);
    // Idle connection failures must not crash the server or log connection secrets.
    pool.on('error', () => {});
  }
  try { return (await pool.query(text,values)).rows as Record<string,unknown>[]; }
  catch { throw new AccountHTTPError(503,'purchase_service_unavailable'); }
}
