# Project: Game_SS3_exclusive (Edu-RPG Production App)

> **Last updated:** 23/04/2026 (session 2 mid-run)
> **Current commit:** `e7258b8` (feat step-22.7 inventory schema v2)
> **Tests:** 351/351 unit pass · 3/3 E2E pass
> **Phase 1 progress:** 23/30 steps (77%) — core 26 complete, 4 new equipment-expansion steps landed via Task C

---

## 📌 Source of Truth Documents (ĐỌC TRƯỚC KHI CODE)

| Doc | Purpose |
|---|---|
| `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md` | **AP v1.1** — Entity, Process, Complex Logic, Task A/B/C (+ §11 inventory/equipment) |
| `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md` | **ISP v1.1** — 30-step roadmap (26 core + 22.7-22.10) |
| `docs/appendix_{A,B,C,D,E}_*.md` | AP v1.0 appendices (monsters, wireframes, mascot, mocks, task classification) |
| `docs/appendix_F_ui_assets_prompts.md` | UI/world asset prompts Phase 1 |
| `docs/appendix_G_pet_breeding_prompts.md` | Phase 2 Pet Breeding UI prompts |
| `docs/appendix_H_equipment_prompts.md` | **NEW** 10 equipment items × 2 assets (icon + sprite) |
| `docs/batch_plan_v2_antigravity.md` | Phase 1 asset batch plan (DONE — 60 PNG delivered) |
| `docs/batch_plan_v2_phase2_antigravity.md` | Phase 2 asset batch plan (DRAFT, send soon) |
| `docs/antigravity_prompt_phase2.md` | Paste-ready Antigravity briefing Phase 2 |
| `docs/harness_checklist_Game_SS3_exclusive.md` | Harness engineering setup |
| `CLAUDE.md` | Harness principles + Clevai term no-hallucination rule |

---

## ✅ Done — Phase 1 Steps 0-22.7

| # | Step | Commit | Tests added |
|---|---|---|---|
| 0 | Repo + Tooling Bootstrap (harness Sprint 1) | `bc3ebfd` | — |
| 1 | Typed Event Bus (seed + error boundary) | `bc3ebfd` | 4 |
| 2 | ElementSystem (8-element damage formula) | `e6fa11c` | 16 |
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
| **16** | **Combat ↔ Quiz integration (FSM + EventBus)** | `d5fc3ae` | 10 |
| **17** | **Damage resolution + Victory/Defeat + respawn** | `572e850` | 12 |
| **18** | **Mascot Sóc dialog + 4-step tutorial** | `46e622a` | 14 |
| **18.5** | **Sentry init + 5 metrics + EventBus bridge** | `1db997d` | 25 |
| **19** | **IndexedDB event stream + Zod + idempotency** | `3dd39f1` | 18 |
| **20** | **Adaptive difficulty picker (CL2)** | `623b15d` | 13 |
| **21** | **Main menu + router + app shell lifecycle** | `4963f59` | 11 |
| **22** | **E2E full flow via window.__GAME__ bridge** | `7a25ca4` | 13 unit + 1 E2E |
| **22.5** | **Guild leaderboard (single-player static)** | `c3eb600` | 13 |
| — | docs(Task C): AP §11 + ISP 22.7-22.10 + Appendix H | `f5c5ee8` | — |
| **22.6** | **Daily boss quest (Aldergasp 5× HP, 500 EXP)** | `01bf6be` | 15 unit + 1 E2E |
| **22.7** | **Inventory + equipment schema v2 migration** | `e7258b8` | 25 |

**Total:** 351/351 unit tests, 3/3 E2E (smoke + full_flow + boss_quest).

---

## 🚧 Remaining — Phase 1 Steps 22.8 → 22.10

### Step 22.8 (NEW v1.1) — Level-up reward drop table + LEVEL_UP event ⭐ NEXT
- `src/domain/LevelUpReward.ts` — pure `rollDrop(level, rng)` weighted against ITEM_REGISTRY
- Extend `gainExp` to loop per level gained → mint InventoryItem + emit `LEVEL_UP`
- EventBus: new `LEVEL_UP { newLevel, grantedItemId }` event + event-stream + observability (breadcrumb)
- Empty drop pool → warn + skip (AP E14)
- Tests: deterministic RNG, multi-level jump, minLevel gate, drop_weight=0 never picked
- **Unlocks Step 22.6 item reward retrofit** (boss grants guaranteed item instead of random roll)
- ~3h

### Step 22.9 (NEW v1.1) — Inventory UI + equip screen
- `src/react/screens/InventoryScreen.tsx` (4 slots + bag grid, rarity-border), route `/inventory`
- MainMenu "Kho đồ" button
- Equip/unequip actions wired to SaveState
- Stat preview panel showing totals from `computeEffectiveStats`
- ~4h

### Step 22.10 (NEW v1.1) — Equipment stat modifiers in combat
- `src/domain/EffectiveStats.ts` pure selector folding modifiers
- CombatScene reads effectiveMaxHp + per-element damage multipliers
- `gainExp` multiplies by `(1 + expGainPct)` before threshold roll
- Crit chance roll via `rng() < critPct` → `isCrit: true` to `calculateDamage`
- E2E: wand-fire-01 equipped → faster boss kill
- ~3h

### Step 3.5 (NEW v1.1, **still skipped**) — Server-side validation mock
Vite plugin `/api/quiz/validate` endpoint. Strip `correct_option_id` from bundled JSON. HMAC-signed receipt. ~3h.
⚠️ Block before public launch — still deferred.

---

## 📋 CEO Review TODOs (accepted)

| # | TODO | Status |
|---|---|---|
| 1 | Error & Rescue Map (11 gaps) | ⏳ Partial — EventBus error boundary + SaveState HMAC + AP E11-E14 spec'd Step 22.7. Code for E11-E14 landed, E2-E5/E7-E10 still deferred |
| 2 | Client validation server-side | ⏳ Step 3.5 pending |
| 3 | SaveState + EventQueue HMAC sign | ✅ SaveState done Step 9.5. EventQueue HMAC wrap still pending |
| 4 | EventBus error boundary | ✅ Done Step 1 + Step 18.5 Sentry wiring |
| 6 | Observability Phase 1 (Sentry + 5 metric) | ✅ Done Step 18.5 + wired at shell Step 21 |
| 7 | Step 22 E2E re-estimate 12h | ✅ Done Step 22 (shipped in ~5s runtime, well under 90s target) |
| 8 | Property-based test ElementSystem | ✅ Done Step 2 |

**Skipped:** #5 Anti-addiction (user vetoed), #9 Wireframe iteration (defer), #10 Deploy spec (defer Phase 3).

---

## 📦 New: Task C Equipment Expansion (Antigravity review 22/04/2026)

Landed docs (`f5c5ee8`), schema (`e7258b8`). Remaining: Steps 22.8-22.10.

**What the expansion adds:**
- AP §11: Item / EquipmentSlot / InventoryItem / EquipmentMap entities + CL6bis (level-up reward) + CL7 (equipment stat modifiers)
- SaveState schema v2: `inventory[]`, `equipment{hat,outfit,wand,shoes}`, `lastLevelUpAt` — additive migration from v1
- `src/data/staticConfig/items.ts` — 10-item registry per Appendix H (3 hats, 3 outfits, 3 wands, 1 boots)
- Error registry E11-E14 (migrate / equip / unequip / empty drop pool)

**Asset delivery pending:** Phase 2 Antigravity batch ships the 20 equipment PNGs (10 icons + 10 sprites) per Appendix H §H.5 checklist.

---

## 📦 Phase 2 — NOT STARTED

**Trigger gửi Antigravity:** ✅ Core 26 steps complete. Phase 2 batch plan + Appendix H equipment prompts ready to send.

- 108 PNG planned (15 monsters mid/boss + Sóc Combat + 3 biomes + Pet Breeding UI + quiz extras) + 20 equipment PNG (Appendix H)
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
| R1 | Prodigy sprites → dev/internal only | Accepted (user dec) |
| R2 | AP v1.0 size 34.8kb warn (>20kb) | Warn-only; AP v1.1 at 16.6kb OK |
| R3 | Anti-addiction NĐ 147/2024 | Vetoed (user) |
| R4 | Production scope vs MVP AP v1.1 | Accepted — AP v1.1 + §11 Task C expansion, no refactor |
| R5 | Step 3.5 server validation pending | ⏳ Block before public launch |
| R6 | Aldergasp boss sprite not delivered (CombatScene renders default placeholder) | Defer to Phase 2 batch |
| R7 | Step 22.6 item reward — boss gives only 500 EXP, no guaranteed item yet (depends on 22.8 drop table) | Explicit TODO in `CombatScene.handleVictory` |
| R8 | EventQueue HMAC wrap (CEO TODO #3 partial) | Defer — structure leaves seam |

---

## 🧪 Test Commands

```bash
cd app
npm run dev              # Vite dev :5173
npm run test:run         # Vitest unit tests (351)
npm run test:e2e         # Playwright E2E (3 specs)
npm run lint             # ESLint flat config
npm run typecheck        # tsc --noEmit
npm run verify           # AP compliance gate
npm run build            # Production build
```

Harness gates all green. Pre-commit hook enforces lint-staged + typecheck + verify.

---

## 🎯 Next Session Action

**Immediate:** Step 22.8 — Level-up Reward Drop Table.

Load `ITEM_REGISTRY` + `SaveStateStore.gainExp` + `addInventoryItem`. Build:
- `src/domain/LevelUpReward.ts` pure `rollDrop(level, rng)` weighted by `drop_weight`, filtered by `minLevel`
- Extend `gainExp`: for each level gained → `rollDrop` → `addInventoryItem` → emit `LEVEL_UP { newLevel, grantedItemId }`
- Extend `EventBus` GameEvent union with `LEVEL_UP`
- Hook `eventStreamBridge` for new `level_up` append (extend discriminated union in EventStreamStore)
- Sentry breadcrumb on LEVEL_UP (keeps 5-metric contract)
- Retrofit `CombatScene.handleVictory` boss branch → `rollDrop(newLevel)` guaranteed after the EXP cascade

Test: deterministic RNG seed, multi-level jump, minLevel gate, drop_weight=0 never picked, empty pool warn+skip, LEVEL_UP event fires once per level.
