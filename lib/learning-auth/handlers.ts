import { accountUUID, parseLearningAttempt, lifetimeTracks, LearningAccountError, type LearningTrack, type VerifiedLifetimePurchase, type StoreEnvironment } from "../learning-account/contracts.ts";
import { accountJSON, accountErrorResponse, attemptCursor, boundedAccountBody, requireAccountMutationOrigin, AccountHTTPError } from "./http.ts";

export type AccountBinding = { appAccountToken: string; syncEpoch: string };
export type StoredPurchase = { transactionId: string; originalTransactionId: string; appAccountToken: string };
export type AttemptPageRow = { sequence: string; body: unknown };
export type LearningHandlerDependencies = {
  enabled(): boolean;
  resolveAccount(request: Request): Promise<{ accountId: string } | null>;
  getBinding(accountId: string, create: boolean): Promise<AccountBinding | null>;
  listAttempts(accountId: string, cursor: string): Promise<AttemptPageRow[]>;
  listPurchases(accountId: string, environment: StoreEnvironment): Promise<StoredPurchase[]>;
  findPurchaseOwner(purchase: VerifiedLifetimePurchase): Promise<{ accountId: string; appAccountToken: string } | null>;
  appendAttempts(accountId: string, syncEpoch: string, attempts: unknown[]): Promise<unknown>;
  clearHistory(accountId: string, syncEpoch: string): Promise<string>;
  recordPurchase(accountId: string, purchase: VerifiedLifetimePurchase): Promise<VerifiedLifetimePurchase>;
  verifier(): Promise<{
    verifyPurchase(signed: string, binding: { accountId: string; appAccountToken: string }): Promise<VerifiedLifetimePurchase & { accountId: string }>;
    reconcileTransaction(id: string): Promise<VerifiedLifetimePurchase>;
    verifyNotification(signed: string): Promise<{ notificationId: string; purchase: VerifiedLifetimePurchase } | null>;
  }>;
  environment(): StoreEnvironment;
  allowedLessons: ReadonlyMap<string, LearningTrack>;
};

function bodyOwner(body: Record<string, unknown>, accountId: string): void {
  if (accountUUID(body.accountId) !== accountId) throw new LearningAccountError("account_changed");
}

/** Shared by the API and server-rendered access decision; never caches provider state. */
export async function reconcileLearningAccess(deps: Pick<LearningHandlerDependencies, "environment" | "listPurchases" | "verifier" | "recordPurchase">, accountId: string) {
  const environment = deps.environment();
  const rows = await deps.listPurchases(accountId, environment);
  const tracks = new Set<LearningTrack>();
  if (rows.length) {
    const verifier = await deps.verifier();
    for (const row of rows) {
      const purchase = await verifier.reconcileTransaction(row.transactionId);
      if (purchase.environment !== environment || purchase.originalTransactionId !== row.originalTransactionId || purchase.appAccountToken !== row.appAccountToken) throw new LearningAccountError("purchase_owner_conflict");
      const recorded = await deps.recordPurchase(accountId, purchase);
      lifetimeTracks(recorded, environment).forEach((track) => tracks.add(track));
    }
  }
  return { accountId, tracks: [...tracks], environment };
}

/** These are the production route implementations; dependencies isolate provider I/O for tests. */
export function createLearningHandlers(deps: LearningHandlerDependencies) {
  const route = (fn: (request: Request) => Promise<Response>) => async (request: Request) => {
    try {
      if (!deps.enabled()) throw new AccountHTTPError(503, "account_service_unavailable");
      return await fn(request);
    } catch (error) { return accountErrorResponse(error); }
  };
  const signedIn = async (request: Request, mutation = false): Promise<string> => {
    if (mutation) requireAccountMutationOrigin(request);
    const account = await deps.resolveAccount(request);
    if (!account) throw new AccountHTTPError(401, "sign_in_required");
    return accountUUID(account.accountId);
  };
  const bindingFor = async (accountId: string, create = false): Promise<AccountBinding> => {
    const binding = await deps.getBinding(accountId, create);
    if (!binding) throw new AccountHTTPError(409, "account_binding_required");
    return { appAccountToken: accountUUID(binding.appAccountToken), syncEpoch: accountUUID(binding.syncEpoch) };
  };
  return {
    binding: route(async (request) => {
      const accountId = await signedIn(request, true);
      return accountJSON({ accountId, ...await bindingFor(accountId, true) });
    }),
    readAttempts: route(async (request) => {
      const accountId = await signedIn(request);
      const params = new URL(request.url).searchParams;
      const cursor = attemptCursor(params.get("after"));
      const expectedEpoch = params.get("syncEpoch");
      const binding = await bindingFor(accountId);
      if ((cursor !== "0" && !expectedEpoch) || (expectedEpoch && accountUUID(expectedEpoch) !== binding.syncEpoch)) throw new LearningAccountError("sync_epoch_changed");
      const result = await deps.listAttempts(accountId, cursor);
      // UTF-8 can be larger than the bounded JSON string length. Keep the
      // complete response comfortably below the hosting payload limit, while
      // advancing only across records actually returned to this client.
      const page: AttemptPageRow[] = [];
      let pageBytes = 2_048;
      for (const row of result.slice(0, 100)) {
        const bytes = new TextEncoder().encode(JSON.stringify(row.body)).byteLength + 1;
        if (pageBytes + bytes > 2_000_000) {
          if (page.length === 0) throw new AccountHTTPError(503, "attempt_page_too_large");
          break;
        }
        page.push(row);
        pageBytes += bytes;
      }
      const nextBinding = await bindingFor(accountId);
      if (nextBinding.syncEpoch !== binding.syncEpoch) throw new LearningAccountError("sync_epoch_changed");
      const lastCursor = page.length ? attemptCursor(page.at(-1)!.sequence) : cursor;
      return accountJSON({ accountId, syncEpoch: binding.syncEpoch, attempts: page.map((row) => row.body), cursor: lastCursor,
        nextCursor: result.length > page.length ? lastCursor : null });
    }),
    appendAttempts: route(async (request) => {
      const accountId = await signedIn(request, true);
      const body = await boundedAccountBody(request);
      bodyOwner(body, accountId);
      if (!Array.isArray(body.attempts) || body.attempts.length < 1 || body.attempts.length > 100) throw new AccountHTTPError(400, "invalid_attempt_batch");
      const attempts = body.attempts.map((input) => parseLearningAttempt(input, deps.allowedLessons));
      const syncEpoch = accountUUID(body.syncEpoch);
      const acknowledged = await deps.appendAttempts(accountId, syncEpoch, attempts);
      return accountJSON({ accountId, syncEpoch, acknowledged });
    }),
    clearHistory: route(async (request) => {
      const accountId = await signedIn(request, true);
      const body = await boundedAccountBody(request, 1_024);
      bodyOwner(body, accountId);
      if (body.confirmation !== "DELETE_GUITARHUB_CLOUD_HISTORY") throw new AccountHTTPError(400, "confirmation_required");
      return accountJSON({ accountId, syncEpoch: await deps.clearHistory(accountId, accountUUID(body.syncEpoch)) });
    }),
    access: route(async (request) => {
      const accountId = await signedIn(request);
      return accountJSON(await reconcileLearningAccess(deps, accountId));
    }),
    purchase: route(async (request) => {
      const accountId = await signedIn(request, true);
      const body = await boundedAccountBody(request, 70_000);
      bodyOwner(body, accountId);
      if (typeof body.signedTransaction !== "string") throw new AccountHTTPError(400, "invalid_signed_purchase");
      const binding = await bindingFor(accountId);
      const environment = deps.environment();
      const purchase = await (await deps.verifier()).verifyPurchase(body.signedTransaction, { accountId, appAccountToken: binding.appAccountToken });
      if (purchase.accountId !== accountId || purchase.appAccountToken !== binding.appAccountToken || purchase.environment !== environment) throw new LearningAccountError("purchase_owner_conflict");
      const recorded = await deps.recordPurchase(accountId, purchase);
      return accountJSON({ accountId, tracks: lifetimeTracks(recorded, environment), environment });
    }),
    notification: route(async (request) => {
      const body = await boundedAccountBody(request, 70_000);
      if (typeof body.signedPayload !== "string") throw new AccountHTTPError(400, "invalid_notification");
      const environment = deps.environment();
      const event = await (await deps.verifier()).verifyNotification(body.signedPayload);
      if (!event) return accountJSON({ received: true });
      if (event.purchase.environment !== environment) throw new LearningAccountError("purchase_identity_mismatch");
      const owner = await deps.findPurchaseOwner(event.purchase);
      if (!owner) return accountJSON({ received: true });
      if (owner.appAccountToken !== event.purchase.appAccountToken) throw new LearningAccountError("purchase_owner_conflict");
      await deps.recordPurchase(accountUUID(owner.accountId), event.purchase);
      return accountJSON({ received: true });
    }),
  };
}
