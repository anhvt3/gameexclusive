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

See `tasks/todo_phase5.md` for full F sequence. F is BLOCKED until anh types
"UAT DONE" after E.3 sign-off.
