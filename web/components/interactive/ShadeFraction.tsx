"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, CheckCircle, Play, WarningCircle } from "@phosphor-icons/react";
import { makeShape, type ShapeKind } from "@/lib/shapes";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { StepControls } from "./StepControls";

interface Props {
  shape: ShapeKind;
  numerator: number;
  // for circle/bar/grid/triangle; ignored by hexagon (fixed 18)
  denominator?: number;
  // grid geometry (rows × cols must equal denominator)
  rows?: number;
  cols?: number;
  // instruction display when it differs from numerator/denominator —
  // e.g. "0.4", "30%", "1/2" (equivalent fraction). Child translates it
  // into a count of parts; correctness is still numerator parts.
  label?: string;
  // Controlled mode (practice flow): parent judges via the server. When
  // onCheck is provided, clicking Check reports the shaded count and feedback
  // comes from `verdict`. When omitted (demo), the component self-checks.
  onCheck?: (count: number) => void;
  verdict?: boolean | null;
}

const CORAL = "#f45b39";
const CORAL_DEEP = "#d64322";
const AUTOPLAY_MS = 800;

// "Color n/d of the shape" — click regions to toggle shading, then check.
// Correct when the count of shaded equal parts equals the numerator.
// Includes a step-by-step shading walkthrough (one part at a time; label
// questions get a conversion step first: "0.4 = 4/10 → shade 4").
export function ShadeFraction({
  shape,
  numerator,
  denominator = 18,
  rows,
  cols,
  label,
  onCheck,
  verdict,
}: Props) {
  const { t } = useI18n();
  const spec = useMemo(
    () => makeShape(shape, denominator, { rows, cols }),
    [shape, denominator, rows, cols]
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selfChecked, setSelfChecked] = useState<null | boolean>(null);
  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const controlled = onCheck !== undefined;
  const d = spec.denominator;
  const feedback = controlled ? verdict ?? null : selfChecked;
  const locked = feedback === true || (controlled && feedback !== null);

  // step demo: label questions get an extra intro (conversion) step
  const hasIntro = Boolean(label);
  const totalSteps = hasIntro ? numerator + 1 : numerator;
  const demoing = demoIndex !== null;
  const demoAvailable = !controlled || feedback !== null;
  const demoShaded = demoIndex === null ? 0 : hasIntro ? demoIndex : demoIndex + 1;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDemoIndex((i) => {
        if (i === null) return 0;
        if (i >= totalSteps - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, totalSteps]);

  function toggle(i: number) {
    if (locked || demoing) return;
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

  function openDemo() {
    setDemoIndex(0);
    setPlaying(true);
  }

  function closeDemo() {
    setPlaying(false);
    setDemoIndex(null);
  }

  const instruction = label
    ? t.shadeInstructionLabel(label)
    : t.shadeInstruction(numerator, d);

  const demoCaption = !demoing
    ? ""
    : hasIntro && demoIndex === 0
      ? t.shadeStepIntro(label!, numerator, d)
      : demoShaded === numerator
        ? t.shadeStepDone(numerator, d)
        : t.shadeStepCount(demoShaded, d);

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="font-display text-xl font-bold tracking-tight text-ink">
        {instruction}
      </p>

      <svg
        viewBox={spec.viewBox}
        className="w-full max-w-sm select-none"
        role="group"
        aria-label={instruction}
      >
        {spec.regions.map((dstr, i) => {
          const fill = demoing
            ? i < demoShaded
              ? i === demoShaded - 1
                ? CORAL_DEEP
                : CORAL
              : "#ffffff"
            : selected.has(i)
              ? CORAL
              : "#ffffff";
          const clickable = !locked && !demoing;
          return (
            <path
              key={i}
              d={dstr}
              onClick={() => toggle(i)}
              className={clickable ? "cursor-pointer transition-[fill] duration-150" : "transition-[fill] duration-150"}
              fill={fill}
              stroke="#443d4d"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {demoing ? (
        <StepControls
          stepIndex={demoIndex!}
          stepCount={totalSteps}
          playing={playing}
          caption={demoCaption}
          closeLabel={t.cubesHideSteps}
          onStep={(i) => {
            setPlaying(false);
            setDemoIndex(i);
          }}
          onTogglePlay={() => setPlaying((p) => !p)}
          onClose={closeDemo}
        />
      ) : (
        demoAvailable && (
          <button
            onClick={openDemo}
            className="btn btn-neutral min-h-10 rounded-full px-5 py-2 text-sm text-muted hover:text-ink"
          >
            <Play size={14} weight="fill" />
            {t.shadeShowSteps}
          </button>
        )
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted">
          {t.shadeProgress(demoing ? demoShaded : selected.size, d)}
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
            disabled={demoing}
            className="btn btn-neutral min-h-11 rounded-full px-5 py-2.5 text-sm text-muted hover:text-ink"
          >
            <ArrowClockwise size={16} weight="bold" />
            {t.shadeReset}
          </button>
        )}
        <button
          onClick={check}
          disabled={locked || demoing || selected.size === 0}
          className="btn btn-primary min-h-11 rounded-full px-7 py-2.5 text-sm"
        >
          {t.shadeCheck}
        </button>
      </div>
    </div>
  );
}
