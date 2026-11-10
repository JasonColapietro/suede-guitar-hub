/**
 * The two places a free page sends a visitor: the 30-day plan (the email
 * magnet) or the free module the placement picks. Every free page carries
 * exactly one primary button, marked `data-funnel-primary`, pointing at one of
 * these; tests/one-promise.test.ts counts them.
 */
export const FUNNEL_PRIMARY = {
  magnet: { href: "/breakthrough", label: "Get your free 30-day plan" },
  freeModule: { href: "/start", label: "Start your free module" },
} as const;
