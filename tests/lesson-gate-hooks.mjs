// Test-only account adapter: exercise the real server page without live purchases.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const navigationUrl = pathToFileURL(createRequire(import.meta.url).resolve('next/navigation.js')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/navigation') return { url: 'test:lesson-navigation', shortCircuit: true };
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url === 'test:lesson-navigation') return {
    format: 'module',
    // Preserve the real client hooks used by the shared shell; only the
    // server notFound boundary needs a test-specific sentinel.
    source: `export * from ${JSON.stringify(navigationUrl)}; export function notFound() { throw new Error("NOT_FOUND"); }`,
    shortCircuit: true,
  };
  if (url.endsWith('/lib/learning-auth/access.ts')) return {
    format: 'module', source: 'export async function getVerifiedLearningAccess() { return globalThis.__lessonGateAccess; }', shortCircuit: true,
  };
  return nextLoad(url, context);
}
