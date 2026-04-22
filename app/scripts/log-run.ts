/**
 * Run Logger — Game_SS3_exclusive
 *
 * Append structured run record to runs.jsonl for observability.
 * Usage: tsx scripts/log-run.ts <type> <status> [duration_ms] [metadata_json]
 * Example: tsx scripts/log-run.ts test:run pass 1234
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const [, , type = 'unknown', status = 'unknown', durationMs, metadataJson] = process.argv;

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const runsPath = join(REPO_ROOT, 'app', 'runs.jsonl');

if (!existsSync(dirname(runsPath))) {
  mkdirSync(dirname(runsPath), { recursive: true });
}

const record = {
  ts: new Date().toISOString(),
  type,
  status,
  duration_ms: durationMs ? parseInt(durationMs, 10) : null,
  commit: (() => {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim();
    } catch {
      return null;
    }
  })(),
  branch: (() => {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch {
      return null;
    }
  })(),
  metadata: metadataJson ? JSON.parse(metadataJson) : null,
};

appendFileSync(runsPath, JSON.stringify(record) + '\n');
console.log(`📝 [log-run] ${type}/${status} logged to runs.jsonl`);
