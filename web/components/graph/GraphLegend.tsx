"use client";

import { MASTERY_META } from "@/lib/mastery";
import type { MasteryStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

const ORDER: MasteryStatus[] = ["mastered", "gap", "unlockable", "locked"];

export function GraphLegend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-muted">
      {ORDER.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: MASTERY_META[s].color }}
          />
          {t.mastery[s]}
        </span>
      ))}
    </div>
  );
}
