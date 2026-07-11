import { NextRequest, NextResponse } from "next/server";
import { getLesson } from "@/lib/db/queries";

// GET /api/lesson?topicId=
// Content is English (as stored). UI chrome is localized client-side.
export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get("topicId");
  if (!topicId) {
    return NextResponse.json({ error: "topicId required" }, { status: 400 });
  }
  const lesson = await getLesson(topicId);
  if (!lesson) {
    return NextResponse.json({ error: "unknown topic" }, { status: 404 });
  }
  return NextResponse.json(lesson);
}
