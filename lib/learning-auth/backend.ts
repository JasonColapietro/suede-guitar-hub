import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createAppleLearningVerifier } from "@/lib/learning-account/apple";
import { accountUUID, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, LearningAccountError, type StoreEnvironment, type VerifiedLifetimePurchase } from "@/lib/learning-account/contracts";
import { accountConfiguration } from "./config";
import { normalizeEmail, type StripePurchase } from "@/lib/learning-account/stripe";
import { AccountHTTPError } from "./http";

function serviceClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

export function accountBackend() {
  const configuration = accountConfiguration();
  const serviceKey = process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY;
  if (!configuration || !serviceKey) throw new AccountHTTPError(503, "account_service_unavailable");
  return serviceClient(configuration.url, serviceKey);
}

/**
 * The service-role client for server work that does not depend on accounts being
 * switched on (email leads): needs the Supabase URL and service key, not
 * `GUITARHUB_ACCOUNTS_ENABLED`. Same project pin as `accountConfiguration`.
 */
export function serviceBackend() {
  const serviceKey = process.env.GUITARHUB_SUPABASE_SERVICE_ROLE_KEY?.trim();
  let origin: string | null = null;
  try {
    const parsed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (parsed.origin === "https://drzuelosizfllruocmly.supabase.co" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash) origin = parsed.origin;
  } catch { /* An unset or malformed URL is unavailable below. */ }
  if (!origin || !serviceKey) throw new AccountHTTPError(503, "account_service_unavailable");
  return serviceClient(origin, serviceKey);
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
  for (const code of ["purchase_owner_conflict", "purchase_already_linked", "purchase_event_conflict", "attempt_identity_conflict", "sync_epoch_changed"]) {
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
  return storedPurchase(db, accountId, purchase);
}

/** The database decides ownership: a purchase linked to another account raises `purchase_already_linked`. */
export async function claimVerifiedPurchase(accountId: string, purchase: VerifiedLifetimePurchase, verifiedEmail: string | null) {
  const db = accountBackend();
  const result = await db.rpc("guitarhub_claim_apple_purchase", {
    p_account_id: accountUUID(accountId), p_purchase: purchase, p_email: verifiedEmail,
  });
  checkDatabaseError(result.error);
  return storedPurchase(db, accountId, purchase);
}

async function storedPurchase(db: ReturnType<typeof accountBackend>, accountId: string, purchase: VerifiedLifetimePurchase) {
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
  const result = await accountBackend().from("guitarhub_apple_purchases").select("transaction_id,original_transaction_id,app_account_token,claimed")
    .eq("account_id", accountUUID(accountId)).eq("environment", environment).limit(21);
  checkDatabaseError(result.error);
  if (!result.data || result.data.length > 20) throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data.map((row) => ({ transactionId: row.transaction_id as string, originalTransactionId: row.original_transaction_id as string, appAccountToken: accountUUID(row.app_account_token), claimed: row.claimed === true }));
}

export async function findPurchaseOwner(purchase: Pick<VerifiedLifetimePurchase, "environment" | "originalTransactionId">) {
  const result = await accountBackend().from("guitarhub_apple_purchases").select("account_id,app_account_token,claimed")
    .eq("environment", purchase.environment).eq("original_transaction_id", purchase.originalTransactionId).maybeSingle();
  checkDatabaseError(result.error);
  return result.data?.account_id ? { accountId: accountUUID(result.data.account_id), appAccountToken: accountUUID(result.data.app_account_token), claimed: result.data.claimed === true } : null;
}

/** Production must count only live-mode Stripe purchases; previews and local runs accept test mode. */
export function stripeLiveRequired(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export async function listStripePurchases(email: string): Promise<StripePurchase[]> {
  const result = await accountBackend().from("guitarhub_stripe_purchases")
    .select("checkout_session_id,payment_intent_id,email,livemode,amount_total,currency,purchased_at,refunded_at")
    .eq("email", normalizeEmail(email)).limit(21);
  checkDatabaseError(result.error);
  if (!result.data || result.data.length > 20) throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data.map((row) => ({ checkoutSessionId: row.checkout_session_id as string, paymentIntentId: row.payment_intent_id as string,
    email: row.email as string, livemode: row.livemode === true, amountTotal: row.amount_total as number, currency: row.currency as string,
    purchasedAt: row.purchased_at as string, refundedAt: (row.refunded_at as string | null) ?? null }));
}

/** Idempotent on `eventId`, and on the Checkout Session: the success page and the webhook may both record one sale. */
export async function recordStripePurchase(eventId: string, type: string, purchase: StripePurchase): Promise<"recorded" | "duplicate"> {
  const result = await accountBackend().rpc("guitarhub_record_stripe_purchase", { p_event_id: eventId, p_type: type, p_purchase: purchase });
  checkDatabaseError(result.error);
  if (result.data !== "recorded" && result.data !== "duplicate") throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data;
}

/** Idempotent on `eventId`. `unknown_purchase` stores nothing, so Stripe's retry can land after the purchase is recorded. */
export async function refundStripePurchase(eventId: string, paymentIntentId: string, refundedAt: string): Promise<"refunded" | "duplicate" | "unknown_purchase"> {
  const result = await accountBackend().rpc("guitarhub_refund_stripe_purchase", { p_event_id: eventId, p_payment_intent_id: paymentIntentId, p_refunded_at: refundedAt });
  checkDatabaseError(result.error);
  if (result.data !== "refunded" && result.data !== "duplicate" && result.data !== "unknown_purchase") throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data;
}

export async function getFreeModule(accountId: string): Promise<string | null> {
  const result = await accountBackend().from("guitarhub_free_modules").select("module_id").eq("account_id", accountUUID(accountId)).maybeSingle();
  checkDatabaseError(result.error);
  return (result.data?.module_id as string | undefined) ?? null;
}

export async function setFreeModule(accountId: string, moduleId: string): Promise<string> {
  const result = await accountBackend().rpc("guitarhub_set_free_module", { p_account_id: accountUUID(accountId), p_module_id: moduleId });
  checkDatabaseError(result.error);
  if (typeof result.data !== "string") throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data;
}

/** Deletes attempts, free module, binding and email sign-ups; purchase rows stay, tagged with the email. */
export async function deleteAccountData(accountId: string, verifiedEmail: string | null): Promise<void> {
  const result = await accountBackend().rpc("guitarhub_delete_account", { p_account_id: accountUUID(accountId), p_email: verifiedEmail });
  checkDatabaseError(result.error);
}

export async function identityInUse(accountId: string): Promise<boolean> {
  const result = await accountBackend().rpc("guitarhub_identity_in_use", { p_account_id: accountUUID(accountId) });
  checkDatabaseError(result.error);
  if (typeof result.data !== "boolean") throw new AccountHTTPError(503, "account_service_unavailable");
  return result.data;
}

/** Hard-deletes the Supabase Auth user. An already-deleted user counts as done, so a retry succeeds. */
export async function deleteIdentity(accountId: string): Promise<void> {
  const result = await accountBackend().auth.admin.deleteUser(accountUUID(accountId));
  if (result.error && result.error.status !== 404) throw new AccountHTTPError(503, "account_service_unavailable");
}
