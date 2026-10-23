import { after } from "next/server";
import { allLessons } from "../learning/curriculum";
import type { LearningTrack } from "../learning-account/contracts";
import { accountConfiguration } from "./config";
import { resolveAccount } from "./server";
import { createLearningHandlers } from "./handlers";
import { forwardToIntake } from "../intake-forward";
import { getAccountBinding, listAccountAttempts, listAccountPurchases, findPurchaseOwner, appendAccountAttempts, clearAccountHistory, recordVerifiedPurchase, appleLearningVerifier, purchaseEnvironment } from "./backend";

const allowedLessons = new Map<string, LearningTrack>([...allLessons("guitar").map((entry) => [entry.lesson.id, "guitar"] as const),
  ...allLessons("voice").map((entry) => [entry.lesson.id, "voice"] as const)]);

export const learningHandlers = createLearningHandlers({
  enabled: () => accountConfiguration() !== null,
  resolveAccount: async (request) => {
    const account = await resolveAccount(request);
    return account ? { accountId: account.user.id } : null;
  },
  getBinding: getAccountBinding, listAttempts: listAccountAttempts, listPurchases: listAccountPurchases, findPurchaseOwner,
  appendAttempts: appendAccountAttempts, clearHistory: clearAccountHistory, recordPurchase: recordVerifiedPurchase,
  verifier: appleLearningVerifier, environment: purchaseEnvironment, allowedLessons,
  // Runs after the response. The ledger row is the record, so neither the buyer
  // nor Apple's notification delivery waits on the hub's retries.
  forwardIntake: (event) => after(() => forwardToIntake(event)),
});
