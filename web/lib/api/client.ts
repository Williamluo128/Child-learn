import type {
  AnswerRequest,
  AnswerResponse,
  GraphResponse,
  LessonResponse,
  PathItem,
  QuestionPublic,
} from "../types";
import type { Locale } from "../i18n/config";

const STUDENT_ID = "demo";

export async function fetchNextQuestion(
  topicId: string,
  locale: Locale
): Promise<QuestionPublic> {
  const r = await fetch(
    `/api/questions/next?topicId=${topicId}&studentId=${STUDENT_ID}&lang=${locale}`
  );
  if (!r.ok) throw new Error("failed to fetch question");
  return r.json();
}

export async function submitAnswer(
  questionId: number,
  choiceKey: string,
  locale: Locale
): Promise<AnswerResponse> {
  const body: AnswerRequest & { lang: Locale } = {
    studentId: STUDENT_ID,
    questionId,
    choiceKey,
    lang: locale,
  };
  const r = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("failed to submit answer");
  return r.json();
}

export async function fetchPath(locale: Locale): Promise<PathItem[]> {
  const r = await fetch(`/api/path?studentId=${STUDENT_ID}&lang=${locale}`);
  if (!r.ok) throw new Error("failed to fetch path");
  return r.json();
}

export async function fetchGraph(
  locale: Locale,
  domain?: string
): Promise<GraphResponse> {
  const q = domain ? `&domain=${encodeURIComponent(domain)}` : "";
  const r = await fetch(`/api/graph?studentId=${STUDENT_ID}&lang=${locale}${q}`);
  if (!r.ok) throw new Error("failed to fetch graph");
  return r.json();
}

export async function fetchLesson(topicId: string): Promise<LessonResponse> {
  const r = await fetch(`/api/lesson?topicId=${topicId}`);
  if (!r.ok) throw new Error("failed to fetch lesson");
  return r.json();
}
