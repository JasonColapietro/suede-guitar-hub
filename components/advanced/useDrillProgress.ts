"use client";
import { useCallback, useEffect, useState } from "react";
import { DRILLS } from "@/lib/advanced/drills";
import { DRILL_PROGRESS_KEY, parseDrillProgress, withDrillResult, type DrillProgress } from "@/lib/advanced/progress";
import type { PracticeResult } from "@/lib/audio/practice";

const IDS = DRILLS.map(drill => drill.id);

function read(): DrillProgress {
  try { return parseDrillProgress(window.localStorage.getItem(DRILL_PROGRESS_KEY), IDS); } catch { return {}; }
}

/** Advanced Lab results, shared across tabs of this browser. */
export function useDrillProgress() {
  const [progress, setProgress] = useState<DrillProgress>({});
  useEffect(() => {
    setProgress(read());
    const sync = (event: StorageEvent) => { if (event.key === DRILL_PROGRESS_KEY) setProgress(read()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const record = useCallback((id: string, result: PracticeResult) => {
    const next = withDrillResult(read(), id, result, new Date().toISOString());
    setProgress(next);
    try { window.localStorage.setItem(DRILL_PROGRESS_KEY, JSON.stringify(next)); return true; } catch { return false; }
  }, []);
  return { progress, record };
}
