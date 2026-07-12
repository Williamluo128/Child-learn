import './load-env.mjs';
/*
 * generate-cube-questions.mjs — procedurally add interactive "count the unit
 * cubes" 3D volume questions (kind='cubes') to the question bank. No LLM:
 * the solid and its volume are computed from the spec (CCSS 5.MD.4 / 5.MD.5).
 *
 * Usage:
 *   DATABASE_URL=... node scripts/generate-cube-questions.mjs
 *
 * Idempotent via batch_id='cubes-v1' (skipped per topic if present).
 */
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const SUBJECT = "Mathematics";
const AGE_START = 10;
const AGE_END = 11;
const BATCH = "cubes-v1";

// exact topic names → which solid mix fits the topic's intent
const TARGETS = [
  { name: "Counting Unit Cubes", mix: "basic" },
  { name: "Estimating volume", mix: "basic" },
  { name: "Volume as additive", mix: "composite" },
  { name: "3-D shapes (age 9+)", mix: "intro" },
  { name: "3-D shapes (age 10+)", mix: "intro" },
  { name: "3-D shapes (age 11+)", mix: "composite" },
];

const volume = (s) =>
  s.solid === "cuboid"
    ? s.l * s.h * s.w
    : s.solid === "lshape"
      ? s.l * s.h * s.w - s.cutL * s.cutH * s.cutW
      : s.w * ((s.steps * (s.steps + 1)) / 2); // staircase

function cuboidQ(l, h, w) {
  const spec = { solid: "cuboid", l, h, w };
  const v = volume(spec);
  return {
    spec,
    correct: v,
    prompt: `Count the unit cubes in this rectangular prism.`,
    explanation: `The prism is ${l} × ${w} × ${h}: each layer has ${l * w} cubes and there are ${h} layers, so ${l} × ${w} × ${h} = ${v} cubes.`,
  };
}

function lshapeQ(l, h, w, cutL, cutH, cutW) {
  const spec = { solid: "lshape", l, h, w, cutL, cutH, cutW };
  const v = volume(spec);
  const full = l * h * w;
  const cut = cutL * cutH * cutW;
  return {
    spec,
    correct: v,
    prompt: `Count the unit cubes in this L-shaped solid.`,
    explanation: `Think of it as a full ${l} × ${w} × ${h} block (${full} cubes) with a ${cutL} × ${cutW} × ${cutH} corner removed (${cut} cubes): ${full} − ${cut} = ${v}. You can also split it into two boxes and add.`,
  };
}

function staircaseQ(steps, w) {
  const spec = { solid: "staircase", steps, w };
  const v = volume(spec);
  const cols = Array.from({ length: steps }, (_, i) => steps - i);
  return {
    spec,
    correct: v,
    prompt: `Count the unit cubes in this staircase solid.`,
    explanation: `Column by column the heights are ${cols.join(", ")}; each column is ${w} deep, so (${cols.join(" + ")}) × ${w} = ${v} cubes.`,
  };
}

// deterministic variety per topic index
function questionsFor(mix, i) {
  const dims = [
    [2, 2, 3],
    [3, 2, 2],
    [3, 3, 2],
    [4, 2, 2],
    [4, 3, 2],
    [3, 2, 4],
  ];
  const [a, b, c] = dims[i % dims.length];
  const [d, e, f] = dims[(i + 2) % dims.length];

  if (mix === "basic") {
    return [cuboidQ(a, b, c), cuboidQ(d, e, f), staircaseQ(3 + (i % 2), 2)];
  }
  if (mix === "composite") {
    return [
      lshapeQ(3 + (i % 2), 3, 2, 1, 1 + (i % 2), 2),
      staircaseQ(3 + (i % 2), 2),
      cuboidQ(a, b, c),
    ];
  }
  // intro: gentler sizes
  return [cuboidQ(2, 2, 2), cuboidQ(a, b, c), staircaseQ(3, 1 + (i % 2))];
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

let inserted = 0;
let skippedTopics = 0;
let missing = 0;

for (let i = 0; i < TARGETS.length; i++) {
  const { name, mix } = TARGETS[i];
  const { rows } = await client.query(
    `SELECT id FROM topics
      WHERE subject = $1 AND age_range_start <= $2 AND age_range_end >= $3 AND name = $4`,
    [SUBJECT, AGE_END, AGE_START, name]
  );
  if (!rows.length) {
    console.warn(`  ! topic not found: ${name}`);
    missing++;
    continue;
  }
  const topicId = rows[0].id;

  const { rows: existing } = await client.query(
    `SELECT 1 FROM questions WHERE topic_id = $1 AND batch_id = $2 LIMIT 1`,
    [topicId, BATCH]
  );
  if (existing.length) {
    skippedTopics++;
    continue;
  }

  for (const q of questionsFor(mix, i)) {
    await client.query(
      `INSERT INTO questions
         (topic_id, kind, prompt, choices, correct_choice, explanation, spec, model, batch_id)
       VALUES ($1, 'cubes', $2, '[]'::jsonb, $3, $4, $5::jsonb, 'procedural', $6)`,
      [topicId, q.prompt, String(q.correct), q.explanation, JSON.stringify(q.spec), BATCH]
    );
    inserted++;
  }
}

console.log(
  `cubes: targets=${TARGETS.length} inserted=${inserted} skippedTopics=${skippedTopics} missingTopics=${missing}`
);
await client.end();
