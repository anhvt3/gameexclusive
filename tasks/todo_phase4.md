# Phase 4 — LiveOps Foundations — Implementation Plan

> **Branch:** `claude/phase4-liveops-b27268`
> **Worktree:** `.claude/worktrees/phase4-liveops-b27268`
> **Base:** `main` at `b4a6ed5` (Phase 3 merged + AP doc fixes)
> **Status:** ⏳ Draft — đợi anh review trước khi code dòng đầu tiên
> **Author:** Claude
> **Date:** 2026-05-12

---

## 1. Phase 4 scope per anh's brief

3 tính năng cốt lõi:

| # | Feature | Type | Why now |
|---|---|---|---|
| 1 | **5-Minute Breeding Timer + Rush Mechanic** | B (SaveState v9→v10 + new action) | Phase 3 ship dùng `durationMs=0` (instant). Phase 4 mở "anticipation loop" + monetization seam (Rush = stars spend) |
| 2 | **Shop Spend Telemetry** | B (new observability module) | Backend chưa có, cần ghi log structured JSON + mock endpoint để Phase 5 wire vào analytics platform |
| 3 | **Production Deploy Spec** | A (doc only) | Soạn `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` — kiến trúc deploy, build pipeline, HMAC server-side real |

---

## 2. Current state baseline (verified)

- **Schema:** v9 (`SaveStateStore.ts:50`). `BreedingSession { startedAt, durationMs, costBattleStars, offspringSpec }` — `durationMs` currently flips between 0 and 5*60*1000 but defaults to 0 in `performBreedingStart.ts:48`.
- **Tests:** 1072 unit + 11 E2E green on `main` post Phase 3 merge.
- **Existing seams:**
  - `performBreedingHatch` already checks `now < session.startedAt + session.durationMs` → returns `'not_ready'`. So timer is wired but durationMs=0 makes it always-ready.
  - `spendBattleStars(amount)` exists (Phase 3 Q4) — usable for Rush cost
  - EventBus has `BREEDING_STARTED` + `EGG_HATCHED` — telemetry can observe them
  - `SHOP_PURCHASE_COMPLETED` event — telemetry can observe shop spend
  - Vite middleware `/api/{shop,breed}/validate` already exists — pattern reusable for `/api/telemetry`

---

## 3. Schema sketch — v9 → v10 (DRAFT)

User explicitly requested `hatchAt` field. Two approaches considered:

```ts
// Option A (CHOSEN per user brief): add explicit hatchAt
interface BreedingSessionV10 {
  readonly parentA: PetInstanceId;
  readonly parentB: PetInstanceId;
  readonly startedAt: number;
  readonly hatchAt: number;          // NEW — epoch ms when egg ready (= startedAt + duration)
  readonly costBattleStars: number;
  readonly offspringSpec: { codename; rarity; level };
  readonly rushedAt: number | null;  // NEW — if user rushed, timestamp of rush click; else null
}

// Remove durationMs (replaced by hatchAt - startedAt derivation if needed)
```

Migration v9→v10: existing v9 `breedingChamber` sessions get `hatchAt = startedAt + durationMs`, `rushedAt = null`. Empty chamber stays null.

**Why keep `startedAt`:** UI countdown wants `(hatchAt - now) / (hatchAt - startedAt)` for progress bar fill ratio.

**Why add `rushedAt`:** Telemetry analytics needs to distinguish "natural hatch" vs "rushed" — `rushedAt` non-null = user paid stars. Plus prevents double-rush exploit (if `rushedAt !== null`, Rush button disabled).

---

## 4. Architecture layers

```
app/src/
├── types/
│   └── breeding.ts                     EDIT — BreedingSession gains hatchAt + rushedAt
├── domain/
│   ├── PetBreedingEngine.ts            EDIT — durationFor(rarity) helper (per Q2)
│   ├── BreedingDurations.ts            NEW — duration table per offspring rarity
│   ├── BreedingRush.ts                 NEW — rush cost formula (Q3)
│   ├── performBreedingStart.ts         EDIT — set hatchAt = now + duration
│   ├── performBreedingHatch.ts         EDIT — check now >= hatchAt
│   └── performBreedingRush.ts          NEW — spend stars + set hatchAt = now
├── observability/                       NEW directory
│   ├── Telemetry.ts                    NEW — trackX functions + transport
│   ├── Telemetry.test.ts
│   ├── TelemetryEngine.ts              NEW — observer engine (listens shop+breed events)
│   └── TelemetryEngine.test.ts
├── persistence/
│   ├── SaveStateStore.ts               EDIT — v9→v10 migration + 1 new action (rushBreeding)
│   └── SaveStateStore.test.ts
├── react/
│   ├── overlays/
│   │   └── PetBreedingOverlay.tsx      EDIT — countdown timer + Rush button
│   └── components/
│       ├── BreedingCountdown.tsx       NEW — countdown UI component
│       └── EggHatchAnim.tsx            EDIT — show "incubating" vs "hatching" states
├── server/
│   └── telemetryRoute.ts               NEW — Vite middleware /api/telemetry (mock)
└── shell/
    └── AppRouter.tsx                   EDIT — mount TelemetryEngine

docs/
└── superpowers/specs/
    └── 2026-05-12-phase-4-production-deploy.md   NEW — design-only spec
```

---

## 5. New EventBus events

Only if needed (TBD per Q9 below). Possible:
- `BREEDING_RUSHED { parentA, parentB, costPaid }` — for telemetry observer

If telemetry uses direct invocation pattern, no new events needed.

---

## 6. Step plan (high-level)

| # | Step | Type | Deps |
|---|---|---|---|
| P4.0 | Preflight (baseline 1072 tests green) | — | — |
| P4.1 | `types/breeding.ts` — add hatchAt + rushedAt fields | A | — |
| P4.2 | `domain/BreedingDurations.ts` — duration table per rarity (Q2) + tests | A | — |
| P4.3 | `domain/BreedingRush.ts` — rush cost formula (Q3) + tests | A | P4.1 |
| P4.4 | SaveState v9→v10 migration + `rushBreeding` action + tests | B | P4.1 |
| P4.5 | `performBreedingStart.ts` — set hatchAt = now + duration | B | P4.2, P4.4 |
| P4.6 | `performBreedingHatch.ts` — check now >= hatchAt (already half-there) | B | P4.5 |
| P4.7 | `performBreedingRush.ts` — orchestration (validate + spend + mutate) + tests | B | P4.3, P4.4 |
| P4.8 | `observability/Telemetry.ts` — trackX functions + console transport + tests | A | — |
| P4.9 | `observability/TelemetryEngine.ts` — observer on shop+breed events + tests | A | P4.8 + EventBus (existing) |
| P4.10 | `server/telemetryRoute.ts` — Vite middleware /api/telemetry mock + smoke | A | — |
| P4.11 | `react/components/BreedingCountdown.tsx` + tests | A | P4.1 |
| P4.12 | `react/components/EggHatchAnim.tsx` — incubating/hatching states + tests | A | — |
| P4.13 | `react/overlays/PetBreedingOverlay.tsx` — countdown + Rush button + tests | B | P4.6, P4.7, P4.11, P4.12 |
| P4.14 | `react/shell/AppRouter.tsx` — mount TelemetryEngine | A | P4.9 |
| P4.15 | E2E `phase_4_breeding_timer.spec.ts` — incubate → rush → hatch | — | All above |
| P4.16 | Spec doc `docs/superpowers/specs/2026-05-12-phase-4-production-deploy.md` | A | independent |
| P4.17 | AP §11.11 update + §11.14 NEW (Telemetry) + ISP Phase 4 row + todo.md | — | All above |

**Estimate:** ~18 atomic tasks. Smaller than Phase 3 (19 tasks) because breeding timer is incremental on existing seams + telemetry is observer pattern.

**Type B overall** — Schema delta + new observability surface but no new EventBus event family.

---

## 7. Clarifying questions — anh chốt trước khi viết spec doc

### Q1. Schema delta strategy

- **A.** `hatchAt` (explicit field) + keep `startedAt` for progress bar ratio + add `rushedAt: number | null` ⭐
- **B.** `hatchAt` only — derive `startedAt` from rarity duration lookup (less storage)
- **C.** Keep `durationMs`, no new field — derive `hatchAt = startedAt + durationMs` at every read

⭐ Em đề xuất A — user explicitly requested `hatchAt`; `rushedAt` enables telemetry attribution + double-rush guard.

### Q2. Breeding duration scaling

Roadmap §F said "5 phút" example. Em đề xuất phân tier:

- **A.** Flat 5 min cho mọi offspring rarity ⭐
- **B.** Scale with rarity: common 2min · rare 5min · epic 10min · legendary 30min
- **C.** Scale with parent compatibility: HIGH 3min · MED 5min · LOW 10min (penalize bad pairings)

⭐ Em đề xuất A — đơn giản, debugging dễ, anh có thể bump Phase 5 nếu retention data cần điều chỉnh.

### Q3. Rush cost formula

- **A.** Flat 100 stars regardless of time remaining ⭐
- **B.** Proportional to time remaining: `ceil((hatchAt - now) / 10_000)` stars (1 star per 10s remaining, max 30 for full 5min)
- **C.** Proportional to offspring rarity: common 50 · rare 100 · epic 200 · legendary 500
- **D.** Hybrid: `RUSH_BASE[rarity] × (timeRemaining / fullDuration)` — fairer

⭐ Em đề xuất A — đơn giản, predictable cho học sinh. Phase 5 có thể tune.

### Q4. Offline progress UX

Học sinh tắt game lúc 3 min còn lại. Mở lại sau 10 min. Expected behavior:

- **A.** Auto-hatch on load — `performBreedingHatch` fires automatically nếu `now >= hatchAt`, emits `EGG_HATCHED`, học sinh thấy hatch animation + offspring khi mở chamber ⭐
- **B.** Show "Trứng đã sẵn sàng!" notification toast on MainMenu, học sinh phải tự click Lai Tạo để xem hatch
- **C.** No auto-action — chamber stays `ready-to-hatch` state forever until user opens overlay

⭐ Em đề xuất B — học sinh được dopamine notification "Trứng đã sẵn sàng!" + sparkle indicator trên MainMenu button (mirror Sprint D `anyQuestReady` pattern). Avoid surprising auto-hatch animation when student is doing something else.

### Q5. Multi-slot chamber?

Phase 3 ship single-slot. Now timer is real, multi-slot lai tạo song song = quality-of-life win.

- **A.** Keep single-slot Phase 4. Multi-slot defer Phase 5. ⭐
- **B.** Multi-slot 2-slot Phase 4 (UI redesign + array `breedingChamber` field)
- **C.** Multi-slot 3-slot

⭐ Em đề xuất A — single feature shipped well > multi feature half-baked. Phase 5 task.

### Q6. Countdown UI update frequency

- **A.** 1s tick (`setInterval(..., 1000)`) — sufficient resolution, low CPU ⭐
- **B.** 100ms tick — smoother countdown UI but 10× re-render
- **C.** `requestAnimationFrame` — 60fps but overkill for 5-min timer

⭐ Em đề xuất A — `setInterval(1000)` updates "4:32 → 4:31 → ..." every second. Stale by max 1s khi student opens overlay — acceptable. CPU friendly.

### Q7. Telemetry transport mode

- **A.** Console.log structured JSON only (Phase 4 dev) ⭐
- **B.** Console.log + mock POST to `/api/telemetry` (Vite middleware) — ready for Phase 5 backend swap
- **C.** Console + IndexedDB persist (offline-first analytics) — overkill for now

⭐ Em đề xuất B — dual emit. Console for dev debugging, mock endpoint to verify wire-up. Production swaps mock endpoint to real Segment/Mixpanel/Amplitude with same shape.

### Q8. Telemetry event schema

- **A.** Zod-validated typed events (mirror EventBus pattern) ⭐
- **B.** Free-form JSON `{ event: 'shop_purchase', payload: {...} }` (no schema)
- **C.** Protobuf schema (overkill)

⭐ Em đề xuất A — Zod validation = schema-as-code, prevents drift between client + backend.

### Q9. Telemetry events scope

- **A.** Phase 3 only (shop_purchase, breeding_start, breeding_rush, breeding_hatch) ⭐
- **B.** Plus retro-fit Sprint F (login_claim, loot_jar_claim, battle_stars_earned)
- **C.** Plus combat events (combat_won, combat_lost) for full funnel analytics

⭐ Em đề xuất A — narrow scope. Phase 5 retro-fit if analytics demands fuller funnel.

### Q10. Production Deploy spec — scope

- **A.** Spec doc only — design + decisions, NO infra code/config files this phase ⭐
- **B.** Spec + sample `vercel.json` / `cloudflare-pages.toml`
- **C.** Spec + actual deploy CI/CD GitHub Actions workflow

⭐ Em đề xuất A — anh's brief explicitly said "soạn thảo tài liệu" (write a document). Code/CI in Phase 5 when host platform chosen.

---

## 8. Tóm tắt 10 quyết định em propose (anh có thể batch override):

| Q | Em đề xuất |
|---|---|
| Q1 | **A** — `hatchAt` + keep `startedAt` + add `rushedAt: number \| null` |
| Q2 | **A** — flat 5 min cho mọi rarity |
| Q3 | **A** — flat 100 stars rush cost |
| Q4 | **B** — "Trứng đã sẵn sàng!" notification + sparkle, NO auto-hatch |
| Q5 | **A** — single-slot Phase 4 (defer multi-slot Phase 5) |
| Q6 | **A** — 1s `setInterval` countdown |
| Q7 | **B** — console.log + mock POST `/api/telemetry` |
| Q8 | **A** — Zod-validated typed events |
| Q9 | **A** — Phase 3 events only (shop + breed) |
| Q10 | **A** — Spec doc only, no infra code |

Anh trả lời batch (vd "all default" hoặc "Q3 chọn B, còn lại default") em sẽ:

1. Viết full spec doc tại `docs/superpowers/specs/2026-05-12-phase-4-liveops-design.md`
2. Anh review spec
3. Em invoke `superpowers:writing-plans` → 18-step phased plan
4. Anh chốt execution mode → subagent-driven ship

---

## 9. Asset workflow

Phase 4 không cần Antigravity asset:
- Countdown UI: pure text + Tailwind progress bar (`<div style={{width: '${pct}%'}}>`)
- Rush button: existing amber-600 Tailwind pattern
- Notification toast: reuse Sprint D `QuestProgressToast` pattern with new payload type

Hoàn toàn ship-without-art.

---

## 10. Risks initial

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Offline progress edge case: tablet locked 6h, đồng hồ system lệch | Med | Use `Date.now()` from real wall clock, NOT internal timer state |
| R2 | setInterval not cleaned on unmount → memory leak | Low | Sprint F LootJarOverlay timer cleanup pattern (useRef + useEffect cleanup) |
| R3 | Rush during chamber lock race (double-click) | Med | `rushedAt !== null` guard on action level (throw if already rushed) |
| R4 | Telemetry crashes app if mock endpoint 500s | High | All telemetry calls in try/catch, never throw to caller |
| R5 | Mock telemetry endpoint leaks PII to console | Low | Strip user identifiers from payload (Phase 4 internal Clevai, no PII anyway) |
| R6 | Schema v9→v10 breaks Phase 3 saves with active breedingChamber | High | Migration: compute `hatchAt = startedAt + durationMs`, set `rushedAt = null` |
| R7 | UI countdown shows "4:60" instead of "5:00" | Low | Use `Math.ceil((hatchAt - now) / 1000)` then format |

---

## 11. Definition of Done (Phase 4)

- [ ] Schema v10 migration: 1072 + ~40 new unit tests pass; v9→v10 chain green
- [ ] BreedingDurations + BreedingRush + performBreedingRush: full unit coverage
- [ ] PetBreedingOverlay shows countdown + Rush button + handles offline reload
- [ ] EggHatchAnim has incubating + hatching states distinguished
- [ ] TelemetryEngine logs 4+ event types via console + POST /api/telemetry
- [ ] Vite middleware `/api/telemetry` accepts + 200s
- [ ] E2E phase_4_breeding_timer.spec.ts: incubate → wait → ready → rush → trừ stars → hatch → roster grows
- [ ] AP §11.11 updated (Phase 4 delta) + §11.14 NEW (Telemetry) + ISP Phase 4 row
- [ ] Production Deploy spec doc shipped (separate, no code)
- [ ] All gates green: lint + typecheck + verify + ~1112 unit + 12 E2E

---

## 12. NEXT ACTION

**Anh review plan này + trả lời Q1-Q10 (batch một message).**

Sau khi anh chốt → em viết full spec doc → anh review → writing-plans → subagent-driven ship.

**End of plan draft.**
