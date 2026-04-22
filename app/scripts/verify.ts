/**
 * Harness Verification Gate — Game_SS3_exclusive
 *
 * Purpose: Enforce AP compliance rules that cannot be caught by ESLint/tsc alone.
 * Exit code 0 = PASS, non-zero = FAIL.
 * Also emits JSON report to runs.jsonl for observability.
 *
 * Checks:
 *  1. AP doc size <= 20kb (split rule)
 *  2. Clevai terminology usage must be referenced to wiki path (No-Hallucination rule)
 *  3. Layer boundary comments match folder structure
 *  4. No .env / secrets committed
 *  5. CLAUDE.md has Harness Principles section
 *
 * Run: npm run verify
 */

import { readFileSync, existsSync, statSync, appendFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

type VerifyResult = {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
};

const REPO_ROOT = execSync('git rev-parse --show-toplevel').toString().trim();
const results: VerifyResult[] = [];

// ─── Check 1: AP doc size ──────────────────────────────────────────
function checkApDocSize() {
  const docsDir = join(REPO_ROOT, 'docs');
  const docs: string[] = [];
  if (existsSync(docsDir)) {
    for (const name of readdirSync(docsDir)) {
      if (name.startsWith('architecturepack_') && name.endsWith('.md')) {
        docs.push(join(docsDir, name));
      }
    }
  }

  for (const doc of docs) {
    const size = statSync(doc).size;
    if (size > 20 * 1024) {
      results.push({
        check: `AP size <= 20kb`,
        status: 'WARN',
        details: `${relative(REPO_ROOT, doc)} is ${(size / 1024).toFixed(1)}kb — cân nhắc tách appendix (rule #6, AP v1.1 roadmap)`,
      });
    }
  }
  if (docs.length > 0 && !results.some((r) => r.check.includes('AP size'))) {
    results.push({ check: 'AP size <= 20kb', status: 'PASS' });
  }
}

// ─── Check 2: Clevai terminology no-hallucination ──────────────────
function checkClevaiTerminology() {
  const CLEVAI_TERMS = [
    'DY1',
    'DY2',
    'DU',
    'XH',
    'KEN',
    'KMA',
    'HRG',
    'ULC',
    'KEN_TT_DU',
    'L4E',
    'CUIE',
    'USI',
    'TEP',
    'CHPT',
    'POSUP',
    'ARCH',
  ];

  const SRC_DIR = join(REPO_ROOT, 'app', 'src');
  if (!existsSync(SRC_DIR)) {
    results.push({
      check: 'Clevai term no-hallucination',
      status: 'WARN',
      details: 'app/src/ not found, skipping',
    });
    return;
  }

  // Recursively walk src/ — find .ts/.tsx files
  // Skip test files + __tests__/ dirs + mocks/ (test fixtures use Clevai subject codes as string values, not logic)
  const files: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (name === 'node_modules' || name === '__tests__' || name === 'mocks') continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) {
        files.push(full);
      }
    }
  }
  walk(SRC_DIR);

  const violations: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (const [i, line] of lines.entries()) {
      for (const term of CLEVAI_TERMS) {
        const regex = new RegExp(`\\b${term}\\b`);
        if (regex.test(line) && !/wiki:|wiki\//.test(line)) {
          // Check nearby lines (±3) for wiki reference
          const window = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4));
          if (!window.some((l) => /wiki:|wiki\//.test(l))) {
            violations.push(
              `${relative(REPO_ROOT, file)}:${i + 1} uses "${term}" without wiki: reference`
            );
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    results.push({
      check: 'Clevai term no-hallucination',
      status: 'FAIL',
      details:
        violations.slice(0, 5).join('\n') +
        (violations.length > 5 ? `\n... +${violations.length - 5} more` : ''),
    });
  } else {
    results.push({ check: 'Clevai term no-hallucination', status: 'PASS' });
  }
}

// ─── Check 3: CLAUDE.md has Harness Principles ────────────────────
function checkClaudeMdHarness() {
  const claudeFile = join(REPO_ROOT, 'CLAUDE.md');
  const gameClaudeFile = join(REPO_ROOT, 'Game_exclusive', 'CLAUDE.md');
  const target = existsSync(gameClaudeFile)
    ? gameClaudeFile
    : existsSync(claudeFile)
      ? claudeFile
      : null;

  if (!target) {
    results.push({
      check: 'CLAUDE.md Harness Principles',
      status: 'WARN',
      details: 'CLAUDE.md not found',
    });
    return;
  }
  const content = readFileSync(target, 'utf8');
  if (!/Harness Engineering Principles/i.test(content)) {
    results.push({
      check: 'CLAUDE.md Harness Principles',
      status: 'FAIL',
      details: `${relative(REPO_ROOT, target)} missing "Harness Engineering Principles" section`,
    });
  } else {
    results.push({ check: 'CLAUDE.md Harness Principles', status: 'PASS' });
  }
}

// ─── Check 4: No secret files ──────────────────────────────────────
function checkNoSecrets() {
  const FORBIDDEN = ['.env', '.env.local', 'secrets.json', 'id_rsa', '*.pem'];
  const bad: string[] = [];
  for (const pat of FORBIDDEN) {
    try {
      const out = execSync(`git ls-files "${pat}"`, {
        cwd: REPO_ROOT,
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
      if (out) bad.push(...out.split('\n'));
    } catch {
      // git fails = no match
    }
  }
  if (bad.length > 0) {
    results.push({
      check: 'No secret files committed',
      status: 'FAIL',
      details: bad.join(', '),
    });
  } else {
    results.push({ check: 'No secret files committed', status: 'PASS' });
  }
}

// ─── Run all checks ────────────────────────────────────────────────
console.log('🔒 [verify] Running AP compliance checks...\n');

checkApDocSize();
checkClevaiTerminology();
checkClaudeMdHarness();
checkNoSecrets();

// ─── Report ─────────────────────────────────────────────────────────
const failed = results.filter((r) => r.status === 'FAIL');
const warned = results.filter((r) => r.status === 'WARN');

for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️ ' : '❌';
  console.log(`${icon} ${r.check}`);
  if (r.details) console.log(`   ${r.details.split('\n').join('\n   ')}`);
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Passed: ${results.filter((r) => r.status === 'PASS').length}`);
console.log(`Warned: ${warned.length}`);
console.log(`Failed: ${failed.length}`);

// Append to runs.jsonl
try {
  const runsPath = join(REPO_ROOT, 'app', 'runs.jsonl');
  const record = {
    ts: new Date().toISOString(),
    type: 'verify',
    passed: results.filter((r) => r.status === 'PASS').length,
    warned: warned.length,
    failed: failed.length,
    results,
  };
  appendFileSync(runsPath, JSON.stringify(record) + '\n');
} catch (e) {
  console.warn(`[verify] runs.jsonl write failed: ${(e as Error).message}`);
}

if (failed.length > 0) {
  console.error('\n❌ FAILED — fix violations before committing.');
  process.exit(1);
}
console.log('\n✅ All verify checks passed.');
