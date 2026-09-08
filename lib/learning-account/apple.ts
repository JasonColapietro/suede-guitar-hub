import { X509Certificate } from "node:crypto";
import { AppStoreServerAPIClient, Environment, SignedDataVerifier, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { accountUUID, GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, LearningAccountError, type StoreEnvironment, type VerifiedLifetimePurchase } from "./contracts.ts";

// Public Apple PKI certificate, downloaded and checked 2026-09-07. No client root override.
const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
export type AppleLearningConfiguration = {
  environment: StoreEnvironment;
  appAppleId: number;
  appleRootCertificates: Buffer[];
  issuerId: string;
  keyId: string;
  /** Read from an approved secret provider in memory; never from a request or log. */
  signingKey: string;
};

const transactionID = (value: unknown): value is string => typeof value === "string" && /^\d{1,40}$/.test(value);
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000_000;

/** Business validation only. Call exclusively on the official verifier's returned payload. */
export function validateVerifiedLifetimePayload(payload: JWSTransactionDecodedPayload, environment: StoreEnvironment): VerifiedLifetimePurchase {
  if (payload.bundleId !== GUITARHUB_BUNDLE_ID || payload.productId !== GUITARHUB_LIFETIME_PRODUCT_ID || payload.type !== "Non-Consumable" || payload.environment !== environment || payload.quantity !== 1) throw new LearningAccountError("purchase_not_supported");
  if (!transactionID(payload.originalTransactionId) || !transactionID(payload.transactionId) || !timestamp(payload.purchaseDate) || !timestamp(payload.signedDate) || payload.purchaseDate > payload.signedDate) throw new LearningAccountError("invalid_purchase");
  if (payload.inAppOwnershipType !== "PURCHASED") throw new LearningAccountError("ownership_recovery_required");
  if (!payload.appAccountToken) throw new LearningAccountError("ownership_recovery_required");
  const appAccountToken = accountUUID(payload.appAccountToken);
  if (payload.revocationDate !== undefined && !timestamp(payload.revocationDate)) throw new LearningAccountError("invalid_purchase");
  if (payload.revocationReason !== undefined && payload.revocationDate === undefined) throw new LearningAccountError("invalid_purchase");
  return {
    environment, originalTransactionId: payload.originalTransactionId, transactionId: payload.transactionId,
    bundleId: GUITARHUB_BUNDLE_ID, productId: GUITARHUB_LIFETIME_PRODUCT_ID, appAccountToken,
    purchasedAt: new Date(payload.purchaseDate).toISOString(), signedAt: new Date(payload.signedDate).toISOString(),
    revokedAt: payload.revocationDate === undefined ? null : new Date(payload.revocationDate).toISOString(),
  };
}

function boundedJWS(value: string): void {
  if (typeof value !== "string" || value.length < 20 || value.length > 65_536 || value.split(".").length !== 3) throw new LearningAccountError("invalid_signed_purchase");
}

/** Server-only factory. Failures never return a grant, decoded fallback, or provider error text. */
export function createAppleLearningVerifier(configuration: AppleLearningConfiguration) {
  if (!["Production", "Sandbox"].includes(configuration.environment) || !Number.isSafeInteger(configuration.appAppleId) || configuration.appAppleId <= 0 || !configuration.issuerId || !configuration.keyId || !configuration.signingKey || configuration.appleRootCertificates.length === 0) throw new LearningAccountError("apple_verification_unavailable");
  try {
    for (const root of configuration.appleRootCertificates) {
      const certificate = new X509Certificate(root);
      if (!certificate.ca || certificate.fingerprint256.replaceAll(":", "").toLowerCase() !== APPLE_ROOT_G3_SHA256) throw new Error("Unapproved root");
    }
  } catch { throw new LearningAccountError("apple_verification_unavailable"); }
  const environment = configuration.environment === "Production" ? Environment.PRODUCTION : Environment.SANDBOX;
  // Online certificate status checks are mandatory; StoreKit/Xcode local environments are excluded.
  const verifier = new SignedDataVerifier(configuration.appleRootCertificates, true, environment, GUITARHUB_BUNDLE_ID, configuration.appAppleId);
  const api = new AppStoreServerAPIClient(configuration.signingKey, configuration.keyId, configuration.issuerId, GUITARHUB_BUNDLE_ID, environment);

  async function verify(signedTransaction: string): Promise<VerifiedLifetimePurchase> {
    boundedJWS(signedTransaction);
    try {
      const payload = await verifier.verifyAndDecodeTransaction(signedTransaction);
      return validateVerifiedLifetimePayload(payload, configuration.environment);
    } catch (error) {
      if (error instanceof LearningAccountError) throw error;
      throw new LearningAccountError("apple_verification_failed");
    }
  }

  async function reconcileTransaction(transactionId: string): Promise<VerifiedLifetimePurchase> {
    if (!transactionID(transactionId)) throw new LearningAccountError("invalid_purchase");
    let signed: string | undefined;
    try { signed = (await api.getTransactionInfo(transactionId)).signedTransactionInfo; }
    catch { throw new LearningAccountError("apple_verification_unavailable"); }
    if (!signed) throw new LearningAccountError("apple_verification_failed");
    const current = await verify(signed);
    if (current.transactionId !== transactionId && current.originalTransactionId !== transactionId) throw new LearningAccountError("purchase_identity_mismatch");
    return current;
  }

  return {
    reconcileTransaction,
    async verifyPurchase(signedTransaction: string, binding: { accountId: string; appAccountToken: string }): Promise<VerifiedLifetimePurchase & { accountId: string }> {
      const accountId = accountUUID(binding.accountId);
      const expectedToken = accountUUID(binding.appAccountToken);
      const submitted = await verify(signedTransaction);
      if (submitted.appAccountToken !== expectedToken) throw new LearningAccountError("purchase_owner_conflict");
      // Certificate OCSP status and purchase refund status are distinct checks.
      const current = await reconcileTransaction(submitted.transactionId);
      if (current.originalTransactionId !== submitted.originalTransactionId || current.transactionId !== submitted.transactionId || current.appAccountToken !== expectedToken) throw new LearningAccountError("purchase_owner_conflict");
      return { ...current, accountId };
    },
    async verifyNotification(signedPayload: string): Promise<{ notificationId: string; purchase: VerifiedLifetimePurchase } | null> {
      boundedJWS(signedPayload);
      let notification;
      try { notification = await verifier.verifyAndDecodeNotification(signedPayload); }
      catch { throw new LearningAccountError("apple_verification_failed"); }
      if (!notification.notificationUUID) throw new LearningAccountError("invalid_notification");
      if (!notification.data?.signedTransactionInfo) return null;
      const event = await verify(notification.data.signedTransactionInfo);
      const purchase = await reconcileTransaction(event.transactionId);
      if (purchase.originalTransactionId !== event.originalTransactionId || purchase.appAccountToken !== event.appAccountToken) throw new LearningAccountError("purchase_identity_mismatch");
      return { notificationId: notification.notificationUUID, purchase };
    },
  };
}
