import { createStoredValue, type StorageArea } from "../shared-storage.ts";
import { METRONOME_CLICK_MODES, METRONOME_GAP_BARS, metronomeBPM, metronomeGapBars, metronomeConfiguration, type MetronomeClickMode, type MetronomePattern } from "./practice-tools.ts";

/** localStorage key for the /practice metronome. Bump the version when the stored shape changes. */
export const METRONOME_STORAGE_KEY = "guitarhub.metronome.v1";

/**
 * Everything the metronome remembers between visits. The gap bar counts are
 * kept while the gap trainer is off, so turning it back on restores them.
 */
export type MetronomeSettings = {
  bpm: number;
  mode: MetronomeClickMode;
  gapEnabled: boolean;
  playBars: number;
  muteBars: number;
};

export const DEFAULT_METRONOME_SETTINGS: MetronomeSettings = {
  bpm: metronomeConfiguration.defaultBPM,
  mode: "everyBeat",
  gapEnabled: false,
  playBars: METRONOME_GAP_BARS.defaultPlay,
  muteBars: METRONOME_GAP_BARS.defaultMute,
};

/** Validate stored settings field by field; a bad field falls back alone. */
export function restoreMetronomeSettings(parsed: unknown): MetronomeSettings | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const raw = parsed as Record<string, unknown>;
  return {
    bpm: typeof raw.bpm === "number" && Number.isFinite(raw.bpm) ? Math.round(metronomeBPM(raw.bpm)) : DEFAULT_METRONOME_SETTINGS.bpm,
    mode: METRONOME_CLICK_MODES.includes(raw.mode as MetronomeClickMode) ? raw.mode as MetronomeClickMode : DEFAULT_METRONOME_SETTINGS.mode,
    gapEnabled: raw.gapEnabled === true,
    playBars: metronomeGapBars(raw.playBars, DEFAULT_METRONOME_SETTINGS.playBars),
    muteBars: metronomeGapBars(raw.muteBars, DEFAULT_METRONOME_SETTINGS.muteBars),
  };
}

/** The pattern the scheduler plays for a set of settings. */
export function patternForSettings(settings: MetronomeSettings): MetronomePattern {
  return { mode: settings.mode, gap: settings.gapEnabled ? { playBars: settings.playBars, muteBars: settings.muteBars } : null };
}

export function metronomeSettingsStore(storage?: () => StorageArea) {
  return createStoredValue<MetronomeSettings>({ key: METRONOME_STORAGE_KEY, restore: restoreMetronomeSettings, storage });
}

/** The labels a player chooses between, in the order they are offered. */
export const METRONOME_CLICK_MODE_LABELS: Record<MetronomeClickMode, string> = {
  everyBeat: "Every beat",
  backbeat: "Beats 2 and 4 (backbeat)",
  downbeat: "Beat 1 only (one click per bar)",
};

/** The running status line for a pattern, read out by the status region. */
export function metronomePatternMessage(settings: MetronomeSettings): string {
  const base = settings.mode === "backbeat"
    ? "Four beats per bar. The click lands on beats 2 and 4; you place 1 and 3."
    : settings.mode === "downbeat"
      ? "One click per bar, on beat 1. You keep beats 2, 3 and 4."
      : "Four beats per bar. The first beat has a brighter click.";
  if (!settings.gapEnabled) return base;
  const play = `${settings.playBars} ${settings.playBars === 1 ? "bar" : "bars"}`;
  const mute = `${settings.muteBars} ${settings.muteBars === 1 ? "bar" : "bars"}`;
  return `${base} ${play} with the click, then ${mute} silent, repeating. Keep playing through the silence.`;
}
