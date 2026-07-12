import type { MasteryStatus } from "./types";

// Rule constants mirror PLAN.md §3.3 (simple-rule learner model).
export const MASTERED_STREAK = 3; // consecutive correct -> mastered
export const GAP_STREAK = 2; // consecutive wrong -> gap

// color = flat sticker fill, edge = hard bottom edge (pressed-button depth).
export const MASTERY_META: Record<
  MasteryStatus,
  { label: string; color: string; edge: string }
> = {
  mastered: { label: "会了", color: "#12b284", edge: "#0a9169" },
  gap: { label: "再练", color: "#efa11c", edge: "#c9820b" },
  unlockable: { label: "可以学", color: "#7c5cf4", edge: "#5f41d6" },
  locked: { label: "还没开", color: "#b9b3c0", edge: "#9d97a6" },
};
