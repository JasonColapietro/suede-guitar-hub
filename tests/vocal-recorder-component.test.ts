import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { claimAudioSession } from "../lib/audio/capture.ts";

type Element = { type: unknown; props: Record<string, unknown> & { children?: unknown } };
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Element;
  return [node, ...elements(node.props.children)];
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function microphone() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { track, getTracks: () => [track] };
}

// Execute the actual recorder handlers with isolated hooks and browser APIs.
// Permissions, recordings and external storage are never opened by these tests.
function recorderHarness(constructorFails = false) {
  const slots: unknown[] = [];
  let cursor = 0, interrupt = () => {}, cleanup = () => {};
  let request = deferred<ReturnType<typeof microphone>>();
  const source = ts.transpileModule(readFileSync(new URL("../components/learning/VocalRecorder.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { VocalRecorder?: (props: { lessonId: string; accountId: null }) => Element } = {};
  const require = createRequire(import.meta.url);
  class Recorder {
    state = "inactive";
    onstop: (() => void) | null = null;
    static isTypeSupported() { return true; }
    constructor() { if (constructorFails) throw new Error("Recorder format is unavailable"); }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.onstop?.(); }
  }
  runInNewContext(source, {
    exports, Error, Blob,
    performance: { now: () => 1000 },
    document: { hidden: false },
    window: { isSecureContext: true, setInterval: () => 1, clearInterval() {}, setTimeout: () => 2, clearTimeout() {} },
    navigator: { mediaDevices: { getUserMedia: () => request.promise } },
    MediaRecorder: Recorder,
    require: (name: string) => name === "react" ? {
      useState(initial: unknown) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (next: unknown) => { slots[i] = next; }]; },
      useRef(initial: unknown) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useEffectEvent: (callback: unknown) => callback,
      useEffect(effect: () => () => void) { const i = cursor++; if (!(i in slots)) { slots[i] = true; cleanup = effect(); } },
    } : name === "@/lib/audio/capture" ? { claimAudioSession }
      : name === "@/lib/learning/vocal-recording" ? {
        vocalTakeOwnerScope: () => "guest", VOCAL_TAKE_LIMIT_SECONDS: 120,
        loadVocalTake: async () => undefined, saveVocalTake: async () => {}, deleteVocalTake: async () => {},
        recordingElapsedSeconds: () => 0,
        bindVocalRecordingLifecycle: (callback: () => void) => { interrupt = callback; return () => {}; },
      } : name.endsWith(".module.css") ? { default: {} } : require(name),
  });
  function render() { cursor = 0; return elements(exports.VocalRecorder!({ lessonId: "v-l1-m1-01", accountId: null })); }
  function click(label: string) {
    const button = render().find(node => node.type === "button" && node.props.children === label);
    assert.ok(button, `Expected button: ${label}`);
    assert.ok(!button.props.disabled, `${label} should be enabled`);
    (button.props.onClick as () => void)();
  }
  return {
    render, click, interrupt: () => interrupt(), cleanup: () => cleanup(),
    request: () => request, nextRequest: () => { request = deferred(); return request; },
  };
}
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }

test("a MediaRecorder constructor failure releases the already-granted microphone", async () => {
  const h = recorderHarness(true), stream = microphone();
  try {
    h.render(); await flush(); h.click("Record a take");
    h.request().resolve(stream); await flush();
    assert.equal(stream.track.stopped, true, "a format failure must not leave the microphone open");
    assert.ok(h.render().some(node => node.props.role === "status" && node.props.children === "Recorder format is unavailable"));
  } finally { h.cleanup(); }
});

for (const outcome of ["granted", "denied"] as const) {
  test(`a stale microphone request ${outcome} after a retry cannot stop or release the newer recording`, async () => {
    const h = recorderHarness(), late = microphone(), active = microphone();
    try {
      h.render(); await flush(); h.click("Record a take");
      const old = h.request();
      if (outcome === "granted") h.click("Cancel microphone request"); else h.interrupt();
      const current = h.nextRequest(); h.click("Record a take");
      current.resolve(active); await flush();
      if (outcome === "granted") old.resolve(late); else old.reject(new Error("Permission denied"));
      await flush();
      assert.equal(active.track.stopped, false, "only the stale request may be cleaned up");
      if (outcome === "granted") assert.equal(late.track.stopped, true);
      assert.ok(h.render().some(node => node.type === "button" && node.props.children === "Save take"));
      const release = claimAudioSession(() => {});
      assert.equal(active.track.stopped, true, "the active recording must retain audio ownership so the next tool stops it");
      release();
    } finally { h.cleanup(); }
  });
}
