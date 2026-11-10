import { cache } from "react";
import type { LearningTrack } from "../learning-account/contracts";
import { accountConfiguration } from "./config";
import { resolveAccount } from "./server";
import { reconcileLearningAccess } from "./handlers";
import { listAccountPurchases, appleLearningVerifier, purchaseEnvironment, recordVerifiedPurchase, listStripePurchases, stripeLiveRequired, getFreeModule } from "./backend";

export type VerifiedLearningAccess = {
  enabled: boolean;
  accountId: string | null;
  tracks: LearningTrack[];
  status: "disabled" | "signedOut" | "verified" | "unavailable";
  freeModuleId: string | null;
  purchaseSource: "apple" | "stripe" | null;
};

/** React memoization is scoped to a server render/request, never a cross-request grant cache. */
export const getVerifiedLearningAccess = cache(async (): Promise<VerifiedLearningAccess> => {
  if (!accountConfiguration()) return { enabled: false, accountId: null, tracks: [], status: "disabled", freeModuleId: null, purchaseSource: null };
  let accountId: string | null = null;
  try {
    const account = await resolveAccount();
    if (!account) return { enabled: true, accountId: null, tracks: [], status: "signedOut", freeModuleId: null, purchaseSource: null };
    accountId = account.user.id;
    const access = await reconcileLearningAccess({ listPurchases: listAccountPurchases, verifier: appleLearningVerifier, environment: purchaseEnvironment, recordPurchase: recordVerifiedPurchase,
      listStripePurchases, stripeLiveRequired, getFreeModule }, accountId, account.verifiedEmail);
    return { enabled: true, accountId, tracks: access.tracks, status: "verified", freeModuleId: access.freeModuleId, purchaseSource: access.purchaseSource };
  } catch { return { enabled: true, accountId, tracks: [], status: "unavailable", freeModuleId: null, purchaseSource: null }; }
});
