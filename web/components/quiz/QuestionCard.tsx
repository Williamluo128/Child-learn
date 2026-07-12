"use client";

import type { AnswerResponse, QuestionPublic } from "@/lib/types";
import { Check, X } from "@phosphor-icons/react";

interface Props {
  question: QuestionPublic;
  selected: string | null;
  result: AnswerResponse | null;
  onSelect: (key: string) => void;
}

export function QuestionCard({ question, selected, result, onSelect }: Props) {
  const answered = result !== null;
  return (
    <div className="card p-6 md:p-8">
      <p className="mb-8 font-display text-2xl font-bold leading-snug tracking-tight text-ink md:text-3xl">
        {question.prompt}
      </p>
      <div className="flex flex-col gap-3">
        {question.choices.map((c) => {
          const isSelected = selected === c.key;
          const isCorrect = answered && c.key === result!.correctChoice;
          const isWrongPick = answered && isSelected && !result!.correct;

          let cls =
            "flex min-h-14 items-center gap-3.5 rounded-control border-2 px-4 py-4 text-left transition-all duration-100";
          if (isCorrect)
            cls +=
              " border-mastered bg-mastered-soft shadow-[0_3px_0_0_#0a9169]";
          else if (isWrongPick)
            cls += " border-gap bg-gap-soft shadow-[0_3px_0_0_#c9820b]";
          else if (isSelected)
            cls += " border-violet bg-violet-soft shadow-[0_3px_0_0_#5f41d6]";
          else
            cls +=
              " border-line bg-surface shadow-edge-sm hover:bg-canvas active:translate-y-[3px] active:shadow-none";

          return (
            <button
              key={c.key}
              className={cls}
              disabled={answered}
              onClick={() => onSelect(c.key)}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 font-display text-base font-bold ${
                  isCorrect
                    ? "border-mastered bg-mastered text-white"
                    : isWrongPick
                      ? "border-gap bg-gap text-white"
                      : isSelected
                        ? "border-violet bg-violet text-white"
                        : "border-line bg-surface text-muted"
                }`}
              >
                {c.key}
              </span>
              <span className="flex-1 text-lg font-medium text-ink">{c.text}</span>
              {isCorrect && (
                <Check size={22} weight="bold" className="text-mastered-deep" />
              )}
              {isWrongPick && (
                <X size={22} weight="bold" className="text-gap-deep" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
