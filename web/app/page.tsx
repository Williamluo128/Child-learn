"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PathItem } from "@/lib/types";
import { fetchPath } from "@/lib/api/client";
import { buildDomainBranches } from "@/lib/domains";
import { KnowledgeTree } from "@/components/home/KnowledgeTree";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function Home() {
  const { locale, t } = useI18n();
  const [path, setPath] = useState<PathItem[]>([]);

  useEffect(() => {
    fetchPath(locale).then(setPath).catch(() => setPath([]));
  }, [locale]);

  const branches = useMemo(
    () => buildDomainBranches(path, locale),
    [path, locale]
  );

  const masteredBranches = branches.filter((b) => b.status === "mastered").length;
  const masteredTopics = path.filter((p) => p.status === "mastered").length;

  return (
    <main className="flex flex-col items-center">
      <header className="mb-6 w-full text-center">
        <p className="label-caps mb-1">{t.subjectMath}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand md:text-5xl">
          {t.homeTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-[26ch] text-base leading-relaxed text-muted">
          {t.homeSubtitle}
        </p>
        {path.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <p className="chip px-4 py-1.5 text-sm text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full bg-mastered"
                aria-hidden
              />
              {t.branchProgress(masteredBranches, branches.length)}
            </p>
            <p className="chip px-3 py-1.5 text-xs text-muted">
              {t.masteredOf(masteredTopics, path.length)}
            </p>
            <Link
              href="/diagnose"
              className="btn btn-primary rounded-full px-4 py-1.5 text-sm"
            >
              🧭 {t.diagCta}
            </Link>
          </div>
        )}
      </header>

      <KnowledgeTree branches={branches} />
    </main>
  );
}
