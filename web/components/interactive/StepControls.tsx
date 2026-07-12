"use client";

import { CaretLeft, CaretRight, Pause, Play, X } from "@phosphor-icons/react";

interface Props {
  stepIndex: number;
  stepCount: number;
  playing: boolean;
  caption: string;
  closeLabel: string;
  onStep: (index: number) => void; // clamped by caller-provided bounds here
  onTogglePlay: () => void;
  onClose: () => void;
}

// Shared step-demo control bar: caption + prev / play-pause / next / close.
// Used by CubeCount (3D) and ShadeFraction (2D) walkthroughs.
export function StepControls({
  stepIndex,
  stepCount,
  playing,
  caption,
  closeLabel,
  onStep,
  onTogglePlay,
  onClose,
}: Props) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-control border-2 border-line bg-canvas px-4 py-3">
      <p className="text-center text-base font-semibold text-ink" aria-live="polite">
        {caption}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStep(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface text-ink shadow-edge-sm transition active:translate-y-[3px] active:shadow-none disabled:opacity-40"
          aria-label="prev step"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-violet text-white shadow-edge-violet transition active:translate-y-1 active:shadow-none"
          aria-label={playing ? "pause" : "play"}
        >
          {playing ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
        </button>
        <button
          onClick={() => onStep(Math.min(stepCount - 1, stepIndex + 1))}
          disabled={stepIndex === stepCount - 1}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface text-ink shadow-edge-sm transition active:translate-y-[3px] active:shadow-none disabled:opacity-40"
          aria-label="next step"
        >
          <CaretRight size={16} weight="bold" />
        </button>
        <button
          onClick={onClose}
          className="ml-2 inline-flex h-10 items-center gap-1 rounded-full border-2 border-line bg-surface px-3 text-sm font-bold text-muted shadow-edge-sm transition hover:text-ink active:translate-y-[3px] active:shadow-none"
        >
          <X size={14} weight="bold" />
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
