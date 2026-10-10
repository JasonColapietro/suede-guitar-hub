/**
 * The tempo span the web metronome plays.
 *
 * Wider than the native app's 40 to 208 (contracts/practice-tools.json, which
 * stays the iOS contract): the sparse-click drills the metronome guide teaches
 * need the bottom of the range, since beat one only at 120 is a click at 30,
 * and 240 matches the Suede Sing metronome room. /tempo builds its ladders in
 * this same span, so every rung it prints is a tempo /practice can play.
 *
 * Dependency-free so lib/tempo.ts can import it and stay pure.
 */
export const METRONOME_MIN_BPM = 30;
export const METRONOME_MAX_BPM = 240;
