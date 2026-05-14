#!/usr/bin/env node
/**
 * check_sql_drift.mjs — Phase 5 D.5
 *
 * Guards that the Postgres (UAT) and MySQL (Clevai canonical) migrations stay
 * structurally aligned. They MUST share:
 *   - Same set of CREATE TABLE table names
 *   - Same set of column names within each table
 *
 * Drift between Postgres column types and MySQL column types is expected
 * (JSONB vs JSON, BIGINT vs BIGINT UNSIGNED, TEXT+CHECK vs ENUM, etc.) and is
 * documented in the SQL file headers. We do NOT diff types — only structure.
 *
 * Exit 0: in sync. Exit 1: drift detected; prints a diff.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PG_PATH = path.join(ROOT, 'Masterdata/migrations/2026-05-13-create-game-tables-postgres.sql');
const MY_PATH = path.join(ROOT, 'Masterdata/migrations/2026-05-13-create-game-tables-mysql.sql');

/**
 * Strip block comments + line comments before parsing — keep parser simple.
 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*\n/g, '\n');
}

/**
 * Replace all SQL single-quoted string literals with empty strings so the
 * column splitter doesn't see commas inside COMMENT 'foo, bar' clauses.
 * Handles escaped quotes via doubling ('it''s').
 */
function stripStringLiterals(sql) {
  return sql.replace(/'(?:''|[^'])*'/g, "''");
}

/**
 * Extract { tableName -> [columnNames] } from CREATE TABLE statements.
 * Supports `CREATE TABLE [IF NOT EXISTS] name (...)`.
 *
 * Heuristic column extraction: each top-level `,` inside the paren block
 * starts a new definition; the first token (after optional backticks/quotes)
 * is the column name, UNLESS that token is a constraint keyword (PRIMARY,
 * FOREIGN, UNIQUE, KEY, INDEX, CONSTRAINT, CHECK).
 */
function parseTables(sql) {
  const clean = stripStringLiterals(stripComments(sql));
  const tables = {};
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s*\(/gi;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const name = m[1].toLowerCase();
    const start = re.lastIndex;
    // Find the matching closing paren (depth tracking).
    let depth = 1;
    let i = start;
    while (i < clean.length && depth > 0) {
      const ch = clean[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    const body = clean.slice(start, i - 1);

    // Split on top-level commas
    const parts = [];
    let buf = '';
    let d = 0;
    for (const ch of body) {
      if (ch === '(') d++;
      else if (ch === ')') d--;
      if (ch === ',' && d === 0) {
        parts.push(buf.trim());
        buf = '';
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) parts.push(buf.trim());

    const KEYWORDS = new Set([
      'primary', 'foreign', 'unique', 'key', 'index', 'constraint', 'check',
    ]);
    const cols = [];
    for (const p of parts) {
      const tok = p.match(/^["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?/);
      if (!tok) continue;
      const name = tok[1].toLowerCase();
      if (KEYWORDS.has(name)) continue;
      cols.push(name);
    }
    tables[name] = cols.sort();
  }
  return tables;
}

function diff(pg, my) {
  const issues = [];
  const pgTables = new Set(Object.keys(pg));
  const myTables = new Set(Object.keys(my));

  for (const t of pgTables) {
    if (!myTables.has(t)) issues.push(`Table "${t}" exists in Postgres but missing in MySQL`);
  }
  for (const t of myTables) {
    if (!pgTables.has(t)) issues.push(`Table "${t}" exists in MySQL but missing in Postgres`);
  }
  for (const t of pgTables) {
    if (!myTables.has(t)) continue;
    const pgCols = new Set(pg[t]);
    const myCols = new Set(my[t]);
    for (const c of pgCols) {
      if (!myCols.has(c)) issues.push(`Table "${t}" column "${c}" in Postgres but missing in MySQL`);
    }
    for (const c of myCols) {
      if (!pgCols.has(c)) issues.push(`Table "${t}" column "${c}" in MySQL but missing in Postgres`);
    }
  }
  return issues;
}

function main() {
  if (!fs.existsSync(PG_PATH)) {
    console.error(`[drift] missing Postgres migration: ${PG_PATH}`);
    process.exit(2);
  }
  if (!fs.existsSync(MY_PATH)) {
    console.error(`[drift] missing MySQL migration: ${MY_PATH}`);
    process.exit(2);
  }
  const pg = parseTables(fs.readFileSync(PG_PATH, 'utf8'));
  const my = parseTables(fs.readFileSync(MY_PATH, 'utf8'));

  console.log(`[drift] Postgres tables: ${Object.keys(pg).length} (${Object.keys(pg).join(', ')})`);
  console.log(`[drift] MySQL    tables: ${Object.keys(my).length} (${Object.keys(my).join(', ')})`);

  const issues = diff(pg, my);
  if (issues.length === 0) {
    console.log('[drift] OK — Postgres/MySQL schemas structurally aligned.');
    process.exit(0);
  }
  console.error(`[drift] DRIFT DETECTED — ${issues.length} issue(s):`);
  for (const i of issues) console.error('  - ' + i);
  process.exit(1);
}

main();
