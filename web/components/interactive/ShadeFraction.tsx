"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { makeShape, type ShapeKind } from "@/lib/shapes";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  shape: ShapeKind;
  numerator: number;
  // for circle/bar; ignored by hexagon (fixed 18)
  denominator?: number;
  // Controlled mode (practice flow): parent judges via the server. When
  // onCheck is provided, clicking Check reports the shaded count and feedback
  // comes from `verdict`. When omitted (demo), the component self-checks.
  onCheck?: (count: number) => void;
  verdict?: boolean | null;
}

// "Color n/d of the shape" — click regions to toggle shading, then check.
// Correct when the count of shaded equal parts equals the numerator.
export function ShadeFraction({ shape, numerator, denominator = 18, onCheck, verdict }: Props) {
  const { t } = useI18n();
  const spec = useMemo(() => makeShape(shape, denominator), [shape, denominator]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selfChecked, setSelfChecked] = useState<null | boolean>(null);

  const controlled = onCheck !== undefined;
  const d = spec.denominator;
  const feedback = controlled ? verdict ?? null : selfChecked;
  const locked = feedback === true || (controlled && feedback !== null);

  function toggle(i: number) {
    if (locked) return;
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(i)) nextSet.delete(i);
      else nextSet.add(i);
      return nextSet;
    });
    if (!controlled) setSelfChecked(null);
  }

  function check() {
    if (controlled) onCheck!(selected.size);
    else setSelfChecked(selected.size === numerator);
  }

  function reset() {
    setSelected(new Set());
    setSelfChecked(null);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xl font-semibold tracking-tight text-ink">
        {t.shadeInstruction(numerator, d)}
      </p>

      <svg
        viewBox={spec.viewBox}
        className="w-full max-w-sm select-none"
        role="group"
        aria-label={t.shadeInstruction(numerator, d)}
      >
        {spec.regions.map((dstr, i) => {
          const on = selected.has(i);
          return (
            <path
              key={i}
              d={dstr}
              onClick={() => toggle(i)}
              className={locked ? "transition-[fill] duration-150" : "cursor-pointer transition-[fill] duration-150"}
              fill={on ? "#fc6e51" : "#ffffff"}
              stroke="#0c0e16"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted">
          {t.shadeProgress(selected.size, d)}
        </span>
        {feedback !== null &&
          (feedback ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-mastered">
              <CheckCircle size={18} weight="fill" />
              {t.correct}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gap">
              <WarningCircle size={18} weight="fill" />
              {t.tryAgain}
            </span>
          ))}
      </div>

      <div className="flex items-center gap-3">
        {!controlled && (
          <button
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            <ArrowClockwise size={16} weight="bold" />
            {t.shadeReset}
          </button>
        )}
        <button
          onClick={check}
          disabled={locked || selected.size === 0}
          className="inline-flex min-h-11 items-center rounded-full bg-coral px-7 py-2.5 text-sm font-semibold text-ink shadow-card transition hover:bg-coral-deep hover:text-white active:scale-[0.98] disabled:opacity-50"
        >
          {t.shadeCheck}
        </button>
      </div>
    </div>
  );
}
