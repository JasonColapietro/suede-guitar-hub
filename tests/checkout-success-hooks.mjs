// Test-only doubles for the checkout success page: the page's Stripe lookup and
// purchase ledger write read from globals, so no Stripe or database call is made.
// Only imports made by the success page (and its sign-in form's router) are
// redirected; the test file itself still loads the real lib/checkout/stripe.ts.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const navigationUrl = pathToFileURL(createRequire(import.meta.url).resolve("next/navigation.js")).href;
const PAGE_DOUBLES = {
  "@/lib/checkout/stripe": "test:checkout-stripe",
  "@/lib/learning-auth/backend": "test:checkout-backend",
};

export async function resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/app/checkout/success/page.tsx") && specifier in PAGE_DOUBLES) {
    return { url: PAGE_DOUBLES[specifier], shortCircuit: true };
  }
  // A server render has no mounted app router; the form only uses it after a code is verified.
  if (context.parentURL?.endsWith("/app/account/sign-in.tsx") && specifier === "next/navigation") {
    return { url: "test:checkout-navigation", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === "test:checkout-stripe") return {
    format: "module", shortCircuit: true,
    source: "export async function paidCheckoutSession(id) { globalThis.__checkoutLookups.push(id); return globalThis.__checkoutSession; }",
  };
  if (url === "test:checkout-backend") return {
    format: "module", shortCircuit: true,
    source: "export async function recordStripePurchase(eventId, type, purchase) { globalThis.__checkoutRecords.push({ eventId, type, purchase }); if (globalThis.__checkoutRecordFails) throw new Error('database down'); return 'recorded'; }",
  };
  if (url === "test:checkout-navigation") return {
    format: "module", shortCircuit: true,
    source: `export * from ${JSON.stringify(navigationUrl)}; export function useRouter() { return { replace() {}, refresh() {} }; }`,
  };
  return nextLoad(url, context);
}
