export interface StudyBar { number: number; chord: "A" | "D"; startBeat: number; beats: number; endBeatExclusive: number }
export interface StudyPhrase { id: string; label: string; startBar: number; endBar: number }
export interface StudyVariant { id: string; label: string; isDefault: boolean; strokeBeatOffsets: number[]; noteDurationBeats: number; action: string }
export interface ChordStudy {
  id: string; title: string; defaultBPM: number; barCount: number; beatsPerBar: number; countInBeats: number;
  bars: StudyBar[]; phrases: StudyPhrase[]; variants: StudyVariant[];
  demoEvents: { beat: number; midiLowToHigh: number[]; durationBeats: number; perStringStrumOffsetBeats: number }[];
}
export type StageTwoAsset =
  | { id: string; kind: "panels"; panels: { number: number; label: string; action: string }[] }
  | { id: string; kind: "anchor"; sequence: { number: number; chord: string | null; action: string }[]; suggestedSeconds: number; textAlternative: string }
  | { id: string; kind: "manualChanges"; durationSeconds: 60; defaultStartingChord: "A" | "D"; countRule: string; earlyReadinessCount: number; longerTermGoalCount: number }
  | { id: string; kind: "barGuide"; bpm: number; beats: { beatInBar: number; action: string }[]; textAlternative: string }
  | { id: string; kind: "study"; study: ChordStudy }
  | { id: string; kind: "externalLinks"; options: { id: string; title: string; url: string; description: string }[] }
  | { id: string; kind: "timingCheckpoint"; barCount: number; targetCount: number; bpm: number };

const stageKinds = new Set(["panels", "anchor", "manualChanges", "barGuide", "study", "externalLinks", "timingCheckpoint"]);
export function isStageTwoAsset(asset: { kind: string }): asset is StageTwoAsset { return stageKinds.has(asset.kind); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid instructional asset"); return value as Record<string, unknown>; }
function text(value: unknown): string { if (typeof value !== "string" || !value.trim()) throw new Error("Missing instructional text"); return value; }
function numeric(value: unknown, min: number, max: number): number { if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Invalid instructional number"); return value; }
function integer(value: unknown, min: number, max: number): number { const number = numeric(value, min, max); if (!Number.isInteger(number)) throw new Error("Expected an integer"); return number; }
function list(value: unknown): unknown[] { if (!Array.isArray(value) || value.length === 0) throw new Error("Missing instructional list"); return value; }

export function decodeChordStudy(value: unknown): ChordStudy {
  const raw = object(value);
  const barCount = integer(raw.barCount, 1, 128), beatsPerBar = integer(raw.beatsPerBar, 4, 4);
  const bars: StudyBar[] = list(raw.bars).map((value, index) => {
    const bar = object(value), chord = text(bar.chord);
    if (chord !== "A" && chord !== "D") throw new Error("Unknown study chord");
    return { number: integer(bar.number, index + 1, index + 1), chord, startBeat: integer(bar.startBeat, index * 4, index * 4), beats: integer(bar.beats, 4, 4), endBeatExclusive: integer(bar.endBeatExclusive, (index + 1) * 4, (index + 1) * 4) };
  });
  if (bars.length !== barCount) throw new Error("Study bar count mismatch");
  const phrases = list(raw.phrases).map(value => { const phrase = object(value); const startBar = integer(phrase.startBar, 1, barCount); return { id: text(phrase.id), label: text(phrase.label), startBar, endBar: integer(phrase.endBar, startBar, barCount) }; });
  const variants = list(raw.variants).map(value => { const variant = object(value); const strokeBeatOffsets = list(variant.strokeBeatOffsets).map(beat => integer(beat, 0, barCount * 4 - 1)); if (strokeBeatOffsets.some((beat, index) => index > 0 && beat <= strokeBeatOffsets[index - 1])) throw new Error("Study strokes must be ordered"); return { id: text(variant.id), label: text(variant.label), isDefault: variant.isDefault === true, strokeBeatOffsets, noteDurationBeats: numeric(variant.noteDurationBeats, .1, 4), action: text(variant.action) }; });
  const demoEvents = list(raw.demoEvents).map((value, index) => { const event = object(value); const midiLowToHigh = list(event.midiLowToHigh).map(midi => integer(midi, 21, 108)); if (midiLowToHigh.length > 6) throw new Error("Too many study voices"); return { beat: numeric(event.beat, index * 4, index * 4), midiLowToHigh, durationBeats: numeric(event.durationBeats, .1, 4), perStringStrumOffsetBeats: numeric(event.perStringStrumOffsetBeats, 0, .1) }; });
  if (demoEvents.length !== barCount) throw new Error("Missing study chord events");
  return { id: text(raw.id), title: text(raw.title), defaultBPM: numeric(raw.defaultBPM, 20, 240), barCount, beatsPerBar, countInBeats: integer(raw.countInBeats, 4, 4), bars, phrases, variants, demoEvents };
}

export function decodeStageTwoAsset(id: string, raw: Record<string, unknown>): StageTwoAsset | null {
  switch (raw.kind) {
    case "instruction_diagram": return { id, kind: "panels", panels: list(raw.panels).map(value => { const panel = object(value); return { number: integer(panel.number, 1, 20), label: text(panel.label), action: text(panel.action) }; }) };
    case "step_diagram": return { id, kind: "anchor", sequence: list(raw.sequence).map(value => { const step = object(value); return { number: integer(step.number, 1, 20), chord: step.chord === null ? null : text(step.chord), action: text(step.action) }; }), suggestedSeconds: numeric(raw.suggestedSeconds, 1, 3600), textAlternative: text(raw.textAlternative) };
    case "manual_timed_exercise": { const chord = raw.defaultStartingChord; if (chord !== "A" && chord !== "D") throw new Error("Invalid starting chord"); return { id, kind: "manualChanges", durationSeconds: integer(raw.durationSeconds, 60, 60) as 60, defaultStartingChord: chord, countRule: text(raw.countRule), earlyReadinessCount: integer(raw.earlyReadinessCount, 1, 1000), longerTermGoalCount: integer(raw.longerTermGoalCount, 1, 1000) }; }
    case "rhythm_diagram_and_demo": return { id, kind: "barGuide", bpm: numeric(raw.suggestedBPM, 20, 240), beats: list(raw.beatCells).map(value => { const beat = object(value); return { beatInBar: integer(beat.beatInBar, 1, 4), action: text(beat.action) }; }), textAlternative: text(raw.textAlternative) };
    case "original_chord_study": return { id, kind: "study", study: decodeChordStudy(raw) };
    case "external_practice_links": return { id, kind: "externalLinks", options: list(raw.options).map(value => { const option = object(value), url = new URL(text(option.url)); if (url.protocol !== "https:") throw new Error("Practice links must use HTTPS"); return { id: text(option.id), title: text(option.title), url: url.href, description: text(option.description) }; }) };
    case "expanded_rhythm_checkpoint": { const spec = object(raw.practiceSpec); return { id, kind: "timingCheckpoint", barCount: integer(raw.barCount, 1, 128), targetCount: list(spec.targets).length, bpm: numeric(spec.bpm, 20, 300) }; }
    default: return null;
  }
}

export function studyPosition(study: ChordStudy, elapsedSeconds: number, bpm: number, firstBar: number, lastBar: number) {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isInteger(firstBar) || !Number.isInteger(lastBar) || firstBar < 1 || lastBar > study.barCount || firstBar > lastBar) throw new Error("Invalid study range or tempo");
  const elapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  const musicBeats = (lastBar - firstBar + 1) * study.beatsPerBar;
  const relativeBeat = elapsed * bpm / 60 - study.countInBeats;
  const finished = relativeBeat >= musicBeats;
  const musicSeconds = Math.max(0, Math.min(musicBeats, relativeBeat)) * 60 / bpm;
  const beat = Math.max(0, Math.min(musicBeats - 1, Math.floor(relativeBeat)));
  return { countingIn: relativeBeat < 0, countInRemaining: Math.max(0, Math.ceil(-relativeBeat)), finished, bar: firstBar + Math.floor(beat / study.beatsPerBar), beatInBar: beat % study.beatsPerBar + 1, musicSeconds };
}
export interface StudySoundEvent { at: number; duration: number; frequency: number; gain: number; type: "sine" | "triangle" }
/** One timeline supplies sound scheduling and the visible bar/beat position. */
export function studySoundEvents(study: ChordStudy, bpm: number, firstBar: number, lastBar: number, variantId: string, chords: boolean, clicks: boolean): StudySoundEvent[] {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isInteger(firstBar) || !Number.isInteger(lastBar) || firstBar < 1 || lastBar > study.barCount || firstBar > lastBar) throw new Error("Invalid study range or tempo");
  const step = 60 / bpm, events: StudySoundEvent[] = [], startBeat = (firstBar - 1) * 4, endBeat = lastBar * 4;
  for (let beat = 0; beat < study.countInBeats; beat++) events.push({ at: beat * step, duration: .055, frequency: beat === 0 ? 880 : 660, gain: .08, type: "sine" });
  if (clicks) for (let beat = startBeat; beat < endBeat; beat++) events.push({ at: (study.countInBeats + beat - startBeat) * step, duration: .055, frequency: beat % 4 === 0 ? 880 : 660, gain: .06, type: "sine" });
  const variant = study.variants.find(item => item.id === variantId);
  if (!variant) throw new Error("Unknown study variant");
  if (chords) for (const beat of variant.strokeBeatOffsets.filter(beat => beat >= startBeat && beat < endBeat)) {
    const chord = study.demoEvents[Math.floor(beat / 4)];
    chord.midiLowToHigh.forEach((midi, stringIndex) => { const offset = stringIndex * chord.perStringStrumOffsetBeats * step; events.push({ at: (study.countInBeats + beat - startBeat) * step + offset, duration: Math.max(.05, Math.min(chord.durationBeats, variant.noteDurationBeats - .05) * step - offset), frequency: 440 * 2 ** ((midi - 69) / 12), gain: .035, type: "triangle" }); });
  }
  return events.sort((a, b) => a.at - b.at);
}

export interface ManualChangeAttempt { id: string; lessonId: string; createdAt: string; startingChord: "A" | "D"; count: number | null; durationSeconds: number; completedMinute: boolean; interrupted: boolean }
export function manualMinuteResult(startedAt: number, now: number, interrupted: boolean) {
  const durationSeconds = Number.isFinite(now) && Number.isFinite(startedAt) ? Math.max(0, Math.min(60, now - startedAt)) : 0;
  return { durationSeconds, completedMinute: durationSeconds === 60 && !interrupted, interrupted };
}
export function manualChangeRate(attempt: ManualChangeAttempt): number | null { return attempt.completedMinute && !attempt.interrupted && attempt.durationSeconds === 60 ? attempt.count : null; }
export interface StudyAttempt { id: string; lessonId: string; studyId: string; createdAt: string; bpm: number; firstBar: number; lastBar: number; variantId: string; practiceSeconds: number; usedBacking: boolean; usedClicks: boolean; interrupted: boolean; timelineFinished: boolean; learnerPlayedAllBars: boolean; reviewBar: number | null }
export function isFullStudyTake(attempt: StudyAttempt, study: ChordStudy) { return attempt.studyId === study.id && study.variants.some(variant => variant.id === attempt.variantId) && attempt.practiceSeconds >= study.barCount * study.beatsPerBar * 60 / attempt.bpm - .01 && attempt.firstBar === 1 && attempt.lastBar === study.barCount && attempt.timelineFinished && !attempt.interrupted && attempt.learnerPlayedAllBars; }
export interface StageTwoHistory { version: 1; track: "guitar" | "voice"; changes: ManualChangeAttempt[]; studies: StudyAttempt[] }
export function stageTwoKey(track: "guitar" | "voice") { return `guitarhub.stage-two.v1.${track}`; }
export function parseStageTwoHistory(raw: string | null, track: "guitar" | "voice"): StageTwoHistory {
  const history: StageTwoHistory = { version: 1, track, changes: [], studies: [] };
  try {
    if (!raw) return history;
    const root = object(JSON.parse(raw));
    if (root.version !== 1 || root.track !== track) return history;
    const identity = (value: Record<string, unknown>) => typeof value.id === "string" && /^[a-zA-Z0-9-]{1,128}$/.test(value.id) && typeof value.lessonId === "string" && value.lessonId.startsWith(`${track[0]}-`) && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt));
    const changeIds = new Set<string>(), studyIds = new Set<string>();
    if (Array.isArray(root.changes)) for (const value of root.changes) { try { const item = object(value); if (!identity(item) || changeIds.has(item.id as string) || !["A", "D"].includes(String(item.startingChord)) || typeof item.completedMinute !== "boolean" || typeof item.interrupted !== "boolean") continue; numeric(item.durationSeconds, 0, 60); if (item.count !== null) integer(item.count, 0, 10000); if (item.completedMinute && (item.durationSeconds !== 60 || item.interrupted)) continue; changeIds.add(item.id as string); history.changes.push({ id: item.id, lessonId: item.lessonId, createdAt: item.createdAt, startingChord: item.startingChord, count: item.count, durationSeconds: item.durationSeconds, completedMinute: item.completedMinute, interrupted: item.interrupted } as ManualChangeAttempt); } catch { /* Ignore invalid attempts, retain the rest. */ } }
    if (Array.isArray(root.studies)) for (const value of root.studies) { try { const item = object(value); if (!identity(item) || studyIds.has(item.id as string) || typeof item.studyId !== "string" || typeof item.variantId !== "string" || ["usedBacking", "usedClicks", "interrupted", "timelineFinished", "learnerPlayedAllBars"].some(key => typeof item[key] !== "boolean")) continue; numeric(item.bpm, 1, 400); integer(item.firstBar, 1, 128); integer(item.lastBar, item.firstBar as number, 128); numeric(item.practiceSeconds, 0, 86400); if (item.reviewBar !== null) integer(item.reviewBar, item.firstBar as number, item.lastBar as number); studyIds.add(item.id as string); history.studies.push({ id: item.id, lessonId: item.lessonId, studyId: item.studyId, createdAt: item.createdAt, bpm: item.bpm, firstBar: item.firstBar, lastBar: item.lastBar, variantId: item.variantId, practiceSeconds: item.practiceSeconds, usedBacking: item.usedBacking, usedClicks: item.usedClicks, interrupted: item.interrupted, timelineFinished: item.timelineFinished, learnerPlayedAllBars: item.learnerPlayedAllBars, reviewBar: item.reviewBar } as StudyAttempt); } catch { /* Ignore invalid attempts, retain the rest. */ } }
  } catch { /* Corrupt storage does not establish practice evidence. */ }
  return history;
}
