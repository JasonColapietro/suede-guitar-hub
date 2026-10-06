// Test-only account adapter: exercise the real server page without live purchases.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/navigation') return { url: 'test:lesson-navigation', shortCircuit: true };
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url === 'test:lesson-navigation') return { format: 'module', source: 'export function notFound() { throw new Error("NOT_FOUND"); }', shortCircuit: true };
  if (url.endsWith('/lib/learning-auth/access.ts')) return {
    format: 'module', source: 'export async function getVerifiedLearningAccess() { return globalThis.__lessonGateAccess; }', shortCircuit: true,
  };
  return nextLoad(url, context);
}
