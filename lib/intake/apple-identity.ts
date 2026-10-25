import { createHash } from "node:crypto";
import { GUITARHUB_BUNDLE_ID, GUITARHUB_LIFETIME_PRODUCT_ID, type StoreEnvironment, type VerifiedLifetimePurchase } from "../learning-account/contracts.ts";

/** Local domain projection, not the hub wire contract. No production route imports this module. */
export type AppleIntakeSnapshot = {
  readonly purchaseKey: string;
  readonly environment: StoreEnvironment;
  readonly productId: typeof GUITARHUB_LIFETIME_PRODUCT_ID;
  readonly purchasedAt: string;
  readonly observedAt: string;
  readonly revokedAt: string | null;
  readonly state: "active" | "revoked";
};

function invalid(): never { throw new Error("invalid_intake_purchase"); }

function instant(value: string): string {
  // Date.parse alone accepts impossible calendar dates such as February 30.
  const match = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return invalid();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const milliseconds = Date.parse(value);
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > maxDay || !Number.isFinite(milliseconds)) return invalid();
  return new Date(milliseconds).toISOString();
}

/**
 * Call only with the authoritative resulting ledger row after Apple verification.
 * Purchase/restore/notification ingress shares the original transaction identity;
 * transaction IDs, notification UUIDs, account IDs and tokens cannot split it.
 * `observedAt` permits later reconciliation without inventing a hub lifecycle ID.
 * The hub owner must still specify how snapshots update one purchase ticket.
 */
export function appleIntakeSnapshot(purchase: VerifiedLifetimePurchase): AppleIntakeSnapshot {
  if (!purchase || !["Production", "Sandbox"].includes(purchase.environment)
    || purchase.bundleId !== GUITARHUB_BUNDLE_ID || purchase.productId !== GUITARHUB_LIFETIME_PRODUCT_ID
    || typeof purchase.originalTransactionId !== "string" || !/^\d{1,40}$/.test(purchase.originalTransactionId)) return invalid();
  const purchasedAt = instant(purchase.purchasedAt);
  const observedAt = instant(purchase.signedAt);
  const revokedAt = purchase.revokedAt === null ? null : instant(purchase.revokedAt);
  if (observedAt < purchasedAt || (revokedAt !== null && (revokedAt < purchasedAt || revokedAt > observedAt))) return invalid();
  const identity = JSON.stringify([purchase.environment, purchase.bundleId, purchase.productId, purchase.originalTransactionId]);
  return {
    purchaseKey: `guitarhub:apple:${createHash("sha256").update(identity).digest("hex")}`,
    environment: purchase.environment,
    productId: GUITARHUB_LIFETIME_PRODUCT_ID,
    purchasedAt, observedAt, revokedAt,
    state: revokedAt === null ? "active" : "revoked",
  };
}
