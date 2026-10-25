import { randomUUID } from "node:crypto";
import type { CohortApplication } from "../application.ts";
import type { VerifiedLifetimePurchase } from "../learning-account/contracts.ts";
import { HostedIntakeOutbox } from "./hosted-outbox.ts";

export type PurchaseCaptureStore = {
  enqueueAcceptedPurchase(purchase: VerifiedLifetimePurchase): string | Promise<string>;
  retainApple(purchase: VerifiedLifetimePurchase): string | Promise<string>;
};

/** A storage failure never reverses accepted fulfillment; ledger reconciliation can retry it. */
export async function capturePurchaseWithStore(purchase: VerifiedLifetimePurchase, store: PurchaseCaptureStore): Promise<void> {
  await store.enqueueAcceptedPurchase(purchase);
  await store.retainApple(purchase);
}

// Independent of environment credentials: operator readback/approval must precede
// changing this gate in reviewed code. No production storage or network runs today.
const ROUTE_CAPTURE_ENABLED = false;

async function hostedStore(): Promise<HostedIntakeOutbox> {
  const { accountBackend } = await import("../learning-auth/backend.ts");
  const backend = accountBackend();
  return new HostedIntakeOutbox((name, args, signal) => backend.rpc(name, args).abortSignal(signal));
}

/** Production capture seam. Never use ephemeral SQLite for hosted requests. */
export async function captureRecordedPurchase(purchase: VerifiedLifetimePurchase): Promise<void> {
  if (!ROUTE_CAPTURE_ENABLED) return;
  await capturePurchaseWithStore(purchase, await hostedStore());
}

/** Email remains the existing acceptance path while capture is disabled. */
export async function captureSubmittedApplication(application: CohortApplication): Promise<void> {
  if (!ROUTE_CAPTURE_ENABLED) return;
  // One receipt generated before persistence; outbox retry always reuses it.
  // Public resubmission is a new request, never a content-hash identity.
  const receiptId = randomUUID();
  await (await hostedStore()).enqueueApplication(application, receiptId, new Date().toISOString());
}

/** Reconstructs missed captures from authoritative rows without changing their event IDs. */
export async function recoverPurchaseCaptures(purchases: AsyncIterable<VerifiedLifetimePurchase>, store: PurchaseCaptureStore): Promise<number> {
  let count = 0;
  for await (const purchase of purchases) { await capturePurchaseWithStore(purchase, store); count += 1; }
  return count;
}
