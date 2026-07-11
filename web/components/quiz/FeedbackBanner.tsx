"use client";

import type { AnswerResponse } from "@/lib/types";
import { CheckCircle, SmileyNervous } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function FeedbackBanner({ result }: { result: AnswerResponse }) {
  const { t } = useI18n();
  const ok = result.correct;
  return (
    <div
      className={`rounded-card p-5 md:p-6 ${
        ok
          ? "bg-[rgba(26,168,122,0.1)]"
          : "bg-[rgba(232,154,46,0.12)]"
      }`}
    >
      <p className="flex items-center gap-2.5 text-xl font-semibold text-ink">
        {ok ? (
          <CheckCircle size={26} weight="fill" className="text-mastered" />
        ) : (
          <SmileyNervous size={26} weight="fill" className="text-gap" />
        )}
        {ok ? t.correct : t.tryAgain}
      </p>
      {result.explanation && (
        <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-muted">
          {result.explanation}
        </p>
      )}
      {result.insertedPrerequisite && (
        <p className="mt-4 text-base font-medium text-ink">
          <span className="text-gap">{t.shoreUpBasics}</span>
          {t.backToPrefix}
          {result.insertedPrerequisite.name}
          {t.backToSuffix}
        </p>
      )}
    </div>
  );
}
