"use client";

import Link from "next/link";
import { Check, Play } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { PathItem } from "@/lib/types";
import { MASTERY_META } from "@/lib/mastery";
import { useI18n } from "@/lib/i18n/I18nProvider";

const NODE = 76;
const ROW_H = 120;
const SIDE_PCT = 16;

function sidePct(i: number): number {
  const pattern = [0, 1, 0, -1] as const;
  return pattern[i % 4] * SIDE_PCT;
}

interface Props {
  path: PathItem[];
  nextId?: string;
}

/** Short zigzag trail for one domain branch — easy → hard, all open. */
export function BranchTrail({ path, nextId }: Props) {
  const { t } = useI18n();

  if (path.length === 0) {
    return (
      <div className="w-full rounded-card bg-surface px-6 py-10 text-center shadow-clay-soft">
        <p className="text-base text-muted">{t.loading}</p>
      </div>
    );
  }

  const height = path.length * ROW_H + 40;

  return (
    <div
      className="relative mx-auto w-full max-w-[360px] pt-1"
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
          const y1 = 24 + i * ROW_H + NODE / 2;
          const x2 = 50 + sidePct(i + 1);
          const y2 = 24 + (i + 1) * ROW_H + NODE / 2;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${item.topic.id}-line`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--path)"
              strokeWidth="2.6"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      <ol className="relative">
        {path.map((item, i) => {
          const xPct = sidePct(i);
          const top = 24 + i * ROW_H;
          const isNext = item.topic.id === nextId;
          const mastered = item.status === "mastered";
          // locked is treated as open (unlockable) for free exploration
          const status =
            item.status === "locked" ? "unlockable" : item.status;
          const color = MASTERY_META[status].color;

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
              <Link
                href={`/learn/${item.topic.id}`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral"
                aria-label={item.topic.name}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: Math.min(i * 0.05, 0.35),
                    duration: 0.26,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative flex w-[7.25rem] flex-col items-center"
                >
                  {isNext && (
                    <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 animate-bob whitespace-nowrap rounded-full bg-coral px-3 py-1 font-display text-sm font-bold text-white shadow-clay">
                      {t.levelStart}
                    </span>
                  )}

                  <span
                    className={`relative flex cursor-pointer items-center justify-center rounded-level border-[4px] shadow-clay transition duration-200 active:translate-y-0.5 active:shadow-clay-press ${
                      isNext ? "animate-level-pulse" : ""
                    }`}
                    style={{
                      width: NODE,
                      height: NODE,
                      backgroundColor: color,
                      borderColor: "rgba(255,255,255,0.55)",
                      color: "#fff",
                    }}
                  >
                    {mastered ? (
                      <Check size={30} weight="bold" />
                    ) : isNext ? (
                      <Play size={28} weight="fill" className="ml-0.5" />
                    ) : (
                      <span className="font-display text-2xl font-bold leading-none">
                        {i + 1}
                      </span>
                    )}
                  </span>

                  <p className="mt-2.5 max-w-[8.5rem] text-center text-sm font-semibold leading-snug text-ink">
                    {item.topic.name}
                  </p>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
