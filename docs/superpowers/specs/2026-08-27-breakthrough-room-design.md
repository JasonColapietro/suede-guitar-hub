# GuitarHub Breakthrough Room Design

**Date:** 2026-08-27
**Status:** Approved for implementation by Jason's direction to "just go"
**Research:** `/Users/jasoncolapietro/code/suede-guitar-hub/research/online-guitar-community-methods-2026-08-27.md`

## Product decision

GuitarHub will be the orchestration and accountability layer around the existing Suede guitar estate. Strumly remains the practice engine and lesson library. Suede Social remains the broad community. GuitarHub owns the goal, the 30-day sequence, evidence checkpoints, crew expectations, mentor-review contract, and the next prescribed action.

The first release is a founding-cohort pilot, not a broad learning-management system. It must be useful before admission: a visitor can generate a four-week plan, launch the correct Strumly resources, and track work locally. Admission adds the human layer described on the site: a small crew, weekly studio, checkpoint review, and final showcase.

## Audience and job

The audience is an advanced beginner or intermediate guitarist who already consumes lessons but has stalled. The page's single job is to turn an unfocused goal into one measurable 30-day practice commitment and a qualified cohort application.

## Core experience

1. The learner chooses one goal, current level, available practice days, and minutes per session.
2. GuitarHub produces one four-week plan with a measurable finish line, weekly focus, Strumly launch links, evidence requirements, and a crew prompt.
3. The plan is stored in the browser only. The learner can mark actions complete without creating an account.
4. Every week ends with evidence, not watch time: a short performance attempt, a self-rating, and one question for feedback.
5. The learner applies to the founding room with the existing name, email, experience, and goal fields. Schedule and accountability preferences remain browser-local in this release rather than expanding third-party email data.
6. Accepted members are placed into an 8–12 person goal/timezone crew. Operational crew delivery may use Suede Social and live calls during the pilot; the public site must not imply that a native GuitarHub forum already exists.

## Better-than-competitor loop

The differentiator is the closed loop competitors expose only in pieces:

`Diagnose -> Prescribe -> Practice -> Prove -> Correct -> Share -> Repeat`

- Diagnose: one goal and a baseline attempt.
- Prescribe: one weekly path, not a catalog.
- Practice: exact Strumly drills, songs, and guides.
- Prove: a clip or measurable attempt plus self-diagnosis.
- Correct: one highest-leverage mentor correction and one next routine.
- Share: learner-controlled progress proof, while private corrections remain private.
- Repeat: the next week begins from evidence rather than elapsed time.

## Goals and plan rules

The pilot supports four goals:

- Clean chord changes through one complete song.
- Lock rhythm and timing to a steady pulse.
- Navigate the fretboard without shape guessing.
- Build a short improvised solo with intentional phrasing.

Each goal defines a finish line, four weekly focuses, a primary Strumly resource, one evidence prompt, and one crew prompt. Practice availability changes the prescribed cadence but not the skill sequence. The UI must never claim that completing checkboxes proves mastery.

## Information architecture

- `/`: revised acquisition page explaining the Breakthrough Room and linking to the planner.
- `/breakthrough`: interactive plan builder and local progress workspace.
- `/api/apply`: existing email application route with stronger validation for the same four fields.

No new authenticated route, database, media upload, payment path, or Strumly write is included.

## Data and privacy

The generated profile and completion state live in `localStorage` under a versioned key. No raw audio or video is captured or uploaded by GuitarHub. Evidence prompts tell the learner what to record for a mentor, but the pilot application collects only text.

Application email payloads keep the existing categories: name, email, experience, and goal. Input is length-bounded and stripped of angle brackets using the existing route's safety style. The release does not expand personal data sent through Resend.

## Components and boundaries

- `lib/breakthrough.ts`: pure goal catalog, profile validation, plan generation, and progress derivation.
- `components/BreakthroughPlanner.tsx`: client state, local persistence, accessible form controls, plan rendering, and action completion.
- `app/breakthrough/page.tsx`: server-rendered product explanation and planner shell.
- `lib/application.ts`: pure normalization and validation for the existing four application fields, shared by the route.
- `components/ApplyForm.tsx`: visible labels, cohort-specific language, and consistent submission states for the existing fields.
- `app/page.tsx`: public positioning and calls to the planner.

## Visual direction

Keep the current GuitarHub indigo, peach, cream, and editorial type system. The signature element is a four-string practice timeline: four weekly nodes connected by guitar-string rules, with each node revealing focus, evidence, and next action. It encodes a real sequence rather than adding decorative step numbers.

The plan workspace uses quieter cream panels and one dark indigo evidence card per week. Motion is limited to the existing reveal system and progress transitions. Keyboard focus, reduced motion, semantic fieldsets, and visible labels are required.

## Error and empty states

- Invalid or incomplete profiles keep the learner in the builder and identify the missing field.
- Corrupt or unknown local state is discarded and the builder starts clean.
- Application delivery errors keep the completed fields available and point to `info@suedeai.ai`.
- External Strumly and Suede Social links identify that they open another Suede surface.

## Verification

- Pure plan behavior and application normalization use Node's built-in test runner with TypeScript stripping.
- Tests must be observed failing before production implementation.
- `npm test` must pass.
- `npm run build` must pass.
- The built `/breakthrough` route must render statically.
- Browser verification must cover desktop and mobile layouts, keyboard focus, persistence after reload, and reduced-motion behavior.

## Explicit deferrals

- Suede SSO and authenticated member profiles.
- Native crews, posts, chat, notifications, and live-room scheduling.
- Clip upload or raw-audio storage.
- Automatic import of Strumly attempt data.
- Mentor queue, payouts, reuse royalties, payments, and cohort billing.
- Outcome claims before the first cohort has measured denominators.
