"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Graph, Path } from "@phosphor-icons/react";
import type { GraphResponse, PathItem } from "@/lib/types";
import { fetchGraph, fetchPath } from "@/lib/api/client";
import { buildDomainBranches, domainLabel } from "@/lib/domains";
import { SkillGraph } from "@/components/graph/SkillGraph";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { KnowledgeTree } from "@/components/home/KnowledgeTree";
import { BranchTrail } from "@/components/home/BranchTrail";
import { useI18n } from "@/lib/i18n/I18nProvider";

type ViewMode = "trail" | "net";

function MapLoading() {
  const { t } = useI18n();
  return (
    <div className="card p-14 text-center">
      <div className="mx-auto mb-3 h-3 w-36 animate-pulse rounded-full bg-line" />
      <div className="mx-auto h-3 w-52 animate-pulse rounded-full bg-line" />
      <p className="mt-5 text-base text-muted">{t.loading}</p>
    </div>
  );
}

function MapContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get("domain");

  const [path, setPath] = useState<PathItem[]>([]);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [mode, setMode] = useState<ViewMode>("trail");

  useEffect(() => {
    fetchPath(locale).then(setPath).catch(() => setPath([]));
  }, [locale]);

  useEffect(() => {
    if (!domainParam) {
      setGraph(null);
      return;
    }
    setGraph(null);
    fetchGraph(locale, domainParam)
      .then(setGraph)
      .catch(() => setGraph(null));
  }, [locale, domainParam]);

  const branches = useMemo(
    () => buildDomainBranches(path, locale),
    [path, locale]
  );

  const branch = useMemo(
    () => branches.find((b) => b.domain === domainParam) ?? null,
    [branches, domainParam]
  );

  if (!domainParam) {
    return (
      <main className="flex flex-col items-center gap-6">
        <header className="w-full text-center">
          <Link
            href="/"
            className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-muted transition hover:text-ink"
          >
            <ArrowLeft size={18} weight="bold" />
            {t.back}
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand md:text-4xl">
            {t.mapTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-[28ch] text-base leading-relaxed text-muted">
            {t.mapTrunkHint}
          </p>
        </header>
        <KnowledgeTree branches={branches} />
      </main>
    );
  }

  const label = branch?.label ?? domainLabel(domainParam, locale);
  const cleared = branch?.status === "mastered";

  return (
    <main className="flex flex-col gap-5">
      <header>
        <Link
          href="/map"
          className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeft size={18} weight="bold" />
          {t.backToTree}
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          {label}
        </h1>
        <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-muted">
          {cleared ? t.branchCleared : t.mapHint}
        </p>
        {branch && (
          <p className="chip mt-3 px-4 py-1.5 text-sm text-ink">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                cleared ? "bg-mastered" : "bg-unlockable"
              }`}
              aria-hidden
            />
            {t.branchProgress(branch.mastered, branch.total)}
          </p>
        )}
      </header>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("trail")}
          className={`btn min-h-11 px-4 text-sm ${
            mode === "trail" ? "btn-violet" : "btn-neutral"
          }`}
        >
          <Path size={16} weight="bold" />
          {t.viewTrail}
        </button>
        <button
          type="button"
          onClick={() => setMode("net")}
          className={`btn min-h-11 px-4 text-sm ${
            mode === "net" ? "btn-violet" : "btn-neutral"
          }`}
        >
          <Graph size={16} weight="bold" />
          {t.viewNet}
        </button>
      </div>

      {mode === "trail" ? (
        branch ? (
          <BranchTrail path={branch.items} nextId={branch.nextTopicId} />
        ) : (
          <MapLoading />
        )
      ) : (
        <>
          <GraphLegend />
          {graph ? (
            <div className="card overflow-hidden">
              <SkillGraph graph={graph} />
            </div>
          ) : (
            <MapLoading />
          )}
        </>
      )}
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapLoading />}>
      <MapContent />
    </Suspense>
  );
}
