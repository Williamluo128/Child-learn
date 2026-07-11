import './load-env.mjs';
/*
 * generate-shade-questions.mjs — procedurally add interactive "shade a
 * fraction" questions (kind='shade') to the question bank. No LLM: geometry is
 * computed from the fraction, so this is free and deterministic.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/generate-shade-questions.mjs
 *
 * Idempotent: skips any topic that already has shade questions.
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

// three shapes per topic; numerator picked < denominator
const SHAPES = [
  { shape: "bar", denominator: 4 },
  { shape: "circle", denominator: 6 },
  { shape: "hexagon", denominator: 18 },
];

const shapeWord = (s) => (s === "hexagon" ? "hexagon" : s === "circle" ? "circle" : "bar");

function pickNumerator(denominator, i) {
  // spread across the range, always 1..d-1
  const n = 1 + ((i * 2 + 1) % (denominator - 1));
  return n;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

const { rows: topics } = await client.query(
  `SELECT id, name FROM topics
    WHERE subject = $1 AND age_range_start <= $2 AND age_range_end >= $3
      AND domain = 'Fractions'
    ORDER BY name`,
  [SUBJECT, AGE_END, AGE_START]
);

let inserted = 0;
let skipped = 0;

for (const topic of topics) {
  const { rows: existing } = await client.query(
    `SELECT 1 FROM questions WHERE topic_id = $1 AND kind = 'shade' LIMIT 1`,
    [topic.id]
  );
  if (existing.length) {
    skipped++;
    continue;
  }

  for (let i = 0; i < SHAPES.length; i++) {
    const { shape, denominator } = SHAPES[i];
    const numerator = pickNumerator(denominator, i);
    const prompt = `Color ${numerator}/${denominator} of the ${shapeWord(shape)}.`;
    const explanation = `${numerator}/${denominator} means shading ${numerator} of the ${denominator} equal parts.`;
    const spec = { shape, numerator, denominator };

    await client.query(
      `INSERT INTO questions
         (topic_id, kind, prompt, choices, correct_choice, explanation, spec, model)
       VALUES ($1, 'shade', $2, '[]'::jsonb, $3, $4, $5::jsonb, 'procedural')`,
      [topic.id, prompt, String(numerator), explanation, JSON.stringify(spec)]
    );
    inserted++;
  }
}

console.log(
  `Fractions topics: ${topics.length}. Inserted ${inserted} shade questions, skipped ${skipped} topics (already had some).`
);

await client.end();
