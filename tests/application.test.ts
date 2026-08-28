import assert from "node:assert/strict";
import test from "node:test";

import {
  buildApplicationEmailFallback,
  normalizeApplication,
} from "../lib/application.ts";

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

test("builds a first-party email fallback with the normalized application", () => {
  const href = buildApplicationEmailFallback(validInput);
  assert.ok(href);

  const fallback = new URL(href);
  assert.equal(fallback.protocol, "mailto:");
  assert.equal(fallback.pathname, "info@suedeai.ai");
  assert.equal(
    fallback.searchParams.get("subject"),
    "GuitarHub application — Ana Diaz",
  );
  assert.equal(
    fallback.searchParams.get("body"),
    [
      "New GuitarHub application",
      "",
      "Name: Ana Diaz",
      "Email: ana@example.com",
      "Experience: Two years, mostly self-taught",
      "Goal: Play one complete song cleanly",
    ].join("\n"),
  );
});

test("does not build an email fallback for invalid application data", () => {
  assert.equal(
    buildApplicationEmailFallback({ ...validInput, email: "not-email" }),
    null,
  );
});
