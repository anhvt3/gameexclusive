# Phase 5 — 3-Environment Implementation Plan (~45 tasks)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship Phase 5 backend qua 3-environment workflow per POSUP override 13/05/2026:
1. **UAT** on Vercel Postgres (sub-phases A-E)
2. **Staging** on Clevai MySQL `staging_s2_bp_log_v2` (sub-phase F.0-F.1)
3. **Prod** on Clevai MySQL `clevai_prod` (sub-phase F.2-F.7, DBA-owned)

**Spec:** `docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md` (canonical — §12 documents 3-env workflow).

**Paired SQL files:**
- `Masterdata/migrations/2026-05-13-create-game-tables-postgres.sql` — UAT
- `Masterdata/migrations/2026-05-13-create-game-tables-mysql.sql` — staging + prod canonical

**Tech Stack:** Vercel Pro · Vercel Postgres (Neon) · Tailscale · node-pg + mysql2 · @amplitude/analytics-{browser,node} · @sentry/{react,node} · Vite 8 · React 19 · TS 5.6

**Working dir:** `D:\projectlocal\clevai\Game_exclusive\.claude\worktrees\phase5-vercel-mysql-6e685e`
**Branch:** `claude/phase5-vercel-mysql-6e685e` from `main@2444199`

**Sequencing:** Strictly sequential A→B→C→D→E→F. Anh approval gate giữa mỗi sub-phase.

---

## 🛑 Hard gates (4 keyword triggers)

| Gate | Trigger | Action required |
|---|---|---|
| **G1 UAT** | Before A.4 (write Vercel Postgres) | Anh types **"APPROVE DB EXEC UAT"** |
| **G2 Staging** | Before F.0 (write Clevai staging MySQL) | Anh types **"APPROVE DB EXEC STAGING"** |
| **G3 Prod** | Before F.2 (write Clevai prod MySQL) | Anh's DBA executes; em provides SQL only |
| **G4 UAT done** | Before sub-phase F (Vercel UAT → MySQL cutover) | Anh types **"UAT DONE"** after E.3 sign-off |

**Rule:** Em NEVER auto-executes DB writes. All 4 gates require explicit anh approval keyword.

---

## Sub-phase A — Foundation + Schema (UAT only) — 7 tasks

**Goal:** 5 `game_*` tables exist trên Vercel Postgres UAT DB. Drift-detection test green.

### Task A.0 — Preflight

- [ ] **Step 1:** Verify worktree state + Phase 4 baseline (1129 tests pass)
- [ ] **Step 2:** Commit Phase 5 spec + plan + 2 SQL files + db_guard.py patches:
  ```bash
  cd /d/projectlocal/clevai/Game_exclusive/.claude/worktrees/phase5-vercel-mysql-6e685e
  git add docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md \
          tasks/todo_phase5.md \
          Masterdata/migrations/2026-05-13-create-game-tables-postgres.sql \
          Masterdata/migrations/2026-05-13-create-game-tables-mysql.sql
  git commit -m "docs(phase-5): 3-env workflow + paired Postgres+MySQL SQL files"
  ```

### Task A.1 — Review paired SQL files (anh + em)

- [ ] **Step 1:** Em prints both SQL files in chat
- [ ] **Step 2:** Anh reviews:
  - Postgres syntax conversions correct? (BIGINT vs BIGINT UNSIGNED, JSONB vs JSON, CHECK constraints vs ENUM, etc.)
  - All 5 tables present in both files
  - JSON columns match SaveState v10 shape (12 JSON columns in `game_players`)
  - updated_at trigger logic correct in Postgres
- [ ] **Step 3:** Anh provides feedback or signals OK to proceed → A.2

### Task A.2 — Drift-detection test

- [ ] **Step 1:** Create `Masterdata/scripts/check_schema_parity.py`:
  - Parse both SQL files
  - Extract column names + canonical type per table
  - Map MySQL→canonical: `BIGINT UNSIGNED→BIGINT`, `JSON→JSONB`, `ENUM(...)→TEXT_CHECK`, `TIMESTAMP DEFAULT CURRENT_TIMESTAMP→TIMESTAMPTZ`, `AUTO_INCREMENT→IDENTITY`, `TINYINT(1)→BOOLEAN`, `TINYINT UNSIGNED→SMALLINT`
  - Compare normalized schemas; assert symmetric_diff == empty
  - Exit 1 if drift, else exit 0
- [ ] **Step 2:** Run test → should PASS (em wrote both files synchronized)
- [ ] **Step 3:** Commit

### Task A.3 — Vercel Postgres provision

- [ ] **Step 1:** Em provides anh step-by-step Vercel dashboard instructions:
  - Login Vercel → project `game-ss3-uat` → Storage tab → Create → Postgres → Free Hobby tier (256MB)
  - Region: nearest to VN (e.g., Singapore `sin1` if available, else Tokyo `hnd1` or San Francisco `sfo1`)
  - Database name: `game_ss3_uat`
  - Anh creates → Vercel auto-provisions `POSTGRES_URL` + sibling env vars
- [ ] **Step 2:** Anh shares Vercel project link với em → em verifies env vars accessible

### Task A.4 — Execute Postgres SQL on UAT DB

**⚠️ GATE G1: Requires anh's "APPROVE DB EXEC UAT" keyword.**

- [ ] **Step 1:** Anh types "APPROVE DB EXEC UAT"
- [ ] **Step 2:** Em writes `Masterdata/scripts/run_uat_migration.py`:
  - Connects via `psycopg[binary]` to `POSTGRES_URL` env var
  - Reads `Masterdata/migrations/2026-05-13-create-game-tables-postgres.sql`
  - Executes within transaction; rollback on error
  - Prints `\x1b[32m✅` status + tables created
- [ ] **Step 3:** Anh runs OR provides `POSTGRES_URL` để em chạy (whichever anh prefers — em recommend anh runs để confirm Vercel link works)
- [ ] **Step 4:** Audit log entry in `Masterdata/.write_log.md` (manual since db_guard.py is MySQL-only)

### Task A.5 — §A verification queries on UAT

- [ ] **Step 1:** Em runs (or anh runs) the 5 verification queries from Postgres SQL §A
- [ ] **Step 2:** Verify: 5 tables exist · all indexes present · 12 JSONB columns · sanity insert+rollback · updated_at trigger fires
- [ ] **Step 3:** Em reports results in chat

### Task A.6 — Audit log + commit

- [ ] **Step 1:** Append entry to `Masterdata/.write_log.md` with timestamp + SQL summary + rows affected
- [ ] **Step 2:** Commit audit log

**Sub-phase A done. ↳ B.**

---

## Sub-phase B — Backend functions (12 tasks)

**Goal:** 6 Vercel Functions deployed against UAT Postgres. Driver abstraction working.

| Task | Description |
|---|---|
| B.0 | `vercel.json` + `api/package.json` + env var `DB_DIALECT=postgres` |
| B.1 | `api/_lib/db.ts` — driver switch (pg vs mysql2) + connection pool |
| B.2 | `api/_lib/auth.ts` — HMAC verify (dialect-agnostic) |
| B.3 | `api/_lib/nonce.ts` — replay protection (parameterized for both dialects) |
| B.4 | `api/_lib/amplitude.ts` — server-side Amplitude SDK |
| B.5 | `api/health.ts` — GET endpoint |
| B.6 | `api/save/load.ts` — GET save state |
| B.7 | `api/save/sync.ts` — UPSERT (use `ON CONFLICT` for pg, `ON DUPLICATE KEY UPDATE` for mysql via helper) |
| B.8 | `api/shop/validate.ts` |
| B.9 | `api/breed/validate.ts` (start + rush actions) |
| B.10 | `api/telemetry.ts` (DB log + Amplitude forward) |
| B.11 | Local `vercel dev` smoke test against UAT Postgres |

Each task: TDD test → impl → commit. **Pre-commit hook ON.**

**Sub-phase B done. ↳ C.**

---

## Sub-phase C — Frontend rewire (8 tasks)

| Task | Description |
|---|---|
| C.0 | Install `@amplitude/analytics-browser` + update `.env.example` |
| C.1 | `main.tsx` Amplitude init + Sentry production tags |
| C.2 | `Telemetry.ts` server-proxy mode (`/api/telemetry`) |
| C.3 | `ServerValidator.ts` env-driven secret + production URL |
| C.4 | `vite.config.ts` mock middlewares dev-only gate |
| C.5 | `SaveSyncEngine.ts` NEW (debounce 2000ms per Q5-4) |
| C.6 | `SaveStateStore.setUserId` action + `?cu=<id>` URL query stub |
| C.7 | `AppRouter.tsx` mount SaveSyncEngine |

**Sub-phase C done. ↳ D.**

---

## Sub-phase D — CI/CD + UAT deploy (6 tasks)

| Task | Description |
|---|---|
| D.0 | Vercel Preview deploy (UAT environment) |
| D.1 | `.github/workflows/test.yml` |
| D.2 | `.github/workflows/deploy.yml` with Sentry release tracking |
| D.3 | DNS `uat.game.clevai.edu.vn` → Vercel preview (intermediate domain — không phải prod) |
| D.4 | Production smoke test on UAT URL |
| D.5 | Drift-detection test integrated in CI |

**Sub-phase D done. ↳ E.**

---

## Sub-phase E — UAT validation (4 tasks)

| Task | Description |
|---|---|
| E.0 | Manual UAT: anh test 30-60 min on Vercel preview URL |
| E.1 | Performance baseline: latency p50/p95 |
| E.2 | Telemetry forwarding verified in Amplitude dashboard |
| E.3 | Sub-phase A-E sign-off |

**⚠️ GATE G4: After E.3, anh types "UAT DONE" → unlock sub-phase F (Clevai cutover).**

---

## Sub-phase F — Staging + Prod cutover (8 tasks)

**Goal:** Migrate UAT-validated schema từ Vercel Postgres → Clevai staging MySQL → Clevai prod MySQL.

### Task F.0 — Run MySQL canonical SQL on Clevai staging

**⚠️ GATE G2: Requires anh's "APPROVE DB EXEC STAGING" keyword.**

- [ ] **Step 1:** Run `db_guard.py --check` on MySQL canonical (already proven PASS từ A.2 dry-run earlier; re-verify post-patches)
- [ ] **Step 2:** Anh types "APPROVE DB EXEC STAGING"
- [ ] **Step 3:** Em runs `db_guard.py --exec --confirm-commit --user-approved --plan-file=<spec>` on `mysql.clevai.vn` staging
- [ ] **Step 4:** Run §A MySQL verification queries
- [ ] **Step 5:** Audit log

### Task F.1 — Smoke test backend pointed at Clevai staging

- [ ] **Step 1:** Vercel env var update: `DB_DIALECT=mysql` + `CLEVAI_DB_*` (staging creds, anh provides)
- [ ] **Step 2:** Redeploy Vercel preview với new env
- [ ] **Step 3:** Hit all 6 endpoints; verify rows land trong Clevai staging tables
- [ ] **Step 4:** Anh signs off F.1

### Task F.2 — Anh's DBA runs MySQL canonical on Clevai PROD

**⚠️ GATE G3: Em does NOT run prod. DBA executes.**

- [ ] **Step 1:** Em finalizes SQL + checklist; provides to DBA via Lark/Slack
- [ ] **Step 2:** DBA schedules off-peak window (~2am VN per Q5-7)
- [ ] **Step 3:** DBA runs CREATE TABLE statements on `clevai_prod`
- [ ] **Step 4:** DBA creates `game_backend_writer` user with §B GRANTs
- [ ] **Step 5:** DBA confirms migration done; em records audit

### Task F.3 — Switch Vercel env: prod MySQL

- [ ] **Step 1:** Vercel env: `DB_DIALECT=mysql` + `CLEVAI_DB_*` set to prod creds (Vercel Production environment only)
- [ ] **Step 2:** Deploy `main` → Vercel Production
- [ ] **Step 3:** `/api/health` returns `{ ok: true, db: 'connected' }` against prod MySQL

### Task F.4 — Cutover DNS

- [ ] **Step 1:** Anh + Clevai infra: CNAME `game.clevai.edu.vn` → Vercel production target
- [ ] **Step 2:** Verify HTTPS + SSL valid
- [ ] **Step 3:** Smoke test live URL

### Task F.5 — Live UAT with real student

- [ ] **Step 1:** Anh logs in as test student → real Clevai SSO → game.clevai.edu.vn
- [ ] **Step 2:** Play 5-10 min: combat, shop, breed
- [ ] **Step 3:** Verify `SELECT * FROM clevai_prod.game_players WHERE clevai_user_id = <X>` shows expected rows
- [ ] **Step 4:** Verify telemetry events in `game_telemetry_events` + Amplitude dashboard
- [ ] **Step 5:** Verify Sentry receives errors with prod release tag

### Task F.6 — Phase 5 closure

- [ ] **Step 1:** AP §11.16 + §11.17 docs + ISP Phase 5 row + tasks/todo.md roll-up
- [ ] **Step 2:** Final audit log entry: Phase 5 closed, all 4 gates passed
- [ ] **Step 3:** Squash merge `claude/phase5-vercel-mysql-6e685e` → main
- [ ] **Step 4:** Cleanup worktree

### Task F.7 — UAT DB cleanup (optional)

- [ ] **Step 1:** Anh decides: keep Vercel Postgres UAT DB (Phase 6 staging environment) OR drop để recover free quota
- [ ] **Step 2:** If drop: run rollback script § C from postgres SQL file via Vercel dashboard

**Sub-phase F done. Phase 5 closed.**

---

## Total: 7 + 12 + 8 + 6 + 4 + 8 = **45 tasks**

## End of plan
