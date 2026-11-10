import type { FunnelEvent } from "./events.ts";

// Measurement is deferred by the owner, so nothing is collected or sent. This
// is the single place a transport would be added later.
export function track(event: FunnelEvent): void {
  void event;
}
