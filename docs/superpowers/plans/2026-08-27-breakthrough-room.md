# GuitarHub Breakthrough Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a useful 30-day GuitarHub practice planner and cohort-intake loop that connects Strumly practice to Suede community accountability without duplicating either product.

**Architecture:** A pure TypeScript plan engine produces deterministic four-week plans from a bounded learner profile. A client planner persists profile and action completion locally, while the existing application route gains testable validation without expanding the personal-data categories sent by email. The release adds no auth, database, media upload, payment, or Strumly mutation.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, browser `localStorage`, Node 22 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-breakthrough-room-design.md`

## Global Constraints

- Preserve the current GuitarHub visual system and original-copy/legal boundaries in `BUILD-BRIEF.md`.
- Leave Strumly and Suede Social repositories untouched.
- Do not claim native community, active mentors, tuition, or measured outcomes that do not exist.
- Do not collect or upload raw audio/video in this release.
- Keep plan state browser-local under a versioned key.
- Follow red-green-refactor for every production behavior.
- Preserve `vercel.json` preview-build suppression unchanged.

---

### Task 1: Deterministic 30-day plan engine

**Files:**
- Create: `tests/breakthrough.test.ts`
- Create: `lib/breakthrough.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `GoalId`, `ExperienceLevel`, `BreakthroughProfile`, `BreakthroughPlan`, `createBreakthroughPlan(profile)`, `normalizeProgress(plan, candidate)`, and `progressPercent(plan, progress)`.
- Consumers: Task 2 imports these exact exports.

- [x] **Step 1: Add the Node test command and write failing tests**

Add `"test": "node --test --experimental-strip-types tests/*.test.ts"` and tests that hand-assert:

```ts
const plan = createBreakthroughPlan({
  goal: "complete-song",
  experience: "advanced-beginner",
  daysPerWeek: 4,
  minutesPerSession: 30,
});

assert.equal(plan.weeks.length, 4);
assert.equal(plan.cadence, "4 days x 30 minutes");
assert.match(plan.finishLine, /complete song/i);
assert.equal(plan.weeks[0].actions.length, 3);
```

Also test rejected out-of-range cadence, deterministic action IDs, corrupt progress removal, and percentage calculation from literal expected counts.

- [x] **Step 2: Run the tests and confirm RED**

Run: `npm test`

Expected: FAIL because `lib/breakthrough.ts` does not exist.

- [x] **Step 3: Implement the smallest pure plan engine**

Define four immutable goal templates with exactly four weeks each. Validate `daysPerWeek` from 3–6 and `minutesPerSession` from 15–60. Generate action IDs as `<goal>-w<week>-a<action>` and return only recognized completed IDs from `normalizeProgress`.

- [x] **Step 4: Run the tests and confirm GREEN**

Run: `npm test`

Expected: all Task 1 tests pass with zero failures.

### Task 2: Interactive Breakthrough Room planner

**Files:**
- Create: `components/BreakthroughPlanner.tsx`
- Create: `app/breakthrough/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Task 1 plan engine exports.
- Produces: `/breakthrough`, a static route whose client planner stores `{ profile, completedActionIds }` under `guitarhub.breakthrough.v1`.

- [x] **Step 1: Write the failing persistence behavior test**

Extend `tests/breakthrough.test.ts` to assert `normalizeProgress` rejects IDs from another goal and keeps only action IDs present in the current plan. Run `npm test` and confirm the new case fails before changing production code.

- [x] **Step 2: Implement and verify the planner**

Create an accessible fieldset for goal, experience, days, and minutes. After generation, render the finish line, cadence, four weekly nodes, Strumly resource links, evidence prompts, crew prompts, and checkboxes. Persist only after client hydration and recover cleanly from malformed JSON. Use a reset control that requires one explicit click and states that it clears browser-local progress.

- [x] **Step 3: Add the four-string timeline styling**

Add focused `.breakthrough-*` styles using existing CSS variables. Render progress without color-only meaning, retain visible focus rings, and disable transitions under `prefers-reduced-motion: reduce`.

- [x] **Step 4: Run tests and build**

Run: `npm test && npm run build`

Expected: tests pass, build exits 0, and `/breakthrough` appears as a static route.

### Task 3: Cohort-ready application intake

**Files:**
- Create: `tests/application.test.ts`
- Create: `lib/application.ts`
- Modify: `components/ApplyForm.tsx`
- Modify: `app/api/apply/route.ts`

**Interfaces:**
- Produces: `normalizeApplication(input)` returning `{ ok: true, value }` or `{ ok: false, error }` for the existing name, email, experience, and goal fields.
- Consumer: `/api/apply` uses the normalized value to build the Resend text payload.

- [x] **Step 1: Write failing normalization tests**

Test valid cohort input, invalid email, missing goal, and angle-bracket stripping with literal expected values. Run `npm test` and confirm RED because `lib/application.ts` does not exist.

- [x] **Step 2: Implement minimal normalization and route adoption**

Move input safety into the pure module. Require name, valid email, and goal. Preserve the existing four-field email payload and remove applicant details from missing-key logs.

- [x] **Step 3: Expand the application form**

Add visible labels to the existing controls. Keep values on delivery error, reset only on success, and align button language with “Apply to the founding room.”

- [x] **Step 4: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and the production build exits 0.

### Task 4: Public method and funnel integration

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `HANDOFF.md`

**Interfaces:**
- Consumes: `/breakthrough` and the expanded application form.
- Produces: honest public positioning for the 30-Day Breakthrough Room and a durable implementation handoff.

- [x] **Step 1: Update the public journey**

Add a “Build your 30-day plan” hero action, replace the generic phase copy with the evidence loop, explain the 8–12 player founding-room format as planned cohort operations, and link community language to Suede Social without claiming a native forum.

- [x] **Step 2: Update metadata**

Describe GuitarHub as a 30-day guitar practice and feedback system. Avoid tuition, mentor availability, daily-feedback, and outcome claims that are not yet verified.

- [x] **Step 3: Write the repo handoff**

Record branch, files, test/build commands, exact status, explicit deferrals, advisory caveat, and next deployment step. Do not claim push, deploy, or live verification unless each occurs.

- [x] **Step 4: Run full verification**

Run: `npm test && npm run build && git diff --check && git status --short --branch`

Expected: tests and build exit 0, no whitespace errors, only intended files changed.
