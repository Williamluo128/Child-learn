import { NextRequest, NextResponse } from "next/server";
import { buildPath } from "@/lib/db/queries";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// GET /api/path?studentId=&lang=
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get("studentId") ?? "demo";
  const langParam = req.nextUrl.searchParams.get("lang");
  const locale = isLocale(langParam) ? langParam : DEFAULT_LOCALE;
  return NextResponse.json(await buildPath(studentId, locale));
}
