import type { MasteryStatus } from "./types";

// Rule constants mirror PLAN.md §3.3 (simple-rule learner model).
export const MASTERED_STREAK = 3; // consecutive correct -> mastered
export const GAP_STREAK = 2; // consecutive wrong -> gap

export const MASTERY_META: Record<
  MasteryStatus,
  { label: string; color: string }
> = {
  mastered: { label: "会了", color: "#1aa87a" },
  gap: { label: "再练", color: "#e89a2e" },
  unlockable: { label: "可以学", color: "#3b82f0" },
  locked: { label: "还没开", color: "#9aa3b2" },
};
