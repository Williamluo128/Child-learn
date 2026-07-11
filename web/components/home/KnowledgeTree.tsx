"use client";

import Link from "next/link";
import { Check, Compass } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { DomainBranch } from "@/lib/domains";
import { domainHref } from "@/lib/domains";
import { MASTERY_META } from "@/lib/mastery";
import { useI18n } from "@/lib/i18n/I18nProvider";

const NODE = 68;
const VIEW_W = 400;

/** Organic placement: sway trunk, uneven reach, branches lift upward. */
function layoutTree(count: number) {
  const row = 108;
  const topPad = 56;
  const bottomPad = 72;
  const height = topPad + count * row + bottomPad;

  const trunkAt = (t: number) => {
    // Gentle S-sway; thicker feel near roots via stroke later
    const y = topPad + t * (height - topPad - bottomPad + 24);
    const x =
      VIEW_W / 2 +
      Math.sin(t * Math.PI * 1.15) * 22 +
      Math.sin(t * Math.PI * 2.4) * 6;
    return { x, y };
  };

  const nodes = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.55) / (count + 0.15);
    const attach = trunkAt(t);
    const side = i % 2 === 0 ? -1 : 1;
    // Vary reach & lift so it doesn't look like a ladder
    const reach = 118 + ((i * 37) % 5) * 14 + (i % 3) * 8;
    const lift = 18 + ((i * 19) % 4) * 10;
    const droop = ((i * 13) % 3) * 6; // slight downward tip variety
    const nx = attach.x + side * reach;
    const ny = attach.y - lift + droop;

    // Control points: leave trunk upward, then arc out to the leaf
    const c1x = attach.x + side * (28 + (i % 3) * 10);
    const c1y = attach.y - 36 - (i % 2) * 12;
    const c2x = nx - side * 18;
    const c2y = ny + 8;

    return {
      attach,
      node: { x: nx, y: ny },
      c1: { x: c1x, y: c1y },
      c2: { x: c2x, y: c2y },
      side,
      t,
    };
  });

  // Trunk path through attachment points + root + crown
  const crown = trunkAt(0.02);
  const root = trunkAt(1.05);
  const trunkPts = [
    { x: crown.x, y: 28 },
    ...nodes.map((n) => n.attach),
    { x: root.x, y: height - 36 },
  ];

  return { height, nodes, trunkPts, crown, root };
}

function trunkPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const midY = (prev.y + cur.y) / 2;
    // Soft vertical S between samples
    d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
  }
  return d;
}

function branchPath(n: {
  attach: { x: number; y: number };
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  node: { x: number; y: number };
}): string {
  return `M ${n.attach.x} ${n.attach.y} C ${n.c1.x} ${n.c1.y}, ${n.c2.x} ${n.c2.y}, ${n.node.x} ${n.node.y}`;
}

interface Props {
  branches: DomainBranch[];
}

export function KnowledgeTree({ branches }: Props) {
  const { t } = useI18n();

  if (branches.length === 0) {
    return (
      <div className="w-full rounded-card bg-surface px-6 py-14 text-center shadow-clay-soft">
        <div className="mx-auto mb-3 h-3 w-32 animate-pulse rounded-full bg-line" />
        <div className="mx-auto h-3 w-48 animate-pulse rounded-full bg-line" />
        <p className="mt-5 text-base text-muted">{t.loading}</p>
      </div>
    );
  }

  const nextIdx = branches.findIndex(
    (b) => b.status === "gap" || b.status === "unlockable"
  );
  const { height, nodes, trunkPts, crown, root } = layoutTree(branches.length);
  const trunkD = trunkPath(trunkPts);

  return (
    <div
      className="relative mx-auto w-full max-w-[400px]"
      style={{ height }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9eb0c0" />
            <stop offset="55%" stopColor="#7f93a6" />
            <stop offset="100%" stopColor="#6a7f92" />
          </linearGradient>
        </defs>

        {/* Faint canopy wash near crown */}
        <ellipse
          cx={crown.x}
          cy={36}
          rx={92}
          ry={34}
          fill="rgba(26,168,122,0.08)"
        />
        <ellipse
          cx={crown.x - 36}
          cy={48}
          rx={48}
          ry={22}
          fill="rgba(26,168,122,0.06)"
        />
        <ellipse
          cx={crown.x + 40}
          cy={44}
          rx={52}
          ry={24}
          fill="rgba(240,106,74,0.05)"
        />

        {/* Trunk — thick organic stroke */}
        <path
          d={trunkD}
          fill="none"
          stroke="url(#trunkGrad)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={trunkD}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(-2.5 0)`}
        />

        {/* Curved limbs */}
        {nodes.map((n, i) => (
          <g key={branches[i].domain}>
            <path
              d={branchPath(n)}
              fill="none"
              stroke="#8fa3b5"
              strokeWidth={5.5 - Math.min(i, 4) * 0.25}
              strokeLinecap="round"
            />
            <path
              d={branchPath(n)}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={2}
              strokeLinecap="round"
              transform={`translate(${n.side > 0 ? -1.2 : 1.2} -0.8)`}
            />
          </g>
        ))}

        {/* Root flare */}
        <path
          d={`M ${root.x - 18} ${height - 28}
              Q ${root.x - 28} ${height - 8}, ${root.x - 42} ${height - 4}
              M ${root.x + 18} ${height - 28}
              Q ${root.x + 28} ${height - 8}, ${root.x + 42} ${height - 4}
              M ${root.x} ${height - 36}
              L ${root.x} ${height - 10}`}
          fill="none"
          stroke="#6a7f92"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={root.x} cy={height - 8} r={5} fill="var(--coral)" />
      </svg>

      {/* Crown label */}
      <div
        className="absolute z-10 flex -translate-x-1/2 flex-col items-center"
        style={{ left: crown.x, top: 4 }}
      >
        <p className="whitespace-nowrap font-display text-sm font-bold text-ink">
          {t.treeCrown}
        </p>
      </div>

      <ol className="relative h-full w-full">
        {branches.map((branch, i) => {
          const pos = nodes[i];
          const isNext = i === nextIdx;
          const mastered = branch.status === "mastered";
          const status =
            branch.status === "locked" ? "unlockable" : branch.status;
          const color = MASTERY_META[status].color;
          const progress =
            branch.total > 0 ? branch.mastered / branch.total : 0;
          const labelOnRight = pos.side > 0;

          return (
            <li
              key={branch.domain}
              className="absolute z-[1]"
              style={{
                left: pos.node.x,
                top: pos.node.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Link
                href={domainHref(branch.domain)}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral"
                aria-label={`${branch.label}: ${t.branchProgress(branch.mastered, branch.total)}`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: Math.min(i * 0.07, 0.5),
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative flex flex-col items-center"
                >
                  {isNext && (
                    <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 animate-bob whitespace-nowrap rounded-full bg-coral px-3 py-1 font-display text-sm font-bold text-white shadow-clay">
                      {t.exploreBranch}
                    </span>
                  )}

                  <span
                    className={`relative flex items-center justify-center rounded-level border-[4px] shadow-clay transition duration-200 active:translate-y-0.5 active:shadow-clay-press ${
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
                    {branch.total > 0 && (
                      <svg
                        className="absolute inset-[-6px]"
                        viewBox="0 0 80 80"
                        aria-hidden
                      >
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="rgba(255,255,255,0.25)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress)}`}
                          transform="rotate(-90 40 40)"
                        />
                      </svg>
                    )}
                    {mastered ? (
                      <Check size={28} weight="bold" />
                    ) : isNext ? (
                      <Compass size={26} weight="bold" />
                    ) : (
                      <span className="font-display text-2xl font-bold leading-none">
                        {i + 1}
                      </span>
                    )}
                  </span>

                  <div
                    className={`mt-2 max-w-[7.5rem] ${
                      labelOnRight ? "text-left self-start" : "text-right self-end"
                    }`}
                    style={{
                      marginLeft: labelOnRight ? 4 : 0,
                      marginRight: labelOnRight ? 0 : 4,
                    }}
                  >
                    <p className="text-sm font-semibold leading-snug text-ink">
                      {branch.label}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-muted">
                      {t.branchProgress(branch.mastered, branch.total)}
                    </p>
                  </div>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
