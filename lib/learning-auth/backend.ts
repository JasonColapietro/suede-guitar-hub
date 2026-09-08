import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createAppleLearningVerifier } from "@/lib/learning-account/apple";
import { accountUUID, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, LearningAccountError, type StoreEnvironment, type VerifiedLifetimePurchase } from "@/lib/learning-account/contracts";
import { accountConfiguration } from "./config";
import { AccountHTTPError } from "./http";

export function accountBackend() {
  const configuration = accountConfiguration();
  const serviceKey = process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY;
  if (!configuration || !serviceKey) throw new AccountHTTPError(503, "account_service_unavailable");
  return createClient(configuration.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

export function purchaseEnvironment(): StoreEnvironment {
  const environment = process.env.GUITARHUB_APPLE_ENVIRONMENT;
  if (environment !== "Production" && environment !== "Sandbox") throw new AccountHTTPError(503, "account_service_unavailable");
  // A production website must never grant access for a test purchase.
  if (process.env.VERCEL_ENV === "production" && environment !== "Production") throw new AccountHTTPError(503, "account_service_unavailable");
  return environment;
}

export async function appleLearningVerifier() {
  const issuerId = process.env.GUITARHUB_APPLE_ISSUER_ID;
  const keyId = process.env.GUITARHUB_APPLE_KEY_ID;
  const signingKey = process.env.GUITARHUB_APPLE_SIGNING_KEY;
  if (!issuerId || !keyId || !signingKey) throw new AccountHTTPError(503, "account_service_unavailable");
  const root = await readFile(path.join(process.cwd(), "lib/learning-account/AppleRootCA-G3.pem"));
  return createAppleLearningVerifier({ environment: purchaseEnvironment(), appAppleId: 6806770875,
    appleRootCertificates: [root], issuerId, keyId, signingKey });
}

function checkDatabaseError(error: { message?: string } | null) {
  if (!error) return;
  for (const code of ["purchase_owner_conflict", "purchase_event_conflict", "attempt_identity_conflict", "sync_epoch_changed"]) {
    if (error.message?.includes(code)) throw new LearningAccountError(code);
  }
  throw new AccountHTTPError(503, "account_service_unavailable");
}

export async function getAccountBinding(accountId: string, create = false) {
  const db = accountBackend();
  const id = accountUUID(accountId);
  if (create) {
    const token = await db.rpc("guitarhub_get_account_token", { p_account_id: id });
    checkDatabaseError(token.error);
  }
  const row = await db.from("guitarhub_account_tokens").select("app_account_token,sync_epoch").eq("account_id", id).maybeSingle();
  checkDatabaseError(row.error);
  if (!row.data) return null;
  return { appAccountToken: accountUUID(row.data?.app_account_token), syncEpoch: accountUUID(row.data?.sync_epoch) };
}

export async function recordVerifiedPurchase(accountId: string, purchase: VerifiedLifetimePurchase) {
  const db = accountBackend();
  const result = await db.rpc("guitarhub_record_apple_purchase", {
    p_account_id: accountUUID(accountId), p_purchase: purchase,
  });
  checkDatabaseError(result.error);
  // The ledger may already contain a newer refund than this Apple response.
  // Return the resulting row, never grant from the older incoming event.
  const current = await db.from("guitarhub_apple_purchases")
    .select("environment,original_transaction_id,transaction_id,bundle_id,product_id,app_account_token,purchased_at,signed_at,revoked_at")
    .eq("account_id", accountUUID(accountId)).eq("environment", purchase.environment).eq("original_transaction_id", purchase.originalTransactionId).single();
  checkDatabaseError(current.error);
  const row = current.data;
  if (!row || row.bundle_id !== GUITARHUB_BUNDLE_ID || row.product_id !== GUITARHUB_LIFETIME_PRODUCT_ID || row.environment !== purchase.environment || row.app_account_token !== purchase.appAccountToken) throw new AccountHTTPError(503, "account_service_unavailable");
  return { environment: purchase.environment, originalTransactionId: row.original_transaction_id, transactionId: row.transaction_id,
    bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken: accountUUID(row.app_account_token),
    purchasedAt: row.purchased_at, signedAt: row.signed_at, revokedAt: row.revoked_at } as VerifiedLifetimePurchase;
}

export async function appendAccountAttempts(accountId: string, syncEpoch: string, attempts: unknown[]) {
  const result = await accountBackend().rpc("guitarhub_append_attempts", {
    p_account_id: accountUUID(accountId), p_sync_epoch: accountUUID(syncEpoch), p_attempts: attempts,
  });
  checkDatabaseError(result.error);
  return result.data;
}

export async function clearAccountHistory(accountId: string, syncEpoch: string) {
  const result = await accountBackend().rpc("guitarhub_clear_history", { p_account_id: accountUUID(accountId), p_sync_epoch: accountUUID(syncEpoch) });
  checkDatabaseError(result.error);
  return accountUUID(result.data);
}

export async function listAccountAttempts(accountId: string, cursor: string) {
  const result = await accountBackend().from("guitarhub_attempts").select("sequence::text,body")
    .eq("account_id", accountUUID(accountId)).gt("sequence", cursor).order("sequence", { ascending: true }).limit(101);
  checkDatabaseError(result.error);
  return (result.data ?? []).map((row) => ({ sequence: row.sequence as string, body: row.body as unknown }));
}

export async function listAccountPurchases(accountId: string, environment: StoreEnvironment) {
  const result = await accountBackend().from("guitarhub_apple_purchases").select("transaction_id,original_transaction_id,app_account_token")
    .eq("account_id", accountUUID(accountId)).eq("environment", environment).limit(21);
  checkDatabaseError(result.error);
  if (!result.data || result.data.length > 20) throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data.map((row) => ({ transactionId: row.transaction_id as string, originalTransactionId: row.original_transaction_id as string, appAccountToken: accountUUID(row.app_account_token) }));
}

export async function findPurchaseOwner(purchase: VerifiedLifetimePurchase) {
  const result = await accountBackend().from("guitarhub_apple_purchases").select("account_id,app_account_token")
    .eq("environment", purchase.environment).eq("original_transaction_id", purchase.originalTransactionId).maybeSingle();
  checkDatabaseError(result.error);
  return result.data?.account_id ? { accountId: accountUUID(result.data.account_id), appAccountToken: accountUUID(result.data.app_account_token) } : null;
}
