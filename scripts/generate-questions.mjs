#!/usr/bin/env node
/**
 * generate-questions.mjs — LLM-generated multiple-choice question bank.
 *
 * Providers:
 *   anthropic (default) — Claude Message Batches API + forced tool call
 *   openai              — OpenAI Batch API + structured JSON schema output
 *
 * Two-phase because batches can take up to 24h to complete (usually much faster):
 *
 *   submit  — build one batch request per topic (skipping topics that
 *             already have enough questions), send the batch, print its ID.
 *   collect — poll a batch until it's done, then insert validated questions
 *             into Postgres. custom_id === topic_id, so no local state file
 *             is needed between submit and collect.
 *
 * Usage:
 *   node scripts/generate-questions.mjs --action submit --subgraph data/subgraphs/grade5-math.json
 *   node scripts/generate-questions.mjs --action collect --batch-id msgbatch_...
 *
 *   node scripts/generate-questions.mjs --provider openai --action submit \
 *     --subgraph data/subgraphs/grade5-math.json --model gpt-4.1-mini
 *   node scripts/generate-questions.mjs --provider openai --action collect --batch-id batch_...
 *
 * Reads DATABASE_URL / ANTHROPIC_API_KEY / OPENAI_API_KEY from the environment
 * or from the project-root .env file.
 */

import './load-env.mjs';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const action = args.action;
const provider = (args.provider ?? 'anthropic').toLowerCase();

if (action !== 'submit' && action !== 'collect') {
  console.error(
    'Usage: --action submit --subgraph <path> | --action collect --batch-id <id>\n' +
      'Optional: --provider anthropic|openai --model <id> --questions-per-topic <n>',
  );
  process.exit(1);
}
if (provider !== 'anthropic' && provider !== 'openai') {
  console.error(`Unknown --provider ${provider}. Use anthropic or openai.`);
  process.exit(1);
}

const defaultModel = provider === 'openai' ? 'gpt-4.1-mini' : 'claude-opus-4-8';
const model = args.model ?? defaultModel;
const questionsPerTopic = Number(args['questions-per-topic'] ?? 3);
const maxTokens = Number(args['max-tokens'] ?? 2048);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Add it to .env or export it.');
  process.exit(1);
}
if (action === 'submit') {
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it to .env or export it.');
    process.exit(1);
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Add it to .env (see .env.example).');
    process.exit(1);
  }
}

const client = new pg.Client({ connectionString: databaseUrl });
// Lazily construct clients so `collect` can auto-detect provider from batch id.
function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it to .env or export it.');
    process.exit(1);
  }
  return new Anthropic();
}
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Add it to .env (see .env.example).');
    process.exit(1);
  }
  return new OpenAI();
}

const SUBMIT_TOOL = {
  name: 'submit_questions',
  description: 'Submit generated multiple-choice practice questions for this topic.',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The question stem, self-contained, no placeholders.' },
            choices: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                  text: { type: 'string' },
                },
                required: ['label', 'text'],
              },
            },
            correctChoice: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            explanation: {
              type: 'string',
              description: 'Why the correct choice is right and, briefly, why the others are not.',
            },
          },
          required: ['prompt', 'choices', 'correctChoice', 'explanation'],
        },
      },
    },
    required: ['questions'],
  },
};

/** OpenAI strict JSON schema (additionalProperties: false required throughout). */
const OPENAI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['prompt', 'choices', 'correctChoice', 'explanation'],
        properties: {
          prompt: { type: 'string' },
          choices: {
            type: 'array',
            minItems: 4,
            maxItems: 4,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'text'],
              properties: {
                label: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: { type: 'string' },
              },
            },
          },
          correctChoice: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

function buildPrompt(topic) {
  return `Write ${questionsPerTopic} multiple-choice practice questions for this learning topic.

Topic: ${topic.name}
Subject / domain: ${topic.subject} / ${topic.domain}
Type: ${topic.type}
Age range: ${topic.ageRangeStart}-${topic.ageRangeEnd}
Description: ${topic.description}
Mastery evidence (what a student who has mastered this can do):
${topic.evidence.map((e) => `- ${e}`).join('\n')}

Requirements:
- Each question tests one piece of evidence above, at a difficulty appropriate for age ${topic.ageRangeStart}-${topic.ageRangeEnd}.
- Exactly 4 answer choices, exactly one correct.
- Wrong choices should be plausible misconceptions, not random or absurd.
- Self-contained: no placeholders, no reference to "the student" or a child's name.
- Return the result as structured JSON matching the schema.`;
}

function validateQuestion(q) {
  if (typeof q.prompt !== 'string' || !q.prompt.trim()) return false;
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return false;
  const labels = q.choices.map((c) => c.label);
  if (new Set(labels).size !== 4) return false;
  if (!['A', 'B', 'C', 'D'].every((l) => labels.includes(l))) return false;
  if (!labels.includes(q.correctChoice)) return false;
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) return false;
  return true;
}

function coerceQuestions(raw) {
  let questions = raw;
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch {
      try {
        questions = JSON.parse(questions.replace(/,\s*([\]}])/g, '$1'));
      } catch {
        questions = [];
      }
    }
  }
  return Array.isArray(questions) ? questions : [];
}

async function loadPendingTopics() {
  const subgraphPath = args.subgraph;
  if (!subgraphPath) {
    console.error('--subgraph <path> is required for --action submit');
    process.exit(1);
  }
  const subgraph = JSON.parse(readFileSync(subgraphPath, 'utf8'));
  let topics = subgraph.topics;
  const limit = args.limit ? Number(args.limit) : undefined;
  if (limit) topics = topics.slice(0, limit);

  await client.connect();
  const ids = topics.map((t) => t.id);
  const { rows: doneRows } = await client.query(
    `SELECT topic_id FROM questions WHERE topic_id = ANY($1) GROUP BY topic_id HAVING count(*) >= $2`,
    [ids, questionsPerTopic],
  );
  const done = new Set(doneRows.map((r) => r.topic_id));
  const pending = topics.filter((t) => !done.has(t.id));

  console.log(
    `${topics.length} topics in subgraph, ${done.size} already have ${questionsPerTopic}+ questions, ${pending.length} pending.`,
  );
  return pending;
}

async function submitAnthropic(pending) {
  const requests = pending.map((topic) => ({
    custom_id: topic.id,
    params: {
      model,
      max_tokens: maxTokens,
      tools: [SUBMIT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_questions' },
      messages: [{ role: 'user', content: buildPrompt(topic) }],
    },
  }));

  const anthropic = getAnthropic();
  const batch = await anthropic.messages.batches.create({ requests });
  console.log(`Submitted Anthropic batch ${batch.id} (${requests.length} requests, model=${model}).`);
  console.log(`Collect later with:`);
  console.log(
    `  node scripts/generate-questions.mjs --provider anthropic --action collect --batch-id ${batch.id}`,
  );
}

async function submitOpenAI(pending) {
  const lines = pending.map((topic) =>
    JSON.stringify({
      custom_id: topic.id,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: buildPrompt(topic) }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'submit_questions',
            strict: true,
            schema: OPENAI_SCHEMA,
          },
        },
      },
    }),
  );

  const openai = getOpenAI();
  const jsonlPath = join(tmpdir(), `child-learn-openai-batch-${Date.now()}.jsonl`);
  writeFileSync(jsonlPath, `${lines.join('\n')}\n`);

  let file;
  try {
    file = await openai.files.create({
      file: await OpenAI.toFile(readFileSync(jsonlPath), 'questions.jsonl'),
      purpose: 'batch',
    });
  } finally {
    try {
      unlinkSync(jsonlPath);
    } catch {
      /* ignore */
    }
  }

  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
    metadata: { source: 'generate-questions' },
  });

  console.log(`Submitted OpenAI batch ${batch.id} (${lines.length} requests, model=${model}).`);
  console.log(`Input file: ${file.id}`);
  console.log(`Collect later with:`);
  console.log(
    `  node scripts/generate-questions.mjs --provider openai --action collect --batch-id ${batch.id}`,
  );
}

async function submit() {
  const pending = await loadPendingTopics();
  if (pending.length === 0) {
    console.log('Nothing to submit.');
    return;
  }
  if (provider === 'openai') await submitOpenAI(pending);
  else await submitAnthropic(pending);
}

async function insertQuestions(batchId, topicId, questions, resultModel) {
  const valid = questions.filter(validateQuestion);
  const skipped = questions.length - valid.length;
  if (valid.length === 0) return { inserted: 0, skipped };

  await client.query('BEGIN');
  for (const q of valid) {
    await client.query(
      `INSERT INTO questions (topic_id, prompt, choices, correct_choice, explanation, model, batch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [topicId, q.prompt, JSON.stringify(q.choices), q.correctChoice, q.explanation, resultModel, batchId],
    );
  }
  await client.query('COMMIT');
  return { inserted: valid.length, skipped };
}

async function collectAnthropic(batchId) {
  const anthropic = getAnthropic();
  let batch = await anthropic.messages.batches.retrieve(batchId);
  while (batch.processing_status !== 'ended') {
    console.log(`Batch ${batchId}: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    batch = await anthropic.messages.batches.retrieve(batchId);
  }
  console.log(`Batch ${batchId} ended: ${JSON.stringify(batch.request_counts)}`);

  await client.connect();
  const { rowCount: cleared } = await client.query(`DELETE FROM questions WHERE batch_id = $1`, [batchId]);
  if (cleared) console.log(`Cleared ${cleared} existing question(s) from batch ${batchId}.`);

  let inserted = 0;
  let skippedInvalid = 0;
  let failed = 0;

  for await (const result of await anthropic.messages.batches.results(batchId)) {
    const topicId = result.custom_id;
    if (result.result.type !== 'succeeded') {
      failed++;
      console.warn(
        `  [${topicId}] ${result.result.type}${result.result.error ? `: ${result.result.error.message}` : ''}`,
      );
      continue;
    }

    const toolUse = result.result.message.content.find(
      (b) => b.type === 'tool_use' && b.name === 'submit_questions',
    );
    const questions = coerceQuestions(toolUse?.input?.questions ?? []);
    const stats = await insertQuestions(batchId, topicId, questions, result.result.message.model ?? model);
    inserted += stats.inserted;
    skippedInvalid += stats.skipped;
  }

  console.log(
    `\nInserted ${inserted} questions. Skipped ${skippedInvalid} malformed, ${failed} failed/errored requests.`,
  );
}

async function collectOpenAI(batchId) {
  const openai = getOpenAI();
  let batch = await openai.batches.retrieve(batchId);
  while (batch.status === 'validating' || batch.status === 'in_progress' || batch.status === 'finalizing') {
    console.log(`Batch ${batchId}: ${batch.status} — ${JSON.stringify(batch.request_counts)}`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    batch = await openai.batches.retrieve(batchId);
  }
  console.log(`Batch ${batchId} ended: ${batch.status} — ${JSON.stringify(batch.request_counts)}`);

  if (batch.status !== 'completed' && batch.status !== 'expired') {
    console.error(`Batch finished with status=${batch.status}; aborting collect.`);
    if (batch.error_file_id) {
      const errFile = await openai.files.content(batch.error_file_id);
      console.error(await errFile.text());
    }
    process.exit(1);
  }

  if (!batch.output_file_id) {
    console.error('Batch has no output_file_id.');
    process.exit(1);
  }

  const output = await openai.files.content(batch.output_file_id);
  const text = await output.text();

  await client.connect();
  const { rowCount: cleared } = await client.query(`DELETE FROM questions WHERE batch_id = $1`, [batchId]);
  if (cleared) console.log(`Cleared ${cleared} existing question(s) from batch ${batchId}.`);

  let inserted = 0;
  let skippedInvalid = 0;
  let failed = 0;

  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const topicId = row.custom_id;
    if (row.error || row.response?.status_code !== 200) {
      failed++;
      console.warn(`  [${topicId}] ${row.error?.message ?? `HTTP ${row.response?.status_code}`}`);
      continue;
    }

    const content = row.response?.body?.choices?.[0]?.message?.content ?? '{}';
    let parsed;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      failed++;
      console.warn(`  [${topicId}] invalid JSON content`);
      continue;
    }

    const questions = coerceQuestions(parsed?.questions ?? []);
    const resultModel = row.response?.body?.model ?? model;
    const stats = await insertQuestions(batchId, topicId, questions, resultModel);
    inserted += stats.inserted;
    skippedInvalid += stats.skipped;
  }

  console.log(
    `\nInserted ${inserted} questions. Skipped ${skippedInvalid} malformed, ${failed} failed/errored requests.`,
  );
}

async function collect() {
  const batchId = args['batch-id'];
  if (!batchId) {
    console.error('--batch-id <id> is required for --action collect');
    process.exit(1);
  }

  // Auto-detect provider from batch id prefix when --provider omitted / mismatched.
  const inferred =
    batchId.startsWith('batch_') ? 'openai' : batchId.startsWith('msgbatch_') ? 'anthropic' : provider;
  if (inferred !== provider) {
    console.log(`Batch id looks like ${inferred}; using that provider.`);
  }

  if (inferred === 'openai') await collectOpenAI(batchId);
  else await collectAnthropic(batchId);
}

(action === 'submit' ? submit() : collect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.end().catch(() => {}));
