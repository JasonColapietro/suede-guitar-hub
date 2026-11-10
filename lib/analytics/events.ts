// Funnel event names and properties, from the "Funnel events" table in
// docs/superpowers/plans/2026-11-10-phase1-shared-contract.md.

export type PaywallTrigger = "module_end" | "locked_item" | "onboarding" | "profile";

export type FunnelEvent =
  // `screen` is sent as the contract's `name` property; it is modelled as
  // `screen` here so it does not clash with the `name` discriminant.
  | { name: "screen_viewed"; screen: string }
  | { name: "magnet_submitted"; source: "plan" | "guide" }
  | { name: "placement_completed"; placement: "beginner" | "intermediate" | "advanced" }
  | { name: "free_module_started"; module_id: string }
  | { name: "free_module_completed"; module_id: string }
  | { name: "paywall_viewed"; trigger: PaywallTrigger }
  | { name: "checkout_started"; platform: "web" }
  | { name: "purchase_completed"; platform: "web"; source: "stripe" }
  | { name: "sign_in_completed"; platform: "web" };

export const FUNNEL_EVENT_NAMES: readonly string[] = [
  "screen_viewed",
  "magnet_submitted",
  "placement_completed",
  "free_module_started",
  "free_module_completed",
  "paywall_viewed",
  "checkout_started",
  "purchase_completed",
  "sign_in_completed",
];
