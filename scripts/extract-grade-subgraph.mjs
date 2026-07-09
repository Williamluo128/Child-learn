#!/usr/bin/env node
/**
 * extract-grade-subgraph.mjs — pulls a grade-band's topics plus every
 * prerequisite they transitively depend on (including topics from earlier
 * grades/subjects), and writes the resulting subgraph to a JSON file.
 *
 * This is the subgraph the diagnostic engine and question bank generation
 * need: not just "5th grade math", but everything a 5th grader might be
 * missing on the way there.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/dbname node scripts/extract-grade-subgraph.mjs \
 *     --subject Mathematics --grade-age-start 10 --grade-age-end 11 --out data/subgraphs/grade5-math.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const subject = args.subject ?? 'Mathematics';
const gradeAgeStart = Number(args['grade-age-start'] ?? 10);
const gradeAgeEnd = Number(args['grade-age-end'] ?? 11);
const outPath = resolve(args.out ?? `data/subgraphs/${subject.toLowerCase()}-age${gradeAgeStart}-${gradeAgeEnd}.json`);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Run scripts/import-to-postgres.mjs first, then set DATABASE_URL to that database.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();

  const { rows: gradeTopics } = await client.query(
    `SELECT id FROM topics WHERE subject = $1 AND age_range_start <= $2 AND age_range_end >= $3`,
    [subject, gradeAgeEnd, gradeAgeStart],
  );
  if (gradeTopics.length === 0) {
    throw new Error(`No topics found for subject=${subject} overlapping age ${gradeAgeStart}-${gradeAgeEnd}`);
  }
  const gradeIds = gradeTopics.map((row) => row.id);

  // Recursive closure: every prerequisite reachable from the grade-band topics,
  // however many hops back (earlier grades, other subjects, etc).
  const { rows: closureRows } = await client.query(
    `WITH RECURSIVE closure AS (
       SELECT id FROM topics WHERE id = ANY($1)
       UNION
       SELECT d.prerequisite_id
       FROM dependencies d
       JOIN closure c ON d.topic_id = c.id
     )
     SELECT id FROM closure`,
    [gradeIds],
  );
  const nodeIds = closureRows.map((row) => row.id);
  const gradeIdSet = new Set(gradeIds);

  const { rows: topicRows } = await client.query(`SELECT * FROM topics WHERE id = ANY($1)`, [nodeIds]);
  // Every edge out of a closure member; its prerequisite is guaranteed to already be in the closure.
  const { rows: depRows } = await client.query(`SELECT * FROM dependencies WHERE topic_id = ANY($1)`, [nodeIds]);

  const topics = topicRows.map((row) => ({
    id: row.id,
    type: row.type,
    subject: row.subject,
    domain: row.domain,
    name: row.name,
    description: row.description,
    ageRangeStart: row.age_range_start,
    ageRangeEnd: row.age_range_end,
    centrality: row.centrality,
    evidence: row.evidence,
    assessmentPrompt: row.assessment_prompt,
    standards: row.standards,
    inGrade: gradeIdSet.has(row.id),
  }));

  const dependencies = depRows.map((row) => ({
    topicId: row.topic_id,
    prerequisiteId: row.prerequisite_id,
    strength: row.strength,
    reason: row.reason,
  }));

  const ancestorTopics = topics.filter((t) => !t.inGrade);
  const ancestorsBySubject = {};
  for (const t of ancestorTopics) ancestorsBySubject[t.subject] = (ancestorsBySubject[t.subject] ?? 0) + 1;

  const output = {
    meta: {
      subject,
      gradeAgeStart,
      gradeAgeEnd,
      generatedAt: new Date().toISOString(),
      gradeTopicCount: gradeIds.length,
      totalTopicCount: topics.length,
      totalDependencyCount: dependencies.length,
      ancestorTopicCount: ancestorTopics.length,
      ancestorsBySubject,
    },
    topics,
    dependencies,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Wrote ${outPath}`);
  console.log(`  grade-band topics:  ${gradeIds.length}`);
  console.log(`  + ancestor topics:  ${ancestorTopics.length} (${JSON.stringify(ancestorsBySubject)})`);
  console.log(`  total topics:       ${topics.length}`);
  console.log(`  dependency edges:   ${dependencies.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.end());
