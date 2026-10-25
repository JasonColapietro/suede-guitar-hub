import { isDraftHubEvent, isStrictInstant, signBody, validAcknowledgement } from "./contract.ts";
import { appleIntakeSnapshot } from "./apple-identity.ts";
import type { VerifiedLifetimePurchase } from "../learning-account/contracts.ts";
import { normalizeApplication } from "../application.ts";

/** Draft hub code, pinned for local preparation; activation is separately held. */
export const HUB_CONTRACT_SHA = "0b33f45a0bdde87b8e7746666d6200c17d0c4b82";
export type ApplicationEvent = {
  id: string; kind: "application"; property: "guitarhub.org"; occurredAt: string;
  summary: string; person: { email: string; name: string };
  details: { application_id: string; interest: "founding-room-application" };
};

export type PurchaseEvent = {
  id: string; kind: "purchase"; property: "guitarhub.org"; occurredAt: string;
  summary: "GuitarHub App Store purchase accepted";
  details: { provider: "apple"; product_id: "org.guitarhub.app.complete.lifetime"; order_id: string };
  canary?: true;
};
export type SenderEvent = ApplicationEvent | PurchaseEvent;

/** Immutable purchase acceptance; refunds/reinstatements are held as separate local snapshots. */
export function purchaseEvent(purchase: VerifiedLifetimePurchase): PurchaseEvent {
  const snapshot = appleIntakeSnapshot(purchase);
  return { id: snapshot.purchaseKey, kind: "purchase", property: "guitarhub.org", occurredAt: snapshot.purchasedAt,
    summary: "GuitarHub App Store purchase accepted", details: { provider: "apple", product_id: snapshot.productId, order_id: snapshot.purchaseKey },
    ...(snapshot.environment === "Sandbox" ? { canary: true as const } : {}) };
}

function prepareWireEvent(event: SenderEvent): SenderEvent {
  if (event.kind === "application") {
    const prepared = applicationEvent({ name: event.person.name, email: event.person.email, goal: event.details.interest, experience: "" }, event.details.application_id, event.occurredAt);
    if (event.id !== prepared.id || event.property !== "guitarhub.org") throw new Error("invalid_wire_payload");
    return prepared;
  }
  if (event.kind !== "purchase" || event.property !== "guitarhub.org" || !/^guitarhub:apple:[a-f0-9]{64}$/.test(event.id)
    || event.details.provider !== "apple" || event.details.product_id !== "org.guitarhub.app.complete.lifetime"
    || event.details.order_id !== event.id || event.summary !== "GuitarHub App Store purchase accepted" || (event.canary !== undefined && event.canary !== true)) throw new Error("invalid_wire_payload");
  return { id: event.id, kind: "purchase", property: "guitarhub.org", occurredAt: event.occurredAt,
    summary: "GuitarHub App Store purchase accepted", details: { provider: "apple", product_id: event.details.product_id, order_id: event.id },
    ...(event.canary ? { canary: true } : {}) };
}

function clean(value: string, max: number): string {
  const text = value.replace(/\u0000/g, "").toWellFormed();
  // Free text is not a safe carrier for arbitrary credentials. Omit it entirely
  // when it resembles a credential; do not retain fragments after truncation.
  if (/password|passwd|secret|token|api.?key|authorization|bearer\s|private key|cookie\s*:|\bAKIA[A-Z0-9]{16}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b|\beyJ[\w-]+\.[\w-]+\.[\w-]+|\b(?:sk|pk|rk)_(?:live|test)_|\bgh[pousr]_/i.test(text)) return "[omitted sensitive text]";
  const clipped = text.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi, (candidate) => {
    try { const url = new URL(candidate); url.username = ""; url.password = ""; url.search = ""; url.hash = ""; return url.toString(); }
    catch { return "[omitted URL]"; }
  }).slice(0, max);
  return clipped.isWellFormed() ? clipped : clipped.slice(0, -1);
}

/** Receipt identity must be generated once and persisted; never hash user form content. */
export function applicationEvent(input: unknown, receiptId: string, at: string): ApplicationEvent {
  const application = normalizeApplication(input);
  if (!application.ok || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(receiptId) || !isStrictInstant(at)) throw new Error("invalid_intake_application");
  const email = application.value.email;
  // Match the pinned hub's accepted email subset; never hide a secret in rescued details.
  if (!/^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i.test(email)) throw new Error("invalid_intake_email");
  return {
    id: `application:${receiptId.toLowerCase()}`, kind: "application", property: "guitarhub.org",
    occurredAt: new Date(at).toISOString(), summary: "GuitarHub founding room application",
    person: { email, name: clean(application.value.name, 120).replace(/\s+/g, " ").trim() },
    details: { application_id: receiptId.toLowerCase(), interest: "founding-room-application" },
  };
}

export type SendResult = { state: "delivered" } | { state: "blocked"; reason: string } | { state: "retry"; reason: string; retryAfterMs?: number };
export type SenderConfig = { enabled?: boolean; source?: string; secret?: string };

/** Entire operation, including response body, is bounded even for an injected fetch that ignores abort. */
export async function sendIntakeEvent(event: SenderEvent, config: SenderConfig = {}, fetcher: typeof fetch = fetch, now = Date.now, timeoutMs = 4000): Promise<SendResult> {
  if (!config.enabled) return { state: "blocked", reason: "disabled" };
  if (config.source !== "guitarhub" || Buffer.byteLength(config.secret ?? "") < 32) return { state: "blocked", reason: "configuration" };
  let prepared: SenderEvent;
  try {
    if (!isDraftHubEvent(event)) return { state: "blocked", reason: "payload" };
    prepared = prepareWireEvent(event);
    if (!isDraftHubEvent(prepared)) return { state: "blocked", reason: "payload" };
  } catch { return { state: "blocked", reason: "payload" }; }
  const body = JSON.stringify(prepared);
  if (Buffer.byteLength(body) > 65536) return { state: "blocked", reason: "payload" };
  const timestamp = String(Math.floor(now() / 1000));
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const operation = async (): Promise<SendResult> => {
    try {
      const response = await fetcher("https://agents.suedeai.ai/api/intake/events", {
        method: "POST", redirect: "error", headers: { "content-type": "application/json", "x-suede-intake-source": config.source!, "x-suede-intake-timestamp": timestamp,
          "x-suede-intake-signature": signBody(config.secret!, timestamp, body) }, body, signal: controller.signal,
      });
      if (response.status === 202) {
        const reader = response.body?.getReader();
        if (!reader) return { state: "retry", reason: "acknowledgement" };
        activeReader = reader;
        let text = ""; let bytes = 0; const decoder = new TextDecoder();
        try {
          for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength; if (bytes > 1024) return { state: "retry", reason: "acknowledgement" }; text += decoder.decode(next.value, { stream: true }); }
          text += decoder.decode();
          const acknowledgement: unknown = JSON.parse(text);
          if (validAcknowledgement(acknowledgement)) return { state: "delivered" };
          return { state: "retry", reason: "acknowledgement" };
        } catch { return { state: "retry", reason: "acknowledgement" }; }
        finally { activeReader = undefined; void reader.cancel().catch(() => {}); }
      }
      void response.body?.cancel().catch(() => {});
      if ([400, 401, 403, 413].includes(response.status)) return { state: "blocked", reason: `http-${response.status}` };
      const retryAfter = response.headers.get("retry-after");
      const delay = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : retryAfter ? Date.parse(retryAfter) - now() : 0;
      return { state: "retry", reason: `http-${response.status}`, ...(Number.isFinite(delay) && delay > 0 ? { retryAfterMs: Math.min(delay, 86400000) } : {}) };
    } catch { return { state: "retry", reason: "network" }; }
  };
  try {
    return await Promise.race([operation(), new Promise<SendResult>((resolve) => { timer = setTimeout(() => { controller.abort(); void activeReader?.cancel().catch(() => {}); resolve({ state: "retry", reason: "timeout" }); }, Math.max(1, Math.min(4000, timeoutMs))); })]);
  } finally { clearTimeout(timer); }
}
