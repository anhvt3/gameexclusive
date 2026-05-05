# Project: Game_SS3_exclusive (Edu-RPG Production App)

> **Last updated:** 02/05/2026 (post Sprint B merge + spec drift sync)
> **Current commit:** `c0e9cb3` (chore: ignore .claude/worktrees/)
> **Tests:** 649/649 unit · 6/6 E2E (smoke + full_flow + boss_quest + equipment_damage + multiparty_combat + sprint_b_zone_flow)
> **Phase 1+1.5 progress:** 100% complete (35/35 steps + harness 22.x extension shipped)
> **Phase 2.5 progress:** Sprint A ✅ + Sprint B ✅ — 2/6 sprints done

---

## 📌 Source of Truth Documents (ĐỌC TRƯỚC KHI CODE)

| Doc | Purpose |
|---|---|
| `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md` | **AP v1.1** — Entity, Process, Complex Logic, Task A/B/C (+ §11 inventory/equipment + Sprint A/B deltas appended) |
| `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md` | **ISP v1.1** — Phase 1+1.5 (35 steps) + Phase 2.5 Sprint A/B row tables |
| `docs/roadmap_phase2.5_prodigy_parity.md` | 6-sprint Prodigy-parity roadmap (A/B done, C-F pending) |
| `docs/appendix_{A-I}_*.md` | AP appendices — A monsters, B wireframes, C mascot, D mocks, E task classification, F UI prompts, G pet breeding prompts, H equipment, I visual juice |
| `docs/superpowers/specs/2026-04-29-multiparty-combat-design.md` | Sprint A spec |
| `docs/superpowers/specs/2026-05-02-sprint-b-maps-design.md` | Sprint B spec |
| `docs/superpowers/plans/2026-04-29-multiparty-combat-plan.md` | Sprint A plan |
| `docs/superpowers/plans/2026-05-02-sprint-b-maps-plan.md` | Sprint B plan |
| `docs/harness_checklist_Game_SS3_exclusive.md` | Harness engineering setup |
| `CLAUDE.md` | Harness principles + Clevai term no-hallucination rule |

---

## 🚀 Phase 2.5 — Prodigy-Parity Sprints

| Sprint | Scope | Status | Commit | New tests |
|---|---|---|---|---|
| **A** | Multi-party combat refactor — `CombatEntity[]`, TurnQueue FSM, ElementMatrix 8×8, 6 starter pets | ✅ shipped | `ed6dbee` | +192 (351 → 543) |
| **B** | World Map + Zone(entrance/path) + Boss Hall scenes — A* pathfinding, walkable masks, persistence | ✅ shipped | `49e5e79` (squash `c5a78b4`) | +106 (543 → 649) |
| **C** | Pet System — rescue mechanic, leveling, evolution, inventory tab | ✅ shipped | (this commit) | +71 (649 → 720) |
| **D** | Quests & Goals panel — 8-quest catalog, QuestEngine, /quests route, toast notifications | ✅ shipped | (this commit) | +74 (720 → 794) |
| **E** | Polish & Onboarding — name picker, customization, tutorial extension (8 beats), settings panel | ✅ shipped | (this commit) | +80 (794 → 874) |
| **F** | Free Daily Rewards — login calendar, loot jar, battle stars | ⏳ pending | — | — |

---

## ✅ Done — Phase 1 (Steps 0-22.10) + Phase 1.5 (Steps 22.11-22.17)

### Phase 1 core (22 steps + 6 expansion)

| # | Step | Commit | Tests added |
|---|---|---|---|
| 0 | Repo + Tooling Bootstrap (harness Sprint 1) | `bc3ebfd` | — |
| 1 | Typed Event Bus (seed + error boundary) | `bc3ebfd` | 4 |
| 2 | ElementSystem (8-element damage formula + property-based test) | `e6fa11c` | 16 |
| 3 | Mock LO JSON + Zod discriminated union | `1f1bf44` | 11 |
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
| 15 | CombatStateMachine pure FSM | `db5969e` | 24 |
| 16 | Combat ↔ Quiz integration (FSM + EventBus) | `d5fc3ae` | 10 |
| 17 | Damage resolution + Victory/Defeat + respawn | `572e850` | 12 |
| 18 | Mascot Sóc dialog + 4-step tutorial | `46e622a` | 14 |
| 18.5 | Sentry init + 5 metrics + EventBus bridge | `1db997d` | 25 |
| 19 | IndexedDB event stream + Zod + idempotency | `3dd39f1` | 18 |
| 20 | Adaptive difficulty picker (CL2) | `623b15d` | 13 |
| 21 | Main menu + router + app shell lifecycle | `4963f59` | 11 |
| 22 | E2E full flow via window.__GAME__ bridge | `7a25ca4` | 13 unit + 1 E2E |
| 22.5 | Guild leaderboard (single-player static) | `c3eb600` | 13 |
| 22.6 | Daily boss quest (Aldergasp 5× HP, 500 EXP) | `01bf6be` | 15 unit + 1 E2E |
| 22.7 | Inventory + equipment schema v2 migration | `e7258b8` | 25 |
| **22.8** | **Level-up reward drop table + LEVEL_UP event** | (Phase 1.5 batch) | 11 |
| **22.9** | **Inventory UI + equip/unequip screen + /inventory route** | (Phase 1.5 batch) | tests in `InventoryScreen.test.tsx` |
| **22.10** | **Equipment stat modifiers wired into combat (effectiveMaxHp + crit + expGainPct)** | (Phase 1.5 batch) | tests in `EffectiveStats.test.ts` |

### Phase 1.5 — Visual Polish & Juice (Appendix I)

| # | Step | Status |
|---|---|---|
| 22.11 | AudioManager + BGM/SFX wiring (Howler.js) | ✅ |
| 22.12 | Base player layered rendering (body + equipment overlay) | ✅ |
| 22.13 | Spell VFX sprite-sheet system (placeholder texture warn — see R9) | ✅ |
| 22.14 | Treasure-chest reward animation (LEVEL_UP overlay) | ✅ |
| 22.15 | Quiz whiteboard scratchpad | ✅ |
| 22.16 | Element icons on HP bar + Victory banner animation | ✅ |
| 22.17 | Audio call-site wiring (post-feature pass) | ✅ |

**Phase 1+1.5 total:** 351 → 649 unit tests, 6/6 E2E green (after Sprint A/B + asset delivery).

---

## 🚧 Remaining — Phase 1 Cleanup

### Step 3.5 (deferred) — Server-side validation mock
Vite plugin `/api/quiz/validate` endpoint. Strip `correct_option_id` from bundled JSON. HMAC-signed receipt. ~3h.
⚠️ **Block before public launch** (R5).

---

## 📋 CEO Review TODOs (accepted)

| # | TODO | Status |
|---|---|---|
| 1 | Error & Rescue Map (11 gaps) | ⏳ Partial — EventBus error boundary + SaveState HMAC + AP E11-E14 spec'd Step 22.7. Code for E11-E14 landed, E2-E5/E7-E10 still deferred |
| 2 | Client validation server-side | ⏳ Step 3.5 pending |
| 3 | SaveState + EventQueue HMAC sign | ✅ SaveState done Step 9.5. EventQueue HMAC wrap still pending |
| 4 | EventBus error boundary | ✅ Done Step 1 + Step 18.5 Sentry wiring |
| 6 | Observability Phase 1 (Sentry + 5 metric) | ✅ Done Step 18.5 + wired at shell Step 21 |
| 7 | Step 22 E2E re-estimate 12h | ✅ Done Step 22 |
| 8 | Property-based test ElementSystem | ✅ Done Step 2 |

**Skipped:** #5 Anti-addiction (user vetoed), #9 Wireframe iteration (defer), #10 Deploy spec (defer Phase 3).

---

## ⚠️ Known Risks / Flags

| # | Risk | Status |
|---|---|---|
| R1 | Prodigy sprites → dev/internal only | Accepted (user dec) |
| R2 | AP v1.0 size 34.8kb warn (>20kb) | Warn-only; AP v1.1 at 16.6kb OK |
| R3 | Anti-addiction NĐ 147/2024 | Vetoed (user) |
| R4 | Production scope vs MVP AP v1.1 | Accepted — AP v1.1 + §11 Task C expansion + Sprint A/B deltas, no v1.2 refactor |
| R5 | Step 3.5 server validation pending | ⏳ Block before public launch |
| R6 | Aldergasp boss sprite not delivered (CombatScene renders default placeholder) | Defer to Phase 2 batch |
| R7 | Step 22.6 item reward — boss grants guaranteed item via `rollDrop` | ✅ Done — `CombatScene.handleVictory` lines 540-558, test at `CombatScene.test.ts:492` |
| R8 | EventQueue HMAC wrap (CEO TODO #3 partial) | Defer — structure leaves seam |
| R9 | `vfx_spell_fire` placeholder texture missing (console.warn during combat) | Antigravity Phase 2 asset gap, non-blocking |

---

## 🧪 Test Commands

```bash
cd app
npm run dev              # Vite dev :5173
npm run test:run         # Vitest unit tests (649)
npm run test:e2e         # Playwright E2E (6 specs)
npm run lint             # ESLint flat config
npm run typecheck        # tsc --noEmit
npm run verify           # AP compliance gate
npm run build            # Production build
```

Harness gates all green. Pre-commit hook enforces lint-staged + typecheck + verify.

---

## 🎯 Next Session Action

**Immediate:** Sprint F — Free Daily Rewards brainstorm (per `docs/roadmap_phase2.5_prodigy_parity.md` §F). Last sprint of Phase 2.5: daily login calendar, loot jar, battle stars currency.

**Deferred:** Step 3.5 server-side validation (block before public launch). Phase 2 sprite swap on pet evolution. Antigravity name picker UI plate (optional polish).
