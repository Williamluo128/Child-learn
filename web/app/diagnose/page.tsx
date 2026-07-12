"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Compass,
  Stairs,
  WarningCircle,
  Wrench,
} from "@phosphor-icons/react";
import type { DiagnoseAnswer, DiagnoseResponse } from "@/lib/types";
import { fetchDiagnoseNext } from "@/lib/api/client";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ShadeFraction } from "@/components/interactive/ShadeFraction";
import { useI18n } from "@/lib/i18n/I18nProvider";

const CubeCount = dynamic(
  () => import("@/components/interactive/CubeCount").then((m) => m.CubeCount),
  { ssr: false }
);

export default function DiagnosePage() {
  const { t } = useI18n();
  const [history, setHistory] = useState<DiagnoseAnswer[]>([]);
  const [resp, setResp] = useState<DiagnoseResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const started = resp !== null;

  async function advance(nextHistory: DiagnoseAnswer[]) {
    setBusy(true);
    try {
      const r = await fetchDiagnoseNext(nextHistory);
      setHistory(nextHistory);
      setResp(r);
    } finally {
      setBusy(false);
    }
  }

  function answer(choiceKey: string) {
    if (!resp || resp.done || busy) return;
    advance([...history, { questionId: resp.question.id, choiceKey }]);
  }

  // ---- intro ----------------------------------------------------------------
  if (!started) {
    return (
      <main className="flex flex-col items-center gap-8 pt-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand bg-brand-soft">
          <Compass size={40} weight="duotone" className="text-brand" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand">{t.diagTitle}</h1>
          <p className="mx-auto mt-3 max-w-[32ch] leading-relaxed text-muted">{t.diagIntro}</p>
        </div>
        <button
          onClick={() => advance([])}
          disabled={busy}
          className="btn btn-primary min-h-14 px-9 py-4 text-lg"
        >
          {t.diagStart}
          <ArrowRight size={20} weight="bold" />
        </button>
        <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
          {t.back}
        </Link>
      </main>
    );
  }

  // ---- summary ----------------------------------------------------------------
  if (resp.done) {
    return (
      <main className="flex flex-col gap-6 pt-4">
        <div className="text-center">
          <p className="text-5xl">🎉</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand">{t.diagDoneTitle}</h1>
          <p className="mt-2 text-muted">
            {t.diagMasteredLine(resp.masteredCount, resp.inferredCount)}
          </p>
        </div>

        <section className="card p-6">
          <h2 className="label-caps mb-3 flex items-center gap-2">
            <Wrench size={18} weight="bold" className="text-gap-deep" />
            {t.diagGapsTitle}
          </h2>
          {resp.gaps.length === 0 ? (
            <p className="text-ink">{t.diagNoGaps}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {resp.gaps.map((gp) => (
                <li key={gp.topicId}>
                  <Link
                    href={`/learn/${gp.topicId}`}
                    className="flex items-center gap-3 rounded-control border-2 border-line bg-surface px-4 py-3 shadow-edge-sm transition hover:bg-brand-soft active:translate-y-[3px] active:shadow-none"
                  >
                    <WarningCircle size={18} weight="fill" className="shrink-0 text-gap" />
                    <span className="font-medium text-ink">{gp.name}</span>
                    <ArrowRight size={14} weight="bold" className="ml-auto text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {resp.frontier.length > 0 && (
          <section className="card p-6">
            <h2 className="label-caps mb-3 flex items-center gap-2">
              <CheckCircle size={18} weight="bold" className="text-unlockable" />
              {t.diagStartHere}
            </h2>
            <ul className="flex flex-col gap-2">
              {resp.frontier.map((f) => (
                <li key={f.topicId}>
                  <Link
                    href={`/learn/${f.topicId}`}
                    className="flex items-center gap-3 rounded-control border-2 border-line bg-surface px-4 py-3 shadow-edge-sm transition hover:bg-brand-soft active:translate-y-[3px] active:shadow-none"
                  >
                    <span className="font-medium text-ink">{f.name}</span>
                    <ArrowRight size={14} weight="bold" className="ml-auto text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          {resp.frontier[0] && (
            <Link
              href={`/learn/${resp.frontier[0].topicId}`}
              className="btn btn-primary min-h-12 px-7 py-3"
            >
              {t.diagGoFix}
              <ArrowRight size={18} weight="bold" />
            </Link>
          )}
          <Link
            href="/"
            className="btn btn-neutral min-h-12 px-7 py-3"
          >
            {t.diagBackHome}
          </Link>
        </div>
      </main>
    );
  }

  // ---- question ----------------------------------------------------------------
  const { question, topicName, isBacktrack, lastCorrect, progress } = resp;
  const pct = Math.min(100, Math.round((progress.asked / progress.budget) * 100));

  return (
    <main className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} weight="bold" />
          {t.back}
        </Link>
        <span className="text-sm font-medium text-muted">
          {t.diagQuestionOf(progress.asked + 1, progress.budget)}
        </span>
      </header>

      <div className="h-3 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {lastCorrect !== null && (
        <p
          className={`flex items-center gap-2 text-sm font-semibold ${
            lastCorrect ? "text-mastered" : "text-gap"
          }`}
        >
          {lastCorrect ? (
            <CheckCircle size={16} weight="fill" />
          ) : (
            <WarningCircle size={16} weight="fill" />
          )}
          {lastCorrect ? t.diagPrevCorrect : t.diagPrevWrong}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip px-3 py-1 text-xs text-muted">
          {topicName}
        </span>
        {isBacktrack && (
          <span className="chip border-brand bg-brand-soft px-3 py-1 text-xs text-brand-deep">
            <Stairs size={12} weight="bold" />
            {t.diagBacktrackNote}
          </span>
        )}
      </div>

      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        {question.kind === "cubes" && question.cubes ? (
          <div className="card p-6 md:p-8">
            <CubeCount
              key={question.id}
              spec={question.cubes}
              onCheck={(count) => answer(String(count))}
              verdict={null}
            />
          </div>
        ) : question.kind === "shade" && question.shape ? (
          <div className="card p-6 md:p-8">
            <ShadeFraction
              key={question.id}
              shape={question.shape}
              numerator={question.numerator ?? 1}
              denominator={question.denominator}
              rows={question.rows}
              cols={question.cols}
              label={question.label}
              onCheck={(count) => answer(String(count))}
              verdict={null}
            />
          </div>
        ) : (
          <QuestionCard
            key={question.id}
            question={question}
            selected={null}
            result={null}
            onSelect={answer}
          />
        )}
      </div>
    </main>
  );
}
