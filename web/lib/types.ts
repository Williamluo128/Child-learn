// Single source of truth for the frontend <-> backend API contract.
// Mock API routes and real Postgres-backed routes must both satisfy these.

export type MasteryStatus = "mastered" | "gap" | "unlockable" | "locked";

export type DependencyStrength = "hard" | "soft";

export interface Topic {
  id: string;
  subject: string;
  domain: string;
  name: string;
  description: string;
  ageRangeStart: number;
  ageRangeEnd: number;
  centrality: number;
}

export interface Dependency {
  topicId: string;
  prerequisiteId: string;
  strength: DependencyStrength;
  reason?: string;
}

export type QuestionKind = "mcq" | "shade" | "cubes";
export type ShapeKind = "hexagon" | "circle" | "bar" | "grid" | "triangle";
export type SolidKind = "cuboid" | "lshape" | "staircase";

// geometry for count-unit-cubes 3D questions (see lib/solids.ts)
export interface CubesSpecPublic {
  solid: SolidKind;
  l?: number;
  h?: number;
  w?: number;
  cutL?: number;
  cutH?: number;
  cutW?: number;
  steps?: number;
}

// A question as sent to the client — never includes the correct answer.
// For shade questions, shape/numerator/denominator are the instruction (what
// to represent), not the hidden answer; the server still verifies the count.
export interface QuestionPublic {
  id: number;
  topicId: string;
  kind: QuestionKind;
  prompt: string;
  choices: { key: string; text: string }[]; // empty for shade
  shape?: ShapeKind;
  numerator?: number;
  denominator?: number;
  // grid geometry
  rows?: number;
  cols?: number;
  // what the instruction displays when it differs from numerator/denominator —
  // e.g. "0.4" (decimal), "30%" (percent), "1/2" (equivalent fraction on an
  // 8-part shape). The child must translate it into a count of parts.
  label?: string;
  // cubes questions: the solid to render (the count is the hidden answer)
  cubes?: CubesSpecPublic;
}

// POST /api/answer  request
export interface AnswerRequest {
  studentId: string;
  questionId: number;
  choiceKey: string;
}

// POST /api/answer  response
export interface AnswerResponse {
  correct: boolean;
  correctChoice: string;
  explanation: string;
  mastery: MasteryState;
  // if the loop decides the student needs to shore up a prerequisite
  insertedPrerequisite?: { topicId: string; name: string; reason: string } | null;
  // convenience pointer for the client to fetch the next question
  nextTopicId: string;
}

export interface MasteryState {
  topicId: string;
  status: MasteryStatus;
  correctStreak: number;
  wrongStreak: number;
}

// GET /api/path  response
export interface PathItem {
  topic: Topic;
  status: MasteryStatus;
  // human-readable "why this next" — powers the explainability card
  reason: string;
}

// GET /api/graph  response — powers the React Flow skill map (/map)
export interface GraphNode {
  topic: Topic;
  status: MasteryStatus;
}

export interface GraphEdge {
  from: string; // prerequisiteId
  to: string; // topicId that depends on it
  strength: DependencyStrength;
  reason?: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  // present when the graph is scoped to a domain (real backend)
  domain?: string;
  domains?: string[];
}

// POST /api/diagnose/next — layered adaptive diagnostic (PLAN §3.4).
// The client holds the session (answers so far); the server judges, replans
// deterministically, and returns the next probe or the final summary. Nothing
// is persisted until the session completes.
export interface DiagnoseAnswer {
  questionId: number;
  choiceKey: string;
}

export interface DiagnoseRequest {
  studentId: string;
  history: DiagnoseAnswer[];
  lang?: string;
}

export interface DiagnoseNextResponse {
  done: false;
  question: QuestionPublic;
  topicName: string;
  // this probe descended from a failed topic (show the "stepping down" note)
  isBacktrack: boolean;
  // judgment of the last submitted answer (null on session start)
  lastCorrect: boolean | null;
  progress: { asked: number; budget: number };
}

export interface DiagnoseSummary {
  done: true;
  lastCorrect: boolean | null;
  masteredCount: number; // answered-correct + inferred prerequisites
  inferredCount: number;
  gaps: { topicId: string; name: string }[];
  frontier: { topicId: string; name: string }[]; // where to start
}

export type DiagnoseResponse = DiagnoseNextResponse | DiagnoseSummary;

// GET /api/lesson  response — the "learn from zero" study page (/learn).
// Composed from existing DB fields; no separately-authored lesson prose.
export interface WorkedExample {
  prompt: string;
  choices: { key: string; text: string }[];
  correctChoice: string;
  explanation: string;
}

export interface StandardRef {
  code: string;
  title: string;
  description: string;
}

export interface LessonResponse {
  topic: Topic;
  topicType: string; // CONCEPTUAL | PROCEDURAL | ...
  objectives: string[]; // topics.evidence — "you'll be able to…"
  example: WorkedExample | null; // a real question shown solved
  standards: StandardRef[];
}
