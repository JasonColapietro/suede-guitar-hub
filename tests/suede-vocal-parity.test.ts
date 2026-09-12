/**
 * Asserts this repo's voice curriculum against Suede Sing's published vocal
 * capabilities.
 *
 * `contracts/suede-vocal.json` is a byte-identical copy of the file generated
 * in `JasonColapietro/sing`, the surface that actually implements the range
 * scan, the warm-up catalogue, the breath drills, the pitch studio and the
 * songbook. Its `measurement` section states, per quantity, whether Sing can
 * measure it today.
 *
 * This repo is the consumer. It ships a seven-level voice track whose modules
 * promise measured outcomes, and before this test nothing connected those
 * promises to the app that would have to deliver them. `proofMetric` is
 * validated as a non-empty string and then read by nothing, so the track could
 * — and did — promise a vibrato rate in hertz, a strain-free verdict, and two
 * passaggio pitches computed from a range scan. None of the three is measurable
 * on any Suede surface.
 *
 * The point is not to turn the whole voice track red. It is to force each
 * module to declare what actually proves it, and to fail when a module claims
 * a measurement Sing does not have. A module whose proof is a singer's own
 * judgment says so in `lib/learning/voice-proof.ts`, and that count is pinned
 * below so it cannot quietly grow.
 *
 * Following this repo's existing pattern: the contract is vendored, never
 * hand-edited, and regenerated on the producing side. See contracts/README.md
 * in the sing repo for the regenerate command.
 */
import assert from "node:assert/strict";
import test from "node:test";

import contract from "../contracts/suede-vocal.json" with { type: "json" };
import voiceCurriculum from "../lib/learning/data/voice.json" with { type: "json" };
import { TRACK_SAFETY_NOTE } from "../lib/learning/curriculum.ts";
import {
  VOICE_MODULE_PROOF,
  moduleIdForLesson,
  singCompanionUrl,
  voiceModuleIds,
} from "../lib/learning/voice-proof.ts";

type MeasurementRow = { measurable: string; unit: string | null; module: string | null; note: string };
const measurements = contract.measurement as unknown as Record<string, MeasurementRow>;

/**
 * How many voice modules rest on the singer's own judgment rather than on a
 * measurement. Pinned so that adding an unmeasurable promise is a visible
 * decision, and so that implementing a measurement in Sing — vibrato, strain,
 * a longest-run reducer — shows up here as a number to bring down.
 */
const SELF_REPORTED_MODULE_COUNT = 19;

test("the vendored contract is the shape this repo expects", () => {
  assert.equal(contract.contract, "suede-vocal");
  assert.equal(contract.version, 1);
  assert.equal(contract.reference.repo, "JasonColapietro/sing");
  assert.ok(Object.keys(measurements).length > 10, "measurement section is vacuous");
});

test("every voice module declares what proves it", () => {
  const ids = voiceModuleIds();
  assert.ok(ids.length > 0, "voice curriculum has no modules");
  assert.deepEqual(
    Object.keys(VOICE_MODULE_PROOF).sort(),
    [...ids].sort(),
    "VOICE_MODULE_PROOF and voice.json disagree about which modules exist",
  );
});

test("a module claiming a measurement names one Sing actually implements", () => {
  for (const [moduleId, proof] of Object.entries(VOICE_MODULE_PROOF)) {
    if (proof.basis.kind !== "measured") continue;
    const row = measurements[proof.basis.measurement];
    assert.ok(row, `${moduleId} rests on unknown measurement ${proof.basis.measurement}`);
    assert.equal(
      row.measurable,
      "yes",
      `${moduleId} rests on ${proof.basis.measurement}, which Sing reports as "${row.measurable}". ` +
        `Either the module is self-reported or the measurement has to be built in the sing repo.`,
    );
  }
});

test("a self-reported module names the measurement it is missing", () => {
  let selfReported = 0;
  for (const [moduleId, proof] of Object.entries(VOICE_MODULE_PROOF)) {
    if (proof.basis.kind !== "selfReported") continue;
    selfReported += 1;
    const row = measurements[proof.basis.missing];
    assert.ok(row, `${moduleId} names unknown missing measurement ${proof.basis.missing}`);
    assert.notEqual(
      row.measurable,
      "yes",
      `${moduleId} is marked self-reported but Sing now measures ${proof.basis.missing}. ` +
        `Promote it to a measured basis.`,
    );
    assert.ok(
      proof.basis.provesInstead.length > 20,
      `${moduleId} must state what its checkpoint does establish`,
    );
  }
  assert.equal(
    selfReported,
    SELF_REPORTED_MODULE_COUNT,
    "the number of voice modules resting on self-report changed; update the pin deliberately",
  );
});

/**
 * The specific contradiction this whole exercise started from. Sing's
 * `lib/voice-types.ts` argues at length that a passaggio is a different
 * measurement from a range scan and that no amount of low/high data implies it.
 * This repo's curriculum promised exactly that derivation.
 */
test("no voice module claims a passaggio derived from a range scan", () => {
  assert.equal(contract.taxonomy.passaggio.derivableFromRangeScan, false);
  assert.ok(!contract.rangeScan.outputs.includes("passaggio" as never));

  const passaggioModules = Object.entries(VOICE_MODULE_PROOF).filter(
    ([, p]) => p.basis.kind === "selfReported" && p.basis.missing === "passaggioPitches",
  );
  assert.ok(
    passaggioModules.length > 0,
    "a module teaching the passaggio must record passaggioPitches as the measurement it lacks",
  );
});

/**
 * The curriculum's own prose is the thing a singer reads, so the prose has to
 * stay inside what the contract permits. These are the exact claims Sing
 * publishes as unsupported.
 */
test("no voice lesson promises an unsupported measurement in its text", () => {
  const forbidden: { pattern: RegExp; why: string }[] = [
    {
      pattern: /computed from your stage 1 scan/i,
      why: "a passaggio is not derived from a range scan (taxonomy.passaggio.derivableFromRangeScan is false)",
    },
    {
      pattern: /flow consistency/i,
      why: "the sustain reading is a coefficient of variation of loudness, not of airflow",
    },
    {
      pattern: /airflow steadiness/i,
      why: "no airflow measurement exists; the reading is loudness steadiness",
    },
    {
      // The scan returns rangeScan.outputs and nothing else. Any wording that
      // hands a singer a passaggio as a scan result is the same bug as the
      // "computed from your Stage 1 scan" line, differently phrased.
      pattern: /passaggio pitches (are|now)/i,
      why: "a range scan yields only lowMidi, highMidi and an estimated voice type label",
    },
    {
      pattern: /\bvibrato\b[^.]*\b(hertz|hz)\b/i,
      why: "no surface analyses vibrato rate, so a hertz figure cannot be a measured result",
    },
  ];

  const offenders: string[] = [];
  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      const texts = [
        learningModule.promise,
        ...learningModule.lessons.flatMap((l) => [l.title, l.summary]),
      ];
      for (const text of texts) {
        for (const { pattern, why } of forbidden) {
          if (pattern.test(text)) offenders.push(`${learningModule.id}: ${JSON.stringify(text)} — ${why}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `voice curriculum makes unsupported claims:\n${offenders.join("\n")}`);
});

/**
 * A structural version of the prose check above, so the next false claim does
 * not need a new regex to be caught.
 *
 * A module whose proof rests on the singer's own judgment must not tell that
 * singer a number was measured. Chasing individual phrases found three such
 * lines; this finds the fourth without being told what it says.
 */
test("a self-reported module never tells the singer something was measured", () => {
  const claimsMeasurement = /\b(measured|measures|scored automatically|the app scores)\b/i;
  const offenders: string[] = [];

  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      const proof = VOICE_MODULE_PROOF[learningModule.id];
      if (!proof || proof.basis.kind !== "selfReported") continue;
      for (const text of [learningModule.promise, ...learningModule.lessons.map((l) => l.summary)]) {
        // "not measured", "nothing measures" and friends are the honest form.
        if (!claimsMeasurement.test(text)) continue;
        if (/\b(not|nothing|no)\b[^.]*\bmeasure/i.test(text)) continue;
        offenders.push(`${learningModule.id} rests on ${proof.basis.missing}: ${JSON.stringify(text)}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `self-reported voice modules claim a measurement:\n${offenders.join("\n")}`,
  );
});

/**
 * 12 seconds is not a rung on Sing's sustain ladder, so a checkpoint worded as
 * a twelve-second pass has nothing to pass against. Guarding the contract's
 * side of that so the curriculum and the benchmark cannot drift apart again.
 */
test("the sustain ladder is what the breath lessons were reconciled against", () => {
  const sustain = contract.breath.sustain;
  assert.equal(sustain.steadinessMetric, "loudness_cv");
  assert.equal(sustain.measuresPitchDrift, false);
  assert.equal(sustain.acceptsUnvoicedHiss, true);
  assert.deepEqual(sustain.starsSec, { one: 10, two: 20, three: 30 });
});

/**
 * `proofMetric` is the field the curriculum uses to say what a module proves,
 * and nothing in this repo reads it — it is validated as a non-empty string and
 * then ignored, which is how `rate_hz` and `flag_clear` survived on modules
 * whose quantities no Suede surface measures.
 *
 * It still is not read at runtime. But it is read by people, and by the iOS
 * catalogue that shares this data, so it has to agree with the basis. A module
 * resting on the singer's judgment says `self_reported`; a measured one names a
 * metric consistent with its measurement.
 */
test("proofMetric agrees with the declared proof basis", () => {
  /** Measurement in the contract → the metric name the curriculum uses for it. */
  const metricFor: Record<string, string> = {
    phonationSeconds: "phonation_sec",
    sustainSeconds: "sustain_sec",
    rangeExtremes: "range_midi_span",
    centsFromTarget: "cents_deviation",
    inTuneHoldTime: "cents_deviation",
    scorePercent: "accuracy_pct",
    ringRatio: "ring_ratio_delta",
    cycleDose: "cycle_dose",
  };

  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      const proof = VOICE_MODULE_PROOF[learningModule.id];
      assert.ok(proof, `${learningModule.id} has no proof basis`);

      if (proof.basis.kind === "selfReported") {
        assert.equal(
          learningModule.proofMetric,
          "self_reported",
          `${learningModule.id} rests on the singer's judgment (missing ${proof.basis.missing}) ` +
            `but declares proofMetric "${learningModule.proofMetric}"`,
        );
        continue;
      }

      const expected = metricFor[proof.basis.measurement];
      assert.ok(
        expected,
        `no curriculum metric name mapped for measurement ${proof.basis.measurement}`,
      );
      assert.equal(
        learningModule.proofMetric,
        expected,
        `${learningModule.id} is measured by ${proof.basis.measurement} but declares "${learningModule.proofMetric}"`,
      );
    }
  }
});

/**
 * The two metrics that named quantities nothing measures. Guarded by name so
 * they cannot come back to the voice track without the measurement arriving
 * first in the sing repo.
 */
test("no voice module declares a metric for an unmeasurable quantity", () => {
  const banned = new Set(["flag_clear", "rate_hz"]);
  const offenders: string[] = [];
  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      if (learningModule.proofMetric && banned.has(learningModule.proofMetric)) {
        offenders.push(`${learningModule.id}: ${learningModule.proofMetric}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `strain (flag_clear) and vibrato rate (rate_hz) are not measurable on any Suede surface:\n${offenders.join("\n")}`,
  );
});

test("every companion link resolves to a real Sing room and parameter", () => {
  for (const [moduleId, proof] of Object.entries(VOICE_MODULE_PROOF)) {
    const room = contract.deepLinks.rooms[proof.companion.room as keyof typeof contract.deepLinks.rooms];
    assert.ok(room, `${moduleId} points at unknown Sing room ${proof.companion.room}`);

    // Throws when the room does not parse the param, which is the failure that
    // would otherwise land a singer on a room's front page.
    const url = singCompanionUrl(proof.companion, contract);
    assert.match(url, /^https:\/\//, `${moduleId} built a non-absolute companion URL`);
  }
});

/**
 * A deep link into a warm-up behind the Pro paywall from a free lesson is a
 * dead end, and Sing gates packs by array membership rather than a flag — so
 * the only safe check is against the contract's own `free` field.
 */
test("no free-level module deep-links a paid warm-up", () => {
  const freeLevels = new Set(
    voiceCurriculum.levels.filter((l) => l.access === "free").map((l) => l.id),
  );
  const freeModules = new Set(
    voiceCurriculum.levels
      .filter((l) => freeLevels.has(l.id))
      .flatMap((l) => l.modules.map((m) => m.id)),
  );
  const exercises = new Map(contract.warmups.exercises.map((e) => [e.id, e]));
  const routines = new Map(contract.warmups.routines.map((r) => [r.id, r]));

  for (const moduleId of freeModules) {
    const proof = VOICE_MODULE_PROOF[moduleId];
    if (!proof || proof.companion.room !== "warmups" || !proof.companion.value) continue;
    if (proof.companion.param === "exercise") {
      const exercise = exercises.get(proof.companion.value);
      assert.ok(exercise, `${moduleId} links unknown warm-up ${proof.companion.value}`);
      assert.equal(exercise.free, true, `free module ${moduleId} links paid warm-up ${exercise.id}`);
    }
    if (proof.companion.param === "routine") {
      const routine = routines.get(proof.companion.value);
      assert.ok(routine, `${moduleId} links unknown routine ${proof.companion.value}`);
      assert.equal(routine.pro, false, `free module ${moduleId} links Pro routine ${routine.id}`);
    }
  }
});

test("every linked song exists in Sing's songbook deep-link surface", () => {
  // The contract does not enumerate songs, so the check is that every song link
  // uses the one param the songbook parses. A wrong slug lands on the library,
  // which is a soft failure; a wrong param is a silent one.
  for (const [moduleId, proof] of Object.entries(VOICE_MODULE_PROOF)) {
    if (proof.companion.room !== "songs") continue;
    assert.equal(proof.companion.param, "song", `${moduleId} uses a non-song param on the songbook`);
    assert.ok(proof.companion.value, `${moduleId} links the songbook with no slug`);
  }
});

test("lesson ids map to their module", () => {
  assert.equal(moduleIdForLesson("v-l1-m1-01"), "v-l1-m1");
  assert.equal(moduleIdForLesson("v-l7-m6-08"), "v-l7-m6");
  assert.equal(moduleIdForLesson("g-l1-m1-01"), undefined);
  assert.equal(moduleIdForLesson("v-l1-m1"), undefined);

  // Every lesson in the curriculum resolves to a module that has a proof basis.
  for (const level of voiceCurriculum.levels) {
    for (const learningModule of level.modules) {
      for (const lesson of learningModule.lessons) {
        assert.equal(
          moduleIdForLesson(lesson.id),
          learningModule.id,
          `lesson ${lesson.id} does not derive module ${learningModule.id}`,
        );
      }
    }
  }
});

/**
 * The vocal safety note has to be on the page a singer actually sees.
 *
 * It lived inline in `LessonSession`, which only mounts for a lesson that is
 * "ready". No voice lesson is ready, so the note never rendered — on a track
 * that tells a singer to slide to both extremes of their range and hold a
 * twelve-second hiss, and whose first two stages are now genuinely open rather
 * than paywalled previews.
 */
test("the voice track has a safety note, and it names the real risks", () => {
  const note = TRACK_SAFETY_NOTE.voice;
  assert.match(note, /comfortable/i, "the note must tell a singer to stay comfortable");
  assert.match(note, /hoarse|hurts/i, "the note must name the symptom to stop on");
  // And it must not overstate what the app can see, which is the same honesty
  // the measurement registry enforces for the proof metrics.
  assert.match(note, /cannot assess vocal health/i);
  assert.notEqual(TRACK_SAFETY_NOTE.voice, TRACK_SAFETY_NOTE.guitar);
});
