import { NextRequest, NextResponse } from "next/server";
import type { AnswerRequest, AnswerResponse } from "@/lib/types";
import { insertedPrereqReason, recordAnswer } from "@/lib/db/queries";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

// POST /api/answer  (accepts optional { lang } in body)
export async function POST(req: NextRequest) {
  const body = (await req.json()) as AnswerRequest & { lang?: string };
  const { studentId = "demo", questionId, choiceKey } = body;
  const locale = isLocale(body.lang) ? body.lang : DEFAULT_LOCALE;

  const outcome = await recordAnswer(studentId, questionId, choiceKey);
  if (!outcome) {
    return NextResponse.json({ error: "unknown question" }, { status: 404 });
  }

  const res: AnswerResponse = {
    correct: outcome.correct,
    correctChoice: outcome.correctChoice,
    explanation: outcome.explanation,
    mastery: outcome.mastery,
    insertedPrerequisite:
      outcome.insertedPrereqId && outcome.insertedPrereqName
        ? {
            topicId: outcome.insertedPrereqId,
            name: outcome.insertedPrereqName,
            reason: insertedPrereqReason(locale),
          }
        : null,
    nextTopicId: outcome.nextTopicId,
  };
  return NextResponse.json(res);
}
