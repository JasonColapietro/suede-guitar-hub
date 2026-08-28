import assert from "node:assert/strict";
import test from "node:test";

import { normalizeApplication } from "../lib/application.ts";

const validInput = {
  name: " Ana <Diaz> ",
  email: "ANA@example.com",
  experience: "Two years, mostly self-taught",
  goal: "Play <one> complete song cleanly",
};

test("normalizes a complete cohort application", () => {
  assert.deepEqual(normalizeApplication(validInput), {
    ok: true,
    value: {
      name: "Ana Diaz",
      email: "ana@example.com",
      experience: "Two years, mostly self-taught",
      goal: "Play one complete song cleanly",
    },
  });
});

test("rejects an invalid email", () => {
  assert.deepEqual(normalizeApplication({ ...validInput, email: "not-email" }), {
    ok: false,
    error: "Provide a valid email address.",
  });
});

test("requires a specific 30-day goal", () => {
  assert.deepEqual(normalizeApplication({ ...validInput, goal: "" }), {
    ok: false,
    error: "Name the breakthrough you want to make.",
  });
});
