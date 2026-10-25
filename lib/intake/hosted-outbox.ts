import { isStrictInstant } from "./contract.ts";
import { createHash } from "node:crypto";
import { appleIntakeSnapshot } from "./apple-identity.ts";
import { applicationEvent, purchaseEvent, sendIntakeEvent, type SenderConfig, type SenderEvent, type SendResult } from "./sender.ts";
import type { VerifiedLifetimePurchase } from "../learning-account/contracts.ts";

type Lane = "application" | "purchase" | "lifecycle" | "failure" | "spam" | "canary";
export type IntakeRPC = (name: string, args: Readonly<Record<string, unknown>>) => PromiseLike<{ data: unknown; error: unknown }>;
export type HostedJob = { id: string; body: SenderEvent; token: string; attempts: number };

/** RPC contract prepared in docs/intake/hosted-outbox-proposal.sql; never provisions anything. */
export class HostedIntakeOutbox {
  readonly rpc: IntakeRPC;
  constructor(rpc: IntakeRPC) { this.rpc = rpc; }
  async #call(name: string, args: Record<string, unknown>): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let result: { data: unknown; error: unknown };
    try {
      result = await Promise.race([Promise.resolve(this.rpc(name, args)), new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("intake_persistence_timeout")), 4000);
      })]);
    } finally { clearTimeout(timer); }
    if (result.error) throw new Error("intake_persistence_unavailable");
    return result.data;
  }
  async #put(id: string, lane: Lane, body: unknown, reason: string | null = null): Promise<string> {
    const result = await this.#call("guitarhub_intake_enqueue", { p_id: id, p_lane: lane, p_body: body, p_blocked_reason: reason });
    if (result !== id) throw new Error("intake_persistence_acknowledgement");
    return id;
  }
  enqueueApplication(input: unknown, receiptId: string, at: string): Promise<string> {
    const event = applicationEvent(input, receiptId, at);
    return this.#put(event.id, "application", event);
  }
  enqueueAcceptedPurchase(purchase: VerifiedLifetimePurchase): Promise<string> {
    const event = purchaseEvent(purchase);
    return this.#put(event.id, event.canary ? "canary" : "purchase", event);
  }
  retainApple(purchase: VerifiedLifetimePurchase): Promise<string> {
    const snapshot = appleIntakeSnapshot(purchase);
    const digest = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 32);
    return this.#put(`${snapshot.purchaseKey}:${digest}`, "lifecycle", snapshot, "purchase-lifecycle-contract");
  }
  retainFailure(id: string, code: "application-notification-failed" | "purchase-notification-failed", at: string): Promise<string> {
    if (!["application-notification-failed", "purchase-notification-failed"].includes(code) || !isStrictInstant(at)) throw new Error("invalid_failure_record");
    return this.#put(id, "failure", { code, occurredAt: new Date(at).toISOString() }, "failure-alert-contract");
  }
  async claim(): Promise<HostedJob | null> {
    const row = await this.#call("guitarhub_intake_claim", {});
    if (row === null) return null;
    if (typeof row !== "object" || !("id" in row) || typeof row.id !== "string" || !("body" in row) || !("token" in row) || typeof row.token !== "string" || !("attempts" in row) || typeof row.attempts !== "number" || !Number.isSafeInteger(row.attempts) || row.attempts < 1) throw new Error("intake_persistence_acknowledgement");
    return row as HostedJob;
  }
  async finish(job: HostedJob, result: SendResult, jitter = Math.random()): Promise<boolean> {
    const retryMs = result.state === "retry" ? Math.ceil(Math.max(result.retryAfterMs ?? 0, Math.min(3600000, 1000 * 2 ** Math.min(job.attempts, 12)) * (1 + Math.max(0, Math.min(1, jitter))))) : 0;
    const value = await this.#call("guitarhub_intake_finish", { p_id: job.id, p_token: job.token, p_state: result.state === "retry" ? "pending" : result.state, p_reason: "reason" in result ? result.reason : null, p_delay_ms: retryMs });
    if (typeof value !== "boolean") throw new Error("intake_persistence_acknowledgement");
    return value;
  }
  async repair(id: string): Promise<boolean> {
    const value = await this.#call("guitarhub_intake_repair", { p_id: id });
    if (typeof value !== "boolean") throw new Error("intake_persistence_acknowledgement");
    return value;
  }
  async dispatchOne(config: SenderConfig = {}, fetcher: typeof fetch = fetch): Promise<boolean> {
    if (!config.enabled) return false;
    const job = await this.claim();
    if (!job) return false;
    return this.finish(job, await sendIntakeEvent(job.body, config, fetcher));
  }
}
