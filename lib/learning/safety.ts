import type { TrackId } from "./models.ts";

/**
 * The comfort-and-safety line for each track.
 *
 * This once lived only in `LessonSession`, which mounts for an open guided
 * lesson. So a singer viewing a locked preview could be told to slide to their
 * lowest and highest comfortable notes, and to hold a twelve-second hiss, with
 * no caution anywhere on the page. It
 * matters more now that the first two voice stages are genuinely open rather
 * than paywalled previews.
 *
 * Shared from here so the outline branch and the full lesson say the same thing.
 */
export const TRACK_SAFETY_NOTE = {
  guitar:
    "Keep your hand and shoulder relaxed. Stop and reset if you feel pain. Pitch feedback cannot judge tension, fingering, or buzzing.",
  voice:
    "Keep the range and volume comfortable. Stop if singing hurts or makes you hoarse; a pitch reading cannot assess vocal health.",
} as const satisfies Record<TrackId, string>;

/**
 * A caution for one module, where the track-wide line is not enough.
 *
 * `TRACK_SAFETY_NOTE` is the floor: it tells a singer to stay comfortable and
 * says that a pitch reading cannot assess vocal health. Two modules ask for
 * considerably more than comfort. `v-l5-m4` instructs a six-second mixed-voice
 * sustain near the top of the transition zone; `v-l7-m4` asks for creak, growl
 * and scream. Nothing here measures strain or pressed phonation. A module that
 * asks for the most load therefore has to name the symptoms to stop on itself
 * rather than rely on a general line further up the page.
 *
 * The register is deliberately the same as the track note: name what to stop
 * on, and do not imply that anything here read the voice and found it safe.
 * Keyed by module so the caution travels with the instruction that needs it
 * instead of being widened into a warning on every lesson, which is how a
 * caution stops being read.
 */
export const MODULE_SAFETY_NOTE = {
  "v-l5-m4":
    "A six-second mixed-voice hold near the top of your transition zone is the heaviest thing this track asks for. Stop the hold the moment it stings, tightens, or turns breathy, and leave the note for another day if your voice is hoarse afterwards; nothing here can tell you whether strain was absent or certify the attempt as safe.",
  "v-l7-m4":
    "Do not learn or imitate a new creak, growl, or scream from this app. Review only an effect already taught by a qualified teacher, at the dose they prescribed; otherwise use the observation-only path. Stop at pain, tightness, unexpected roughness, or a changed speaking voice. Nothing here can tell you whether an effect was safe.",
} as const satisfies Record<string, string>;
