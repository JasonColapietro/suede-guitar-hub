"use client";

import { useEffect, useMemo, useState } from "react";
import { Paywall } from "@/components/paywall/Paywall";
import type { LifetimeOffer } from "@/lib/site";
import { track } from "@/lib/analytics/tracker";
import { hasVerifiedTrackAccess, isLessonReady } from "@/lib/learning/access";
import { catalogLessons } from "@/lib/learning/catalog";
import { freeModuleLessonIds } from "@/lib/learning/free-module";
import { browserStorage, claimFreeModuleMilestone } from "@/lib/learning/free-module-store";
import { lessonHref } from "@/lib/learning/track";
import { useLearningAccess } from "./LearningAccessProvider";
import { useLearningProgress } from "./useLearningProgress";

/** The first guitar lesson after the module, where lifetime access takes the visitor next. */
function lessonAfter(moduleId: string): string {
  const lessons = catalogLessons("guitar");
  const last = lessons.findLastIndex(entry => entry.module.id === moduleId);
  const next = last >= 0 ? lessons[last + 1] : undefined;
  return next ? lessonHref("guitar", next.lesson.id) : "/learn/guitar";
}

/**
 * Follows the visitor's free module from its first lesson view to its end.
 * Rendered with each lesson of the module: it notes the start once per
 * browser, and when every lesson of the module is done it notes the
 * completion once and opens the lifetime offer. Purchasers see nothing.
 */
export function FreeModuleEnd({ moduleId, checkoutAvailable, offer }: { moduleId: string; checkoutAvailable: boolean; offer?: LifetimeOffer }) {
  const access = useLearningAccess();
  const { progress } = useLearningProgress("guitar");
  const [closed, setClosed] = useState(false);
  const active = access.freeModuleId === moduleId && !hasVerifiedTrackAccess("guitar", access);
  const lessonIds = useMemo(() => freeModuleLessonIds(moduleId).filter(id => isLessonReady("guitar", id)), [moduleId]);
  const complete = active && lessonIds.length > 0 && lessonIds.every(id => progress.lessons[id]?.assessment === "ready");

  useEffect(() => {
    if (!active || !claimFreeModuleMilestone(browserStorage(), moduleId, "started")) return;
    try { track({ name: "free_module_started", module_id: moduleId }); } catch { /* Measurement never blocks a lesson. */ }
  }, [active, moduleId]);

  useEffect(() => {
    if (!complete || !claimFreeModuleMilestone(browserStorage(), moduleId, "completed")) return;
    try { track({ name: "free_module_completed", module_id: moduleId }); } catch { /* Measurement never blocks the offer. */ }
  }, [complete, moduleId]);

  return <Paywall trigger="module_end" open={complete && !closed} onClose={() => setClosed(true)} checkoutAvailable={checkoutAvailable} returnTo={lessonAfter(moduleId)} offer={offer} />;
}
