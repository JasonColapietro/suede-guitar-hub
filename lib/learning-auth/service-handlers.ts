import { captureRecordedPurchase } from "../intake/capture";
import { allLessons } from "../learning/curriculum";
import type { LearningTrack } from "../learning-account/contracts";
import { accountConfiguration } from "./config";
import { resolveAccount } from "./server";
import { createLearningHandlers } from "./handlers";
import { getAccountBinding, listAccountAttempts, listAccountPurchases, findPurchaseOwner, appendAccountAttempts, clearAccountHistory, recordVerifiedPurchase, appleLearningVerifier, purchaseEnvironment, listStripePurchases, stripeLiveRequired, getFreeModule, setFreeModule } from "./backend";

const allowedLessons = new Map<string, LearningTrack>([...allLessons("guitar").map((entry) => [entry.lesson.id, "guitar"] as const),
  ...allLessons("voice").map((entry) => [entry.lesson.id, "voice"] as const)]);

export const learningHandlers = createLearningHandlers({
  enabled: () => accountConfiguration() !== null,
  resolveAccount: async (request) => {
    const account = await resolveAccount(request);
    return account ? { accountId: account.user.id, verifiedEmail: account.verifiedEmail } : null;
  },
  getBinding: getAccountBinding, listAttempts: listAccountAttempts, listPurchases: listAccountPurchases, findPurchaseOwner,
  appendAttempts: appendAccountAttempts, clearHistory: clearAccountHistory, recordPurchase: recordVerifiedPurchase,
  capturePurchase: captureRecordedPurchase,
  listStripePurchases, stripeLiveRequired, getFreeModule, setFreeModule,
  verifier: appleLearningVerifier, environment: purchaseEnvironment, allowedLessons,
});
