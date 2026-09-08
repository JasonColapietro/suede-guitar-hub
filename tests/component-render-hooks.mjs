// Compile the real TSX components for structural server-render tests. This does
// not emulate a browser, run effects, or claim interaction/accessibility QA.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import ts from 'typescript';
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/link") return nextResolve("next/link.js", context);
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const base = new URL(specifier, context.parentURL);
    for (const extension of ['', '.ts', '.tsx', '.js']) {
      const candidate = new URL(base.href + extension);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.module.css')) return { format: 'module', source: 'export default new Proxy({}, { get: (_, key) => String(key) });', shortCircuit: true };
  // Next also permits JSON imports without Node's mandatory import attribute.
  if (url.endsWith('.json') && context.importAttributes?.type !== 'json') return { format: 'module', source: `export default ${await readFile(new URL(url), 'utf8')};`, shortCircuit: true };
  if (url.endsWith('.tsx')) {
    const source = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
