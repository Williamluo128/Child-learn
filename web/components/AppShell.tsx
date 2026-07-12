"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapTrifold, House } from "@phosphor-icons/react";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const onMap = pathname.startsWith("/map");
  const onHome = pathname === "/";

  return (
    <div
      className={`mx-auto min-h-[100dvh] max-w-shell px-5 pb-24 pt-4 md:px-6 ${
        onHome ? "pb-16" : ""
      }`}
    >
      <header className="mb-6 flex h-12 items-center justify-between">
        <Link
          href="/"
          className="group flex min-h-11 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-control bg-brand text-white shadow-edge-brand transition group-active:translate-y-1 group-active:shadow-none">
            <span className="absolute inset-[8px] rounded-sm border-2 border-white/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {!onHome && (
            <span className="font-display text-lg font-extrabold tracking-tight text-brand">
              Child Learn
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={onMap ? "/" : "/map"}
            className="btn btn-secondary min-h-11 px-3.5 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {onMap ? (
              <>
                <House size={16} weight="bold" />
                {t.appTitle}
              </>
            ) : (
              <>
                <MapTrifold size={16} weight="bold" />
                {t.viewMap}
              </>
            )}
          </Link>
          <LangToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
