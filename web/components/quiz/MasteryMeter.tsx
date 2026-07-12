"use client";

import { MASTERED_STREAK } from "@/lib/mastery";
import type { MasteryState } from "@/lib/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function MasteryMeter({ mastery }: { mastery: MasteryState }) {
  const { t } = useI18n();
  const filled = Math.min(mastery.correctStreak, MASTERED_STREAK);
  return (
    <div className="flex items-center gap-2.5" aria-label={t.streak(mastery.correctStreak, MASTERED_STREAK)}>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: MASTERED_STREAK }).map((_, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < filled ? "#12b284" : "#e7e3ea" }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-muted">
        {t.streak(mastery.correctStreak, MASTERED_STREAK)}
      </span>
    </div>
  );
}
