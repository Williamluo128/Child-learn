#!/usr/bin/env node
import './load-env.mjs';
/**
 * import-to-postgres.mjs — loads data/*.json into a Postgres database.
 *
 * Applies db/schema.sql (idempotent), then truncates and re-inserts every
 * table, so re-running this script always leaves the database matching the
 * current contents of data/.
 *
 * Usage:
 *   DATABASE_URL=postgres://user:pass@host:5432/dbname node scripts/import-to-postgres.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, 'data');
const load = (name) => JSON.parse(readFileSync(resolve(DATA, name), 'utf8'));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Example: DATABASE_URL=postgres://user:pass@localhost:5432/marble_taxonomy node scripts/import-to-postgres.mjs',
  );
  process.exit(1);
}

console.log('Validating dataset integrity before import...');
execFileSync('node', [resolve(ROOT, 'scripts/validate.mjs')], { stdio: 'inherit' });

const topics = load('topics.json');
const deps = load('dependencies.json');
const standards = load('curriculum-standards.json');
const clusters = load('clusters.json');

const client = new pg.Client({ connectionString: databaseUrl });

// column(rows, key) -> array of that field, in row order, for UNNEST-based bulk inserts.
const column = (rows, key) => rows.map((row) => row[key]);

async function importTopics() {
  const rows = topics.topics;
  await client.query(
    // standards arrives as jsonb (one JSON array per row) rather than text[][] because
    // UNNEST flattens a 2D array parameter across all rows instead of keeping one
    // sub-array per row; jsonb_array_elements_text rebuilds the per-row text[] instead.
    `INSERT INTO topics (id, type, subject, domain, name, description, age_range_start, age_range_end, centrality, evidence, assessment_prompt, standards)
     SELECT id, type, subject, domain, name, description, age_range_start, age_range_end, centrality, evidence, assessment_prompt,
            ARRAY(SELECT jsonb_array_elements_text(standards_json))
     FROM UNNEST(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
       $7::smallint[], $8::smallint[], $9::double precision[], $10::jsonb[], $11::text[], $12::jsonb[]
     ) AS t(id, type, subject, domain, name, description, age_range_start, age_range_end, centrality, evidence, assessment_prompt, standards_json)`,
    [
      column(rows, 'id'),
      column(rows, 'type'),
      column(rows, 'subject'),
      column(rows, 'domain'),
      column(rows, 'name'),
      column(rows, 'description'),
      column(rows, 'ageRangeStart'),
      column(rows, 'ageRangeEnd'),
      column(rows, 'centrality'),
      rows.map((row) => JSON.stringify(row.evidence)),
      column(rows, 'assessmentPrompt'),
      rows.map((row) => JSON.stringify(row.standards)),
    ],
  );
  return rows.length;
}

async function importDependencies() {
  const rows = deps.dependencies;
  await client.query(
    `INSERT INTO dependencies (topic_id, prerequisite_id, strength, reason)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[])`,
    [column(rows, 'topicId'), column(rows, 'prerequisiteId'), column(rows, 'strength'), column(rows, 'reason')],
  );
  return rows.length;
}

async function importCurricula() {
  const rows = standards.curricula;
  await client.query(
    `INSERT INTO curricula (slug, country, name, version, source_url, text_included, license)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::boolean[], $7::text[])`,
    [
      column(rows, 'slug'),
      column(rows, 'country'),
      column(rows, 'name'),
      column(rows, 'version'),
      column(rows, 'sourceUrl'),
      column(rows, 'textIncluded'),
      column(rows, 'license'),
    ],
  );

  const links = rows.flatMap((curriculum) => curriculum.topics.map((standard) => ({ curriculumSlug: curriculum.slug, ...standard })));
  await client.query(
    `INSERT INTO curriculum_standards (key, curriculum_slug, code, data)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::jsonb[])`,
    [column(links, 'key'), column(links, 'curriculumSlug'), column(links, 'code'), links.map((link) => (link.data ? JSON.stringify(link.data) : null))],
  );
  return { curricula: rows.length, standards: links.length };
}

async function importClusters() {
  const rows = clusters.clusters;
  await client.query(
    `INSERT INTO clusters (subject, domain, age_range_start, summary)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::smallint[], $4::text[])`,
    [column(rows, 'subject'), column(rows, 'domain'), column(rows, 'ageRangeStart'), column(rows, 'summary')],
  );
  return rows.length;
}

async function main() {
  await client.connect();
  try {
    console.log('Applying schema...');
    await client.query(readFileSync(resolve(ROOT, 'db/schema.sql'), 'utf8'));

    await client.query('BEGIN');
    console.log('Clearing existing rows...');
    await client.query('TRUNCATE TABLE dependencies, curriculum_standards, topics, curricula, clusters RESTART IDENTITY CASCADE');

    console.log('Importing topics...');
    const topicCount = await importTopics();

    console.log('Importing dependencies...');
    const depCount = await importDependencies();

    console.log('Importing curricula + standards...');
    const { curricula: curriculaCount, standards: standardCount } = await importCurricula();

    console.log('Importing clusters...');
    const clusterCount = await importClusters();

    await client.query('COMMIT');

    console.log('\nImport complete:');
    console.log(`  topics:              ${topicCount}`);
    console.log(`  dependencies:        ${depCount}`);
    console.log(`  curricula:           ${curriculaCount}`);
    console.log(`  curriculum_standards: ${standardCount}`);
    console.log(`  clusters:            ${clusterCount}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
