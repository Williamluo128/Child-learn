import "server-only";
import type { DiagnoseAnswer, DiagnoseResponse } from "../types";
import { GAP_STREAK, MASTERED_STREAK } from "../mastery";
import { GRADE, pool } from "./pool";
import { pickQuestion } from "./queries";

// Layered adaptive diagnostic (PLAN §3.4):
// - probe high-centrality grade-level topics, one per domain
// - wrong answer → descend to its hard prerequisites (may leave the grade
//   band; capped at MAX_DEPTH hops — PLAN §6's backtrack limit)
// - right answer → infer its whole hard-prerequisite closure as mastered
// - stop at BUDGET questions or when nothing informative is left
// The plan is a pure function of the judged history, so replaying the history
// on every request reproduces the same probe sequence (stateless server).

const BUDGET = 10;
const MAX_DEPTH = 3;

interface Judged {
  topicId: string;
  questionId: number;
  choiceKey: string;
  correct: boolean;
}

async function judgeHistory(history: DiagnoseAnswer[]): Promise<Judged[]> {
  if (!history.length) return [];
  const ids = history.map((h) => h.questionId);
  const { rows } = await pool.query<{
    id: number;
    topic_id: string;
    correct_choice: string;
  }>(`SELECT id, topic_id, correct_choice FROM questions WHERE id = ANY($1)`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const judged: Judged[] = [];
  for (const h of history) {
    const q = byId.get(h.questionId);
    if (q) {
      judged.push({
        topicId: q.topic_id,
        questionId: h.questionId,
        choiceKey: h.choiceKey,
        correct: h.choiceKey === q.correct_choice,
      });
    }
  }
  return judged;
}

interface GraphData {
  // grade-band topics ordered for seeding
  seeds: { id: string; name: string }[];
  gradeTopicIds: Set<string>;
  hardPrereqs: Map<string, string[]>; // topic -> hard prereqs (full graph)
  hasQuestion: Set<string>;
  nameById: Map<string, string>;
  topCentrality: { id: string; name: string }[];
}

async function loadGraph(): Promise<GraphData> {
  const [gradeRes, depsRes, qRes, namesRes] = await Promise.all([
    pool.query<{ id: string; name: string; domain: string; centrality: number }>(
      `SELECT id, name, domain, centrality FROM topics
        WHERE subject = $1 AND age_range_start <= $2 AND age_range_end >= $3
        ORDER BY centrality DESC`,
      [GRADE.subject, GRADE.ageEnd, GRADE.ageStart]
    ),
    pool.query<{ topic_id: string; prerequisite_id: string }>(
      `SELECT topic_id, prerequisite_id FROM dependencies WHERE strength = 'hard'`
    ),
    pool.query<{ topic_id: string }>(`SELECT DISTINCT topic_id FROM questions`),
    pool.query<{ id: string; name: string }>(`SELECT id, name FROM topics`),
  ]);

  // one seed per domain: its highest-centrality topic; seeds ordered by centrality
  const byDomain = new Map<string, { id: string; name: string }>();
  for (const r of gradeRes.rows) {
    if (!byDomain.has(r.domain)) byDomain.set(r.domain, { id: r.id, name: r.name });
  }
  const domainTop = new Set([...byDomain.values()].map((s) => s.id));
  const seeds = gradeRes.rows
    .filter((r) => domainTop.has(r.id))
    .map((r) => ({ id: r.id, name: r.name }));

  const hardPrereqs = new Map<string, string[]>();
  for (const d of depsRes.rows) {
    if (!hardPrereqs.has(d.topic_id)) hardPrereqs.set(d.topic_id, []);
    hardPrereqs.get(d.topic_id)!.push(d.prerequisite_id);
  }

  return {
    seeds,
    gradeTopicIds: new Set(gradeRes.rows.map((r) => r.id)),
    hardPrereqs,
    hasQuestion: new Set(qRes.rows.map((r) => r.topic_id)),
    nameById: new Map(namesRes.rows.map((r) => [r.id, r.name])),
    topCentrality: gradeRes.rows.slice(0, 6).map((r) => ({ id: r.id, name: r.name })),
  };
}

// hard-prerequisite closure of the passed topics (minus anything judged)
function inferMastered(passed: Set<string>, judged: Set<string>, g: GraphData): Set<string> {
  const inferred = new Set<string>();
  const stack = [...passed];
  while (stack.length) {
    const t = stack.pop()!;
    for (const p of g.hardPrereqs.get(t) ?? []) {
      if (!inferred.has(p) && !judged.has(p)) {
        inferred.add(p);
        stack.push(p);
      }
    }
  }
  return inferred;
}

interface Probe {
  id: string;
  depth: number;
  backtrack: boolean;
}

// Deterministic next-probe selection from the judged history.
function planNext(judged: Judged[], g: GraphData): Probe | null {
  const verdict = new Map<string, boolean>();
  for (const j of judged) verdict.set(j.topicId, j.correct);
  const passed = new Set([...verdict].filter(([, ok]) => ok).map(([t]) => t));
  const inferred = inferMastered(passed, new Set(verdict.keys()), g);

  const stack: Probe[] = g.seeds.map((s) => ({ id: s.id, depth: 0, backtrack: false }));
  while (stack.length) {
    const t = stack.shift()!;
    if (verdict.has(t.id)) {
      if (!verdict.get(t.id) && t.depth < MAX_DEPTH) {
        // failed → descend into its unjudged, probeable hard prereqs
        const down = (g.hardPrereqs.get(t.id) ?? [])
          .filter((p) => !verdict.has(p) && !inferred.has(p) && g.hasQuestion.has(p))
          .map((p) => ({ id: p, depth: t.depth + 1, backtrack: true }));
        stack.unshift(...down);
      }
      continue;
    }
    if (inferred.has(t.id)) continue;
    if (!g.hasQuestion.has(t.id)) continue;
    return t;
  }
  return null;
}

// Persist the finished session: attempts (mode='diagnose') + mastery seeds.
// Re-diagnosing replaces the previous diagnostic attempts.
async function commit(studentId: string, judged: Judged[], inferred: Set<string>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO students (id, display_name) VALUES ($1, $1)
       ON CONFLICT (id) DO NOTHING`,
      [studentId]
    );
    await client.query(
      `DELETE FROM practice_attempts WHERE student_id = $1 AND mode = 'diagnose'`,
      [studentId]
    );
    for (const j of judged) {
      await client.query(
        `INSERT INTO practice_attempts (student_id, topic_id, question_id, chosen, correct, mode)
         VALUES ($1, $2, $3, $4, $5, 'diagnose')`,
        [studentId, j.topicId, j.questionId, j.choiceKey, j.correct]
      );
    }
    const mastered = [
      ...judged.filter((j) => j.correct).map((j) => j.topicId),
      ...inferred,
    ];
    for (const topicId of mastered) {
      await client.query(
        `INSERT INTO student_topic_mastery (student_id, topic_id, status, correct_streak, wrong_streak, last_seen)
         VALUES ($1, $2, 'mastered', $3, 0, now())
         ON CONFLICT (student_id, topic_id) DO UPDATE
           SET status='mastered', correct_streak=$3, wrong_streak=0, last_seen=now()`,
        [studentId, topicId, MASTERED_STREAK]
      );
    }
    for (const j of judged.filter((x) => !x.correct)) {
      await client.query(
        `INSERT INTO student_topic_mastery (student_id, topic_id, status, correct_streak, wrong_streak, last_seen)
         VALUES ($1, $2, 'gap', 0, $3, now())
         ON CONFLICT (student_id, topic_id) DO UPDATE
           SET status='gap', correct_streak=0, wrong_streak=$3, last_seen=now()`,
        [studentId, j.topicId, GAP_STREAK]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function diagnoseNext(
  studentId: string,
  history: DiagnoseAnswer[]
): Promise<DiagnoseResponse> {
  const [judged, g] = await Promise.all([judgeHistory(history), loadGraph()]);
  const lastCorrect = judged.length ? judged[judged.length - 1].correct : null;

  const next = judged.length >= BUDGET ? null : planNext(judged, g);

  if (next) {
    const question = await pickQuestion(studentId, next.id);
    if (question) {
      return {
        done: false,
        question,
        topicName: g.nameById.get(next.id) ?? next.id,
        isBacktrack: next.backtrack,
        lastCorrect,
        progress: { asked: judged.length, budget: BUDGET },
      };
    }
  }

  // session complete → persist and summarize
  const verdict = new Map(judged.map((j) => [j.topicId, j.correct]));
  const passed = new Set([...verdict].filter(([, ok]) => ok).map(([t]) => t));
  const inferred = inferMastered(passed, new Set(verdict.keys()), g);
  await commit(studentId, judged, inferred);

  const gaps = [...verdict]
    .filter(([, ok]) => !ok)
    .map(([topicId]) => ({ topicId, name: g.nameById.get(topicId) ?? topicId }));
  const frontier = gaps.length
    ? gaps.slice(0, 3)
    : g.topCentrality
        .filter((s) => !verdict.has(s.id) && !inferred.has(s.id))
        .slice(0, 3)
        .map((s) => ({ topicId: s.id, name: s.name }));

  return {
    done: true,
    lastCorrect,
    masteredCount: passed.size + inferred.size,
    inferredCount: inferred.size,
    gaps,
    frontier,
  };
}
