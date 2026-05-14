# Phase 5 — Vercel + Clevai MySQL Prod — Design Spec

**Phase:** 5 (post-Phase 4 LiveOps)
**Type:** C (Production infra + DB schema change + cross-cutting backend) — POSUP + ARCH + DBA approval required
**Author:** Claude (`claude/phase5-vercel-mysql-6e685e`)
**Status:** Draft → đợi anh review (13/05/2026)
**Base:** `main` at `2444199` (Phase 4 merged)
**Plan doc:** `tasks/todo_phase5.md` (30-task implementation plan)
**Sibling doc:** `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` (Phase 4 deploy design — superseded by this spec for Q-deploy answers)

---

## 1. Why this phase

Phase 1-4 đã ship full client-side gameplay loop (combat → quiz → shop → breeding → daily rewards → telemetry mock). Anh quyết định bring Phase 5 lên production cho students Clevai access qua `game.clevai.edu.vn`:

- **Persistent saves** (localStorage → Clevai MySQL): cho phép cross-device sync, anti-tamper, server-side authority
- **Real anti-cheat**: HMAC + nonce stored server-side, shop/breeding actions validated against DB state (battleStars, stock, breedingChamber)
- **Production telemetry**: Amplitude SDK forward events for retention/conversion analytics
- **Production error tracking**: Sentry tags + release tracking
- **Stable URL**: `game.clevai.edu.vn` (Vercel-hosted, free Vercel SSL)

POSUP-approved decisions (13/05/2026, batch answer):

| Q | Decision |
|---|---|
| Q-deploy-1 | **Vercel** (UAT priority over Cloudflare) |
| Q-deploy-2 | **Amplitude** (10M MTU free, key events only) |
| Q-deploy-3 | **Vercel Serverless Functions → Clevai MySQL Production DB** (internal, NOT Cloudflare D1/KV) |
| Q-deploy-4 | **Sentry free tier** (5K errors/month) |
| Q-deploy-5 | **`game.clevai.edu.vn`** domain |
| Q5-1 Vercel plan | **Pro $20/mo** — required cho static egress IP (whitelist MySQL firewall) |
| Q5-2 MySQL network | **Tailscale tunnel** — Vercel function → Tailscale exit node ở Clevai DC → MySQL; zero firewall config, audit-friendly |
| Q5-3 MySQL driver | **mysql2 pool size 1** + 10s timeout per cold start; Phase 6 evaluate RDS Proxy if pool exhaustion |
| Q5-4 Save sync | **Debounce 2000ms** (NOT 300ms) — balance UX with Vercel invocation cost + MySQL pool pressure |
| Q5-5 Amplitude placement | **Server-side proxy** via `/api/telemetry` → forwards to Amplitude Node SDK; client never sees AMPLITUDE_API_KEY |
| Q5-6 Auth flow | Phase 5 stub: `?cu=<id>` URL query for UAT. Real SSO/JWT integration defer Phase 6 |
| Q5-7 Migration window | Off-peak ~2am VN time; 5 CREATE TABLE statements (<1 sec, no lock) |
| Q5-8 Rollback | `VITE_BACKEND_ENABLED=false` flag → behaves like Phase 4 (local-only + mock middlewares) |
| Sequencing | **Strictly sequential sub-phases A→B→C→D→E→F** với anh approval gate giữa mỗi sub-phase |

---

## 2. Goals

- Provision 5 `game_*` tables trong Clevai MySQL prod DB qua R6 plan-approve-write gate (anh's DBA executes; AI agent provides SQL + staging dry-run only).
- Ship 11 Vercel Serverless Functions (`api/save/*`, `api/shop/validate`, `api/breed/validate`, `api/telemetry`, `api/health`) connecting MySQL via Tailscale tunnel.
- Wire frontend SDKs: Amplitude (server-proxy mode) + Sentry production tags + release tracking.
- Add `SaveSyncEngine` observer: debounce 2000ms client state change → POST `/api/save/sync`.
- Replace 4 Phase 3/4 Vite mock middlewares với production Vercel Functions.
- Domain `game.clevai.edu.vn` live; CI/CD pipeline auto-deploys `main` → Vercel Production.
- `VITE_BACKEND_ENABLED` rollback flag → Phase 4 fallback mode.
- AP §11.16 NEW (Backend deploy seam) + §11.17 NEW (MySQL schema reference) documented.

---

## 3. Non-goals

- **Real SSO** — Phase 5 stub `?cu=<id>` only (Q5-6). Phase 6 wires Clevai SSO.
- **Multi-tab save sync conflict resolution** — Phase 5 uses optimistic concurrency via `updated_at` timestamp; full CRDT defer Phase 7+.
- **Sprint F event retro-fit** (login_claim, loot_jar_claim, battle_stars_earned to Amplitude) — Q9 default deferred from Phase 4.
- **Multi-slot breeding chamber** — Phase 4 single-slot; Phase 6.
- **Real-time multiplayer / leaderboard** — out of scope.
- **MongoDB / Redis** for telemetry — local MySQL table is source of truth; Amplitude is replica.
- **Migration of existing localStorage saves** — backfill happens lazily on first `/api/save/sync` from client; no batch migration script needed.
- **Cache layer** in front of MySQL — Phase 6 evaluate Redis if read latency from VN students > 200ms.
- **CI/CD on Cloudflare Pages** — Vercel only.
- **PII handling enhancements** — internal Clevai deploy treats `clevai_user_id` as PII proxy; no further anonymization Phase 5.

---

## 4. Architecture overview

### 4.1 Component diagram

```
┌─────────────────────────────────────────────────────────┐
│  game.clevai.edu.vn                                     │
│  (Vercel Production CDN, Static SPA — Phase 1+4 build)  │
│                                                          │
│  React + Phaser game.                                    │
│  Telemetry SDK → POST /api/telemetry                     │
│  SaveSyncEngine → POST /api/save/sync (debounce 2s)      │
│  Shop/Breed validate → POST /api/{shop,breed}/validate   │
│  Sentry SDK → Sentry.io                                  │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel Serverless Functions (Pro plan, us-east-1)      │
│  Region: hopefully Singapore (lambda@edge config)        │
│                                                          │
│  api/save/{sync,load}.ts                                 │
│  api/shop/validate.ts                                    │
│  api/breed/validate.ts                                   │
│  api/telemetry.ts → Amplitude Node SDK → Amplitude       │
│  api/health.ts                                           │
│                                                          │
│  _lib/{db,auth,nonce,sentry,amplitude}.ts                │
└──────────────┬──────────────────────────────────────────┘
               │ MySQL protocol via Tailscale Funnel
               ▼ (egress IP = Tailscale node ở Clevai DC)
┌─────────────────────────────────────────────────────────┐
│  Tailscale exit node ở Clevai DC                        │
│  (Single static egress IP — whitelist trên MySQL FW)    │
└──────────────┬──────────────────────────────────────────┘
               │ MySQL internal protocol
               ▼
┌─────────────────────────────────────────────────────────┐
│  Clevai MySQL Production DB (internal)                  │
│  Database: clevai_prod                                  │
│                                                          │
│  game_players                  (1 row / student)         │
│  game_telemetry_events         (append-only log)         │
│  game_breeding_sessions        (anti-cheat state)        │
│  game_shop_validation_log      (audit trail)             │
│  game_nonces                   (replay protection)       │
│                                                          │
│  Service user: game_backend_writer                       │
│  GRANT SELECT/INSERT/UPDATE/DELETE per table             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Folder placement (NEW layout)

```
repo-root/
├── app/                              EXISTING (Phase 1-4 SPA — minor edits)
│   ├── src/
│   │   ├── observability/Telemetry.ts        EDIT — server-proxy via /api/telemetry
│   │   ├── persistence/
│   │   │   ├── SaveStateStore.ts             EDIT — setUserId action
│   │   │   ├── SaveSyncEngine.ts             NEW — debounce 2s POST observer
│   │   │   └── SaveSyncEngine.test.ts        NEW
│   │   ├── domain/ServerValidator.ts         EDIT — env var rotation
│   │   ├── react/shell/AppRouter.tsx         EDIT — mount SaveSyncEngine
│   │   └── main.tsx                          EDIT — Amplitude init + Sentry tags
│   ├── .env.example                          EDIT — document VITE_* env vars
│   └── vite.config.ts                        EDIT — mock middlewares dev-only gate
│
├── api/                              NEW (Vercel Functions)
│   ├── _lib/
│   │   ├── db.ts                             MySQL pool (mysql2, singleton)
│   │   ├── auth.ts                           HMAC verify
│   │   ├── nonce.ts                          Replay protection
│   │   ├── sentry.ts                         Server-side Sentry init
│   │   └── amplitude.ts                      Amplitude Node SDK
│   ├── health.ts                             GET /api/health
│   ├── save/
│   │   ├── load.ts                           GET /api/save/load
│   │   └── sync.ts                           POST /api/save/sync
│   ├── shop/validate.ts                      POST /api/shop/validate
│   ├── breed/validate.ts                     POST /api/breed/validate
│   ├── telemetry.ts                          POST /api/telemetry
│   ├── package.json                          NEW — backend-only deps
│   └── tsconfig.json                         NEW — Node target
│
├── Masterdata/
│   ├── migrations/
│   │   └── 2026-05-13-create-game-tables.sql NEW — 5 CREATE TABLE + service user GRANT
│   └── .write_log.md                         EDIT — audit entry per R5
│
├── .github/workflows/
│   ├── test.yml                              NEW — pre-merge gate
│   └── deploy.yml                            NEW — main → Vercel deploy
│
├── vercel.json                       NEW — project config
└── docs/
    ├── superpowers/specs/
    │   └── 2026-05-13-phase-5-vercel-mysql-design.md   THIS FILE
    └── architecturepack_Game_SS3_exclusive_v1.1_22042026.md   EDIT — §11.16-17 NEW
```

### 4.3 MySQL schema (5 NEW tables) — see §3 of `tasks/todo_phase5.md`

Full DDL ở `Masterdata/migrations/2026-05-13-create-game-tables.sql`. Summary:

| Table | Purpose | Approx volume |
|---|---|---|
| `game_players` | Primary save record (scalar + JSON hybrid) | 1 row × 10K students |
| `game_telemetry_events` | Event log (Amplitude replica) | 50 events/student/day × 10K = 500K/day |
| `game_breeding_sessions` | Server-side breeding state (anti-cheat) | 1-3 sessions/student/day |
| `game_shop_validation_log` | Purchase audit trail | 5 validations/student/day |
| `game_nonces` | Replay protection (TTL 7d cron cleanup) | 50 nonces/student/day, ~25M rows at steady state |

Service user `game_backend_writer` GRANT scopes (least privilege):
- `game_players`: SELECT, INSERT, UPDATE
- `game_telemetry_events`: SELECT, INSERT
- `game_breeding_sessions`: SELECT, INSERT, UPDATE
- `game_shop_validation_log`: INSERT only (audit trail, no updates)
- `game_nonces`: SELECT, INSERT, DELETE (DELETE for cron cleanup)

### 4.4 Save sync flow (Q5-4 debounce 2000ms)

```
Frontend Zustand state change
       ↓
SaveSyncEngine (subscribes to useSaveState)
       ↓
debounce(2000ms)            ← Q5-4 anh override (was 300ms)
       ↓
buildPayload(state, clevaiUserId, clientNonce++, hmac)
       ↓
POST /api/save/sync
       ↓
Vercel Function api/save/sync.ts
  - verifyHmac()
  - checkNonce(user, nonce) — reject if duplicate
  - UPSERT game_players row (ON DUPLICATE KEY UPDATE)
  - return { ok: true, server_updated_at }
       ↓
Frontend stores server_updated_at → use as optimistic-concurrency token
```

**Conflict semantics (R9):** Multi-tab edits → debounce coalesces within 2s window. Cross-tab edits >2s apart → second POST wins (last-write-wins). Phase 6+ can add CRDT or optimistic locking.

**Invocation cost estimate:** 10K students × ~10 state changes / 30min session × 30 sessions/month ÷ debounce window = ~3K syncs/student/month = 30M/month. Vercel Pro includes 1M invocations/month, then $0.40/1M. Estimate ~$12/month for sync alone. Acceptable.

### 4.5 Amplitude server-proxy flow (Q5-5)

```
Frontend Telemetry.track('shop_purchase', {...})
       ↓
POST /api/telemetry { event, payload, nonce, hmac }
       ↓
Vercel Function api/telemetry.ts
  - verifyHmac()
  - INSERT INTO game_telemetry_events (forwarded=0)
  - amplitudeClient.track({ user_id, event_type, event_properties })
  - UPDATE game_telemetry_events SET forwarded=1 WHERE event_id=<lastId>
  - return { ok: true }
```

Local table = source of truth; Amplitude = replica. If Amplitude quota exceeded, telemetry continues into MySQL; Phase 6 batch-forward unsent.

### 4.6 Environment variables (Vercel Production)

| Var | Source | Used by |
|---|---|---|
| `CLEVAI_DB_HOST` | Tailscale-exposed MySQL IP/hostname | `api/_lib/db.ts` |
| `CLEVAI_DB_PORT` | MySQL port (default 3306) | `api/_lib/db.ts` |
| `CLEVAI_DB_USER` | `game_backend_writer` | `api/_lib/db.ts` |
| `CLEVAI_DB_PASS` | Long random secret from anh's DBA | `api/_lib/db.ts` |
| `CLEVAI_DB_NAME` | `clevai_prod` | `api/_lib/db.ts` |
| `PHASE5_VALIDATION_SECRET` | Rotated quarterly, replaces `PHASE3_DEV_SECRET` hardcoded literal | `api/_lib/auth.ts` |
| `AMPLITUDE_API_KEY` | From anh's Amplitude org dashboard | `api/_lib/amplitude.ts` |
| `SENTRY_DSN` | From Sentry project (already provisioned Step 18.5) | `app/src/main.tsx` (via VITE_) + `api/_lib/sentry.ts` |
| `SENTRY_RELEASE` | `$VERCEL_GIT_COMMIT_SHA` build-time | `.github/workflows/deploy.yml` |
| `VITE_BACKEND_ENABLED` | `true` production / `false` rollback | `app/src/persistence/SaveSyncEngine.ts` |
| `VITE_API_BASE` | `https://game.clevai.edu.vn` production / `http://localhost:5173` dev | `app/src/observability/Telemetry.ts` + `ServerValidator.ts` |

Frontend env vars prefixed `VITE_` (Vite convention — exposed to client bundle). Backend env vars (DB creds, Amplitude key) stay server-only.

### 4.7 30-task breakdown (see `tasks/todo_phase5.md`)

6 sub-phases A→B→C→D→E→F sequential per anh's decision:

- **A. Foundation + Schema** (A.0-A.4, 5 tasks) — SQL migration + DBA prod run + service user
- **B. Backend functions** (B.0-B.10, 11 tasks) — 6 Vercel Functions + 5 `_lib` modules
- **C. Frontend rewire** (C.0-C.7, 8 tasks) — Amplitude + Sentry + SaveSyncEngine
- **D. CI/CD + Deploy** (D.0-D.4, 5 tasks) — Vercel pipeline + DNS + smoke
- **E. Migration & Backfill** (E.0-E.2, 3 tasks) — cron cleanup + Sentry release
- **F. Verification + docs** (F.0-F.5, 6 tasks) — E2E + AP/ISP + manual UAT

Anh approval gate between sub-phases. **Sub-phase A is hard-gated by anh's "APPROVE SQL" keyword** before any DB write (staging or prod).

---

## 5. Acceptance criteria

1. **Schema deployed** trên staging + prod (anh's DBA confirmed). 5 game_* tables exist với correct column types + indexes.
2. **Service user** `game_backend_writer` created with GRANTs per §4.3.
3. **6 Vercel Functions** deployed, all returning 200 against staging DB via Tailscale.
4. **`/api/health`** returns `{ ok: true, db: 'connected', version: <git-sha> }`.
5. **HMAC verify** rejects forged requests with 401 + `hmac_mismatch`.
6. **Nonce replay** prevents duplicate (user_id, nonce) requests — second submission returns 401 `replay_attempted`.
7. **`/api/save/sync`** UPSERTs `game_players` row atomically; returns `server_updated_at`.
8. **`/api/save/load`** returns SaveState v10 JSON shape; matches client expectations.
9. **`/api/shop/validate`** rejects if server-side `battleStars < priceCharged`; logs to `game_shop_validation_log`.
10. **`/api/breed/validate`** start action inserts `game_breeding_sessions` row with `hatch_at = started_at + duration[rarity]`; rush updates `hatch_at = NOW()`.
11. **`/api/telemetry`** inserts row + forwards to Amplitude; survives Amplitude downtime (`forwarded=0` on retry-eligible).
12. **Amplitude dashboard** receives `shop_purchase`, `breeding_start`, `breeding_rush`, `breeding_hatch` events with correct `user_id` attribution.
13. **Sentry** receives errors from both client + serverless functions; release tag set from Git SHA.
14. **SaveSyncEngine debounce 2000ms** confirmed via test: rapid state changes coalesce into single POST after 2s idle.
15. **`game.clevai.edu.vn`** DNS resolved + HTTPS valid + static SPA loads.
16. **`VITE_BACKEND_ENABLED=false`** rollback: frontend behaves like Phase 4 (local-only).
17. **E2E `phase_5_backend.spec.ts`** passes against Vercel preview environment.
18. **No regressions**: 1129 unit tests + 11 E2E green on main post-merge.
19. **AP §11.16 + §11.17** + ISP Phase 5 row + todo.md updated.

---

## 6. Risks and mitigations (12 items)

See `tasks/todo_phase5.md` §6. Critical items:

- **R1 Vercel us-east-1 → Clevai DC latency** — mitigate via Tailscale tunnel + Vercel Singapore region pin
- **R2 Static IP whitelist** — Tailscale provides single static egress IP
- **R3 Connection pool exhaustion** — `mysql2` pool size 1 + 10s timeout
- **R4 Prod DB write authority** — AI agent NEVER runs prod migration; anh's DBA executes
- **R9 Save sync race** — `updated_at` optimistic concurrency
- **R11 Migration safety** — additive schema, no destructive changes, no live data touched

---

## 7. AP / ISP impact

### 7.1 AP §11.16 (NEW) — Backend deploy seam

Document Vercel architecture, Tailscale tunnel, env var inventory, HMAC contract, nonce protocol, rollback mechanism.

### 7.2 AP §11.17 (NEW) — MySQL schema reference

5 game_* tables + service user GRANTs + index strategy + retention policy (game_nonces TTL 7d, game_telemetry_events keep forever for analytics).

### 7.3 ISP Phase 5 row table

30 atomic tasks (P5-A.0 → P5-F.5) status tracking.

### 7.4 tasks/todo.md update

Phase 5 row added. Header bumped to "Phase 5 ✅ — production-live".

---

## 8. Type classification

**Type C** — Production infra (Vercel + DNS + MySQL schema migration) + cross-cutting backend (6 new serverless functions) + EventBus unchanged but data flow shifts to server-authoritative.

POSUP + ARCH + DBA approval required:
- §11.16 backend seam (ARCH)
- §11.17 schema (DBA)
- Q-deploy-1..5 + Q5-1..8 (POSUP) — already answered 13/05/2026

---

## 9. Asset spec — none Phase 5

Pure infra phase. UI changes minimal (no new components, only env-var rewires).

---

## 10. Open questions baked as defaults

All Q-deploy + Q5-1..8 answered batch 13/05/2026 với Q5-4 override (2000ms). No further open questions blocking implementation.

---

## 11. Sequencing — sequential sub-phases per anh

```
A (Schema)
  ↓ anh APPROVE SQL → staging dry-run → prod migration
B (Backend functions)
  ↓ anh approve B done → C
C (Frontend rewire)
  ↓
D (CI/CD + Deploy)
  ↓ anh approve D done → E
E (Migration + Backfill)
  ↓
F (Verification + docs)
  ↓
Phase 5 closed
```

Hard gates:
- **A.3 (staging dry-run)** requires anh approval keyword "APPROVE SQL"
- **A.4 (prod migration)** executed by anh's DBA — Claude provides SQL + post-migration verification queries
- **D.3 (DNS cutover)** requires anh + Clevai infra team action
- **F.4 (live UAT)** requires anh confirming real student session works end-to-end

---

**End Phase 5 design spec.**

Next: anh review this spec → approve → em invoke `superpowers:writing-plans` → 30-task TDD plan → Sub-phase A.1 SQL migration.
