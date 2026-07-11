import { NextRequest, NextResponse } from "next/server";
import { buildGraph, listDomains } from "@/lib/db/queries";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// GET /api/graph?studentId=&lang=&domain=
// If no domain is given, defaults to the first grade domain.
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get("studentId") ?? "demo";
  const langParam = req.nextUrl.searchParams.get("lang");
  const locale = isLocale(langParam) ? langParam : DEFAULT_LOCALE;

  const domains = await listDomains();
  const requested = req.nextUrl.searchParams.get("domain");
  const domain = requested && domains.includes(requested) ? requested : domains[0];

  const graph = await buildGraph(studentId, locale, domain);
  return NextResponse.json({ ...graph, domain, domains });
}
