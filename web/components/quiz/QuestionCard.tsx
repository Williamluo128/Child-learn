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
    <div className="rounded-card bg-surface p-6 shadow-card md:p-8">
      <p className="mb-8 text-2xl font-semibold leading-snug tracking-tight text-ink md:text-3xl">
        {question.prompt}
      </p>
      <div className="flex flex-col gap-3">
        {question.choices.map((c) => {
          const isSelected = selected === c.key;
          const isCorrect = answered && c.key === result!.correctChoice;
          const isWrongPick = answered && isSelected && !result!.correct;

          let cls =
            "flex min-h-14 items-center gap-3.5 rounded-control border-2 px-4 py-4 text-left transition active:scale-[0.99]";
          if (isCorrect)
            cls += " border-mastered bg-[rgba(26,168,122,0.1)]";
          else if (isWrongPick)
            cls += " border-gap bg-[rgba(232,154,46,0.12)]";
          else if (isSelected)
            cls += " border-coral bg-coral-soft";
          else
            cls += " border-transparent bg-canvas/80 hover:bg-canvas";

          return (
            <button
              key={c.key}
              className={cls}
              disabled={answered}
              onClick={() => onSelect(c.key)}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                  isCorrect
                    ? "bg-mastered text-white"
                    : isWrongPick
                      ? "bg-gap text-white"
                      : isSelected
                        ? "bg-coral text-ink"
                        : "bg-surface text-muted shadow-card"
                }`}
              >
                {c.key}
              </span>
              <span className="flex-1 text-lg font-medium text-ink">{c.text}</span>
              {isCorrect && <Check size={22} weight="bold" className="text-mastered" />}
              {isWrongPick && <X size={22} weight="bold" className="text-gap" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
