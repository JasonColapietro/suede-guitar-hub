import { accountUUID, assertSyncScope, LearningAccountError, type LearningAttempt, type LearningSyncBinding, type LearningTrack } from "../learning-account/contracts.ts";
import { acknowledgeAccountUpload, emptyAccountSyncQueue, enqueueAccountAttempt, parseAccountAttemptPage, parseAccountSyncQueue, prepareAccountUpload } from "../learning-auth/sync.ts";

export interface SyncStorage { readonly length: number; key(index: number): string | null; getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export type SyncTransport = (url: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
export type SyncStatus = "off" | "pending" | "syncing" | "synced" | "error" | "suspended";
export interface SyncSnapshot { status: SyncStatus; pending: number; attempts: LearningAttempt[]; error: string | null; enabled: boolean }
type Consent = LearningSyncBinding & { enabled: boolean; enabledAt: number; token: string };
const ROOT = "guitarhub.account-sync.v1.";
export const activeSyncAccountKey = `${ROOT}active`;
const consentKey = (accountId: string) => `${ROOT}${accountId}.consent`;
const prefix = (binding: LearningSyncBinding) => `${ROOT}${binding.accountId}.${binding.syncEpoch}.`;
const initialSnapshot = (): SyncSnapshot => ({ status: "off", pending: 0, attempts: [], error: null, enabled: false });

/** Each immutable event has its own key. Concurrent tabs never replace a shared queue array. */
export class AccountSyncClient {
  private snapshot = initialSnapshot();
  private listeners = new Set<() => void>();
  private generation = 0;
  private abort: AbortController | null = null;
  private running: Promise<void> | null = null;
  private observedToken: string | null = null;
  private disposed = false;
  readonly accountId: string;
  private storage: SyncStorage;
  private transport: SyncTransport;
  private lessons: ReadonlyMap<string, LearningTrack>;
  private uuid: () => string;
  private now: () => number;
  constructor(accountId: string, storage: SyncStorage, transport: SyncTransport, lessons: ReadonlyMap<string, LearningTrack>, uuid: () => string, now = Date.now) {
    this.accountId = accountUUID(accountId); this.storage = storage; this.transport = transport; this.lessons = lessons; this.uuid = uuid; this.now = now;
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  private publish(update: Partial<SyncSnapshot>) { this.snapshot = { ...this.snapshot, ...update }; this.listeners.forEach(listener => listener()); }
  private keys(start: string) { const keys: string[] = []; for (let i = 0; i < this.storage.length; i++) { const key = this.storage.key(i); if (key?.startsWith(start)) keys.push(key); } return keys.sort(); }
  private consent(): Consent | null {
    const raw = this.storage.getItem(consentKey(this.accountId));
    if (!raw) return null;
    let data: Consent;
    try { data = JSON.parse(raw) as Consent; } catch { throw new LearningAccountError("invalid_sync_queue"); }
    if (!data || typeof data !== "object") throw new LearningAccountError("invalid_sync_queue");
    assertSyncScope(data, { accountId: this.accountId, syncEpoch: accountUUID(data.syncEpoch) });
    if (typeof data.enabled !== "boolean" || !Number.isFinite(data.enabledAt) || typeof data.token !== "string") throw new LearningAccountError("invalid_sync_queue");
    return data;
  }
  private active() { return !this.disposed && this.storage.getItem(activeSyncAccountKey) === this.accountId; }
  private current(expected: Consent, generation: number) {
    const current = this.consent();
    if (generation !== this.generation || !this.active() || !current?.enabled || current.token !== expected.token) throw new LearningAccountError("account_changed");
    assertSyncScope(expected, current);
    return current;
  }
  private events(binding: LearningSyncBinding, area: "outbox" | "inbox") {
    const queue = emptyAccountSyncQueue(binding);
    for (const key of this.keys(`${prefix(binding)}${area}.`)) {
      const raw = this.storage.getItem(key);
      if (raw === null) continue;
      // Invalid bytes remain untouched for recovery; processing stops visibly instead of discarding them.
      const event = parseAccountSyncQueue(raw, binding, this.lessons);
      if (event.attempts.length !== 1 || !key.endsWith(`.${event.attempts[0].id}`)) throw new LearningAccountError("invalid_sync_queue");
      queue.attempts.push(event.attempts[0]);
    }
    return queue;
  }
  private put(binding: LearningSyncBinding, area: "outbox" | "inbox", attempt: LearningAttempt) {
    const key = `${prefix(binding)}${area}.${attempt.id}`;
    const existing = this.storage.getItem(key);
    const queue = existing ? parseAccountSyncQueue(existing, binding, this.lessons) : emptyAccountSyncQueue(binding);
    if (existing && (queue.attempts.length !== 1 || queue.attempts[0].id !== attempt.id)) throw new LearningAccountError("invalid_sync_queue");
    const updated = enqueueAccountAttempt(queue, binding, attempt, this.lessons);
    if (!existing) this.storage.setItem(key, JSON.stringify(updated));
  }
  private refresh(status?: SyncStatus) {
    const consent = this.consent();
    if (!this.active()) { this.publish({ status: "suspended", enabled: false, attempts: [], pending: 0 }); return; }
    if (!consent) { this.publish(initialSnapshot()); return; }
    const outbox = this.events(consent, "outbox");
    const all = new Map<string, LearningAttempt>();
    // A cloud reset archives an epoch; it does not erase this device's evidence or re-enqueue it.
    const accountPrefix = `${ROOT}${this.accountId}.`;
    for (const key of this.keys(accountPrefix)) {
      const suffix = key.slice(accountPrefix.length).split(".");
      if (suffix.length !== 3 || !["inbox", "outbox"].includes(suffix[1])) continue;
      const scope = { accountId: this.accountId, syncEpoch: accountUUID(suffix[0]) };
      const raw = this.storage.getItem(key);
      if (raw === null) continue;
      const record = parseAccountSyncQueue(raw, scope, this.lessons);
      if (record.attempts.length !== 1 || record.attempts[0].id !== suffix[2]) throw new LearningAccountError("invalid_sync_queue");
      const attempt = record.attempts[0], previous = all.get(attempt.id);
      if (previous) enqueueAccountAttempt({ ...emptyAccountSyncQueue(scope), attempts: [previous] }, scope, attempt, this.lessons);
      all.set(attempt.id, attempt);
    }
    this.observedToken = consent.token;
    this.publish({ attempts: [...all.values()], pending: outbox.attempts.length, enabled: consent.enabled, error: null, status: status ?? (consent.enabled ? outbox.attempts.length ? "pending" : "synced" : "off") });
  }
  private fail(error: unknown) { this.publish({ status: "error", error: error instanceof LearningAccountError ? error.code : "sync_unavailable" }); }
  activate() { this.disposed = false; try { this.storage.setItem(activeSyncAccountKey, this.accountId); this.refresh(); } catch (error) { this.fail(error); } }
  externalChange() {
    try {
      if (!this.active() || this.consent()?.token !== this.observedToken) { this.generation++; this.abort?.abort(); }
      this.refresh();
    } catch (error) { this.fail(error); }
  }
  dispose() { this.disposed = true; this.generation++; this.abort?.abort(); }
  private async request(url: string, init: RequestInit) {
    const response = await this.transport(url, { ...init, credentials: "same-origin", cache: "no-store", signal: this.abort?.signal });
    const body = await response.json();
    if (!response.ok) throw new LearningAccountError(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "sync_unavailable");
    return body;
  }
  async enable() {
    const generation = ++this.generation;
    this.abort?.abort(); this.abort = new AbortController();
    try {
      if (!this.active()) throw new LearningAccountError("account_changed");
      this.consent(); // Preserve malformed consent instead of silently replacing it.
      this.publish({ status: "syncing", error: null });
      const value = await this.request("/api/learning/binding", { method: "POST" }) as LearningSyncBinding;
      if (generation !== this.generation || !this.active()) return;
      const binding = { accountId: accountUUID(value.accountId), syncEpoch: accountUUID(value.syncEpoch) };
      assertSyncScope(binding, { accountId: this.accountId, syncEpoch: binding.syncEpoch });
      this.storage.setItem(consentKey(this.accountId), JSON.stringify({ ...binding, enabled: true, enabledAt: this.now(), token: this.uuid() }));
      this.refresh("pending");
    } catch (error) { if (generation === this.generation) this.fail(error); return; }
    await this.sync();
  }
  pause() {
    this.generation++; this.abort?.abort();
    try { const consent = this.consent(); if (consent) this.storage.setItem(consentKey(this.accountId), JSON.stringify({ ...consent, enabled: false, token: this.uuid() })); this.refresh("off"); } catch (error) { this.fail(error); }
  }
  /** Called synchronously before the sign-out form submits; history is retained. */
  suspend() { this.pause(); try { this.storage.setItem(activeSyncAccountKey, ""); } catch (error) { this.fail(error); } this.publish({ status: "suspended", enabled: false, attempts: [] }); }
  permitsLocalWrite() { try { return this.active(); } catch { return false; } }
  recordFailure(error: unknown) { this.fail(error); }
  acceptsNewEvent(createdAt: string) { try { const consent = this.consent(); return !!consent?.enabled && this.active() && Date.parse(createdAt) >= consent.enabledAt; } catch { return false; } }
  acceptsReadingAttempt(attempt: { id: string; lessonId: string; createdAt: string }) {
    if (this.acceptsNewEvent(attempt.createdAt)) return true;
    try {
      const consent = this.consent();
      if (!consent?.enabled || !this.active()) return false;
      // Continuing an already account-owned quiz is a new answer, not an import of guest history.
      return [...this.events(consent, "inbox").attempts, ...this.events(consent, "outbox").attempts].some(event => {
        const reading = event.details.readingQuizAttempt;
        return event.kind === "reading" && event.lessonId === attempt.lessonId && !!reading && typeof reading === "object" && "id" in reading && reading.id === attempt.id && "createdAt" in reading && typeof reading.createdAt === "string" && Date.parse(reading.createdAt) === Date.parse(attempt.createdAt);
      });
    } catch (error) { this.fail(error); return false; }
  }
  enqueue(attempt: LearningAttempt) {
    try {
      const consent = this.consent();
      if (!consent?.enabled || !this.active() || !this.acceptsNewEvent(attempt.createdAt)) return false;
      const queued = this.events(consent, "outbox");
      enqueueAccountAttempt(queued, consent, attempt, this.lessons);
      this.put(consent, "outbox", attempt); this.refresh("pending");
      return true;
    } catch (error) { this.fail(error); return false; }
  }
  sync(): Promise<void> {
    if (this.running) return this.running;
    const operation = this.run(); this.running = operation;
    void operation.finally(() => { if (this.running === operation) this.running = null; });
    return operation;
  }
  private async run() {
    const generation = this.generation;
    try {
      const consent = this.consent();
      if (!consent?.enabled || !this.active()) return;
      this.abort = new AbortController(); this.publish({ status: "syncing", error: null });
      // Bound work per run; remaining events stay durable and continue on the next wakeup.
      for (let batch = 0; batch < 10; batch++) {
        this.current(consent, generation);
        const queued = this.events(consent, "outbox");
        if (!queued.attempts.length) break;
        const upload = prepareAccountUpload(queued, consent), candidates = upload.attempts;
        upload.attempts = [];
        // Count UTF-8 JSON bytes, including the account/epoch envelope, array brackets and commas.
        const encoder = new TextEncoder();
        let bytes = encoder.encode(JSON.stringify(upload)).byteLength;
        for (const attempt of candidates) {
          const size = encoder.encode(JSON.stringify(attempt)).byteLength + (upload.attempts.length ? 1 : 0);
          if (bytes + size > 500_000) break;
          upload.attempts.push(attempt); bytes += size;
        }
        if (!upload.attempts.length) throw new LearningAccountError("sync_event_too_large");
        const sent = { ...queued, attempts: upload.attempts };
        const response = await this.request("/api/learning/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upload) });
        this.current(consent, generation);
        const remaining = acknowledgeAccountUpload(sent, consent, response);
        const remainingIds = new Set(remaining.attempts.map(attempt => attempt.id));
        const acknowledged = sent.attempts.filter(attempt => !remainingIds.has(attempt.id));
        if (!acknowledged.length) throw new LearningAccountError("invalid_sync_response");
        for (const attempt of acknowledged) {
          const key = `${prefix(consent)}outbox.${attempt.id}`;
          const currentRaw = this.storage.getItem(key);
          if (currentRaw !== null) {
            const currentEvent = parseAccountSyncQueue(currentRaw, consent, this.lessons);
            if (currentEvent.attempts.length !== 1) throw new LearningAccountError("invalid_sync_queue");
            enqueueAccountAttempt(currentEvent, consent, attempt, this.lessons);
          }
          this.put(consent, "inbox", attempt);
          this.storage.removeItem(key);
        }
      }
      const checkpoints = this.keys(`${prefix(consent)}cursor.`).map(key => key.slice(`${prefix(consent)}cursor.`.length)).filter(value => /^(0|[1-9]\d{0,18})$/.test(value));
      let after = checkpoints.reduce((largest, value) => BigInt(value) > BigInt(largest) ? value : largest, "0");
      for (let page = 0; page < 100; page++) {
        this.current(consent, generation);
        const response = await this.request(`/api/learning/attempts?after=${after}&syncEpoch=${consent.syncEpoch}`, { method: "GET" });
        this.current(consent, generation);
        const parsed = parseAccountAttemptPage(response, consent, this.lessons);
        if (BigInt(parsed.cursor) < BigInt(after) || (parsed.attempts.length > 0 && BigInt(parsed.cursor) <= BigInt(after))) throw new LearningAccountError("invalid_sync_response");
        for (const attempt of parsed.attempts) this.put(consent, "inbox", attempt);
        // Commit a cursor only after every event is durable. Immutable checkpoints cannot regress across tabs.
        this.storage.setItem(`${prefix(consent)}cursor.${parsed.cursor}`, "1");
        after = parsed.cursor;
        if (parsed.nextCursor === null) break;
        if (page === 99) throw new LearningAccountError("sync_more_history");
      }
      this.current(consent, generation); this.refresh();
    } catch (error) {
      if (generation === this.generation) {
        if (error instanceof LearningAccountError && ["account_changed", "sign_in_required"].includes(error.code)) this.suspend();
        else this.fail(error);
      }
    }
  }
  async resetCloudHistory() {
    this.pause();
    const generation = this.generation;
    this.abort = new AbortController();
    try {
      if (!this.active()) throw new LearningAccountError("account_changed");
      this.publish({ status: "syncing", error: null });
      const consent = this.consent();
      const value = consent ?? await this.request("/api/learning/binding", { method: "POST" }) as LearningSyncBinding;
      const binding = { accountId: accountUUID(value.accountId), syncEpoch: accountUUID(value.syncEpoch) };
      assertSyncScope(binding, { accountId: this.accountId, syncEpoch: binding.syncEpoch });
      if (generation !== this.generation || !this.active()) return;
      const response = await this.request("/api/learning/attempts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...binding, confirmation: "DELETE_GUITARHUB_CLOUD_HISTORY" }) }) as LearningSyncBinding;
      const paused = this.consent();
      if (generation !== this.generation || !this.active() || paused?.enabled || (paused && paused.syncEpoch !== binding.syncEpoch)) return;
      const next = { accountId: accountUUID(response.accountId), syncEpoch: accountUUID(response.syncEpoch) };
      assertSyncScope(next, { accountId: this.accountId, syncEpoch: next.syncEpoch });
      if (next.syncEpoch === binding.syncEpoch) throw new LearningAccountError("invalid_sync_response");
      this.storage.setItem(consentKey(this.accountId), JSON.stringify({ ...next, enabled: false, enabledAt: this.now(), token: this.uuid() }));
      this.refresh("off");
    } catch (error) { if (generation === this.generation) this.fail(error); }
  }
}
