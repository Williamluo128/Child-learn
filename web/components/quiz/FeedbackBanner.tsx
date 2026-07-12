"use client";

import type { AnswerResponse } from "@/lib/types";
import { CheckCircle, SmileyNervous } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function FeedbackBanner({ result }: { result: AnswerResponse }) {
  const { t } = useI18n();
  const ok = result.correct;
  return (
    <div
      className={`rounded-card border-2 p-5 md:p-6 ${
        ok
          ? "border-mastered bg-mastered-soft"
          : "border-gap bg-gap-soft"
      }`}
    >
      <p
        className={`flex items-center gap-2.5 font-display text-xl font-bold ${
          ok ? "text-mastered-deep" : "text-gap-deep"
        }`}
      >
        {ok ? (
          <CheckCircle size={26} weight="fill" className="text-mastered" />
        ) : (
          <SmileyNervous size={26} weight="fill" className="text-gap" />
        )}
        {ok ? t.correct : t.tryAgain}
      </p>
      {result.explanation && (
        <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-ink">
          {result.explanation}
        </p>
      )}
      {result.insertedPrerequisite && (
        <p className="mt-4 text-base font-medium text-ink">
          <span className="text-gap-deep">{t.shoreUpBasics}</span>
          {t.backToPrefix}
          {result.insertedPrerequisite.name}
          {t.backToSuffix}
        </p>
      )}
    </div>
  );
}
