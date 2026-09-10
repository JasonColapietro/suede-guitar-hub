import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const templateUrl = new URL("../lib/learning/routine-template.json", import.meta.url);
const componentUrl = new URL("../components/learning/PracticeRoutine.tsx", import.meta.url);

test("the public practice routine contains no competitor or outbound instruction links", async () => {
  const [template, component] = await Promise.all([
    readFile(templateUrl, "utf8"),
    readFile(componentUrl, "utf8"),
  ]);
  const publicRoutineSource = `${template}\n${component}`;

  assert.doesNotMatch(publicRoutineSource, /https?:\/\//i);
  assert.doesNotMatch(publicRoutineSource, /JustinGuitar|Yousician|learnwithsonora/i);
  assert.doesNotMatch(template, /"external(?:Url|Label)"/i);
});
