/**
 * Binds the decision not to ship a strain or pressed-phonation measurement, and
 * the prohibition on faking one.
 *
 * Four voice modules — `v-l3-m5`, `v-l5-m4`, `v-l7-m3` and `v-l7-m4` — are
 * written as though strain were measured, and it is not. Measuring it needs
 * jitter, shimmer, harmonic-to-noise ratio or cepstral peak prominence, none of
 * which exists on any Suede surface, and then it needs a validated threshold
 * before a number could be shown to a singer at all. The threshold is the
 * blocker rather than the signal processing: a cutoff that tells somebody their
 * voice is safe, derived from a consumer microphone and chosen by whoever wrote
 * the commit, is a clinical-adjacent claim this product must not make. So the
 * gap stays open deliberately, and this file is what keeps it open honestly.
 *
 * The specific failure it exists to prevent is substitution. `ringRatio` is
 * real, shipped and easy to reach for: a single number, higher on a bright
 * forward tone, that looks like it might say something about effort. It does
 * not. The vendored contract calls it a self-relative resonance share and says
 * in as many words that it is not a strain measure, because comparing it
 * against anything other than the same singer's earlier takes is meaningless.
 * Wiring it to a safety verdict would be the most harmful available version of
 * this gap: a singer told they were fine by a number that cannot know.
 *
 * A decision recorded only in prose is a decision nobody can enforce, which is
 * why the register in `contracts/adjudications.ts` exists and why this is a
 * test rather than a paragraph in the spec. Nothing here asserts that strain is
 * unmeasurable forever. It asserts that the claim cannot appear without the
 * contract, the curriculum and these assertions all moving in the same commit,
 * which is the smallest unit of deliberation the claim deserves.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import contract from "../contracts/suede-vocal.json" with { type: "json" };
import voiceCurriculum from "../lib/learning/data/voice.json" with { type: "json" };
import { MODULE_SAFETY_NOTE, TRACK_SAFETY_NOTE } from "../lib/learning/curriculum.ts";
import { VOICE_MODULE_PROOF } from "../lib/learning/voice-proof.ts";

type MeasurementRow = { measurable: string; unit: string | null; module: string | null; note: string };
const measurements = contract.measurement as unknown as Record<string, MeasurementRow>;

/**
 * The modules whose checkpoint is written around an absence of strain. Listed
 * by hand because the point is that this set is a decision: a fifth module
 * gating on strain has to be added here, and that edit is the moment somebody
 * asks whether it should.
 */
const STRAIN_MODULE_IDS = ["v-l3-m5", "v-l5-m4", "v-l7-m3", "v-l7-m4"] as const;

/** The measurement key every one of them has to name as the thing it lacks. */
const STRAIN_MEASUREMENT = "strainOrPressedPhonation";

test("the contract still reports strain and pressed phonation as unmeasurable", () => {
  const row = measurements[STRAIN_MEASUREMENT];
  assert.ok(row, "the contract no longer carries a strainOrPressedPhonation row at all");
  assert.equal(
    row.measurable,
    "no",
    "strainOrPressedPhonation is no longer reported as unmeasurable. That is not a contract edit: " +
      "it requires a primitive (jitter, shimmer, HNR or CPP) that exists and a threshold that has " +
      "been validated against something other than one person's ear. Until both are true this row " +
      "stays \"no\" and the four strain checkpoints stay self-reported.",
  );
  assert.equal(row.module, null, "an unmeasurable quantity cannot name an implementing module");
  assert.equal(row.unit, null, "an unmeasurable quantity cannot carry a unit");

  // The row has to keep naming the primitives, because "not measurable" with no
  // statement of what is missing is a gap nobody can close on purpose.
  for (const primitive of [/jitter/i, /shimmer/i, /HNR/, /CPP/]) {
    assert.match(row.note, primitive, "the row must keep naming the primitives a real measurement needs");
  }
});

test("the contract still forbids substituting a resonance share for a strain verdict", () => {
  const row = measurements[STRAIN_MEASUREMENT];
  assert.match(
    row.note,
    /do not substitute ring ?ratio/i,
    "the prohibition on substituting ringRatio has been removed from the contract note",
  );

  const ring = measurements.ringRatio;
  assert.ok(ring, "the contract no longer describes ringRatio");
  assert.match(ring.note, /self-relative/i, "ringRatio must keep saying it is self-relative only");
  assert.match(ring.note, /not a strain measure/i, "ringRatio must keep saying it is not a strain measure");

  /**
   * `unsupportedClaims` pairs each false claim with what to use instead, and
   * for the strain-free verdict that list is deliberately empty. An empty list
   * is the prohibition in machine-readable form: there is no substitute, so
   * anything appearing here would be one.
   */
  const claim = (contract.unsupportedClaims as Record<string, { claimedAs: string; reality: string; useInstead: string[] }>)[
    "strain-free-verdict"
  ];
  assert.ok(claim, "the contract no longer records the strain-free verdict as an unsupported claim");
  assert.deepEqual(
    claim.useInstead,
    [],
    "a substitute has been offered for the strain-free verdict. There is no honest substitute; " +
      "a resonance share, a loudness figure and a sustain length all measure something else.",
  );
});

test("the four strain checkpoints are exactly the self-reported set, and stay self-reported", () => {
  const restingOnStrain = Object.entries(VOICE_MODULE_PROOF)
    .filter(([, proof]) => proof.basis.kind === "selfReported" && proof.basis.missing === STRAIN_MEASUREMENT)
    .map(([moduleId]) => moduleId)
    .sort();
  assert.deepEqual(
    restingOnStrain,
    [...STRAIN_MODULE_IDS].sort(),
    "the set of modules resting on an unmeasured strain verdict changed; that is a decision, not a refactor",
  );

  for (const moduleId of STRAIN_MODULE_IDS) {
    const proof = VOICE_MODULE_PROOF[moduleId];
    assert.ok(proof, `${moduleId} has no proof basis`);
    assert.equal(
      proof.basis.kind,
      "selfReported",
      `${moduleId} now claims a measured basis. Nothing measures strain, so the only way this is ` +
        `correct is if the measurement and its validated threshold both landed first.`,
    );
  }

  const byId = new Map(
    voiceCurriculum.levels.flatMap((level) => level.modules.map((m) => [m.id, m] as const)),
  );
  for (const moduleId of STRAIN_MODULE_IDS) {
    const learningModule = byId.get(moduleId);
    assert.ok(learningModule, `${moduleId} is no longer in the voice curriculum`);
    assert.equal(
      learningModule.proofMetric,
      "self_reported",
      `${moduleId} declares a proof metric other than self_reported`,
    );
  }
});

/**
 * The four modules' own words, checked harder than the track-wide prose rule in
 * `suede-vocal-parity.test.ts`. That test reads promises and lesson summaries;
 * this one reads lesson titles too, which is where "The Difference You Can Hear
 * and Measure" sat on the belt-safety module — a title telling a singer the
 * difference between a belt and a shout is something the app can measure.
 */
test("a strain module never implies a reading confirmed the singer was safe", () => {
  const claims: { pattern: RegExp; why: string }[] = [
    { pattern: /\bmeasures?\b|\bmeasured\b|\bmeasurement\b/i, why: "nothing measures strain" },
    { pattern: /\bscored?\b|\bscores\b|\bscoring\b/i, why: "a strain checkpoint cannot be scored" },
    { pattern: /\bdetect(?:s|ed|ing|ion|or)?\b/i, why: "there is no strain detector" },
    { pattern: /\bverif(?:y|ies|ied|ication)\b/i, why: "no reading can verify vocal safety" },
    { pattern: /\bconfirms?\b|\bconfirmed\b/i, why: "no reading confirms an absence of strain" },
    { pattern: /\bautomatic(?:ally)?\b/i, why: "nothing about this checkpoint is automatic" },
    { pattern: /\bthe app (?:knows|checks|tells|watches)\b/i, why: "the app is not watching for strain" },
  ];
  // The honest form of the same words — "not measured", "nothing detects this" —
  // is the wording this whole exercise is trying to produce, so it passes.
  const honest = /\b(?:not|no|nothing|never|cannot|can't)\b[^.]{0,40}\b(?:measure|score|detect|verif|confirm)/i;

  const offenders: string[] = [];
  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      if (!(STRAIN_MODULE_IDS as readonly string[]).includes(learningModule.id)) continue;
      const texts = [
        learningModule.promise,
        learningModule.skill,
        ...learningModule.lessons.flatMap((lesson) => [lesson.title, lesson.summary]),
      ];
      for (const text of texts) {
        if (honest.test(text)) continue;
        for (const { pattern, why } of claims) {
          if (pattern.test(text)) offenders.push(`${learningModule.id}: ${JSON.stringify(text)} — ${why}`);
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `a module resting on the singer's own report implies a reading:\n${offenders.join("\n")}`,
  );
});

/**
 * The generalisation of the rule above, applied to every voice module rather
 * than to the four that gate on strain.
 *
 * `v-l5-m3` is why this exists. Its promise read "Get louder with no
 * pressed-phonation flag" and its proof basis is `measured("ringRatio")` — so
 * the page promised a cleared instrument, and the thing behind it was a
 * self-relative share of energy in a 2800–3200 Hz band that says nothing about
 * effort. It survived the earlier pass that removed `flag_clear` and `rate_hz`
 * by name: the metric names were corrected and the sentence a singer reads was
 * not, which is the whole reason those names were banned in the first place.
 *
 * The line drawn here is between the singer's experience and an instrument's
 * output. A checkpoint may ask a singer to report that a note felt free — that
 * is what self-reported means, and the four strain modules are worded that way
 * on purpose. What no copy may do is name a flag, meter, reading or verdict for
 * strain, pressing or effort, because no Suede surface produces one and a
 * singer who is promised a cleared flag will wait for a warning that cannot
 * arrive.
 */
test("no voice module promises an instrument that would have to read strain", () => {
  const instrument: { pattern: RegExp; why: string }[] = [
    { pattern: /\bflag(?:s|ged)?\b/i, why: "nothing on any Suede surface emits a flag of any kind" },
    {
      pattern: /\b(?:strain|pressed[ -]?phonation|pressing|effort|tension)\s+(?:flag|meter|reading|readout|score|indicator|verdict|check)\b/i,
      why: "there is no instrument for strain, pressing or effort",
    },
    {
      pattern: /\b(?:meter|reading|readout|indicator)\b[^.]{0,40}\b(?:strain|pressed|pressing|effort|tension)\b/i,
      why: "the only meter in the tone room reads a band energy share, not effort",
    },
  ];

  const offenders: string[] = [];
  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      const texts = [
        learningModule.promise,
        learningModule.skill,
        ...learningModule.lessons.flatMap((lesson) => [lesson.title, lesson.summary]),
      ];
      for (const text of texts) {
        for (const { pattern, why } of instrument) {
          if (pattern.test(text)) offenders.push(`${learningModule.id}: ${JSON.stringify(text)} — ${why}`);
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `voice copy promises a reading nothing produces:\n${offenders.join("\n")}`,
  );
});

/** Source roots walked by the substitution guards below. */
const SOURCE_ROOTS = ["app", "components", "lib", "contracts", "scripts"];

/** Every source and data file under those roots, excluding build and dependency trees. */
function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (directory: string) => {
    for (const name of readdirSync(directory)) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.(ts|tsx|mjs|js|json)$/.test(name)) continue;
      found.push(path);
    }
  };
  for (const root of SOURCE_ROOTS) walk(root);
  return found;
}

/**
 * Anything that is, or is derived from, a share of energy in a frequency band.
 * `ringRatio` by name, the band-ratio primitive underneath it, and the words a
 * page would use for the same number.
 */
const RESONANCE_TERM = /ring[ _]?ratio|ring band|resonance share|bandRatio|RING_LO_HZ|RING_HI_HZ/i;

/**
 * The kind of claim such a number must never be attached to. "Pressed
 * phonation" is matched through a hyphen as well as a space because that is how
 * it was actually written when this guard first missed it: `v-l5-m3` promised
 * "no pressed-phonation flag" against a `ringRatio` basis, and a space-only
 * pattern walked straight past it.
 */
const VERDICT_TERM =
  /\bstrain|pressed[ -]?phonation|\bsafe\b|\bsafety\b|\bsafely\b|\bunsafe\b|\bhealth|\bdamag|\binjur|\bhoarse/i;

/**
 * Statements that deny the connection rather than assert it. These are
 * metric-level denials — the number is not a strain measure — and they are the
 * honest thing to write, so they pass. A denial about the *singer* ("no
 * strain", "strain-free") is not on this list and never will be: that is the
 * substitution itself, phrased as reassurance.
 */
const DENIALS = [
  /\bnot a strain (?:measure|proxy|detector|indicator|verdict|reading)\b/i,
  /\bsays nothing about strain\b/i,
  /\bdo not substitute\b/i,
  /\bnever a strain\b/i,
];

/**
 * Reassurance shapes that are forbidden outright, denial or no denial. The
 * second entry is the one `v-l5-m3` needed: "no pressed-phonation flag" reads as
 * a cleared instrument rather than as a singer's report, and the word it turns
 * on is "flag" — nothing on any Suede surface emits one.
 */
const REASSURANCES = [
  /\b(?:no|without|zero|absence of|free of|free from)\s+(?:\w+[\s-]+){0,2}(?:strain|pressed[ -]?phonation|pressing)\b/i,
  /\b(?:no|without|zero|clear(?:ed)?)\s+(?:\w+[\s-]+){0,3}flag(?:s|ged)?\b/i,
  /strain[- ]free/i,
  /\bsafe to sing\b/i,
  /\b(?:your|their|the singer'?s)\s+strain\b/i,
];

/**
 * Split a file into statement-sized chunks. Sentence enders catch prose that
 * wraps across lines in JSX, and braces keep one code block from merging with
 * the next, which is what keeps this from reporting a claim that is really two
 * unrelated statements a few lines apart.
 */
function chunks(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.;!?])\s+|[{}]/);
}

test("no resonance share is read as a strain, safety or health verdict anywhere in this repository", () => {
  const offenders: string[] = [];
  for (const path of sourceFiles()) {
    for (const chunk of chunks(readFileSync(path, "utf8"))) {
      if (!RESONANCE_TERM.test(chunk)) continue;
      const reassurance = REASSURANCES.some((pattern) => pattern.test(chunk));
      if (!reassurance) {
        if (!VERDICT_TERM.test(chunk)) continue;
        if (DENIALS.some((pattern) => pattern.test(chunk))) continue;
      }
      offenders.push(`${path}: ${chunk.trim().slice(0, 200)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a resonance share is being spoken about as strain, safety or vocal health. It is a " +
      "self-relative band energy share and means nothing about effort:\n" + offenders.join("\n"),
  );
});

test("no statement binds a resonance share to a strain or safety name", () => {
  // The narrower, sharper form of the same rule: an assignment or a property
  // whose name is a verdict and whose value comes from the band ratio. This
  // catches the substitution even when nobody writes a sentence about it.
  const binding = [
    /(?:strain|pressed|safe|safety|health)\w*\s*[:=][^;\n]{0,120}(?:ring[ _]?ratio|bandRatio)/i,
    /(?:ring[ _]?ratio|bandRatio)[^;\n]{0,80}(?:=>|as)\s*(?:strain|pressed|safe|safety|health)/i,
  ];
  const offenders: string[] = [];
  for (const path of sourceFiles()) {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      for (const pattern of binding) {
        if (pattern.test(line)) offenders.push(`${path}: ${line.trim().slice(0, 200)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `a resonance share is bound to a verdict name:\n${offenders.join("\n")}`);
});

test("the voice track's safety copy is rendered on the pages a singer reaches", () => {
  // The note itself is asserted in suede-vocal-parity.test.ts. What is asserted
  // here is that it reaches a screen: it previously lived only in
  // `LessonSession`, which no voice lesson mounts, so for the whole voice track
  // it rendered nowhere at all. A constant with no reader is the same as no
  // constant.
  const lessonPage = readFileSync("app/learn/[track]/[lessonId]/page.tsx", "utf8");
  assert.match(lessonPage, /TRACK_SAFETY_NOTE\[track\]/, "the outline branch no longer renders the track safety note");
  const session = readFileSync("components/learning/LessonSession.tsx", "utf8");
  assert.match(session, /TRACK_SAFETY_NOTE\[track\]/, "the full lesson no longer renders the track safety note");

  assert.match(TRACK_SAFETY_NOTE.voice, /hoarse|hurts/i, "the voice note must name a symptom to stop on");
  assert.match(TRACK_SAFETY_NOTE.voice, /cannot assess vocal health/i, "the voice note must not overstate the app");
});

test("the mixed-voice sustain and the effects module carry their own caution", () => {
  /**
   * `v-l5-m4` is the one the spec singles out, and it needs this whether or not
   * a measurement ever lands: a six-second mixed-voice sustain near the top of
   * the transition zone, on a free stage, while nothing measures strain.
   * `v-l7-m4` asks for creak, growl and scream on the same terms.
   */
  for (const moduleId of ["v-l5-m4", "v-l7-m4"] as const) {
    const note: string | undefined = MODULE_SAFETY_NOTE[moduleId];
    assert.ok(note, `${moduleId} has no module-level caution`);
    assert.match(note, /\bstop\b/i, `${moduleId}'s caution must say to stop`);
    assert.match(
      note,
      /hoarse|pain|stings|tight/i,
      `${moduleId}'s caution must name the symptom to stop on rather than telling a singer to be careful`,
    );
    assert.match(
      note,
      /nothing here can tell you/i,
      `${moduleId}'s caution must say that nothing here is judging the outcome`,
    );
    // The same honesty the proof basis enforces: a caution that implies the app
    // is watching is worse than none, because it invites the singer to wait for
    // a warning that will never come.
    assert.doesNotMatch(
      note,
      /\b(?:we|the app|this page|suede)\s+(?:will|can)\s+(?:warn|tell|detect|stop)/i,
      `${moduleId}'s caution implies something is monitoring the attempt`,
    );
  }

  const lessonPage = readFileSync("app/learn/[track]/[lessonId]/page.tsx", "utf8");
  assert.match(lessonPage, /MODULE_SAFETY_NOTE/, "the lesson page no longer renders the module caution");
  const session = readFileSync("components/learning/LessonSession.tsx", "utf8");
  assert.match(session, /MODULE_SAFETY_NOTE/, "the full lesson no longer renders the module caution");
});
