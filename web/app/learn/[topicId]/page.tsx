"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Lightbulb, ListChecks } from "@phosphor-icons/react";
import type { LessonResponse } from "@/lib/types";
import { fetchLesson } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LearnPage({
  params,
}: {
  params: { topicId: string };
}) {
  const { t } = useI18n();
  const [lesson, setLesson] = useState<LessonResponse | null>(null);

  useEffect(() => {
    fetchLesson(params.topicId).then(setLesson).catch(() => setLesson(null));
  }, [params.topicId]);

  if (!lesson) {
    return (
      <div className="card p-12 text-center text-muted">
        {t.loading}
      </div>
    );
  }

  const ex = lesson.example;

  return (
    <main className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} weight="bold" />
          {t.back}
        </Link>
      </header>

      <div>
        <p className="label-caps mb-2">{lesson.topic.domain}</p>
        <h1 className="text-balance font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
          {lesson.topic.name}
        </h1>
      </div>

      {/* Concept */}
      <section className="card p-6">
        <h2 className="label-caps mb-3 flex items-center gap-2">
          <Lightbulb size={18} weight="bold" className="text-brand" />
          {t.learnConcept}
        </h2>
        <p className="text-lg leading-relaxed text-ink">{lesson.topic.description}</p>
      </section>

      {/* Objectives */}
      {lesson.objectives.length > 0 && (
        <section className="card p-6">
          <h2 className="label-caps mb-4 flex items-center gap-2">
            <ListChecks size={18} weight="bold" className="text-violet" />
            {t.learnGoals}
          </h2>
          <ul className="flex flex-col gap-3">
            {lesson.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-3 text-ink">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mastered-soft">
                  <Check size={14} weight="bold" className="text-mastered" />
                </span>
                <span className="leading-relaxed">{o}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Worked example */}
      {ex && (
        <section className="card p-6">
          <h2 className="label-caps mb-4">{t.learnExample}</h2>
          <p className="mb-4 text-lg font-semibold leading-snug text-ink">{ex.prompt}</p>
          <div className="mb-4 flex flex-col gap-2">
            {ex.choices.map((c) => {
              const correct = c.key === ex.correctChoice;
              return (
                <div
                  key={c.key}
                  className={`flex items-center gap-3 rounded-control border-2 px-4 py-3 ${
                    correct
                      ? "border-mastered bg-mastered-soft"
                      : "border-line opacity-70"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      correct ? "bg-mastered text-white" : "bg-canvas text-muted"
                    }`}
                  >
                    {c.key}
                  </span>
                  <span className="flex-1 text-ink">{c.text}</span>
                  {correct && <Check size={18} weight="bold" className="text-mastered" />}
                </div>
              );
            })}
          </div>
          <div className="rounded-control bg-canvas p-4">
            <p className="label-caps mb-1">
              {t.exampleAnswer}
            </p>
            <p className="leading-relaxed text-ink">{ex.explanation}</p>
          </div>
        </section>
      )}

      {/* Standards (only when present) */}
      {lesson.standards.length > 0 && (
        <section className="card p-6">
          <h2 className="label-caps mb-3">{t.learnStandards}</h2>
          <ul className="flex flex-col gap-3">
            {lesson.standards.map((s) => (
              <li key={s.code} className="text-sm">
                <span className="font-mono text-xs text-muted">{s.code}</span>
                {s.description && (
                  <p className="mt-0.5 leading-relaxed text-ink">{s.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/practice/${lesson.topic.id}`}
        className="btn btn-primary min-h-14 self-end px-8 py-3 text-base"
      >
        {t.startQuestions}
        <ArrowRight size={18} weight="bold" />
      </Link>
    </main>
  );
}
