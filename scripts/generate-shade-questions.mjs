import './load-env.mjs';
/*
 * generate-shade-questions.mjs — procedurally add interactive "shade a
 * fraction" questions (kind='shade') to the question bank. No LLM: geometry is
 * computed from the fraction, so this is free and deterministic.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/generate-shade-questions.mjs
 *
 * Question sets (each idempotent via batch_id, skipped per topic if present):
 *   base      — bar/circle/hexagon simple fractions, Fractions domain
 *   grid-tri  — grid + triangle + equivalent-fraction variants, Fractions domain
 *   decimal   — "Color 0.4" tenths/hundredths, topics named decimal/tenth/hundredth
 *   percent   — "Color 30%" bars & 5%-grids, topics named percent
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// grade-5 US math band
const SUBJECT = "Mathematics";
const AGE_START = 10;
const AGE_END = 11;

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const GRADE_WHERE = `subject = $1 AND age_range_start <= $2 AND age_range_end >= $3`;
const gradeParams = [SUBJECT, AGE_END, AGE_START];

async function topicsWhere(extra, extraParams = []) {
  const { rows } = await client.query(
    `SELECT id, name FROM topics WHERE ${GRADE_WHERE} AND (${extra}) ORDER BY name`,
    [...gradeParams, ...extraParams]
  );
  return rows;
}

// skip a topic if it already has questions from this batch
async function hasBatch(topicId, batchId) {
  const { rows } = await client.query(
    `SELECT 1 FROM questions WHERE topic_id = $1 AND kind = 'shade'
       AND (batch_id = $2 OR ($2 = 'shade-base' AND batch_id IS NULL)) LIMIT 1`,
    [topicId, batchId]
  );
  return rows.length > 0;
}

async function insert(topicId, batchId, q) {
  await client.query(
    `INSERT INTO questions
       (topic_id, kind, prompt, choices, correct_choice, explanation, spec, model, batch_id)
     VALUES ($1, 'shade', $2, '[]'::jsonb, $3, $4, $5::jsonb, 'procedural', $6)`,
    [topicId, q.prompt, String(q.correct), q.explanation, JSON.stringify(q.spec), batchId]
  );
}

const shapeWord = (s) =>
  s === "hexagon" ? "hexagon" : s === "circle" ? "circle" : s === "grid" ? "grid" : s === "triangle" ? "triangle" : "bar";

// deterministic pseudo-variety per topic index
const pick = (i, k, mod, base = 1) => base + ((i * k + 3) % mod);

let totalInserted = 0;

async function runSet(setName, batchId, topics, buildQuestions) {
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    if (await hasBatch(topic.id, batchId)) {
      skipped++;
      continue;
    }
    for (const q of buildQuestions(i)) {
      await insert(topic.id, batchId, q);
      inserted++;
    }
  }
  totalInserted += inserted;
  console.log(`[${setName}] topics=${topics.length} inserted=${inserted} skipped=${skipped}`);
}

// ---- set 1: base (bar/circle/hexagon) — Fractions domain --------------------
const fractionTopics = await topicsWhere(`domain = 'Fractions'`);
await runSet("base", "shade-base", fractionTopics, (i) => {
  const shapes = [
    { shape: "bar", denominator: 4 },
    { shape: "circle", denominator: 6 },
    { shape: "hexagon", denominator: 18 },
  ];
  return shapes.map(({ shape, denominator }, j) => {
    const numerator = pick(i + j, 2, denominator - 1);
    return {
      prompt: `Color ${numerator}/${denominator} of the ${shapeWord(shape)}.`,
      correct: numerator,
      explanation: `${numerator}/${denominator} means shading ${numerator} of the ${denominator} equal parts.`,
      spec: { shape, numerator, denominator },
    };
  });
});

// ---- set 2: grid + triangle + equivalent fractions — Fractions domain -------
await runSet("grid-tri-eq", "shade-grid-tri-eq", fractionTopics, (i) => {
  const qs = [];

  // 3×4 grid (12 parts)
  const gN = pick(i, 5, 11);
  qs.push({
    prompt: `Color ${gN}/12 of the grid.`,
    correct: gN,
    explanation: `${gN}/12 means shading ${gN} of the 12 equal squares.`,
    spec: { shape: "grid", numerator: gN, denominator: 12, rows: 3, cols: 4 },
  });

  // triangle of 9 congruent parts
  const tN = pick(i, 2, 8);
  qs.push({
    prompt: `Color ${tN}/9 of the triangle.`,
    correct: tN,
    explanation: `The big triangle is made of 9 equal small triangles, so shade ${tN} of them.`,
    spec: { shape: "triangle", numerator: tN, denominator: 9 },
  });

  // equivalent fraction: instruction shows a simpler fraction than the parts
  const eqVariants = [
    { label: "1/2", shape: "circle", denominator: 8, correct: 4 },
    { label: "1/3", shape: "grid", denominator: 6, rows: 2, cols: 3, correct: 2 },
    { label: "3/4", shape: "bar", denominator: 8, correct: 6 },
  ];
  const eq = eqVariants[i % eqVariants.length];
  qs.push({
    prompt: `Color ${eq.label} of the ${shapeWord(eq.shape)}. It has ${eq.denominator} equal parts.`,
    correct: eq.correct,
    explanation: `${eq.label} of ${eq.denominator} equal parts is ${eq.correct} parts, because ${eq.correct}/${eq.denominator} = ${eq.label}.`,
    spec: {
      shape: eq.shape,
      numerator: eq.correct,
      denominator: eq.denominator,
      ...(eq.rows ? { rows: eq.rows, cols: eq.cols } : {}),
      label: eq.label,
    },
  });

  return qs;
});

// ---- set 3: decimals (tenths bar/circle + hundredths grid) ------------------
const decimalTopics = await topicsWhere(`name ~* 'decimal|tenth|hundredth'`);
await runSet("decimal", "shade-decimal", decimalTopics, (i) => {
  const qs = [];

  // tenths on a bar: "Color 0.4"
  const bN = pick(i, 3, 9);
  qs.push({
    prompt: `Color 0.${bN} of the bar.`,
    correct: bN,
    explanation: `0.${bN} means ${bN} tenths — shade ${bN} of the 10 equal parts.`,
    spec: { shape: "bar", numerator: bN, denominator: 10, label: `0.${bN}` },
  });

  // tenths on a circle
  const cN = pick(i, 4, 9);
  qs.push({
    prompt: `Color 0.${cN} of the circle.`,
    correct: cN,
    explanation: `0.${cN} means ${cN} tenths — shade ${cN} of the 10 equal sectors.`,
    spec: { shape: "circle", numerator: cN, denominator: 10, label: `0.${cN}` },
  });

  // hundredths on a 10×10 grid (small counts to keep clicking friendly)
  const hN = 4 + ((i * 7) % 12); // 4..15
  const hLabel = `0.${String(hN).padStart(2, "0")}`;
  qs.push({
    prompt: `Color ${hLabel} of the grid.`,
    correct: hN,
    explanation: `${hLabel} means ${hN} hundredths — shade ${hN} of the 100 small squares.`,
    spec: { shape: "grid", numerator: hN, denominator: 100, rows: 10, cols: 10, label: hLabel },
  });

  return qs;
});

// ---- set 4: percents (tenths bar + 5% grid) ---------------------------------
const percentTopics = await topicsWhere(`name ~* 'percent'`);
await runSet("percent", "shade-percent", percentTopics, (i) => {
  const qs = [];

  // multiples of 10% on a 10-part bar
  const pN = pick(i, 3, 9); // 1..9 → 10%..90%
  qs.push({
    prompt: `Color ${pN * 10}% of the bar.`,
    correct: pN,
    explanation: `${pN * 10}% means ${pN * 10} out of 100, which is ${pN} of the 10 equal parts.`,
    spec: { shape: "bar", numerator: pN, denominator: 10, label: `${pN * 10}%` },
  });

  // multiples of 5% on a 4×5 grid (20 parts, 5% each)
  const gN = 3 + ((i * 5) % 15); // 3..17 → 15%..85%
  qs.push({
    prompt: `Color ${gN * 5}% of the grid. Each square is 5%.`,
    correct: gN,
    explanation: `Each square is 5%, so ${gN * 5}% = ${gN} squares.`,
    spec: { shape: "grid", numerator: gN, denominator: 20, rows: 4, cols: 5, label: `${gN * 5}%` },
  });

  return qs;
});

console.log(`Total inserted: ${totalInserted}`);
await client.end();
