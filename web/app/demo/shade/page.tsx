"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { ShadeFraction } from "@/components/interactive/ShadeFraction";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Proof-of-concept for interactive "shade a fraction" questions.
// Same geometry as the classic manipulative; fully procedural.
export default function ShadeDemoPage() {
  const { t } = useI18n();
  return (
    <main className="flex flex-col gap-10">
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft size={16} weight="bold" />
          {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          交互题原型 · Interactive demo
        </h1>
        <p className="mt-1 text-sm text-muted">
          点击图形板块涂色，凑出目标分数，再点「检查」。
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface p-8 shadow-card">
        <ShadeFraction shape="hexagon" numerator={3} />
      </section>

      <section className="rounded-card border border-line bg-surface p-8 shadow-card">
        <ShadeFraction shape="circle" numerator={3} denominator={8} />
      </section>

      <section className="rounded-card border border-line bg-surface p-8 shadow-card">
        <ShadeFraction shape="bar" numerator={2} denominator={5} />
      </section>
    </main>
  );
}
