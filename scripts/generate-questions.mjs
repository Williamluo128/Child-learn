#!/usr/bin/env node
/**
 * generate-questions.mjs — LLM-generated multiple-choice question bank.
 *
 * Uses the Claude Message Batches API (50% cheaper than synchronous calls,
 * built for exactly this kind of bulk job) plus a forced tool call per topic
 * so every response is validated, structured JSON instead of free text.
 *
 * Two-phase because batches can take up to 24h to complete (usually ~1h):
 *
 *   submit  — build one batch request per topic (skipping topics that
 *             already have enough questions), send the batch, print its ID.
 *   collect — poll a batch until it's done, then insert validated questions
 *             into Postgres. custom_id === topic_id, so no local state file
 *             is needed between submit and collect.
 *
 * Usage:
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/generate-questions.mjs \
 *     --action submit --subgraph data/subgraphs/grade5-math.json
 *
 *   DATABASE_URL=... ANTHROPIC_API_KEY=... node scripts/generate-questions.mjs \
 *     --action collect --batch-id msgbatch_...
 */

import { readFileSync } from 'node:fs';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const action = args.action;
if (action !== 'submit' && action !== 'collect') {
  console.error('Usage: --action submit --subgraph <path> | --action collect --batch-id <id>');
  process.exit(1);
}

const model = args.model ?? 'claude-opus-4-8';
const questionsPerTopic = Number(args['questions-per-topic'] ?? 3);
const maxTokens = Number(args['max-tokens'] ?? 2048);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
const anthropic = new Anthropic();

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
            explanation: { type: 'string', description: 'Why the correct choice is right and, briefly, why the others are not.' },
          },
          required: ['prompt', 'choices', 'correctChoice', 'explanation'],
        },
      },
    },
    required: ['questions'],
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
- Call submit_questions with the result.`;
}

async function submit() {
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

  console.log(`${topics.length} topics in subgraph, ${done.size} already have ${questionsPerTopic}+ questions, ${pending.length} pending.`);
  if (pending.length === 0) {
    console.log('Nothing to submit.');
    return;
  }

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

  const batch = await anthropic.messages.batches.create({ requests });
  console.log(`Submitted batch ${batch.id} (${requests.length} requests, model=${model}).`);
  console.log(`Check status / collect later with:`);
  console.log(`  node scripts/generate-questions.mjs --action collect --batch-id ${batch.id}`);
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

async function collect() {
  const batchId = args['batch-id'];
  if (!batchId) {
    console.error('--batch-id <id> is required for --action collect');
    process.exit(1);
  }

  let batch = await anthropic.messages.batches.retrieve(batchId);
  while (batch.processing_status !== 'ended') {
    console.log(`Batch ${batchId}: ${batch.processing_status} — ${JSON.stringify(batch.request_counts)}`);
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    batch = await anthropic.messages.batches.retrieve(batchId);
  }
  console.log(`Batch ${batchId} ended: ${JSON.stringify(batch.request_counts)}`);

  await client.connect();
  let inserted = 0;
  let skippedInvalid = 0;
  let failed = 0;

  for await (const result of await anthropic.messages.batches.results(batchId)) {
    const topicId = result.custom_id;
    if (result.result.type !== 'succeeded') {
      failed++;
      console.warn(`  [${topicId}] ${result.result.type}${result.result.error ? `: ${result.result.error.message}` : ''}`);
      continue;
    }

    const toolUse = result.result.message.content.find((b) => b.type === 'tool_use' && b.name === 'submit_questions');
    const questions = toolUse?.input?.questions ?? [];
    const valid = questions.filter(validateQuestion);
    skippedInvalid += questions.length - valid.length;
    if (valid.length === 0) continue;

    await client.query('BEGIN');
    for (const q of valid) {
      await client.query(
        `INSERT INTO questions (topic_id, prompt, choices, correct_choice, explanation, model, batch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [topicId, q.prompt, JSON.stringify(q.choices), q.correctChoice, q.explanation, model, batchId],
      );
      inserted++;
    }
    await client.query('COMMIT');
  }

  console.log(`\nInserted ${inserted} questions. Skipped ${skippedInvalid} malformed, ${failed} failed/errored requests.`);
}

(action === 'submit' ? submit() : collect())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.end());
