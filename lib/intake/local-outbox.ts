import { isStrictInstant } from "./contract.ts";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { appleIntakeSnapshot } from "./apple-identity.ts";
import type { VerifiedLifetimePurchase } from "../learning-account/contracts.ts";
import { applicationEvent, purchaseEvent, sendIntakeEvent, type SenderEvent, type SenderConfig, type SendResult } from "./sender.ts";

type Lane = "application" | "purchase" | "lifecycle" | "failure" | "spam" | "canary";
type Job = { id: string; lane: Lane; body: string; state: string; attempts: number; token: string; lease_until: number; next_at: number; reason: string | null };
const LIMITS: Record<Lane, number> = { application: 10000, purchase: 10000, lifecycle: 10000, failure: 1000, spam: 100, canary: 100 };

/**
 * Durable local preparation adapter. Requires an explicit persistent file.
 * Never suitable for ephemeral Vercel/serverless disk; no routes import it.
 * A hosted durable adapter and acceptance transaction remain activation gates.
 */
export class LocalIntakeOutbox {
  readonly #db: DatabaseSync;
  constructor(filename: string) {
    if (!filename.startsWith("/") || filename === "/") throw new Error("persistent_outbox_path_required");
    this.#db = new DatabaseSync(filename);
    this.#db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000;
      CREATE TABLE IF NOT EXISTS intake_jobs (
        id TEXT PRIMARY KEY, lane TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0, token TEXT, lease_until INTEGER NOT NULL DEFAULT 0,
        next_at INTEGER NOT NULL DEFAULT 0, reason TEXT);
      CREATE INDEX IF NOT EXISTS intake_pending ON intake_jobs(state,next_at,lease_until);`);
  }
  close(): void { this.#db.close(); }
  get(id: string): Job | undefined { return this.#db.prepare("SELECT * FROM intake_jobs WHERE id=?").get(id) as Job | undefined; }
  #put(id: string, lane: Lane, body: string, blocked?: string): void {
    if (!/^[A-Za-z0-9][A-Za-z0-9:_.-]{7,127}$/.test(id) || Buffer.byteLength(body) > 65536) throw new Error("invalid_outbox_record");
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.get(id);
      if (old) { if (old.body !== body || old.lane !== lane) throw new Error("outbox_identity_conflict"); }
      else {
        const count = this.#db.prepare("SELECT count(*) AS count FROM intake_jobs WHERE lane=?").get(lane) as { count: number };
        if (count.count >= LIMITS[lane]) throw new Error(`outbox_capacity_${lane}`);
        this.#db.prepare("INSERT INTO intake_jobs(id,lane,body,state,reason) VALUES(?,?,?,?,?)").run(id, lane, body, blocked ? "blocked" : "pending", blocked ?? null);
      }
      this.#db.exec("COMMIT");
    } catch (error) { this.#db.exec("ROLLBACK"); throw error; }
  }
  enqueueApplication(input: unknown, receiptId: string, at: string): string {
    const event = applicationEvent(input, receiptId, at);
    this.#put(event.id, "application", JSON.stringify(event));
    return event.id;
  }
  enqueueAcceptedPurchase(purchase: VerifiedLifetimePurchase): string {
    const event = purchaseEvent(purchase);
    this.#put(event.id, event.canary ? "canary" : "purchase", JSON.stringify(event));
    return event.id;
  }
  /** No invented purchase lifecycle wire event: retain each canonical snapshot locally for future reconciliation. */
  retainApple(purchase: VerifiedLifetimePurchase): string {
    const snapshot = appleIntakeSnapshot(purchase);
    const id = `${snapshot.purchaseKey}:${createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 32)}`;
    this.#put(id, "lifecycle", JSON.stringify(snapshot), "purchase-lifecycle-contract");
    return id;
  }
  retainFailure(id: string, code: "application-notification-failed" | "purchase-notification-failed", at: string): void {
    if (!["application-notification-failed", "purchase-notification-failed"].includes(code) || !isStrictInstant(at)) throw new Error("invalid_failure_record");
    this.#put(id, "failure", JSON.stringify({ code, occurredAt: new Date(at).toISOString() }), "failure-alert-contract");
  }
  /** Only an observation category, never submitted spam-body keys or contact data. */
  retainObservation(id: string, lane: "spam" | "canary"): void {
    if (lane !== "spam" && lane !== "canary") throw new Error("invalid_observation_lane");
    this.#put(id, lane, JSON.stringify({ category: lane }), "observation-activation-held");
  }
  claim(now: number, leaseMs = 30000): Job | undefined {
    if (!Number.isSafeInteger(now) || !Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000) throw new Error("invalid_claim_time");
    return this.#db.prepare(`UPDATE intake_jobs SET state='working', token=?, lease_until=?, attempts=attempts+1
      WHERE id=(SELECT id FROM intake_jobs WHERE lane IN ('application','purchase','canary') AND
        ((state='pending' AND next_at<=?) OR (state='working' AND lease_until<=?)) ORDER BY next_at,id LIMIT 1)
      RETURNING *`).get(randomUUID(), now + leaseMs, now, now) as Job | undefined;
  }
  finish(job: Job, result: SendResult, now: number, jitter = Math.random()): boolean {
    const delay = result.state === "retry" ? Math.max(result.retryAfterMs ?? 0, Math.min(3600000, 1000 * 2 ** Math.min(job.attempts, 12)) * (1 + Math.max(0, Math.min(1, jitter)))) : 0;
    return this.#db.prepare("UPDATE intake_jobs SET state=?,reason=?,next_at=?,token=NULL,lease_until=0 WHERE id=? AND state='working' AND token=? AND lease_until>?")
      .run(result.state === "retry" ? "pending" : result.state, "reason" in result ? result.reason : null, now + Math.ceil(delay), job.id, job.token, now).changes === 1;
  }
  /** Repair only config/auth/payload-blocked applications after operator fixes; identity and bytes stay fixed. */
  retryBlockedApplication(id: string): boolean {
    return this.#db.prepare("UPDATE intake_jobs SET state='pending',next_at=0,reason=NULL WHERE id=? AND lane IN ('application','purchase','canary') AND json_extract(body,'$.kind') IN ('application','purchase') AND state='blocked'").run(id).changes === 1;
  }
  async dispatchOne(config: SenderConfig = {}, fetcher: typeof fetch = fetch, now = Date.now): Promise<boolean> {
    if (!config.enabled) return false;
    const job = this.claim(now());
    if (!job) return false;
    const result = await sendIntakeEvent(JSON.parse(job.body) as SenderEvent, config, fetcher, now);
    return this.finish(job, result, now());
  }
}
