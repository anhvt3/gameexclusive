# Phase 5 — Runbook (anh-driven dashboard steps)

Steps below require the Vercel / Sentry / Amplitude / Clevai DNS dashboards.
Em can't perform them directly — anh executes, em validates afterward via the
smoke scripts at the bottom.

---

## D.0 — Vercel Preview deploy (UAT environment)

**Goal:** Get a stable Vercel Preview URL that points at the Postgres-backed
serverless functions, so sub-phase E can run UAT.

1. Open https://vercel.com/anhvt3/gameexclusive
2. **Settings → Environment Variables** — add (Preview scope):

   | Key | Value | Scope |
   |---|---|---|
   | `DB_DIALECT` | `pg` | Preview |
   | `POSTGRES_URL` | the Neon-backed connection string from `Storage → game-uat-db` | Preview |
   | `PHASE5_VALIDATION_SECRET` | `phase5-game-ss3-validation-secret-v1` | Preview |
   | `VITE_BACKEND_ENABLED` | `true` | Preview |
   | `VITE_PHASE5_VALIDATION_SECRET` | `phase5-game-ss3-validation-secret-v1` | Preview |
   | `VITE_API_BASE` | leave empty (same-origin) | Preview |
   | `AMPLITUDE_API_KEY` | server-side key | Preview |
   | `VITE_AMPLITUDE_API_KEY` | client-side key | Preview |
   | `SENTRY_DSN` | server DSN | Preview |
   | `VITE_SENTRY_DSN` | client DSN | Preview |

3. **Git → Connected Repository:** confirm `anhvt3/gameexclusive` is linked
   and that `main` is the production branch.
4. Trigger a preview build:
   - Push to a non-main branch, OR
   - In Vercel dashboard click `Deployments → Redeploy → Use existing Build Cache: No`
5. Wait for build to finish. Copy the Preview URL — looks like
   `https://gameexclusive-git-claude-phase5-anhvt3.vercel.app`.

**Validation gate:** anh shares the URL back, em runs `UAT_URL=<url> node scripts/uat_smoke.mjs`.

---

## D.3 — DNS `uat.game.clevai.edu.vn` → Vercel preview

**Goal:** Stable URL anh can give to internal testers without exposing the
Vercel-generated subdomain (which changes per branch).

1. Open Clevai's DNS provider (Cloudflare? Route53?) — login as DNS admin.
2. Create CNAME record:
   - Host: `uat.game`
   - Type: `CNAME`
   - Value: `cname.vercel-dns.com`
   - TTL: 300
3. In Vercel → Settings → Domains → Add `uat.game.clevai.edu.vn`
   - Assign to the preview branch `claude/phase5-vercel-mysql-6e685e`
   - Or assign to the production branch if anh wants UAT to follow `main`
4. Wait 5–10 min for DNS propagation.
5. Verify: `curl -I https://uat.game.clevai.edu.vn/api/health` → 200.

**Do NOT** point `game.clevai.edu.vn` (no `uat` prefix) at this preview —
prod domain stays parked until sub-phase F.

---

## D.4 — Smoke test on UAT URL (em runs after D.0/D.3 done)

```bash
UAT_URL=https://uat.game.clevai.edu.vn \
UAT_USER_ID=999001 \
  node scripts/uat_smoke.mjs
```

Pass criteria: 5/5 checks green. Em commit the run-log into
`Masterdata/.write_log.md`.

---

## D.5 — Drift-detection (CI)

Auto-runs on every push via `.github/workflows/ci.yml` job
`schema-drift`. Compares Postgres UAT migration vs MySQL canonical migration
on column-name structure (types intentionally diverge, see SQL headers).

Run locally:
```bash
node scripts/check_sql_drift.mjs
```

---

## E.0 — Manual UAT checklist (30–60 min, anh's session)

Anh opens `https://uat.game.clevai.edu.vn/?cu=999001` and walks the flows:

- [ ] Onboarding loads, no console errors in Network tab
- [ ] HP/MP bars render, position persists on reload
- [ ] Open Inventory → equip an item → reload → equipment persists
- [ ] Battle → win → battle stars increase server-side (check `/api/save/load`)
- [ ] Daily login claim → loot jar fills after 3 battles → claim works
- [ ] Shop → purchase one item → battle stars deducted server-side
- [ ] Breeding chamber → start session → reload page → session still there
- [ ] Open Network panel → verify `/api/save/sync` POSTs every ~2s during play
- [ ] Open Amplitude dashboard → see events flowing for `shop_purchase`
- [ ] Open Sentry → no errors in last 10 min
- [ ] Open another tab `?cu=999002` → confirm isolation (different save state)

---

## F.0+ — Clevai cutover (gated by anh's "UAT DONE" keyword)

F is BLOCKED until anh types **"UAT DONE"** after E.3 sign-off. Once unlocked,
the flow is:

### F.0 — Run MySQL canonical SQL on Clevai staging (DB Gate G2)

**Pre-validated by em**: `db_guard.py --check` PASSED (5/5 tables in scope, no
DELETE/DROP/TRUNCATE, INSERT/UPDATE/DDL only, audit trail wired).

```bash
# Em runs (after anh types "APPROVE DB EXEC STAGING"):
python Masterdata/scripts/db_guard.py --exec --confirm-commit \
  --sql-file Game_exclusive/.claude/worktrees/phase5-vercel-mysql-6e685e/Masterdata/migrations/2026-05-13-create-game-tables-mysql.sql \
  --tables game_players,game_telemetry_events,game_breeding_sessions,game_shop_validation_log,game_nonces \
  --user-request "Phase 5 F.0 — anh approved staging cutover" \
  --user-approved
```

Connection string: `CLEVAI_DB_*` env vars on `mysql.clevai.vn` staging
(`staging_s2_bp_log_v2`). Anh provides creds at cutover time.

Post-execution: em runs §A MySQL verification queries (the SELECTs at bottom
of canonical SQL file), reports R7 + R8 to anh.

### F.1 — Smoke-test backend against Clevai staging

1. Anh provides Clevai staging DB creds: `CLEVAI_DB_HOST`, `CLEVAI_DB_USER`,
   `CLEVAI_DB_PASS`, `CLEVAI_DB_NAME`
2. Em (or anh in Vercel dashboard) sets Vercel Preview env vars:
   - `DB_DIALECT=mysql` (was `pg`)
   - `CLEVAI_DB_HOST=mysql.clevai.vn`
   - `CLEVAI_DB_USER=game_backend_writer`
   - `CLEVAI_DB_PASS=<staging password>`
   - `CLEVAI_DB_NAME=staging_s2_bp_log_v2`
3. Em triggers Vercel redeploy (push to branch)
4. Em runs:
   ```bash
   UAT_URL=https://gameexclusive-git-claude-phase5-vercel-mysql-6e685e-anhvt3.vercel.app \
     node scripts/uat_smoke.mjs       # 5/5 must PASS
   UAT_URL=...same... \
     node scripts/uat_integration.mjs  # 7/7 must PASS
   ```
5. SELECT verify rows landed in Clevai `game_players`, `game_nonces`,
   `game_telemetry_events` (not Vercel Postgres anymore)
6. Anh signs off F.1

### F.2 — Anh's DBA runs MySQL canonical on Clevai PROD (Gate G3)

Em does NOT touch prod. DBA executes off-peak (~2am VN per Q5-7):

1. Em emails DBA the canonical SQL file + checklist (Lark/Slack)
2. DBA schedules window
3. DBA runs SQL on `clevai_prod`
4. DBA creates `game_backend_writer` user with §B GRANTs
5. DBA confirms back to anh; anh confirms to em; em logs audit

### F.3 — Switch Vercel Production env: prod MySQL

1. Vercel Settings → Environment Variables → Production scope only:
   - `DB_DIALECT=mysql`
   - `CLEVAI_DB_*` = prod creds
2. Vercel auto-deploys `main` → Production
3. `curl https://gameexclusive.vercel.app/api/health` → `{ ok: true, db: 'connected', dialect: 'mysql' }`

### F.4 — Cutover DNS (game.clevai.edu.vn)

1. Anh + Clevai infra: CNAME `game.clevai.edu.vn` → `cname.vercel-dns.com`
2. Vercel Settings → Domains → add `game.clevai.edu.vn`, assign to Production
3. Verify HTTPS + SSL chain valid
4. `curl https://game.clevai.edu.vn/api/health` → 200

### F.5 — Live UAT with real Clevai student

1. Anh logs in via real Clevai SSO → game.clevai.edu.vn
2. Plays 5–10 min: combat, shop, breed, login claim
3. Anh's DBA: `SELECT * FROM clevai_prod.game_players WHERE clevai_user_id = <anh's id>`
   → row present with current state
4. Amplitude dashboard: anh's events visible
5. Sentry: no errors in last 10 min on prod release tag

### F.6 — Phase 5 closure

1. AP §11.16 + §11.17 updated (anh authors)
2. ISP Phase 5 row marked DONE
3. `tasks/todo.md` Phase 5 roll-up entry
4. Final audit log in `Masterdata/.write_log.md`
5. Squash merge `claude/phase5-vercel-mysql-6e685e` → `main`
6. Cleanup worktree: `git worktree remove .claude/worktrees/phase5-vercel-mysql-6e685e`

### F.7 — UAT DB cleanup (optional)

Vercel Postgres UAT DB can stay (cost ≈ $0 on free tier) for Phase 6 dev
work, or anh can drop it via Storage → game-uat-db → Delete. SQL rollback
script lives in §C of `2026-05-13-create-game-tables-postgres.sql` if a
clean DROP is wanted before delete.
