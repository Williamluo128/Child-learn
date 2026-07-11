"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { AnswerResponse, MasteryState, QuestionPublic } from "@/lib/types";
import { fetchNextQuestion, submitAnswer } from "@/lib/api/client";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { FeedbackBanner } from "@/components/quiz/FeedbackBanner";
import { MasteryMeter } from "@/components/quiz/MasteryMeter";
import { ShadeFraction } from "@/components/interactive/ShadeFraction";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function PracticePage({
  params,
}: {
  params: { topicId: string };
}) {
  const { locale, t } = useI18n();
  const [topicId, setTopicId] = useState(params.topicId);
  const [question, setQuestion] = useState<QuestionPublic | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResponse | null>(null);
  const [mastery, setMastery] = useState<MasteryState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuestion = useCallback(
    async (tid: string) => {
      setLoading(true);
      setSelected(null);
      setResult(null);
      try {
        const q = await fetchNextQuestion(tid, locale);
        setQuestion(q);
      } finally {
        setLoading(false);
      }
    },
    [locale]
  );

  useEffect(() => {
    loadQuestion(topicId);
  }, [topicId, loadQuestion]);

  async function submit(key: string) {
    if (result || !question) return;
    setSelected(key);
    const res = await submitAnswer(question.id, key, locale);
    setResult(res);
    setMastery(res.mastery);
  }

  function handleNext() {
    if (!result) return;
    if (result.nextTopicId === topicId) {
      loadQuestion(topicId);
    } else {
      setTopicId(result.nextTopicId);
    }
  }

  return (
    <main className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft size={18} weight="bold" />
          {t.back}
        </Link>
        {mastery && <MasteryMeter mastery={mastery} />}
      </header>

      {loading || !question ? (
        <div className="rounded-card bg-surface p-14 text-center shadow-card">
          <div className="mx-auto mb-3 h-3 w-36 animate-pulse rounded-full bg-line" />
          <div className="mx-auto h-3 w-52 animate-pulse rounded-full bg-line" />
          <p className="mt-5 text-base text-muted">{t.loading}</p>
        </div>
      ) : (
        <>
          {question.kind === "shade" && question.shape ? (
            <div className="rounded-card border border-line bg-surface p-6 shadow-card md:p-8">
              <ShadeFraction
                key={question.id}
                shape={question.shape}
                numerator={question.numerator ?? 1}
                denominator={question.denominator}
                onCheck={(count) => submit(String(count))}
                verdict={result ? result.correct : null}
              />
            </div>
          ) : (
            <QuestionCard
              question={question}
              selected={selected}
              result={result}
              onSelect={submit}
            />
          )}
          {result && <FeedbackBanner result={result} />}
          {result && (
            <button
              onClick={handleNext}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-coral px-8 py-4 text-lg font-semibold text-ink shadow-card transition hover:bg-coral-deep hover:text-white active:scale-[0.98] md:w-auto md:self-end"
            >
              {result.correct ? t.next : t.keepGoing}
              <ArrowRight size={20} weight="bold" />
            </button>
          )}
        </>
      )}
    </main>
  );
}
