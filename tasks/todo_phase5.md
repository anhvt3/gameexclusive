# Phase 5 — 30-Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship Vercel-hosted production frontend at `game.clevai.edu.vn` with serverless `/api/*` functions connecting Clevai MySQL via Tailscale tunnel; Amplitude + Sentry production wiring; debounce 2000ms save sync.

**Architecture:** Per `docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md`. 5 MySQL tables in `game_*` namespace, 11 serverless functions in `api/` dir, Tailscale tunnel for static egress IP, optimistic-concurrency save sync, server-proxy Amplitude.

**Tech Stack:** Vercel Pro · Tailscale · mysql2 · @amplitude/analytics-{browser,node} · @sentry/{react,node} · Vite 8 · React 19 · TS 5.6

**Working directory:** `D:\projectlocal\clevai\Game_exclusive\.claude\worktrees\phase5-vercel-mysql-6e685e`

**Branch:** `claude/phase5-vercel-mysql-6e685e` from `main@2444199`

**Sequencing:** Strictly sequential sub-phases A→B→C→D→E→F. Anh approval gate between each sub-phase. **Hard gate at A.3 + A.4: requires anh's "APPROVE SQL" keyword.**

---

## Hard gates summary

| Gate | Trigger | Action required |
|---|---|---|
| **G1** | Before A.3 (staging DB write) | Anh types "APPROVE SQL" → em runs `db_guard.py --exec --confirm-commit` on staging |
| **G2** | Before A.4 (prod DB write) | Anh's DBA executes migration directly; em provides post-execution verification queries |
| **G3** | Between sub-phases B → C | Anh reviews backend endpoint smoke tests, approves frontend rewire |
| **G4** | Before D.3 (DNS cutover) | Anh + Clevai infra team configure CNAME `game.clevai.edu.vn` → Vercel |
| **G5** | F.4 (live UAT) | Anh confirms real student session works end-to-end against production |

---

## Sub-phase A — Foundation + Schema (5 tasks, ~1 hour total)

**Goal:** 5 `game_*` tables exist on Clevai staging + prod. Service user `game_backend_writer` created.

### Task A.0 — Preflight

**Files:** None modified.

- [ ] **Step 1:** Verify worktree state (`git status --short`, `git log --oneline -3` should show Phase 5 spec + plan + SQL committed)
- [ ] **Step 2:** Install deps for client side: `cd app && npm install` if needed
- [ ] **Step 3:** Run baseline test suite: `npm run test:run` (expect 1129 pass)
- [ ] **Step 4:** Confirm `Masterdata/scripts/db_guard.py` accessible: `ls Masterdata/scripts/db_guard.py preflight_bash.py`
- [ ] **Step 5:** Commit Phase 5 spec + plan + SQL docs:
  ```bash
  git add docs/superpowers/specs/2026-05-13-phase-5-vercel-mysql-design.md \
          tasks/todo_phase5.md \
          Masterdata/migrations/2026-05-13-create-game-tables.sql
  git commit -m "docs(phase-5): spec + 30-step plan + SQL migration draft"
  ```

### Task A.1 — Review SQL migration draft

**Files:** `Masterdata/migrations/2026-05-13-create-game-tables.sql` (already drafted)

- [ ] **Step 1:** Em prints SQL trong chat (5 CREATE TABLE + §A verification + §B service user + §C rollback)
- [ ] **Step 2:** Anh + DBA review:
  - Column types correct? (BIGINT UNSIGNED for user_id, SMALLINT UNSIGNED for hp/level)
  - JSON columns match SaveState v10 shape from `app/src/persistence/SaveStateStore.ts`?
  - Indexes on right columns?
  - Engine + charset (InnoDB + utf8mb4)?
  - No accidental DROP/DELETE statements?
- [ ] **Step 3:** Anh provides feedback or types "APPROVE SQL" → unlock A.2
- [ ] **Step 4:** (If feedback) Em edits SQL file, re-prints, re-loops to Step 2

### Task A.2 — Dry-run on staging via `db_guard.py`

**⚠️ GATE G1: Requires anh's "APPROVE SQL" keyword before this task.**

**Files:** No file changes; runs SQL.

- [ ] **Step 1:** Verify staging connection: `python Masterdata/scripts/db_guard.py --check --sql "SELECT 1" --tables "" --user-request "Phase 5 preflight"` (connects to `mysql.clevai.vn`)
- [ ] **Step 2:** Run dry-run validate:
  ```bash
  python Masterdata/scripts/db_guard.py --check \
    --sql-file Masterdata/migrations/2026-05-13-create-game-tables.sql \
    --tables "game_players,game_telemetry_events,game_breeding_sessions,game_shop_validation_log,game_nonces" \
    --user-request "Phase 5 schema bootstrap — staging dry-run per spec 2026-05-13"
  ```
- [ ] **Step 3:** Confirm `--check` exits 0 + reports no R-rule violations
- [ ] **Step 4:** Em reports to anh: "Dry-run passes. Awaiting 'APPROVE SQL' to execute on staging."

### Task A.3 — Execute on STAGING

**⚠️ GATE G1 (continued): Requires anh's explicit "APPROVE SQL" keyword.**

**Files:** No file changes; writes staging DB.

- [ ] **Step 1:** Anh types "APPROVE SQL" → em proceeds
- [ ] **Step 2:** Execute on staging:
  ```bash
  python Masterdata/scripts/db_guard.py --exec --confirm-commit \
    --sql-file Masterdata/migrations/2026-05-13-create-game-tables.sql \
    --tables "game_players,game_telemetry_events,game_breeding_sessions,game_shop_validation_log,game_nonces" \
    --user-request "Phase 5 schema bootstrap — staging APPROVE SQL 13/05/2026"
  ```
- [ ] **Step 3:** Verify 5 tables exist on staging via §A verification queries from SQL file
- [ ] **Step 4:** Audit log entry auto-appended to `Masterdata/.write_log.md` (R5 enforced by `db_guard.py`)
- [ ] **Step 5:** Em reports to anh: tables list + sample SELECT output (R7 post-write report)
- [ ] **Step 6:** Em provides self-verify SELECT queries (R8) for anh to run independently
- [ ] **Step 7:** Anh confirms staging looks correct → unlock A.4

### Task A.4 — Production migration (anh's DBA executes)

**⚠️ GATE G2: Em does NOT run on prod. Anh's DBA executes.**

**Files:** No file changes by em.

- [ ] **Step 1:** Em provides finalized SQL file + execution checklist to anh's DBA via Slack/Lark
- [ ] **Step 2:** Anh's DBA schedules off-peak window (~2am VN time per Q5-7)
- [ ] **Step 3:** Anh's DBA runs the 5 CREATE TABLE statements on `clevai_prod`
- [ ] **Step 4:** Anh's DBA creates `game_backend_writer` user with §B GRANTs (using long random password)
- [ ] **Step 5:** Anh's DBA stores service user credentials in Vercel env vars: `CLEVAI_DB_HOST`, `CLEVAI_DB_PORT`, `CLEVAI_DB_USER=game_backend_writer`, `CLEVAI_DB_PASS=<password>`, `CLEVAI_DB_NAME=clevai_prod`
- [ ] **Step 6:** Anh's DBA confirms migration complete; em records prod completion in audit log
- [ ] **Step 7:** Em + anh re-run verification queries via service user account to confirm SELECT works
- [ ] **Step 8:** Commit A.x audit + status updates to `Masterdata/.write_log.md`:
  ```bash
  git add Masterdata/.write_log.md
  git commit -m "audit(phase-5): A.3 staging migration + A.4 prod confirmed by DBA"
  ```

**Sub-phase A done. Wait anh approval to proceed sub-phase B.**

---

## Sub-phase B — Backend functions (11 tasks, ~2-3 hours total)

**Goal:** 6 Vercel Functions deployed against staging DB. Local `vercel dev` smoke green.

### Task B.0 — Vercel project setup + env vars

**Files:** Create `vercel.json`, `api/package.json`, `api/tsconfig.json`.

- [ ] **Step 1:** Install Vercel CLI: `npm i -g vercel@latest`
- [ ] **Step 2:** Anh `vercel login` (em can't auth from agent)
- [ ] **Step 3:** `vercel link --project=game-ss3-prod` (em can run with anh's session)
- [ ] **Step 4:** Create `vercel.json` with build config + function runtime + region pin (Singapore preferred)
- [ ] **Step 5:** Create `api/package.json` with backend deps (mysql2, @amplitude/analytics-node, @sentry/node)
- [ ] **Step 6:** Configure Vercel env vars via CLI or dashboard: CLEVAI_DB_*, PHASE5_VALIDATION_SECRET, AMPLITUDE_API_KEY, SENTRY_DSN
- [ ] **Step 7:** Commit `feat(phase-5): Vercel project config + api/ package`

### Task B.1 — api/_lib/db.ts (MySQL pool)

**Files:** Create `api/_lib/db.ts` + test.

- [ ] **Step 1:** Test: pool created lazily, reused across handler invocations, 10s connect timeout
- [ ] **Step 2:** RED: tests fail (module missing)
- [ ] **Step 3:** Implement: `mysql2/promise` `createPool({ connectionLimit: 1, connectTimeout: 10_000 })`. Singleton pattern (module-level let cachedPool).
- [ ] **Step 4:** GREEN
- [ ] **Step 5:** Commit `feat(phase-5): api/_lib/db.ts MySQL pool singleton`

### Task B.2 — api/_lib/auth.ts (HMAC verify)

**Files:** Create `api/_lib/auth.ts` + test.

- [ ] **Step 1:** Tests: verify accepts correct HMAC, rejects mismatch + missing headers + bad nonce format
- [ ] **Step 2:** Implement: derive key from `PHASE5_VALIDATION_SECRET` env var (Node crypto.subtle), `verifyHex(data, hmacHex, key)`
- [ ] **Step 3:** Commit `feat(phase-5): api/_lib/auth.ts HMAC verify (Node-side)`

### Task B.3 — api/_lib/nonce.ts (replay protection)

**Files:** Create `api/_lib/nonce.ts` + test.

- [ ] **Step 1:** Tests: `checkAndInsertNonce(userId, nonce, endpoint)` returns true if new, false if duplicate; uses INSERT IGNORE for atomicity
- [ ] **Step 2:** Implement: SQL `INSERT IGNORE INTO game_nonces (clevai_user_id, client_nonce, endpoint) VALUES (?, ?, ?)` → check affectedRows
- [ ] **Step 3:** Commit `feat(phase-5): api/_lib/nonce.ts replay protection`

### Task B.4 — api/health.ts (health endpoint)

**Files:** Create `api/health.ts` + integration test.

- [ ] **Step 1:** Test: GET returns `{ ok: true, version, db: 'connected'|'disconnected' }`
- [ ] **Step 2:** Implement: try `SELECT 1`, return ok=true/false based on result
- [ ] **Step 3:** Smoke test via `vercel dev` then `curl http://localhost:3000/api/health`
- [ ] **Step 4:** Commit `feat(phase-5): api/health.ts endpoint`

### Task B.5 — api/save/load.ts

**Files:** Create `api/save/load.ts` + test.

- [ ] **Step 1:** Tests: GET with valid `clevai_user_id` returns SaveState v10 JSON; missing user returns 404; invalid HMAC returns 401
- [ ] **Step 2:** Implement: `SELECT * FROM game_players WHERE clevai_user_id = ?`, transform row → SaveStateData shape
- [ ] **Step 3:** Commit `feat(phase-5): api/save/load.ts GET endpoint`

### Task B.6 — api/save/sync.ts

**Files:** Create `api/save/sync.ts` + test.

- [ ] **Step 1:** Tests: POST with valid HMAC + new state → INSERT new row OR UPDATE existing (UPSERT); returns `server_updated_at`. Optimistic concurrency: reject if client's `last_known_updated_at` < server's
- [ ] **Step 2:** Implement: `INSERT INTO game_players (...) VALUES (...) ON DUPLICATE KEY UPDATE ...` atomic
- [ ] **Step 3:** Commit `feat(phase-5): api/save/sync.ts UPSERT endpoint`

### Task B.7 — api/shop/validate.ts

**Files:** Create `api/shop/validate.ts` + test.

- [ ] **Step 1:** Tests: happy path INSERT log row + return ok; insufficient stars rejects + logs rejection
- [ ] **Step 2:** Implement: SELECT `battle_stars` from `game_players`, compare to `priceCharged`, INSERT into `game_shop_validation_log`
- [ ] **Step 3:** Commit `feat(phase-5): api/shop/validate.ts server-side validation`

### Task B.8 — api/breed/validate.ts (start + rush)

**Files:** Create `api/breed/validate.ts` + test.

- [ ] **Step 1:** Tests: action='start' inserts session with hatch_at; action='rush' updates if rushed_at IS NULL else rejects
- [ ] **Step 2:** Implement: switch on `action` field; INSERT or UPDATE `game_breeding_sessions`
- [ ] **Step 3:** Commit `feat(phase-5): api/breed/validate.ts (start + rush actions)`

### Task B.9 — api/telemetry.ts (DB log + Amplitude forward)

**Files:** Create `api/telemetry.ts` + `api/_lib/amplitude.ts` + tests.

- [ ] **Step 1:** Tests: POST inserts row into `game_telemetry_events`; Amplitude SDK called with user_id + event payload; `forwarded_to_amplitude` flips to 1 on success
- [ ] **Step 2:** Implement Amplitude Node SDK init in `_lib/amplitude.ts` (lazy singleton). INSERT then `amplitude.track()` then UPDATE forwarded flag
- [ ] **Step 3:** Commit `feat(phase-5): api/telemetry.ts + _lib/amplitude.ts`

### Task B.10 — Local `vercel dev` smoke test

**Files:** No file changes; manual test.

- [ ] **Step 1:** `vercel dev` in repo root → starts local Vercel dev server on port 3000
- [ ] **Step 2:** Smoke each endpoint with curl: `/api/health`, `/api/save/load`, `/api/save/sync`, `/api/shop/validate`, `/api/breed/validate`, `/api/telemetry`
- [ ] **Step 3:** Verify staging DB rows inserted (SELECT from game_telemetry_events should show test rows)
- [ ] **Step 4:** Em reports backend complete to anh → GATE G3 (anh approve before sub-phase C)

**Sub-phase B done. Wait anh approval.**

---

## Sub-phase C — Frontend rewire (8 tasks, ~2 hours total)

**Goal:** Frontend wired to Vercel backend. Amplitude client SDK loaded. Sentry production tags. SaveSyncEngine 2000ms debounce.

### Task C.0 — Install Amplitude SDK + update .env.example

**Files:** `app/package.json`, `app/.env.example`.

- [ ] **Step 1:** `cd app && npm install @amplitude/analytics-browser`
- [ ] **Step 2:** Add to `.env.example`:
  ```
  VITE_AMPLITUDE_API_KEY=<from Amplitude dashboard>
  VITE_SENTRY_DSN=<from Sentry project>
  VITE_PHASE5_VALIDATION_SECRET=phase5-game-ss3-validation-secret-v1
  VITE_API_BASE=http://localhost:3000  # dev; production: https://game.clevai.edu.vn
  VITE_BACKEND_ENABLED=true             # set false for Phase 4 fallback mode
  ```
- [ ] **Step 3:** Commit `feat(phase-5): install @amplitude/analytics-browser + env vars`

### Task C.1 — main.tsx Amplitude + Sentry production init

**Files:** `app/src/main.tsx`.

- [ ] **Step 1:** Add `amplitude.init(import.meta.env.VITE_AMPLITUDE_API_KEY)` call (lazy-load via dynamic import to avoid blocking first paint)
- [ ] **Step 2:** Update Sentry init: `release: import.meta.env.VITE_SENTRY_RELEASE`, sample rate 10% errors
- [ ] **Step 3:** Commit `feat(phase-5): main.tsx Amplitude init + Sentry prod tags`

### Task C.2 — Telemetry.ts server-proxy mode

**Files:** `app/src/observability/Telemetry.ts` + test.

- [ ] **Step 1:** Test: track() calls fetch `${VITE_API_BASE}/api/telemetry` (not `/api/telemetry` literal)
- [ ] **Step 2:** Implement: use `import.meta.env.VITE_API_BASE` + `VITE_PHASE5_VALIDATION_SECRET` for HMAC sign
- [ ] **Step 3:** Commit `feat(phase-5): Telemetry.ts server-proxy + env-driven base URL`

### Task C.3 — ServerValidator.ts env rotation

**Files:** `app/src/domain/ServerValidator.ts` + test.

- [ ] **Step 1:** Test: `PHASE5_VALIDATION_SECRET` env var read instead of hardcoded literal
- [ ] **Step 2:** Implement: replace `'phase3-game-ss3-validation-secret-v1'` literal with `import.meta.env.VITE_PHASE5_VALIDATION_SECRET`; concat with `VITE_API_BASE` for endpoint URLs
- [ ] **Step 3:** Commit `feat(phase-5): ServerValidator env-driven secret + endpoint`

### Task C.4 — vite.config.ts dev-only mock middlewares gate

**Files:** `app/vite.config.ts`.

- [ ] **Step 1:** Wrap shop/breed/telemetry middleware registration in `if (mode === 'development')` block
- [ ] **Step 2:** Verify `vite build` produces production bundle without mock middlewares
- [ ] **Step 3:** Commit `feat(phase-5): mock middlewares dev-only gate`

### Task C.5 — SaveSyncEngine (debounce 2000ms per Q5-4)

**Files:** Create `app/src/persistence/SaveSyncEngine.ts` + test.

- [ ] **Step 1:** Tests:
  - Multiple state changes within 2s coalesce into single POST
  - POST body matches SaveState v10 shape + HMAC
  - 401 response triggers Sentry alert
  - Network error → soft-fail, retry on next change
  - `VITE_BACKEND_ENABLED=false` → no POST fires
- [ ] **Step 2:** Implement: subscribe to `useSaveState`, debounce 2000ms, POST `/api/save/sync`, store `server_updated_at` for optimistic concurrency
- [ ] **Step 3:** Commit `feat(phase-5): SaveSyncEngine (debounce 2000ms — Q5-4 override)`

### Task C.6 — SaveStateStore setUserId action

**Files:** `app/src/persistence/SaveStateStore.ts` + test.

- [ ] **Step 1:** Test: `setUserId(clevaiUserId)` action sets state.clevaiUserId field
- [ ] **Step 2:** Implement: new field `clevaiUserId: number | null` (default null), action `setUserId(id) => set({ clevaiUserId: id })`
- [ ] **Step 3:** Wire: read `?cu=<id>` URL query in `main.tsx`, call `setUserId(parsed)`
- [ ] **Step 4:** Commit `feat(phase-5): setUserId action + URL query stub auth`

### Task C.7 — AppRouter mount SaveSyncEngine

**Files:** `app/src/react/shell/AppRouter.tsx`.

- [ ] **Step 1:** Add `saveSyncEngineRef` + `useEffect` mounting `SaveSyncEngine.start()` after `persist.hasHydrated()`
- [ ] **Step 2:** Verify cleanup on unmount
- [ ] **Step 3:** Commit `feat(phase-5): AppRouter mount SaveSyncEngine lifecycle`

**Sub-phase C done. Wait anh approval.**

---

## Sub-phase D — CI/CD + Deploy (5 tasks, ~1-2 hours total)

**Goal:** Vercel deploy pipeline live. `game.clevai.edu.vn` resolves.

### Task D.0 — Initial Vercel Preview deploy

**Files:** No file changes; CLI command.

- [ ] **Step 1:** `vercel --prod=false` deploys preview build to `<random>.vercel.app` URL
- [ ] **Step 2:** Smoke test preview URL: open in browser, verify game loads, telemetry POSTs visible in Network tab
- [ ] **Step 3:** Commit any final adjustments

### Task D.1 — .github/workflows/test.yml

**Files:** Create `.github/workflows/test.yml`.

- [ ] **Step 1:** Workflow: lint + typecheck + verify + unit + E2E on every push + PR
- [ ] **Step 2:** Test workflow by pushing to feature branch
- [ ] **Step 3:** Commit `ci(phase-5): test.yml pre-merge gate`

### Task D.2 — .github/workflows/deploy.yml

**Files:** Create `.github/workflows/deploy.yml`.

- [ ] **Step 1:** Workflow: trigger on push to `main`. Build → Vercel CLI deploy. Inject `SENTRY_RELEASE=$GITHUB_SHA`.
- [ ] **Step 2:** Add Vercel token to GitHub secrets
- [ ] **Step 3:** Commit `ci(phase-5): deploy.yml main → Vercel prod`

### Task D.3 — DNS cutover game.clevai.edu.vn (anh + Clevai infra)

**⚠️ GATE G4: Em doesn't have DNS access. Anh + Clevai infra execute.**

- [ ] **Step 1:** Em provides Vercel DNS target (e.g. `cname.vercel-dns.com`) to anh
- [ ] **Step 2:** Anh + Clevai infra add CNAME `game.clevai.edu.vn → cname.vercel-dns.com`
- [ ] **Step 3:** Anh confirms DNS propagation (~5-30 min): `nslookup game.clevai.edu.vn` resolves
- [ ] **Step 4:** Vercel auto-provisions SSL cert; em verifies `https://game.clevai.edu.vn` loads

### Task D.4 — Production smoke test

**Files:** No file changes.

- [ ] **Step 1:** `curl https://game.clevai.edu.vn/api/health` → expect 200 with `db: connected`
- [ ] **Step 2:** Open game.clevai.edu.vn in browser. Verify Phase 4 features work. Check Sentry receives errors (force a test error if needed)
- [ ] **Step 3:** Verify Amplitude dashboard receives test events
- [ ] **Step 4:** Commit any post-deploy fixes

**Sub-phase D done. Wait anh approval.**

---

## Sub-phase E — Migration + Backfill (3 tasks, ~1 hour total)

### Task E.0 — Nonce TTL cleanup cron

**Files:** Create `Masterdata/scripts/game_nonces_cleanup.py`.

- [ ] **Step 1:** Script DELETEs from `game_nonces WHERE used_at < NOW() - INTERVAL 7 DAY`
- [ ] **Step 2:** Test on staging
- [ ] **Step 3:** Anh's DBA schedules nightly cron
- [ ] **Step 4:** Commit `feat(phase-5): nonces TTL cron script`

### Task E.1 — localStorage → server backfill (lazy)

**Files:** No new code; tested via E2E.

- [ ] **Step 1:** Verify: first POST `/api/save/sync` from client with new `clevai_user_id` triggers UPSERT INSERT (because no existing row)
- [ ] **Step 2:** Existing localStorage v10 data automatically syncs to MySQL on first state change
- [ ] **Step 3:** No batch migration needed

### Task E.2 — Sentry release tracking

**Files:** `.github/workflows/deploy.yml`.

- [ ] **Step 1:** Add Sentry CLI step: `sentry-cli releases new $VERCEL_GIT_COMMIT_SHA`
- [ ] **Step 2:** Upload sourcemaps for symbolication
- [ ] **Step 3:** Commit `ci(phase-5): Sentry release tracking via deploy.yml`

**Sub-phase E done.**

---

## Sub-phase F — Verification + docs (6 tasks, ~1-2 hours total)

### Task F.0 — E2E phase_5_backend.spec.ts

**Files:** Create `app/tests/e2e/phase_5_backend.spec.ts`.

- [ ] **Step 1:** Spec: load `?cu=999999` → game initializes → modify state → wait 3s for debounce → reload page → state persists from server
- [ ] **Step 2:** Run against Vercel preview URL (CI matrix)
- [ ] **Step 3:** Commit `test(phase-5): E2E backend integration`

### Task F.1 — gameTestBridge backend URL helper

**Files:** `app/src/testing/gameTestBridge.ts`.

- [ ] **Step 1:** Add `setBackendUrl(url)` helper to simulate object
- [ ] **Step 2:** E2E uses to switch to staging API URL
- [ ] **Step 3:** Commit `test(phase-5): test bridge setBackendUrl helper`

### Task F.2 — AP §11.16 + §11.17 NEW

**Files:** `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`.

- [ ] **Step 1:** Append §11.16 (Backend deploy seam) — Vercel + Tailscale + 11 functions + rollback flag
- [ ] **Step 2:** Append §11.17 (MySQL schema reference) — 5 tables + service user GRANTs + retention
- [ ] **Step 3:** Commit `docs(phase-5): AP §11.16 backend + §11.17 MySQL schema`

### Task F.3 — ISP Phase 5 row + todo.md roll-up

**Files:** `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`, `tasks/todo.md`.

- [ ] **Step 1:** Append Phase 5 row table (30 tasks status)
- [ ] **Step 2:** Update tasks/todo.md header: Phase 5 ✅ production-live + insert P5 row in sprints table
- [ ] **Step 3:** Commit `docs(phase-5): ISP Phase 5 row + todo.md roll-up`

### Task F.4 — Live UAT with real student session

**⚠️ GATE G5: Anh confirms real student session works end-to-end.**

- [ ] **Step 1:** Anh logs in as test student (clevai_user_id = X) via real Clevai SSO → redirect to game.clevai.edu.vn
- [ ] **Step 2:** Play 5 minutes: combat, shop, breeding
- [ ] **Step 3:** Verify `SELECT * FROM game_players WHERE clevai_user_id = X` shows updated rows
- [ ] **Step 4:** Verify `SELECT * FROM game_telemetry_events WHERE clevai_user_id = X ORDER BY event_ts DESC LIMIT 10` shows recent events
- [ ] **Step 5:** Verify Sentry dashboard receives any errors
- [ ] **Step 6:** Verify Amplitude dashboard shows session

### Task F.5 — Phase 5 closure

**Files:** `Masterdata/.write_log.md`.

- [ ] **Step 1:** Final audit entry: Phase 5 closed, prod migration completed, 30 tasks ✅
- [ ] **Step 2:** Em reports completion stats to anh: # rows in each table, Sentry events, Amplitude events, Vercel invocations
- [ ] **Step 3:** Commit `audit(phase-5): closure log`
- [ ] **Step 4:** Squash merge to main per Phase 4 pattern (anh decides timing)

**Sub-phase F done. Phase 5 closed. Ready for Phase 6 brainstorm.**

---

## End of plan

**Total: 30 tasks across 6 sub-phases.**

**Hard gates:** G1 (APPROVE SQL → A.3), G2 (anh DBA → A.4), G3 (B done → C), G4 (DNS cutover → D.3), G5 (live UAT → F.4).

**Sequential discipline:** Em does NOT proceed to next sub-phase without anh's explicit approval.

**SQL execution rule:** Em NEVER auto-executes SQL on staging or prod. Anh's "APPROVE SQL" keyword is the only trigger for A.3 staging dry-run. Anh's DBA owns A.4 prod migration.

**Rollback:** `VITE_BACKEND_ENABLED=false` flag at any time falls back to Phase 4 local-only behavior.
