"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { ShadeFraction } from "@/components/interactive/ShadeFraction";
import { CubeCount } from "@/components/interactive/CubeCount";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Proof-of-concept gallery for interactive "shade a fraction" questions.
// Fully procedural — same component the practice flow uses.
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
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink">
          交互题原型 · Interactive demo
        </h1>
        <p className="mt-1 text-sm text-muted">
          点击图形板块涂色，凑出目标，再点「检查」。
        </p>
      </header>

      <section className="card p-8">
        <p className="label-caps mb-4">分数 · Hexagon 18</p>
        <ShadeFraction shape="hexagon" numerator={3} />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">分数 · Triangle 9</p>
        <ShadeFraction shape="triangle" numerator={4} denominator={9} />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">分数 · Grid 3×4</p>
        <ShadeFraction shape="grid" numerator={5} denominator={12} rows={3} cols={4} />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">等值分数 · &quot;1/2&quot; on 8 parts</p>
        <ShadeFraction shape="circle" numerator={4} denominator={8} label="1/2" />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">小数 · 0.07 on 10×10</p>
        <ShadeFraction shape="grid" numerator={7} denominator={100} rows={10} cols={10} label="0.07" />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">百分数 · 35% on 5%-grid</p>
        <ShadeFraction shape="grid" numerator={7} denominator={20} rows={4} cols={5} label="35%" />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">体积 · 3D 数方块 (cuboid 3×2×2)</p>
        <CubeCount spec={{ solid: "cuboid", l: 3, h: 2, w: 2 }} />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">体积 · L 形组合体</p>
        <CubeCount spec={{ solid: "lshape", l: 3, h: 3, w: 2, cutL: 1, cutH: 2, cutW: 2 }} />
      </section>

      <section className="card p-8">
        <p className="label-caps mb-4">体积 · 阶梯形</p>
        <CubeCount spec={{ solid: "staircase", steps: 4, w: 2 }} />
      </section>
    </main>
  );
}
