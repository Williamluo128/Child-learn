import { NextRequest, NextResponse } from "next/server";
import type { DiagnoseRequest } from "@/lib/types";
import { diagnoseNext } from "@/lib/db/diagnose";

// POST /api/diagnose/next — judge the history, return the next probe or the
// final summary (which also persists mastery seeds + diagnose attempts).
export async function POST(req: NextRequest) {
  const body = (await req.json()) as DiagnoseRequest;
  const { studentId = "demo", history = [] } = body;
  return NextResponse.json(await diagnoseNext(studentId, history));
}
