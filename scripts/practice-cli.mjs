#!/usr/bin/env node
import './load-env.mjs';
/**
 * practice-cli.mjs — vertical-slice loop for the fractions subgraph:
 *   diagnose → answer → update mastery → recommend next
 *
 * Usage:
 *   DATABASE_URL=... node scripts/practice-cli.mjs \
 *     --subgraph data/subgraphs/fractions-slice.json --student demo
 */

import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import pg from 'pg';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const subgraphPath = args.subgraph ?? 'data/subgraphs/fractions-slice.json';
const studentId = args.student ?? 'demo';
const studentName = args.name ?? studentId;
const demoMode = args.demo === 'true' || args.demo === '';
const demoLimit = Number(args['demo-limit'] ?? 5);
const diagnoseLimit = Number(args['diagnose-limit'] ?? 15);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const subgraph = JSON.parse(readFileSync(subgraphPath, 'utf8'));
const topicIds = subgraph.topics.map((t) => t.id);
const topicById = new Map(subgraph.topics.map((t) => [t.id, t]));
const gradeIds = new Set(subgraph.topics.filter((t) => t.inGrade).map((t) => t.id));
const hardPrereqs = new Map();
for (const d of subgraph.dependencies) {
  if (d.strength !== 'hard') continue;
  if (!hardPrereqs.has(d.topicId)) hardPrereqs.set(d.topicId, []);
  hardPrereqs.get(d.topicId).push(d.prerequisiteId);
}

const client = new pg.Client({ connectionString: databaseUrl });
const rl = demoMode ? null : createInterface({ input, output });
let demoAsked = 0;

async function ensureSchemaAndStudent() {
  await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  await client.query(
    `INSERT INTO students (id, display_name) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
    [studentId, studentName],
  );
  for (const id of topicIds) {
    await client.query(
      `INSERT INTO student_topic_mastery (student_id, topic_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [studentId, id],
    );
  }
}

async function masteryMap() {
  const { rows } = await client.query(
    `SELECT topic_id, status, correct_streak, wrong_streak
     FROM student_topic_mastery WHERE student_id = $1 AND topic_id = ANY($2)`,
    [studentId, topicIds],
  );
  return new Map(rows.map((r) => [r.topic_id, r]));
}

function isUnlocked(topicId, mastery) {
  const prereqs = hardPrereqs.get(topicId) ?? [];
  return prereqs.every((pre) => mastery.get(pre)?.status === 'mastered');
}

async function pickQuestion(topicId, excludeIds = []) {
  const { rows } = await client.query(
    `SELECT id, prompt, choices, correct_choice, explanation
     FROM questions
     WHERE topic_id = $1 AND NOT (id = ANY($2::int[]))
     ORDER BY random() LIMIT 1`,
    [topicId, excludeIds],
  );
  if (rows[0]) return rows[0];
  const { rows: any } = await client.query(
    `SELECT id, prompt, choices, correct_choice, explanation
     FROM questions WHERE topic_id = $1 ORDER BY random() LIMIT 1`,
    [topicId],
  );
  return any[0] ?? null;
}

async function askQuestion(topic, question, mode) {
  if (demoMode && demoAsked >= demoLimit) return { quit: true };

  console.log('\n────────────────────────────────────────');
  console.log(`[${mode}] ${topic.name}  (${topic.ageRangeStart}–${topic.ageRangeEnd})`);
  console.log(topic.domain);
  console.log('\n' + question.prompt + '\n');
  const choices = typeof question.choices === 'string' ? JSON.parse(question.choices) : question.choices;
  for (const c of choices.sort((a, b) => a.label.localeCompare(b.label))) {
    console.log(`  ${c.label}. ${c.text}`);
  }

  let answer = '';
  if (demoMode) {
    demoAsked += 1;
    // Odd turns: deliberate miss (to exercise prerequisite walk); even: correct.
    answer = demoAsked % 2 === 1
      ? choices.find((c) => c.label !== question.correct_choice).label
      : question.correct_choice;
    console.log(`\n[demo] answering ${answer}`);
  } else {
    while (!['A', 'B', 'C', 'D'].includes(answer)) {
      answer = (await rl.question('\nYour answer (A/B/C/D, or q to quit): ')).trim().toUpperCase();
      if (answer === 'Q') return { quit: true };
    }
  }

  const correct = answer === question.correct_choice;
  console.log(correct ? '\n✓ Correct' : `\n✗ Incorrect — answer was ${question.correct_choice}`);
  console.log(question.explanation);

  await client.query(
    `INSERT INTO practice_attempts (student_id, topic_id, question_id, chosen, correct, mode)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [studentId, topic.id, question.id, answer, correct, mode],
  );
  await updateMastery(topic.id, correct);
  return { quit: false, correct };
}

async function updateMastery(topicId, correct) {
  const { rows } = await client.query(
    `SELECT status, correct_streak, wrong_streak FROM student_topic_mastery
     WHERE student_id = $1 AND topic_id = $2`,
    [studentId, topicId],
  );
  let { status, correct_streak: cs, wrong_streak: ws } = rows[0];
  if (correct) {
    cs += 1;
    ws = 0;
    if (cs >= 3) status = 'mastered';
    else if (status === 'unknown' || status === 'gap') status = 'learning';
  } else {
    ws += 1;
    cs = 0;
    if (ws >= 2) status = 'gap';
    else if (status === 'unknown') status = 'learning';
    else if (status === 'mastered') status = 'learning';
  }
  await client.query(
    `UPDATE student_topic_mastery
     SET status = $3, correct_streak = $4, wrong_streak = $5, last_seen = now()
     WHERE student_id = $1 AND topic_id = $2`,
    [studentId, topicId, status, cs, ws],
  );
  console.log(`  → mastery: ${status} (correct streak ${cs}, wrong streak ${ws})`);
}

/** Layered diagnose: probe top grade hubs; on miss, walk hard prerequisites. */
async function diagnose() {
  console.log('\n=== Diagnostic ===');
  console.log(
    `Probing up to ${diagnoseLimit} grade-level hubs (by centrality), then walking prerequisites on misses.\n`,
  );
  const mastery = await masteryMap();
  const queue = subgraph.topics
    .filter((t) => t.inGrade && mastery.get(t.id)?.status === 'unknown')
    .sort((a, b) => b.centrality - a.centrality)
    .slice(0, diagnoseLimit);

  const seenQuestions = [];
  while (queue.length) {
    const topic = queue.shift();
    const row = (await masteryMap()).get(topic.id);
    if (!row || row.status === 'mastered') continue;

    const question = await pickQuestion(topic.id, seenQuestions);
    if (!question) {
      console.log(`(no questions for ${topic.name}, skipping)`);
      continue;
    }
    seenQuestions.push(question.id);
    const result = await askQuestion(topic, question, 'diagnose');
    if (result.quit) return false;

    if (!result.correct) {
      const prereqs = (hardPrereqs.get(topic.id) ?? [])
        .map((id) => topicById.get(id))
        .filter(Boolean)
        .filter((t) => {
          const m = mastery.get(t.id);
          return !m || m.status !== 'mastered';
        })
        .sort((a, b) => b.centrality - a.centrality);
      for (const pre of prereqs) {
        if (!queue.some((t) => t.id === pre.id)) queue.unshift(pre);
      }
    }
  }
  return true;
}

function recommendNext(mastery) {
  // Prefer gaps whose hard prereqs are mastered; else unlocked learning/unknown grade topics by centrality.
  const candidates = subgraph.topics.filter((t) => {
    const m = mastery.get(t.id);
    if (!m || m.status === 'mastered') return false;
    return isUnlocked(t.id, mastery);
  });
  candidates.sort((a, b) => {
    const ma = mastery.get(a.id);
    const mb = mastery.get(b.id);
    const gapFirst = (mb.status === 'gap') - (ma.status === 'gap');
    if (gapFirst) return gapFirst;
    const gradeFirst = Number(gradeIds.has(b.id)) - Number(gradeIds.has(a.id));
    if (gradeFirst) return gradeFirst;
    return b.centrality - a.centrality;
  });
  return candidates[0] ?? null;
}

async function printStatus() {
  const mastery = await masteryMap();
  const counts = { unknown: 0, learning: 0, mastered: 0, gap: 0 };
  for (const id of topicIds) counts[mastery.get(id)?.status ?? 'unknown']++;
  console.log(
    `\nProgress — mastered ${counts.mastered} · learning ${counts.learning} · gap ${counts.gap} · unknown ${counts.unknown} / ${topicIds.length}`,
  );
}

async function practiceLoop() {
  for (;;) {
    await printStatus();
    const mastery = await masteryMap();
    const next = recommendNext(mastery);
    if (!next) {
      console.log('\nAll unlocked topics in this slice look mastered. Nice work!');
      return;
    }
    const why =
      mastery.get(next.id)?.status === 'gap'
        ? 'gap repair'
        : gradeIds.has(next.id)
          ? 'grade hub (high centrality)'
          : 'foundation prerequisite';
    console.log(`\nNext up: ${next.name} — ${why}`);

    if (demoMode) {
      if (demoAsked >= demoLimit) {
        console.log('[demo] limit reached, stopping.');
        return;
      }
    } else {
      const cont = (await rl.question('Practice this topic? [Y/n/q]: ')).trim().toLowerCase();
      if (cont === 'q') return;
      if (cont === 'n') continue;
    }

    const question = await pickQuestion(next.id);
    if (!question) {
      console.log('No questions available.');
      continue;
    }
    const result = await askQuestion(next, question, 'practice');
    if (result.quit) return;
  }
}

async function main() {
  await client.connect();
  await ensureSchemaAndStudent();
  console.log(`Student: ${studentName} (${studentId})`);
  console.log(`Subgraph: ${subgraphPath} (${topicIds.length} topics)`);

  const mastery = await masteryMap();
  const unknownCount = [...mastery.values()].filter((m) => m.status === 'unknown').length;
  if (unknownCount > topicIds.length * 0.5) {
    const ok = await diagnose();
    if (!ok) return;
  } else {
    console.log('\nSkipping full diagnose (most topics already seen). Jumping to practice.');
  }
  await practiceLoop();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    rl?.close();
    await client.end();
  });
