import { NextRequest, NextResponse } from "next/server";
import { pickQuestion } from "@/lib/db/queries";

// GET /api/questions/next?topicId=&studentId=
// Content is served in English (the generated bank's language); the `lang`
// param only affects UI chrome + reasons, handled elsewhere.
export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId");
  const studentId = req.nextUrl.searchParams.get("studentId") ?? "demo";
  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }
  const q = await pickQuestion(studentId, topicId);
  if (!q) {
    return NextResponse.json({ error: "no question for topic" }, { status: 404 });
  }
  return NextResponse.json(q);
}
