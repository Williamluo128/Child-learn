"use client";

import Link from "next/link";
import { Check, Lock, Play } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { PathItem } from "@/lib/types";
import { MASTERY_META } from "@/lib/mastery";
import { useI18n } from "@/lib/i18n/I18nProvider";

const NODE = 84;
const ROW_H = 128;
/** Zigzag offset as % of path width */
const SIDE_PCT = 18;

function sidePct(i: number): number {
  const pattern = [0, 1, 0, -1] as const;
  return pattern[i % 4] * SIDE_PCT;
}

interface Props {
  path: PathItem[];
  nextId?: string;
}

export function LevelPath({ path, nextId }: Props) {
  const { t } = useI18n();

  if (path.length === 0) {
    return (
      <div className="card w-full px-6 py-14 text-center">
        <div className="mx-auto mb-3 h-3 w-32 animate-pulse rounded-full bg-line" />
        <div className="mx-auto h-3 w-48 animate-pulse rounded-full bg-line" />
        <p className="mt-5 text-base text-muted">{t.loading}</p>
      </div>
    );
  }

  const height = path.length * ROW_H + 48;

  return (
    <div
      className="relative mx-auto w-full max-w-[380px] pt-2"
      style={{ height: height + 8 }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {path.slice(0, -1).map((item, i) => {
          const x1 = 50 + sidePct(i);
          const y1 = 32 + i * ROW_H + NODE / 2;
          const x2 = 50 + sidePct(i + 1);
          const y2 = 32 + (i + 1) * ROW_H + NODE / 2;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${item.topic.id}-line`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--path)"
              strokeWidth="2.8"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      <ol className="relative">
        {path.map((item, i) => {
          const xPct = sidePct(i);
          const top = 32 + i * ROW_H;
          const isNext = item.topic.id === nextId;
          const locked = item.status === "locked";
          const mastered = item.status === "mastered";
          const clickable =
            item.status === "gap" ||
            item.status === "unlockable" ||
            item.status === "mastered";
          const { color, edge } = MASTERY_META[item.status];

          const node = (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: Math.min(i * 0.05, 0.4),
                duration: 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex w-[7.5rem] flex-col items-center"
            >
              {isNext && (
                <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 animate-bob whitespace-nowrap rounded-full bg-brand px-3 py-1 font-display text-sm font-bold text-white shadow-edge-brand">
                  {t.levelStart}
                </span>
              )}

              <span
                className={`relative flex items-center justify-center rounded-level transition duration-150 ${
                  clickable
                    ? "cursor-pointer active:translate-y-1 active:!shadow-none"
                    : "cursor-not-allowed opacity-70"
                } ${isNext ? "animate-level-pulse" : ""}`}
                style={{
                  width: NODE,
                  height: NODE,
                  backgroundColor: locked ? "#eeebf2" : color,
                  boxShadow: `0 6px 0 0 ${locked ? "#d6d1dc" : edge}`,
                  color: locked ? "#9d97a6" : "#fff",
                }}
              >
                {locked ? (
                  <Lock size={30} weight="bold" />
                ) : mastered ? (
                  <Check size={34} weight="bold" />
                ) : isNext ? (
                  <Play size={32} weight="fill" className="ml-0.5" />
                ) : (
                  <span className="font-display text-3xl font-bold leading-none">
                    {i + 1}
                  </span>
                )}
              </span>

              <p
                className={`mt-3 max-w-[9rem] text-center text-sm font-semibold leading-snug ${
                  locked ? "text-muted/70" : "text-ink"
                }`}
              >
                {item.topic.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted">
                {t.levelOf(i + 1, path.length)}
              </p>
            </motion.div>
          );

          return (
            <li
              key={item.topic.id}
              className="absolute"
              style={{
                top,
                left: `calc(50% + ${xPct}%)`,
                transform: "translateX(-50%)",
              }}
            >
              {clickable ? (
                <Link
                  href={`/learn/${item.topic.id}`}
                  className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral"
                  aria-label={`${t.levelOf(i + 1, path.length)}: ${item.topic.name}`}
                >
                  {node}
                </Link>
              ) : (
                <div
                  role="img"
                  aria-label={`${t.levelOf(i + 1, path.length)}: ${item.topic.name}, ${t.mastery.locked}`}
                >
                  {node}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
