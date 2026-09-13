/**
 * What a sing practice session counts as against this repository's voice
 * curriculum — and, for most session types, the reasoned statement that it
 * counts as nothing.
 *
 * ## The shape comes from there, the mapping belongs here
 *
 * `contracts/suede-progress.json` is vendored from JasonColapietro/sing and
 * describes what a session *is*: an activity type, a local day, a duration, and
 * sometimes a percentage. It deliberately does not say what a session means
 * here, because lesson identifiers are authored in this repository and are
 * meaningless over there. A mapping table published from sing would be an
 * assertion about a catalog sing cannot see and could not revalidate when a
 * lesson is renamed.
 *
 * So this module is the other half, and the reason it is the half with teeth is
 * `parseLearningAttempt`: the ledger refuses any lesson identifier outside the
 * caller's `allowedLessons`, which makes this side the only side that can be
 * wrong in a way a test can catch.
 *
 * ## What a mapped record establishes, and what it does not
 *
 * It establishes that the singer did the thing the lesson asks for, on a day, for
 * a duration, in another application. It does not establish a pass. An imported
 * attempt is `source: "legacy"`, `kind: "legacy"`, `disposition: "imported"`, and
 * `parseLearningAttempt` forces `assessment: "repeat"` for every legacy attempt,
 * so no import can mark a lesson ready no matter what it claims. That is not a
 * limitation to work around; it is the only reason this mapping can ship before
 * the product question below is answered.
 *
 * ## Why most types map to nothing
 *
 * Two different reasons, kept apart because they have different remedies. An
 * ambiguous type has several lessons it could be evidence for and nothing in the
 * session to choose between them — the remedy is more information in the session
 * or a narrower curriculum. A type with no corresponding lesson has none at all,
 * and the remedy is a product decision about whether that activity belongs in the
 * curriculum. Inventing an identifier for either would be the failure this whole
 * change-set has been removing: a record that looks like evidence and is not.
 *
 * Nothing is dropped quietly. Every session lands in exactly one outcome bucket
 * and the counts sum to the number of sessions handed in.
 */
import {
  parseLearningAttempt,
  type LearningAttempt,
  type LearningTrack,
} from "../learning-account/contracts.ts";

/** The activity types sing publishes, as this repository reads them. Kept as a
 * type rather than a runtime list: the runtime list is the vendored contract's,
 * and `tests/sing-session-mapping.test.ts` fails if the two disagree. */
export type SingActivityType =
  | "warmup"
  | "pitch"
  | "range"
  | "ear"
  | "breath"
  | "song"
  | "recording"
  | "tools"
  | "analyze";

/**
 * Why an activity type does not become an attempt.
 *
 * `ambiguous` names the lessons it could be, because a list of two is an
 * argument that can be checked and "unclear" is not. `noCorrespondingLesson`
 * carries no candidates because there are none.
 */
export type SingMapping =
  | { verdict: "mapped"; lessonId: string; establishes: string; because: string }
  | { verdict: "ambiguous"; candidates: readonly string[]; because: string }
  | { verdict: "noCorrespondingLesson"; because: string };

/**
 * One entry per activity type sing publishes, with the reasoning attached.
 *
 * One of nine maps. That ratio is the finding, not a gap in the work: the voice
 * curriculum here is a hundred and two authored lessons of guided instruction,
 * and sing is a set of practice rooms. They overlap in one place where a session
 * both corresponds to a single lesson and carries the measurement that lesson is
 * about.
 */
export const SING_SESSION_MAPPING: Readonly<Record<SingActivityType, SingMapping>> = {
  range: {
    verdict: "mapped",
    lessonId: "v-l1-m2-04",
    establishes:
      "That a full range scan was completed on that day, with a measured low and " +
      "high MIDI note. Not that the checkpoint was passed: an imported attempt is " +
      "legacy-sourced, so the ledger records it as 'repeat' whatever it claims.",
    because:
      "A completed range scan is the only sing activity that corresponds to exactly " +
      "one authored lesson and carries the measurement that lesson is about. " +
      "`v-l1-m2` is the Your Range module, its proof metric is the MIDI span, and " +
      "its checkpoint asks for a scan completed without pushing into strain at " +
      "either end — which is what sing's range finder does and records.",
  },
  warmup: {
    verdict: "ambiguous",
    candidates: ["v-l2-m1-03", "v-l7-m1-03"],
    because:
      "Two authored lessons are about warming up, in stages five apart: the straw " +
      "and lip-trill exercise in stage two, and building your own warm-up in stage " +
      "seven. A sing warmup session names its exercise only in a free-text detail " +
      "field drawn from sing's own catalogue, so nothing in the session chooses " +
      "between a beginner drilling back pressure and a singer running a routine " +
      "they designed.",
  },
  pitch: {
    verdict: "ambiguous",
    candidates: ["v-l2-m2-03", "v-l4-m1-03"],
    because:
      "Landing a pitch and correcting drift across a whole song are separate " +
      "lessons four stages apart, both scored on cents deviation, and a pitch " +
      "session distinguishes them nowhere. The session's score is a percentage of " +
      "time within tolerance, which is not a cents deviation, so even once a lesson " +
      "were chosen the number would not be the proof metric that lesson is judged " +
      "on.",
  },
  breath: {
    verdict: "ambiguous",
    candidates: ["v-l1-m3-04", "v-l2-m1-06"],
    because:
      "Two modules are measured in sustained seconds — twelve seconds of even hiss " +
      "in stage one, eight seconds unbroken on a straw in stage two — and a session " +
      "carries only the duration of the whole sitting, never the longest single " +
      "sustain inside it. So neither threshold can be evidenced from a session even " +
      "if the lesson were not ambiguous, which is two independent reasons and one " +
      "verdict.",
  },
  song: {
    verdict: "ambiguous",
    candidates: ["v-l2-m4-04", "v-l3-m4-04", "v-l6-m6-05"],
    because:
      "The three song lessons are distinguished by the span the song covers — an " +
      "octave, a tenth, a twelfth — because the point of each is which registers " +
      "the singer has to cross. A sing song session carries a title and, on Pro " +
      "records only, per-note tallies that a span could be derived from. The tallies " +
      "are absent from every session logged before Pro analytics existed, which is " +
      "exactly the history an import is for.",
  },
  ear: {
    verdict: "noCorrespondingLesson",
    because:
      "No lesson in the voice curriculum teaches or tests interval recognition. " +
      "Ear training is a sing room with no counterpart here, and a lesson cannot be " +
      "chosen for it because none of the hundred and two is about it.",
  },
  recording: {
    verdict: "noCorrespondingLesson",
    because:
      "The recorder is a tool. No lesson asks for a take to be filed, so a take " +
      "being filed is not an attempt at anything the curriculum authored.",
  },
  tools: {
    verdict: "noCorrespondingLesson",
    because:
      "The metronome and the pitch pipe support practice rather than being " +
      "practised. Nothing in the curriculum is completed by using one.",
  },
  analyze: {
    verdict: "noCorrespondingLesson",
    because:
      "Analysing a take is the closest near-miss in the set, and it is still a miss. " +
      "The nearest lesson, Fix the Wobble, is a checkpoint against the singer's own " +
      "earlier baseline, and this repository never recorded a baseline to beat. " +
      "Mapping to it would import a comparison against a number that does not exist " +
      "here.",
  },
};

/** The subset of a sing session this repository reads. Validated rather than
 * trusted: these bytes reached us through an export file or another app's store. */
export interface SingSession {
  id: string;
  type: string;
  /** ISO timestamp. Sing repairs a missing one to local noon on `day`. */
  date: string;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  durationSec: number;
  detail?: string;
}

/** One entry of sing's `rangeHistory`. The span a `range` session is about lives
 * here and not in the session, so the two have to be matched up by day. */
export interface SingRangeTest {
  lowMidi: number;
  highMidi: number;
  testedAt: string;
}

/**
 * Every way a session can end up, including the way that produces an attempt.
 *
 * Exhaustive on purpose. A session that matched none of these would be a session
 * this module dropped without saying so, and the counts are asserted to sum to
 * the input length precisely so that cannot happen unnoticed.
 */
export type SingSessionOutcome =
  | "imported"
  | "ambiguousLesson"
  | "noCorrespondingLesson"
  | "evidenceMissing"
  | "ambiguousEvidence"
  | "identityUnassigned"
  | "lessonNotAllowed"
  | "unreadable";

export const SING_SESSION_OUTCOMES = [
  "ambiguousEvidence",
  "ambiguousLesson",
  "evidenceMissing",
  "identityUnassigned",
  "imported",
  "lessonNotAllowed",
  "noCorrespondingLesson",
  "unreadable",
] as const satisfies readonly SingSessionOutcome[];

export interface SingImport {
  attempts: LearningAttempt[];
  /** Every outcome key present, zeros included, so a caller rendering this cannot
   * mistake an absent key for a count of none. */
  counts: Record<SingSessionOutcome, number>;
  total: number;
}

const MAX_PRACTICE_SECONDS = 86_400;

/**
 * How close a range test must sit to a session to be that session's result.
 *
 * The join used to compare `testedAt.slice(0, 10)` against `session.day`, which
 * was wrong twice. `day` is a local calendar date and an ISO prefix is a UTC one,
 * so a scan either side of midnight failed to match the sitting it belonged to;
 * and `.find` took the first test sharing a day, so a singer who scanned twice in
 * one day had the first scan's range attached to both sessions. Comparing the two
 * timestamps as instants removes the midnight problem entirely — there is no date
 * string left to disagree about — and requiring exactly one candidate inside the
 * window turns the second scan from a silent wrong answer into a counted one.
 *
 * Twelve hours is deliberately generous: sing repairs a session with no time to
 * local noon on its day, so a real pair can legitimately sit half a day apart.
 */
export const RANGE_JOIN_WINDOW_SEC = 12 * 60 * 60;

/**
 * Whether a range test is fit to be stored as provenance.
 *
 * `parseLearningAttempt` bounds `details` as JSON and does not look inside it, so
 * without this a tampered or truncated export could land `lowMidi: -999` in the
 * ledger as an imported measurement. A record that fails here is reported as
 * unreadable rather than stored: an unusable measurement is not evidence.
 */
function isUsableRangeTest(test: SingRangeTest | undefined): test is SingRangeTest {
  if (!test) return false;
  if (typeof test.testedAt !== "string" || !Number.isFinite(Date.parse(test.testedAt))) return false;
  for (const midi of [test.lowMidi, test.highMidi]) {
    if (!Number.isInteger(midi) || midi < 0 || midi > 127) return false;
  }
  return test.lowMidi <= test.highMidi;
}

function isActivityType(value: string): value is SingActivityType {
  return Object.hasOwn(SING_SESSION_MAPPING, value);
}

/**
 * Turn a singer's sing history into ledger attempts, and account for everything
 * that did not become one.
 *
 * `attemptIds` is required rather than generated, and that is the point of it.
 * Sing session ids are `${epochMillis}-${random}`, which `accountUUID` rejects,
 * and minting a fresh UUID per run would make the same practice arrive again as
 * a new attempt on every import — the ledger is append-only, so there is no
 * later correction. The caller therefore has to hold a persisted sing-id to
 * attempt-id mapping, and a session with no entry in it is counted as
 * `identityUnassigned` rather than given an identity this function invented.
 *
 * `allowedLessons` is the caller's, not this module's, because entitlement and
 * track availability are the caller's business. A mapped lesson the caller does
 * not allow is counted, not thrown: an import of six hundred sessions must not
 * fail wholesale because one lesson is outside the caller's curriculum slice.
 */
export function importSingSessions(input: {
  sessions: readonly SingSession[];
  rangeTests: readonly SingRangeTest[];
  attemptIds: ReadonlyMap<string, string>;
  allowedLessons: ReadonlyMap<string, LearningTrack>;
  track?: LearningTrack;
}): SingImport {
  const track = input.track ?? "voice";
  const attempts: LearningAttempt[] = [];
  const counts = Object.fromEntries(SING_SESSION_OUTCOMES.map((key) => [key, 0])) as Record<SingSessionOutcome, number>;
  const count = (outcome: SingSessionOutcome) => { counts[outcome] += 1; };

  for (const session of input.sessions) {
    if (typeof session?.type !== "string" || !isActivityType(session.type)) { count("unreadable"); continue; }
    const createdAt = new Date(session.date);
    if (!Number.isFinite(createdAt.getTime())) { count("unreadable"); continue; }
    // The ledger's ceiling is the stricter of the two, and a sitting longer than
    // a day is a corrupt row rather than practice. Clamping it would publish a
    // duration nobody sang, so the row is reported instead.
    if (!Number.isFinite(session.durationSec) || session.durationSec < 0 || session.durationSec > MAX_PRACTICE_SECONDS) { count("unreadable"); continue; }

    const mapping = SING_SESSION_MAPPING[session.type];
    if (mapping.verdict === "ambiguous") { count("ambiguousLesson"); continue; }
    if (mapping.verdict === "noCorrespondingLesson") { count("noCorrespondingLesson"); continue; }

    const attemptId = input.attemptIds.get(session.id);
    if (!attemptId) { count("identityUnassigned"); continue; }

    // The one mapped type is a range scan, and the scan's measurement is not in
    // the session, so the two records have to be joined. Candidates are the tests
    // whose instant sits inside the window; a session with none is a scan whose
    // result was never stored, and a session with two cannot be attributed to
    // either without guessing.
    const sessionAt = createdAt.getTime();
    const candidates = input.rangeTests.filter(
      (test) =>
        isUsableRangeTest(test) &&
        Math.abs(Date.parse(test.testedAt) - sessionAt) <= RANGE_JOIN_WINDOW_SEC * 1000,
    );
    if (candidates.length === 0) { count("evidenceMissing"); continue; }
    if (candidates.length > 1) { count("ambiguousEvidence"); continue; }
    const [rangeTest] = candidates;

    if (input.allowedLessons.get(mapping.lessonId) !== track) { count("lessonNotAllowed"); continue; }

    try {
      attempts.push(parseLearningAttempt({
        version: 1,
        id: attemptId,
        track,
        lessonId: mapping.lessonId,
        kind: "legacy",
        createdAt: createdAt.toISOString(),
        practiceSeconds: Math.round(session.durationSec),
        exerciseRevision: null,
        source: "legacy",
        disposition: "imported",
        // Stated rather than computed, and overridden by the parser anyway: a
        // legacy attempt is always "repeat". Sending "ready" here would be a
        // claim the transport refuses, which is the right place for it to die.
        assessment: "repeat",
        score: null,
        bpm: null,
        // Provenance only. No XP, no streak and no achievement ids: see the
        // vendored contract's `portability` section, and `tests/sing-session-mapping.test.ts`,
        // which walks every produced attempt for those keys.
        details: {
          singSession: {
            id: session.id,
            type: session.type,
            day: session.day,
            durationSec: Math.round(session.durationSec),
            ...(typeof session.detail === "string" ? { detail: session.detail.slice(0, 400) } : {}),
          },
          singRangeTest: { lowMidi: rangeTest.lowMidi, highMidi: rangeTest.highMidi, testedAt: rangeTest.testedAt },
        },
      }, input.allowedLessons));
      count("imported");
    } catch {
      // The transport refused it. That is a reportable outcome and not a reason
      // to abandon the rest of the history.
      count("unreadable");
    }
  }

  return { attempts, counts, total: input.sessions.length };
}
