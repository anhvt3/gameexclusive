# Project: Game_SS3_exclusive (Edu-RPG Production App)

> **Last updated:** 22/04/2026 (session 1 handoff)
> **Current commit:** `db5969e` → next pushed after Step 15
> **Tests:** 181/181 pass
> **Phase 1 progress:** 15/26 steps (58%)

---

## 📌 Source of Truth Documents (ĐỌC TRƯỚC KHI CODE)

| Doc | Purpose |
|---|---|
| `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md` | **AP v1.1** — Entity, Process, Complex Logic, Task A/B/C |
| `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md` | **ISP v1.1** — 26 steps roadmap Phase 1 |
| `docs/appendix_{A,B,C,D,E}_*.md` | AP v1.0 appendices (monsters, wireframes, mascot, mocks, task classification) |
| `docs/appendix_F_ui_assets_prompts.md` | UI/world asset prompts Phase 1 |
| `docs/appendix_G_pet_breeding_prompts.md` | Phase 2 Pet Breeding UI prompts |
| `docs/batch_plan_v2_antigravity.md` | Phase 1 asset batch plan (DONE — 60 PNG delivered) |
| `docs/batch_plan_v2_phase2_antigravity.md` | Phase 2 asset batch plan (DRAFT, send khi Step ~22+) |
| `docs/antigravity_prompt_phase2.md` | Paste-ready Antigravity briefing Phase 2 |
| `docs/harness_checklist_Game_SS3_exclusive.md` | Harness engineering setup |
| `CLAUDE.md` | Harness principles + Clevai term no-hallucination rule |

---

## ✅ Done — Phase 1 Steps 0-15

| # | Step | Commit | Tests |
|---|---|---|---|
| 0 | Repo + Tooling Bootstrap (harness Sprint 1) | `bc3ebfd` | — |
| 1 | Typed Event Bus (seed + error boundary) | `bc3ebfd` | 4 |
| 2 | ElementSystem (8-element damage formula) | `e6fa11c` | 16 |
| 3 | Mock LO JSON + Zod discriminated union | `1f1bf44` | 11 |
| — | docs: fix ISP Step 3 spec bug | `305d500` | — |
| 4 | MultipleChoiceRenderer | `af50245` | 7 |
| 5 | ClozeRenderer | | 7 |
| 6 | DragDropRenderer (click-assign) | | 5 |
| 7 | QuizFactory + Appendix F | | 5 |
| 8 | QuizOverlay event-driven container | | 6 |
| 9 | SaveStateStore Zustand + persist | | 16 |
| 9.5 | HMAC signing (hmac + SessionKey + HmacStorage) | | 17 |
| 10 | PhaserGame React wrapper + leak test | | 6 |
| 11 | Boot + Preload + World scenes chain | | 11 |
| 12 | WorldScene placeholder + Player WASD | | 20 |
| 13 | Enemy spawn + overlap → ENTER_COMBAT | | 19 |
| 14 | CombatScene static layout + HP bars | `5db6f3e` | 17 |
| — | dev: Combat preview tool (App.tsx `?preview=combat`) | `87f3c93` | — |
| 15 | CombatStateMachine pure FSM | `db5969e` | 24 |

**Total:** 181/181 tests pass.

---

## 🚧 Remaining — Phase 1 Steps 16-26

### Step 16 — Combat ↔ Quiz Integration ⭐ NEXT
Wire FSM (Step 15) into CombatScene via EventBus. Click spell → emit OPEN_QUIZ → handle QUIZ_RESULT → FSM transition. Spell selection UI 4 placeholder buttons. Phaser pause/resume on quiz. ~3h.

### Step 17 — Damage Resolution + Victory/Defeat
Apply `ElementSystem.calculateDamage` (Step 2) on RESOLVE_DAMAGE. HP sync via SaveStateStore. VICTORY → emit EXIT_COMBAT(won=true), remove monster from WorldScene, gain EXP. DEFEAT → respawn HUB. ~3h.

### Step 18 — Mascot Sóc Dialog + Tutorial
React MascotDialog with typewriter, tutorial sequence 4 steps for first-time. Flag `tutorial_completed` in SaveState. 4 Sóc portraits. ~3h.

### Step 18.5 (NEW v1.1) — Sentry + 5 Metrics Wiring
Init Sentry + 5 core metric emitter functions. Wire lifecycle events. ~2h.

### Step 19 — Event Stream Local (IndexedDB)
Append-only `QuizAnsweredEvent` + `CombatEvent` to IndexedDB via idb lib. Idempotency key. Zod schema validate. ~3h.

### Step 20 — Adaptive Difficulty (CL2)
`selectNextLO(studentId)` sliding window accuracy → difficulty ±1 bump, exclude recently played. ~3h.

### Step 21 — Main Menu + App Shell Routing
react-router-dom routes `/` menu, `/play` game. Replace dev preview tool. MainMenu WF1. ~2h.

### Step 22 — E2E Integration Test (Playwright)
Full flow: Menu → Tutorial → World → Combat → Quiz × 3 → Victory → Return. Expose `window.__GAME__` for Playwright assertions. Re-estimated 4h → 12h per CEO TODO #7.

### Step 22.5 (NEW v1.1) — Guild Leaderboard single-player static
Fake 30 classmates data. ~3h.

### Step 22.6 (NEW v1.1) — Boss Quest single-player (1 boss daily)
Daily reset via SaveState flag. 5x HP scale. ~4h.

### Step 3.5 (NEW v1.1, **not yet done**) — Server-side validation mock
Vite plugin `/api/quiz/validate` endpoint. Strip `correct_option_id` from bundled JSON. HMAC-signed receipt. ~3h.

⚠️ **Step 3.5 đáng ra làm trước Step 4 per ISP v1.1 order. Hiện đang skipped — cần retrofit sau Step 17 hoặc parallel.**

---

## 📋 CEO Review TODOs (accepted)

| # | TODO | Status |
|---|---|---|
| 1 | Error & Rescue Map (11 gaps) | ⏳ Partially done (EventBus error boundary + SaveState HMAC). 9 remaining gaps deferred |
| 2 | Client validation server-side | ⏳ Step 3.5 pending |
| 3 | SaveState + EventQueue HMAC sign | ✅ Done Step 9.5 (partial — EventQueue HMAC chưa tích hợp Step 19) |
| 4 | EventBus error boundary | ✅ Done Step 1 seed |
| 6 | Observability Phase 1 (Sentry + 5 metric) | ⏳ Step 18.5 pending |
| 7 | Step 22 E2E re-estimate 12h | ✅ Noted ISP v1.1 |
| 8 | Property-based test ElementSystem | ✅ Done Step 2 |

**Skipped:** #5 Anti-addiction (user vetoed), #9 Wireframe iteration (defer), #10 Deploy spec (defer Phase 3).

---

## 📦 Phase 2 — NOT STARTED

**Trigger gửi Antigravity:** Khi Phase 1 code ≥ Step 22/26.

- 108 PNG planned (15 monsters mid/boss + Sóc Combat + 3 biomes + Pet Breeding UI + quiz extras)
- Send brief: [`docs/antigravity_prompt_phase2.md`](../docs/antigravity_prompt_phase2.md)
- Master plan: [`docs/batch_plan_v2_phase2_antigravity.md`](../docs/batch_plan_v2_phase2_antigravity.md)

Code steps Phase 2:
- Quiz renderers 4 more (OrderList, ClozeDD, IF, VisualChoice)
- Combat form Sóc integration
- Pet Breeding mechanic
- Full 20 quái spawn logic
- 3 biome tilemap + transitions

---

## ⚠️ Known Risks / Flags

| # | Risk | Status |
|---|---|---|
| R1 | Prodigy sprites → user said use for dev/internal test only. Hard commit replace before public launch | Accepted (user dec) |
| R2 | AP v1.0 size 34.8kb warn (>20kb rule #6) | Warn-only |
| R3 | Anti-addiction NĐ 147/2024 for public production | Vetoed by user |
| R4 | Production scope vs MVP AP v1.1 (no doc refactor yet) | Accepted (user dec) |
| R5 | Step 3.5 server validation pending — mock JSON still ship `correct_option_id` in bundle | ⏳ Block before public launch |

---

## 🧪 Test Commands

```bash
cd app
npm run dev              # Vite dev :5173 (preview via ?preview=combat&monster=1)
npm run test:run         # Vitest unit tests
npm run test:e2e         # Playwright E2E (Step 22+ populated)
npm run lint             # ESLint flat config
npm run typecheck        # tsc --noEmit
npm run verify           # AP compliance gate (scripts/verify.ts)
npm run build            # Production build
```

Harness gates all green. Pre-commit hook enforces lint-staged + typecheck + verify.

---

## 🎯 Next Session Action

**Immediate:** Step 16 — Combat ↔ Quiz Integration.

Load CombatStateMachine + EventBus + QuizOverlay. Wire events:
- Spell button click → `nextCombatState(state, CLICK_SPELL)` → `SELECT_SPELL`
- Simulate OPEN_QUIZ from CombatScene → EventBus emit → QuizOverlay shows
- Listen QUIZ_RESULT → FSM transition QUIZ_CORRECT/WRONG
- Pause Phaser during quiz

Test: 4 backend transition tests + 1 E2E round-trip.
