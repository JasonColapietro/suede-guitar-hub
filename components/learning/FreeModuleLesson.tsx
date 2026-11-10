"use client";

import { useLearningAccess } from "./LearningAccessProvider";

/**
 * A lesson in one of the three candidate free modules, served to a visitor the
 * server cannot place. The browser's free-module choice decides: the visitor
 * whose module this is gets the lesson, everyone else gets the gate.
 */
export function FreeModuleLesson({ moduleId, locked, children }: { moduleId: string; locked: React.ReactNode; children: React.ReactNode }) {
  return useLearningAccess().freeModuleId === moduleId ? children : locked;
}
