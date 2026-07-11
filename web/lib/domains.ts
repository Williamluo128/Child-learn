import type { Locale } from "./i18n/config";
import type { MasteryStatus, PathItem } from "./types";

/** Pedagogical trunk order — foundations first, then applications. */
export const DOMAIN_ORDER = [
  "Number Representation & Place Value",
  "Addition & Subtraction",
  "Multiplication & Division",
  "Fractions",
  "Ratio & Proportion",
  "Measurement",
  "Geometry",
  "Data & Statistics",
  "Probability",
  "Algebra",
  "Mathematical Thinking",
] as const;

const DOMAIN_LABELS: Record<string, { zh: string; en: string }> = {
  "Number Representation & Place Value": {
    zh: "数与数位",
    en: "Numbers & Place Value",
  },
  "Addition & Subtraction": { zh: "加减法", en: "Add & Subtract" },
  "Multiplication & Division": { zh: "乘除法", en: "Multiply & Divide" },
  Fractions: { zh: "分数", en: "Fractions" },
  "Ratio & Proportion": { zh: "比与比例", en: "Ratio & Proportion" },
  Measurement: { zh: "测量", en: "Measurement" },
  Geometry: { zh: "几何", en: "Geometry" },
  "Data & Statistics": { zh: "数据与统计", en: "Data & Statistics" },
  Probability: { zh: "概率", en: "Probability" },
  Algebra: { zh: "代数萌芽", en: "Algebra" },
  "Mathematical Thinking": { zh: "数学思维", en: "Math Thinking" },
};

export interface DomainBranch {
  domain: string;
  label: string;
  items: PathItem[];
  mastered: number;
  total: number;
  status: MasteryStatus;
  /** First playable topic in this branch, if any */
  nextTopicId?: string;
}

export function domainLabel(domain: string, locale: Locale): string {
  const entry = DOMAIN_LABELS[domain];
  if (!entry) return domain;
  return locale === "zh" ? entry.zh : entry.en;
}

function aggregateStatus(items: PathItem[]): MasteryStatus {
  if (items.length === 0) return "unlockable";
  if (items.every((i) => i.status === "mastered")) return "mastered";
  if (items.some((i) => i.status === "gap")) return "gap";
  return "unlockable";
}

/** Easy → hard: younger age band first, then lower centrality, then name. */
export function sortTrailEasyToHard(items: PathItem[]): PathItem[] {
  return [...items].sort((a, b) => {
    const age =
      a.topic.ageRangeStart - b.topic.ageRangeStart ||
      a.topic.ageRangeEnd - b.topic.ageRangeEnd;
    if (age !== 0) return age;
    // Within same age: lower centrality = more foundational
    const cen = a.topic.centrality - b.topic.centrality;
    if (cen !== 0) return cen;
    return a.topic.name.localeCompare(b.topic.name, "en");
  });
}

export function buildDomainBranches(
  path: PathItem[],
  locale: Locale
): DomainBranch[] {
  const byDomain = new Map<string, PathItem[]>();
  for (const item of path) {
    const d = item.topic.domain;
    const list = byDomain.get(d);
    if (list) list.push(item);
    else byDomain.set(d, [item]);
  }

  const known = new Set<string>(DOMAIN_ORDER);
  const ordered = [
    ...DOMAIN_ORDER.filter((d) => byDomain.has(d)),
    ...[...byDomain.keys()].filter((d) => !known.has(d)).sort(),
  ];

  return ordered.map((domain) => {
    const items = sortTrailEasyToHard(byDomain.get(domain) ?? []);
    const next = items.find(
      (i) => i.status === "gap" || i.status === "unlockable"
    );
    return {
      domain,
      label: domainLabel(domain, locale),
      items,
      mastered: items.filter((i) => i.status === "mastered").length,
      total: items.length,
      status: aggregateStatus(items),
      nextTopicId: next?.topic.id,
    };
  });
}

export function domainHref(domain: string): string {
  return `/map?domain=${encodeURIComponent(domain)}`;
}
