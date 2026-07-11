import "server-only";
import type {
  GraphResponse,
  LessonResponse,
  MasteryState,
  MasteryStatus,
  PathItem,
  QuestionPublic,
  Topic,
} from "../types";
import { GAP_STREAK, MASTERED_STREAK } from "../mastery";
import type { Locale } from "../i18n/config";
import { GRADE, pool } from "./pool";

// ---- row mapping -----------------------------------------------------------

interface TopicRow {
  id: string;
  subject: string;
  domain: string;
  name: string;
  description: string;
  age_range_start: number;
  age_range_end: number;
  centrality: number;
}

function toTopic(r: TopicRow): Topic {
  return {
    id: r.id,
    subject: r.subject,
    domain: r.domain,
    name: r.name,
    description: r.description,
    ageRangeStart: r.age_range_start,
    ageRangeEnd: r.age_range_end,
    centrality: Number(r.centrality),
  };
}

const gradeParams = [GRADE.subject, GRADE.ageEnd, GRADE.ageStart] as const;
// grade band predicate: subject=$1 AND age_range_start<=$2 AND age_range_end>=$3
const GRADE_WHERE =
  "subject = $1 AND age_range_start <= $2 AND age_range_end >= $3";

// ---- student state ---------------------------------------------------------

async function ensureStudent(studentId: string) {
  await pool.query(
    `INSERT INTO students (id, display_name) VALUES ($1, $1)
     ON CONFLICT (id) DO NOTHING`,
    [studentId]
  );
}

interface MasteryRow {
  topic_id: string;
  status: string;
  correct_streak: number;
  wrong_streak: number;
}

// The set of the student's mastery rows, keyed by topic id.
async function masteryRows(studentId: string): Promise<Map<string, MasteryRow>> {
  const { rows } = await pool.query<MasteryRow>(
    `SELECT topic_id, status, correct_streak, wrong_streak
       FROM student_topic_mastery WHERE student_id = $1`,
    [studentId]
  );
  return new Map(rows.map((r) => [r.topic_id, r]));
}

// In-grade hard dependencies: topic_id (grade target) <- prerequisite_id
// (also a grade target). Ancestor/out-of-grade prereqs are backtrack-only and
// do not block unlocking (PLAN.md §3.5 — below-grade gaps are "shore up", not
// hard locks).
async function inGradeHardPrereqs(): Promise<Map<string, string[]>> {
  const { rows } = await pool.query<{ topic_id: string; prerequisite_id: string }>(
    `SELECT d.topic_id, d.prerequisite_id
       FROM dependencies d
       JOIN topics t  ON t.id = d.topic_id       AND (${GRADE_WHERE})
       JOIN topics p  ON p.id = d.prerequisite_id AND (p.subject=$1 AND p.age_range_start<=$2 AND p.age_range_end>=$3)
      WHERE d.strength = 'hard'`,
    gradeParams as unknown as unknown[]
  );
  const m = new Map<string, string[]>();
  for (const r of rows) {
    if (!m.has(r.topic_id)) m.set(r.topic_id, []);
    m.get(r.topic_id)!.push(r.prerequisite_id);
  }
  return m;
}

function displayStatus(
  row: MasteryRow | undefined,
  _hardPrereqs: string[],
  _masteredSet: Set<string>
): MasteryStatus {
  if (row?.status === "mastered") return "mastered";
  if (row?.status === "gap") return "gap";
  // Free exploration: every topic is open; no lock gate.
  return "unlockable";
}

// ---- public API ------------------------------------------------------------

export async function listGradeTopics(): Promise<Topic[]> {
  const { rows } = await pool.query<TopicRow>(
    `SELECT * FROM topics WHERE ${GRADE_WHERE} ORDER BY domain, centrality DESC, name`,
    gradeParams as unknown as unknown[]
  );
  return rows.map(toTopic);
}

export async function listDomains(): Promise<string[]> {
  const { rows } = await pool.query<{ domain: string }>(
    `SELECT DISTINCT domain FROM topics WHERE ${GRADE_WHERE} ORDER BY domain`,
    gradeParams as unknown as unknown[]
  );
  return rows.map((r) => r.domain);
}

interface QuestionRow {
  id: number;
  topic_id: string;
  kind: "mcq" | "shade";
  prompt: string;
  choices: { label: string; text: string }[];
  correct_choice: string;
  explanation: string;
  spec: { shape: "hexagon" | "circle" | "bar"; numerator: number; denominator: number } | null;
}

// The "learn from zero" study page, composed entirely from existing fields:
// description (concept), evidence (objectives), one solved question (worked
// example), and any resolvable curriculum standards. No authored lesson prose.
export async function getLesson(topicId: string): Promise<LessonResponse | null> {
  const { rows } = await pool.query<TopicRow & { type: string; evidence: string[]; standards: string[] }>(
    `SELECT id, type, subject, domain, name, description,
            age_range_start, age_range_end, centrality, evidence, standards
       FROM topics WHERE id = $1`,
    [topicId]
  );
  const r = rows[0];
  if (!r) return null;

  const { rows: qs } = await pool.query<QuestionRow>(
    `SELECT id, topic_id, kind, prompt, choices, correct_choice, explanation, spec
       FROM questions WHERE topic_id = $1
      ORDER BY (kind = 'mcq') DESC, id ASC LIMIT 1`,
    [topicId]
  );
  const q = qs[0];
  const example = q
    ? {
        prompt: q.prompt,
        choices: q.choices.map((c) => ({ key: c.label, text: c.text })),
        correctChoice: q.correct_choice,
        explanation: q.explanation,
      }
    : null;

  let standards: LessonResponse["standards"] = [];
  if (r.standards?.length) {
    const { rows: st } = await pool.query<{ code: string; data: { title?: string; description?: string } | null }>(
      `SELECT code, data FROM curriculum_standards
        WHERE key = ANY($1) AND data IS NOT NULL`,
      [r.standards]
    );
    standards = st.map((s) => ({
      code: s.code,
      title: s.data?.title ?? "",
      description: s.data?.description ?? "",
    }));
  }

  return {
    topic: toTopic(r),
    topicType: r.type,
    objectives: Array.isArray(r.evidence) ? r.evidence : [],
    example,
    standards,
  };
}

async function fetchQuestion(questionId: number): Promise<QuestionRow | null> {
  const { rows } = await pool.query<QuestionRow>(
    `SELECT id, topic_id, prompt, choices, correct_choice, explanation
       FROM questions WHERE id = $1`,
    [questionId]
  );
  return rows[0] ?? null;
}

// Least-recently-attempted question for a topic (so repeats cycle through pool).
export async function pickQuestion(
  studentId: string,
  topicId: string
): Promise<QuestionPublic | null> {
  const { rows } = await pool.query<QuestionRow>(
    `SELECT q.id, q.topic_id, q.kind, q.prompt, q.choices, q.correct_choice, q.explanation, q.spec
       FROM questions q
      WHERE q.topic_id = $1
      ORDER BY (
        SELECT count(*) FROM practice_attempts pa
         WHERE pa.question_id = q.id AND pa.student_id = $2
      ) ASC, q.id ASC
      LIMIT 1`,
    [topicId, studentId]
  );
  const q = rows[0];
  if (!q) return null;
  return {
    id: q.id,
    topicId: q.topic_id,
    kind: q.kind,
    prompt: q.prompt,
    choices: q.choices.map((c) => ({ key: c.label, text: c.text })),
    ...(q.kind === "shade" && q.spec
      ? {
          shape: q.spec.shape,
          numerator: q.spec.numerator,
          denominator: q.spec.denominator,
        }
      : {}),
  };
}

function reasonFor(
  status: MasteryStatus,
  prereqNames: string[],
  locale: Locale
): string {
  const list = prereqNames.join(locale === "zh" ? "、" : ", ");
  if (locale === "en") {
    switch (status) {
      case "gap":
        return "You missed a couple in a row — let's shore up the basics here.";
      case "mastered":
        return "You've got this one. On to the next challenge!";
      case "unlockable":
        return prereqNames.length
          ? `You've learned ${list}, so this is unlocked now.`
          : "A good place to start in this area.";
      default:
        return prereqNames.length
          ? `Master ${list} first to unlock this.`
          : "Locked for now.";
    }
  }
  switch (status) {
    case "gap":
      return "最近连续答错，需要先补一下这里的基础。";
    case "mastered":
      return "你已经掌握啦，可以继续挑战下一个。";
    case "unlockable":
      return prereqNames.length
        ? `因为你已经学会了「${list}」，现在可以学这个了。`
        : "这是这一领域的入门知识点，适合先学。";
    default:
      return prereqNames.length
        ? `需要先掌握「${list}」才能解锁。`
        : "暂未解锁。";
  }
}

export function insertedPrereqReason(locale: Locale): string {
  return locale === "en"
    ? "A couple of misses in a row — let's revisit this basic first."
    : "连续答错，先回去巩固这个基础知识点。";
}

// Full path over all grade topics, with computed status + explainable reason.
export async function buildPath(
  studentId: string,
  locale: Locale
): Promise<PathItem[]> {
  const [topics, prereqs, rows] = await Promise.all([
    listGradeTopics(),
    inGradeHardPrereqs(),
    masteryRows(studentId),
  ]);
  const mastered = new Set(
    [...rows.values()].filter((r) => r.status === "mastered").map((r) => r.topic_id)
  );
  const nameById = new Map(topics.map((t) => [t.id, t.name]));

  return topics.map((topic) => {
    const hp = prereqs.get(topic.id) ?? [];
    const status = displayStatus(rows.get(topic.id), hp, mastered);
    const prereqNames = hp.map((id) => nameById.get(id)).filter(Boolean) as string[];
    return { topic, status, reason: reasonFor(status, prereqNames, locale) };
  });
}

// Graph scoped to one domain: the domain's grade topics + their in-grade hard
// prerequisites (which may live in other domains, shown as context).
export async function buildGraph(
  studentId: string,
  locale: Locale,
  domain: string
): Promise<GraphResponse> {
  const [prereqs, rows] = await Promise.all([
    inGradeHardPrereqs(),
    masteryRows(studentId),
  ]);
  const mastered = new Set(
    [...rows.values()].filter((r) => r.status === "mastered").map((r) => r.topic_id)
  );

  // node set = grade topics in this domain + their in-grade prereqs
  const { rows: domainRows } = await pool.query<TopicRow>(
    `SELECT * FROM topics WHERE ${GRADE_WHERE} AND domain = $4`,
    [...gradeParams, domain]
  );
  const nodeIds = new Set(domainRows.map((r) => r.id));
  for (const t of domainRows) (prereqs.get(t.id) ?? []).forEach((p) => nodeIds.add(p));

  const { rows: nodeRows } = await pool.query<TopicRow>(
    `SELECT * FROM topics WHERE id = ANY($1)`,
    [[...nodeIds]]
  );

  // edges among the node set (both hard and soft, for display)
  const { rows: edgeRows } = await pool.query<{
    topic_id: string;
    prerequisite_id: string;
    strength: "hard" | "soft";
    reason: string | null;
  }>(
    `SELECT topic_id, prerequisite_id, strength, reason
       FROM dependencies
      WHERE topic_id = ANY($1) AND prerequisite_id = ANY($1)`,
    [[...nodeIds]]
  );

  const nodes = nodeRows.map((r) => {
    const hp = prereqs.get(r.id) ?? [];
    return { topic: toTopic(r), status: displayStatus(rows.get(r.id), hp, mastered) };
  });
  const edges = edgeRows.map((e) => ({
    from: e.prerequisite_id,
    to: e.topic_id,
    strength: e.strength,
    reason: e.reason ?? undefined,
  }));
  return { nodes, edges };
}

// Decide what to work on after answering `currentTopicId`.
export async function nextTopicId(
  studentId: string,
  currentTopicId: string
): Promise<string> {
  const [prereqs, rows, topics] = await Promise.all([
    inGradeHardPrereqs(),
    masteryRows(studentId),
    listGradeTopics(),
  ]);
  const mastered = new Set(
    [...rows.values()].filter((r) => r.status === "mastered").map((r) => r.topic_id)
  );

  // 1. any gap with an un-mastered in-grade hard prereq -> fix the prereq
  for (const [tid, r] of rows) {
    if (r.status === "gap") {
      const p = (prereqs.get(tid) ?? []).find((x) => !mastered.has(x));
      if (p) return p;
    }
  }
  // 2. stay on current topic until mastered
  if (!mastered.has(currentTopicId)) return currentTopicId;
  // 3. next unlockable grade topic, highest centrality first
  const next = topics
    .filter((t) => displayStatus(rows.get(t.id), prereqs.get(t.id) ?? [], mastered) === "unlockable")
    .sort((a, b) => b.centrality - a.centrality)[0];
  return next?.id ?? currentTopicId;
}

export interface AnswerOutcome {
  correct: boolean;
  correctChoice: string;
  explanation: string;
  mastery: MasteryState;
  insertedPrereqId: string | null;
  insertedPrereqName: string | null;
  nextTopicId: string;
}

export async function recordAnswer(
  studentId: string,
  questionId: number,
  choiceKey: string
): Promise<AnswerOutcome | null> {
  const q = await fetchQuestion(questionId);
  if (!q) return null;
  await ensureStudent(studentId);

  const correct = choiceKey === q.correct_choice;

  // read prior streaks
  const { rows: prior } = await pool.query<MasteryRow>(
    `SELECT topic_id, status, correct_streak, wrong_streak
       FROM student_topic_mastery WHERE student_id=$1 AND topic_id=$2`,
    [studentId, q.topic_id]
  );
  let correctStreak = prior[0]?.correct_streak ?? 0;
  let wrongStreak = prior[0]?.wrong_streak ?? 0;
  let status: string = prior[0]?.status ?? "learning";

  if (correct) {
    correctStreak += 1;
    wrongStreak = 0;
    status = correctStreak >= MASTERED_STREAK ? "mastered" : "learning";
  } else {
    wrongStreak += 1;
    correctStreak = 0;
    status = wrongStreak >= GAP_STREAK ? "gap" : "learning";
  }

  await pool.query(
    `INSERT INTO student_topic_mastery
       (student_id, topic_id, status, correct_streak, wrong_streak, last_seen)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (student_id, topic_id) DO UPDATE
       SET status=$3, correct_streak=$4, wrong_streak=$5, last_seen=now()`,
    [studentId, q.topic_id, status, correctStreak, wrongStreak]
  );
  await pool.query(
    `INSERT INTO practice_attempts
       (student_id, topic_id, question_id, chosen, correct, mode)
     VALUES ($1,$2,$3,$4,$5,'practice')`,
    [studentId, q.topic_id, q.id, choiceKey, correct]
  );

  // gap -> surface first un-mastered in-grade hard prereq
  let insertedPrereqId: string | null = null;
  let insertedPrereqName: string | null = null;
  if (status === "gap") {
    const prereqs = await inGradeHardPrereqs();
    const rows = await masteryRows(studentId);
    const mastered = new Set(
      [...rows.values()].filter((r) => r.status === "mastered").map((r) => r.topic_id)
    );
    const p = (prereqs.get(q.topic_id) ?? []).find((x) => !mastered.has(x));
    if (p) {
      insertedPrereqId = p;
      const { rows: nameRows } = await pool.query<{ name: string }>(
        `SELECT name FROM topics WHERE id=$1`,
        [p]
      );
      insertedPrereqName = nameRows[0]?.name ?? null;
    }
  }

  // map stored enum -> display status for the mastery meter
  const displayForMeter: MasteryStatus =
    status === "mastered" ? "mastered" : status === "gap" ? "gap" : "unlockable";

  return {
    correct,
    correctChoice: q.correct_choice,
    explanation: q.explanation,
    mastery: {
      topicId: q.topic_id,
      status: displayForMeter,
      correctStreak,
      wrongStreak,
    },
    insertedPrereqId,
    insertedPrereqName,
    nextTopicId: await nextTopicId(studentId, q.topic_id),
  };
}
