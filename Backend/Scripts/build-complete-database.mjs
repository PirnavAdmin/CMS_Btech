import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '..');
const baseDump = process.argv[2] ? resolve(process.argv[2]) : null;

if (!baseDump || !existsSync(baseDump)) {
  console.error(
    'Usage: node Scripts/build-complete-database.mjs <path-to-cms_btech-dump.sql>'
  );
  process.exit(2);
}

const integrationUpdate = resolve(
  root,
  'Database/IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql'
);

if (!existsSync(integrationUpdate)) {
  console.error(`Integration SQL not found: ${integrationUpdate}`);
  process.exit(2);
}

const preamble = `-- =============================================================\n` +
  `-- CMS BTECH COMPLETE DATABASE\n` +
  `-- Generated: 2026-09-04\n` +
  `-- Target: MySQL 8.x\n` +
  `-- Creates/selects cms_btech, imports the supplied snapshot,\n` +
  `-- then applies all integration corrections.\n` +
  `-- =============================================================\n\n` +
  `CREATE DATABASE IF NOT EXISTS \`cms_btech\`\n` +
  `  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;\n` +
  `USE \`cms_btech\`;\n\n`;

const base = readFileSync(baseDump, 'utf8')
  .replace(/^\uFEFF/, '')
  .trim();
const update = readFileSync(integrationUpdate, 'utf8')
  .replace(/^\uFEFF/, '')
  .trim();

const output = resolve(
  root,
  'Database/CompleteDatabase/CMS_BTECH_COMPLETE_UPDATED.sql'
);

writeFileSync(output, `${preamble}${base}\n\n${update}\n`, 'utf8');
console.log(output);
