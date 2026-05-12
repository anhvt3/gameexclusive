# ARCHITECTURE PACK — Game_SS3_exclusive v1.1

> **Project:** Game_SS3_exclusive
> **Version:** v1.1 (CEO review + Harness Sprint 1 applied)
> **Date:** 22/04/2026
> **Status:** APPROVED for Phase 1 build
> **Supersedes:** v1.0 (keep v1.0 for historical reference)
> **Related:** Appendix A-E unchanged, `IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`, `harness_checklist_*.md`

---

## 0. CHANGE SUMMARY v1.0 → v1.1

| Delta | Section affected | Reason |
|---|---|---|
| Reframe: **internal product for active Clevai students**, not commercial clone | 0, 6 | CEO review |
| Expansion **Q2 Guild (single-player leaderboard)** added Phase 1 | 8 | CEO review accept |
| Expansion **Q4 Boss Raid (single-player quests)** added Phase 1 | 8 | CEO review accept |
| Expansion **Q8 Pet Breeding** added Phase 2 | 8 | CEO review accept |
| Multiplayer (Guild + Boss Raid live) deferred **Phase 5** | 8 | CEO review single-player first |
| **Full Error & Rescue Registry** — 11 gaps closed | 2 (new) | CEO review critical |
| **Security hardening**: client→server validation gate, SaveState HMAC, IndexedDB HMAC | 3 (new) | CEO review 4 CRITICAL gaps |
| **EventBus error boundary** — code-enforced via seed file | 3.1, 7 | Harness Sprint 1 ✅ |
| **Observability bumped to Phase 1** (Sentry + 5 metrics + runs.jsonl) | 6 | CEO review NĐ Phase 5 was too late |
| **Anti-addiction timer** — REJECTED by user (internal product) | 6.4 | CEO review decision |
| **Harness gates operational** — ESLint boundaries, verify.ts, husky, CI | 3.1, 7 | Harness Sprint 1 ✅ |
| Step 22 E2E re-estimated **4h → 12h** + `window.__GAME__` exposé | ISP | CEO review |
| Property-based test (`fast-check`) required cho ElementSystem | 5, ISP | CEO review |
| Rollback/Feature flag posture added | 9 (new) | CEO review gap |

**v1.0 sections not changed:** 1 (Entity), 2.x (Process 1/2/3/5), 4 (Asset Pipeline), 5 (Data Contracts), 10 (Approval Matrix). Xem v1.0 cho chi tiết.

---

## 2. ERROR & RESCUE REGISTRY (FULL — closes CEO review gap)

### 2.1 Exception taxonomy (code-level, có class cụ thể)

| # | Method / Codepath | Failure mode | Exception class | Rescued? | Rescue action | User sees | Log level |
|---|---|---|---|---|---|---|---|
| E1 | `LearningObjectAdapter.fetch` | Zod parse fail | `ZodError` | ✅ | Retry 1x + fallback mock | "Câu hỏi đang tải lại..." | error |
| E2 | `LearningObjectAdapter.fetch` | Network timeout | `NetworkTimeoutError` | ✅ | Retry 2x exponential backoff | "Kết nối chậm, thử lại..." | warn |
| E3 | `LearningObjectAdapter.fetch` | 401 token expired | `AuthError` | ✅ | Silent refresh → retry | Nothing | info |
| E4 | `LearningObjectAdapter.fetch` | 500 server | `ServerError` | ✅ | Retry 2x + report | "Server lỗi, Sóc đang xin lỗi!" | error |
| E5 | `EventBus.emit` listener throw | Any exception | `unknown` caught | ✅ | Console.error + ignore | Nothing | error |
| E6 | `ProgressSyncAdapter.batch` | 409 conflict (dup idempotency) | `ConflictError` | ✅ | Treat as success, dequeue | Nothing | info |
| E7 | `ProgressSyncAdapter.batch` | 429 rate limit | `RateLimitError` | ✅ | Backoff 5s retry | Nothing | warn |
| E8 | `Phaser.Scene.start` | Asset 404 | `AssetLoadError` | ✅ | Fallback placeholder sprite + telemetry | Asset tạm thời bị thiếu | error |
| E9 | `IndexedDB.put` | Quota exceeded | `QuotaExceededError` | ✅ | Drain oldest 100 events → retry | "Game đã dọn bộ nhớ..." | warn |
| E10 | `SaveStateStore` rehydrate | Schema migration fail | `ZodError` | ✅ | Backup old → reset to v1 defaults | "Lưu game cũ không tương thích, bắt đầu session mới" | warn |
| E11 | `CombatStateMachine.next` | Invalid transition | `InvalidTransitionError` | ✅ | Log + force INIT state | "Combat bị lỗi, quay về map" | error |

### 2.2 Never-rescue list (must propagate)
- `ConfigurationError` — dev mistake, crash loud
- `SecurityViolationError` (HMAC mismatch) — log + lock session
- `AssertionError` — test/dev only

### 2.3 Rescue patterns (forbidden)
- ❌ `catch (e) {}` — always log
- ❌ `catch (Exception e)` / `catch (any)` — always narrow
- ❌ Catch + silent continue without user feedback when user is blocked

### 2.4 Tests required per error
Mỗi exception class phải có:
- Unit test trigger path
- Unit test rescue path (mock error, assert rescue action fires)
- Happy path vẫn work sau rescue

---

## 3. SECURITY — CLIENT-SIDE VALIDATION HARDENING

### 3.1 Client-side answer validation (CRITICAL fix v1.0 → v1.1)

**Problem v1.0:** Mock JSON ship `correct_option_id` → học sinh mở DevTools xem đáp án.

**v1.1 solution (Phase 1 mock + Phase 3 server):**

```ts
// Phase 1 (mock): correct answer strip ở build-time
// Mock JSON vẫn có correct_option_id NHƯNG bundle loader strip field trước khi ship
// QuizFactory gọi /api/quiz/validate ngay cả ở Phase 1 — mock server trong Vite plugin
// Phase 3: same endpoint, Supham backend

POST /api/quiz/validate
Body: { lo_id, quiz_type_id, user_answer, session_id, hmac }
Response: { correct: bool, explanation?: string, score: number, signed_receipt: string }
```

**Implementation checklist:**
- [ ] Vite plugin: strip `correct_option_id`, `correct_answer`, `alternatives` từ bundled JSON
- [ ] Dev server mock endpoint `/api/quiz/validate`
- [ ] Phase 3: real Supham endpoint + JWT auth
- [ ] Response HMAC: server signs `{student_id, lo_id, correct, ts}` với session key

### 3.2 SaveState HMAC (CRITICAL fix)

**Problem v1.0:** `localStorage.game_ss3_save_v1` plain JSON → tamper 1-click.

**v1.1 solution:**
```ts
// Session key derived from JWT on login, stored only in memory (not localStorage)
saveState = { data: {...}, hmac: hmacSha256(JSON.stringify(data), sessionKey) }
// On load: verify HMAC, if fail → log SecurityViolationError + force fresh save
```

### 3.3 IndexedDB Event Queue HMAC (CRITICAL fix)
Cùng approach với SaveState. Mỗi event `{ ...payload, hmac }`. Server reject batch nếu HMAC mismatch.

**`TURN_RESOLVED`** (Sprint A): emitted by CombatResolver after every
applied damage step. Payload = `{ sourceId, targetIds[], action:
'spell'|'pet-attack'|'monster-attack', damage, isCrit, remainingHp }`.
Replaces `DAMAGE_APPLIED` (deprecated for one release; remove in
Sprint B).

### 3.4 Tolerance model
- Student chưa login → generate ephemeral session key, game vẫn chơi được nhưng không sync progress
- Key rotation: rotate mỗi 24h hoặc khi user re-login
- **Không hard-block** nếu HMAC fail ở local — log + reset (vì có thể client lỗi, không phải attack)

---

## 6. OBSERVABILITY — BUMPED TO PHASE 1

### 6.1 Sentry error tracking
- Free tier Sentry SDK integrated ở `main.tsx`
- Capture: uncaught exceptions, unhandled rejections, EventBus rescue events
- Tag every event với `student_grade`, `current_scene`, `combat_id`, `lo_id`
- Sampling: 100% errors, 10% performance traces

### 6.2 5 Core Metrics (Phase 1 min)
| Metric | Event name | Dimensions |
|---|---|---|
| DAU | `game_session_start` | grade, day_of_week |
| Combat started | `combat_started` | monster_id, grade |
| Combat completed | `combat_completed` | monster_id, won, duration_ms |
| Quiz correct rate | `quiz_answered` | quiz_type_id, is_correct, time_spent |
| Session duration | `session_end` | duration_ms, quizzes_attempted |

Persist qua `runs.jsonl` local (harness có sẵn) + Phase 3 POST lên Supham.

### 6.3 1 dashboard đơn giản
Phase 1: Grafana Cloud free tier **HOẶC** static HTML dashboard đọc từ server log. Decision: Phase 2 quyết.

### 6.4 ~~Anti-addiction timer~~ — REJECTED (user decision)
Game internal cho active students Clevai, không launch public → không bắt buộc NĐ 147/2024 compliance. Nếu đổi hướng public launch sau, revisit.

---

## 7. BUG PREVENTION (v1.1 additions)

### 7.10 EventBus error boundary (code-enforced)
Seed file `src/bus/EventBus.ts` — `emit()` wrap `try/catch` around `emitter.emit()`. Listener throw không propagate. ✅ Harness Sprint 1.

### 7.11 Save state corruption recovery
Khi Zod rehydrate fail, **không crash game**. Backup cũ vào `localStorage.game_ss3_save_v1.backup` + reset. User thấy dialog Sóc giải thích.

### 7.12 Race condition khi class 30 students cùng combat
**Load analysis:** 1 class 30 students × 60s quiz = ~30 POST/min peak lên Supham. Không worry production scale. Nhưng batch sync (10 event / 60s cap) giảm xuống ~5 POST/min/student → **150 POST/min/class**. Supham backend cần confirm rate limit.

---

## 8. PHASED ROADMAP (v1.1)

Sprint A semantic shift: `PLAYER_TURN` becomes `ACTOR_TURN` with a
`currentActorId` field driven by `TurnQueue.next()`. Hero turn keeps
the existing quiz-gate branch; pet and monster turns auto-resolve via
`CombatResolver` synchronously inside `handleQuizResult`. End check
runs after every resolution.

| Phase | Scope | Timeline | Deliverable |
|---|---|---|---|
| **P1: Vertical Slice** | React+Phaser engine, 1 biome, 5 quái tier-starter, 3 quiz types (MC/Cloze/DD), Mascot Sóc guide, **single-player guild leaderboard (static)**, **single-player boss quest (1 boss)**, mock JSON, server-side validation (mock), HMAC signing, Sentry + 5 metrics, harness gates active. | 4 tuần (↑ từ 3 tuần vì thêm scope) | Playable demo + telemetry |
| **P2: Full Roster + Pet Breeding** | 20/20 quái, 7/11 quiz types, 3 biome maps, KEN + Math subject, **Pet Breeding mechanic (Q8)**, Mascot Sóc Combat form. | +5 tuần | Demo đầy đủ roster + collection loop |
| **P3: Supham API Integration** | Replace mock endpoints bằng Supham API thật, JWT, progress sync, idempotency, offline queue. | +3 tuần | Staging đầu-cuối |
| **P4: Custom Art + Mobile Portrait** | Nano Banana generate 20 quái + mascot, responsive portrait, touch polish. | +5 tuần | Production-ready visual |
| **P5: Multiplayer — Guild realtime + Boss Raid realtime** | WebSocket/Socket.io, realtime leaderboard, shared boss HP, schoolwide event. | +5 tuần | Social launch |

**Total MVP → full social launch: ~22 tuần** (↑ từ 18 tuần v1.0).

---

## 9. ROLLBACK & FEATURE FLAG POSTURE (new section)

### 9.1 Feature flags
Phase 1 simple JSON `public/config/flags.json` fetch at boot:
```json
{ "combat_enabled": true, "new_quiz_type_8": false, "boss_raid": true, "debug_overlay": false }
```
Phase 3+: remote config service.

### 9.2 Rollback strategy per phase
| Phase | Rollback mechanism | RTO |
|---|---|---|
| P1-P2 (local build) | Git revert + redeploy Vite build | 5 phút |
| P3 (Supham integration) | Feature flag `supham_sync_enabled=false` → fall back mock | 1 phút |
| P4 (custom art) | Asset versioning `/v1/sprites/` vs `/v2/sprites/` — flip cache header | 30 giây |
| P5 (multiplayer) | Kill switch `multiplayer_enabled=false` → downgrade single-player | 30 giây |

### 9.3 Save state migration
`SaveStateStore.version` bump trigger migration. Migration test bắt buộc cho mỗi bump.

---

## 10. UPDATED APPROVAL MATRIX

AP v1.1 = **Type C change** (đụng Event Layer spec + Security hardening) → **POSUP + ARCH phải duyệt** trước khi apply code changes.

**Reviewers:**
- POSUP: po2@clevai.edu.vn ✅ self-approve (này là spec)
- ARCH: [cần anh đề cử]

---

## 11. INVENTORY, EQUIPMENT & LEVEL-UP REWARD (NEW, v1.1 addendum)

**Trigger:** Antigravity review 22/04/2026 flagged core Prodigy-parity gap —
`SaveStateStore` had no `inventory` / `equipment`, `gainExp` gave no tangible
reward at level-up, and Appendix F only covered UI chrome (not actual items).
Classified **Type C** (Entity Schema + CL change) → POSUP + ARCH approved.

This section is additive. No existing entity is removed or renamed; the
SaveState schema bumps `version: 1 → 2` with a forward migration that
injects empty `inventory: []` + empty `equipment: {...}` for players who
pre-date the upgrade.

### 11.1 New Entities

```ts
// src/types/item.ts — enum + id
export const ITEM_SLOTS = ['hat', 'outfit', 'wand', 'shoes'] as const;
export type EquipmentSlot = (typeof ITEM_SLOTS)[number];

export const ITEM_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];

// src/data/staticConfig/items.ts — registry entry
export interface ItemDef {
  id: string;                // kebab-case, stable across saves ('wand-fire-01')
  slot: EquipmentSlot;
  displayNameVi: string;
  rarity: ItemRarity;
  iconKey: string;           // preload key, e.g. 'item_wand_fire_01_icon'
  spriteKey: string;         // character-overlay sprite key
  modifiers: ItemModifier[]; // see §11.3
  drop_weight: number;       // relative weight in level-up drop table
  minLevel: number;          // gated — can't drop before this level
}

// Instance carried by the student. Stacking is out of scope — each instance
// is its own row so future enchantments/durability plug in cleanly.
export interface InventoryItem {
  instanceId: string;        // uuid at creation
  itemId: string;            // references ItemDef.id
  acquiredAt: number;        // ms epoch
}

export type EquipmentMap = {
  [K in EquipmentSlot]: string | null;  // instanceId or null
};
```

**SaveState schema v2 delta (breaking from v1):**
```ts
{
  ...v1,
  inventory: InventoryItem[],          // default []
  equipment: { hat: null, outfit: null, wand: null, shoes: null },
  lastLevelUpAt: number | null,        // debounce reward animations
}
```

Migration v1 → v2: additive only, never fails → no backup/reset path needed.
Registered in `SaveStateStore.persist({ migrate })`.

**v3 migration (Sprint A):** add `active_pet_instance_id: string | null`
(default `null`). Backwards-compatible — v2 saves auto-migrate.
HMAC revalidation runs after migration.

### 11.2 New Complex Logic — CL6bis "Level Up Reward"

Extends existing CL6 (EXP curve). When `gainExp` pushes level across a
threshold, **for each** level gained:

1. Roll drop table filtered by `minLevel ≤ newLevel` weighted by `drop_weight`.
   Drop is deterministic in tests via injectable `rng` (default
   `Math.random`).
2. Mint an `InventoryItem` with fresh `instanceId` + `acquiredAt = Date.now()`.
3. Append to `inventory[]` via Zustand set (immutable).
4. Emit `LEVEL_UP` event on EventBus: `{ newLevel, grantedItemId }` — picked
   up by UI to show banner + observability.

**Rules:**
- One item per level-up level (multi-level jumps grant multiple items).
- Dupes allowed — stacking is not modeled in Phase 1.
- No coins/stars in v1.1; those come with economy work in Phase 2.

### 11.3 New Complex Logic — CL7 "Equipment Stat Modifiers"

```ts
export type ItemModifier =
  | { kind: 'maxHp'; delta: number }                      // flat +N max HP
  | { kind: 'spellDamage'; element: Element; pct: number } // +5% Fire damage
  | { kind: 'critChance'; pct: number }                   // +N% crit roll
  | { kind: 'expGain'; pct: number };                     // +N% EXP gained
```

`computeEffectiveStats(saveState)` is a pure selector that folds the
equipped modifiers into a single `EffectiveStats` object used by:
- `CombatScene` reads `effectiveMaxHp` + per-element damage multipliers
  when applying damage (extends `ElementSystem.calculateDamage` call site).
- `HpBar` reads `effectiveMaxHp`.
- `gainExp` multiplies incoming EXP by `1 + expGainPct`.

Pure — no side effects. Test harness: property test that unequipping an
item always returns stats to the no-equipment baseline (inverse invariant).

### 11.4 Error Registry Additions

| # | Operation | Failure | Exception | Rescue | User msg |
|---|---|---|---|---|---|
| E11 | SaveState migrate v1→v2 | Missing inventory field | `SchemaMigrationError` | ✅ Inject defaults, re-sign | Silent |
| E12 | `equipItem(slot, instanceId)` | instanceId not in inventory | `InvalidEquipError` | ❌ Propagate — dev bug | "Trang bị lỗi, thử lại" |
| E13 | `unequipItem(slot)` | Slot already null | `noop` | ✅ Early return | Silent |
| E14 | Drop table roll | Empty pool for level | `EmptyDropTableError` | ✅ Skip reward + warn | Silent |

### 11.5 Element matrix (Sprint A)

8×8 multiplier table; lookup via `domain/ElementMatrix.ts`. Pairs:
Fire→Plant ×2, Fire→Ice ×2, Fire→Water ×0.5, Fire→Earth ×0.5,
Water→Fire ×2, Water→Earth ×2, Water→Plant ×0.5, Water→Storm ×0.5,
Plant→Water ×2, Plant→Earth ×2, Plant→Fire ×0.5, Plant→Ice ×0.5,
Ice→Plant ×2, Ice→Storm ×2, Ice→Fire ×0.5,
Storm→Water ×2, Storm→Astral ×2, Storm→Earth ×0.5, Storm→Ice ×0.5,
Earth→Fire ×2, Earth→Storm ×2, Earth→Shadow ×2, Earth→Plant ×0.5,
Astral→Shadow ×2, Astral→Storm ×0.5,
Shadow→Astral ×2, Shadow→Earth ×0.5.
Unlisted pairs default to ×1.0.

### 11.6 Pet entity schema (Sprint A)

`PetEntity extends CombatEntityBase` with `petInstanceId: string` and
`attackPower: number`. PetDef registry in `data/staticConfig/pets.ts`
ships 6 starters (bunbleaf / pyropup / aquakit / frostfae / voltchick /
terraowl) keyed by codename and element. Pet auto-attack damage =
`level × PET_DAMAGE_BASE_MULTIPLIER × elementMultiplier × jitter` where
constants live in `data/staticConfig/combatConstants.ts`.

### 11.7 Approval & Task Classification

| Change | Task | Reviewer |
|---|---|---|
| New entity Item/EquipmentSlot | C | POSUP + ARCH |
| SaveState schema v2 migration | C | POSUP + ARCH |
| CL6bis Level-up reward | C | POSUP + ARCH |
| CL7 Equipment stat modifiers | C | POSUP + ARCH |
| Appendix H asset prompts | B | POSUP |

All approved 22/04/2026 via Antigravity review session.

---

## HARNESS STATUS (new metadata section)

Harness Sprint 1 committed `bc3ebfd` (22/04/2026):
- ✅ Git init, Vite+React+TS+Tailwind
- ✅ Vitest 4/4 pass, Playwright config
- ✅ ESLint flat config + boundary rules (`import/no-restricted-paths` 11 zones)
- ✅ Husky pre-commit (lint-staged + typecheck + verify)
- ✅ `scripts/verify.ts`: 4 checks (AP size WARN, Clevai term, CLAUDE.md principles, no secrets)
- ✅ CI workflow: harness + E2E + Task A/B/C label enforcement
- ✅ `src/bus/EventBus.ts`: typed + cleanup pairing + error boundary

Sprint 2 schedule (parallel với ISP Step 1-5):
- H14 Zod adapter-only pattern (ISP Step 3)
- H16 Claude Code Hooks PreToolUse + Stop
- H17 Coverage threshold active (60% default)
- H19 Sentry init (per Section 6)

---

**END AP v1.1.** Đi kèm ISP v1.1 cho Phase 1 execution plan.

---

## Phase 2.5 — Prodigy-Parity Roadmap (POSUP approved 29/04/2026)

POSUP commissioned a parity push between current Phase 1+1.5 (shipped)
and original Phase 2 (Pet Breeding + 15-monster roster). Driven by a
148-frame audit of a reference edu-RPG session.

Sprint sequence and per-sprint scope: see
`docs/roadmap_phase2.5_prodigy_parity.md`.

Order: **A** (multi-party combat — Type C) → **B** (world / zone /
boss-hall scenes — Type C) ∥ **E** (polish + onboarding — Type A) →
**C** (pet system, depends on A — Type B) → **D** (quests panel —
Type B) → **F** (free daily rewards / loot jar UI, premium dropped per
POSUP scope — Type B).

Each sprint produces its own design spec at
`docs/superpowers/specs/<date>-<sprint>-design.md`. Type C sprints
also require ARCH sign-off before any code lands.

---

## Sprint B — Delta (02/05/2026)

Sprint B adds the World Map → Zone → Boss Hall scene chain. Type C
(Event Layer + Scene chain delta + Entity Schema delta).

### §3.1 — Folder structure additions
- `domain/pathfinding/` — pure-TS WalkableMask + AStar + waypoint smoothing
- `data/staticConfig/islands.ts` — 8 islands (3 active + 5 locked)
- `react/overlays/LockedIslandTooltip.tsx`
- `types/zone.ts`

### §6 — Navigation flow (post-Sprint-B default)
WorldMapScene → ZoneScene(entrance) → ZoneScene(path) → BossHallScene
→ RewardChestOverlay → WorldMapScene.

Phase 1 WorldScene retained behind `useLegacyWorldScene` flag (transient,
test-only).

### §7 — Scene lifecycle
WorldScene marked legacy. Three new Phaser scenes:
- `WorldMapScene` — 8 island markers, locked-island silhouette + tooltip
- `ZoneScene` — entrance + path branches, A* point-and-click on a
  walkable mask, monster overlap → CombatScene
- `BossHallScene` — fresh / defeated-not-claimed / conquered branches;
  EXIT_COMBAT(won, bossId) → spawn chest; chest click → CHEST_OPENED
  → React overlay; "Quay lại" → retreat to WorldMapScene

### §13 — SaveState v4 (additive over v3)
+ `defeatedBossIds: string[]` (deduped on append)
+ `claimedChestIds: string[]` (deduped on append)
+ `currentZoneId: string | null` (resume hint)
+ `useLegacyWorldScene: boolean` (transient, NOT persisted)

Migration: v3 → v4 initialises the three persisted fields to defaults;
v2 → v3 → v4 chain validated.

### §14 — EventBus catalog additions
+ `ENTER_ZONE { zoneId }`
+ `EXIT_ZONE { zoneId, reason: 'retreat' | 'completed' }`
+ `BOSS_DEFEATED { bossId, zoneId }`
+ `CHEST_OPENED { chestId, zoneId, items: { itemId, qty }[] }`
+ `LOCKED_ISLAND_HINT { islandId }`

### Pathfinding details
A* on a 16-px-block downsampled grid (1280x720 -> 80x45 cells). Octile
heuristic. No diagonal corner-cutting through walls. Iteration cap 5000.
Waypoints smoothed via Bresenham line-of-sight collinear merge.

### Asset delivery (parallel — Antigravity)
27 new PNGs declared in PHASE1_ASSETS: 1 world map + 8 island icons +
9 zone backgrounds + 9 walkable masks. Delivery is asynchronous; missing
PNGs log 404s in dev but do not block unit tests or the wiring contract.

---

## Sprint C — Delta (02/05/2026)

Sprint C ships the pet rescue + roster + leveling + evolution loop on
top of Sprint A's combat foundation. Type B (Entity Schema delta + v5
migration).

### §3.1 — Folder structure additions
- `domain/PetRescue.ts` — pure rolls (bucket, rarity, species)
- `domain/PetLeveling.ts` — XP curve, evolution stages, applyPetXp
- `react/overlays/PetRescueOverlay.tsx` — modal sparkle reveal +
  roster-cap picker
- `types/pet.ts` — PetInstance, PetRarity, PetEvolutionStage,
  multiplier tables, ROSTER_CAP

### §11.6 — Pet rescue rules (NEW)

Rescue rate per monster bucket (tier-based; level field reused if
present):
- weak (tier=starter): 10% per battle, weights 70/25/5/0
- mid (tier=mid|rare): 15%, weights 30/50/18/2
- boss (tier=boss OR is_boss=true): 30%, weights 0/40/50/10

Stat multipliers per rarity (HP × ATK):
- common 1.0, rare 1.15, epic 1.3, legendary 1.6

Evolution stages (derived from level):
- stage 1 (lvl 1-9): mult 1.0
- stage 2 (lvl 10-19): mult 1.3
- stage 3 (lvl 20+): mult 1.6

Per-level additive: +5 HP, +1 ATK per level above 1.

Pet level cap = pre-cascade hero level. XP propagation: active pet
(matched by active_pet_instance_id) gains 100% of scaled hero EXP per
battle. Inactive pets gain 0%. Pet always lags one cascade behind
hero — student must run another battle to catch up.

### §13 — SaveState v5
+ `ownedPets: PetInstance[]` (defaults `[]`)
- Existing `active_pet_instance_id` (v3) referenced by Sprint C as
  the equip slot for the roster.
- Migration v4→v5 additive; no behavioral change to v4 fields.

### §14 — EventBus catalog additions
+ `PET_RESCUE_OFFERED { petCodename, rarity }`
+ `PET_COLLECTED { petInstanceId, petCodename, rarity }`
+ `PET_RELEASED { petCodename, rarity, reason: 'rejected-offer' | 'roster-cap-replace' | 'manual' }`
+ `PET_LEVEL_UP { petInstanceId, newLevel, evolved }`

---

## Sprint D — Delta (02/05/2026)

Sprint D ships the centralized QuestEngine + 8-quest catalog (3 daily +
2 weekly + 3 main) + Quests Panel UI. Type B (Entity Schema delta + v6
migration). No scene/quiz/combat code modified — engine listens to
existing Sprint A-C events.

### §3.1 — Folder structure additions
- `domain/QuestEngine.ts` — class with start()/stop() lifecycle that
  subscribes once per source-event-type and translates matches into
  QUEST_PROGRESS emits + SaveState increments
- `domain/QuestCycle.ts` — UTC+7 daily/weekly anchor math (pure ms,
  no Date weirdness)
- `domain/QuestReward.ts` — tier→rarity rollDrop wrapper
- `data/staticConfig/quests.ts` — 8-quest catalog with declarative
  match predicates per quest
- `react/overlays/QuestProgressToast.tsx` — top-right ephemeral
  notification with ready-state sparkle variant
- `react/screens/QuestsPanel.tsx` — `/quests` route with daily/weekly/
  main tier sections + per-quest progress / claim / claimed states
- `types/quest.ts` — QuestId, QuestTier, QuestDef, QuestRewardTier,
  TIER_REWARD/TIER_LABEL_VI maps

### §11.7 — Quest schema (NEW)

QuestDef carries id, tier (daily/weekly/main), displayNameVi,
description, target (count goal), rewardTier (common/rare/epic),
source (GameEventType), and match (payload → delta) predicate.

QuestEngine subscribes once per unique source-event-type from the
catalog. On each emit, the engine runs all matching quests' match()
predicates; non-zero deltas trigger SaveState.incrementQuestProgress
(clamped at target, no-op if already claimed) and a QUEST_PROGRESS
event emit.

Refresh semantics:
- Daily quests reset at UTC+7 midnight (Vietnam local midnight).
- Weekly quests reset at UTC+7 Sunday-midnight.
- Main quests never reset; once claimed, stay claimed.
- refreshCyclesIfNeeded runs on app mount and window focus, NOT on
  every event (R2 mitigation — session crossing midnight keeps progress
  until next mount/focus).

Reward minting: claimQuestReward calls rollQuestReward (tier→rarity
filter on ITEM_REGISTRY, defers to LevelUpReward.rollDrop for the
weighted pick), mints an InventoryItem instance, pushes to inventory,
and pushes the questId to claimedRewards.

Monotonic counter policy: PET_COLLECTED-sourced quests count every
collect emit, not "currently owned". Release-and-re-collect could
inflate but rate-gating (Sprint C 10-30%) makes this practically a
non-issue.

### §13 — SaveState v6 (additive over v5)
+ `questProgress: Record<QuestId, number>` (default `{}`)
+ `claimedRewards: QuestId[]` (default `[]`)
+ `questCycleAnchors: { dailyEpochUtc7: number; weeklyEpochUtc7: number }`
  (default `{ dailyEpochUtc7: 0, weeklyEpochUtc7: 0 }` — `0` triggers
  first-run refresh)

### §14 — EventBus catalog additions / extensions
+ `QUEST_PROGRESS { questId: string; delta: number }` (NEW)
~ `CHEST_OPENED` payload extended with optional `label?: string` —
  defaults to "Về Bản Đồ" in `RewardChestOverlay` for back-compat
  with Sprint B/C; quest claims pass `label: "Đóng"`.

---

## Sprint E — Delta (02/05/2026)

Sprint E ships the onboarding + identity + settings surface. Type B
(spec drift from roadmap §E Type A — 4 new persisted SaveState fields
required). No combat code modified.

### §3.1 — Folder structure additions
- `react/onboarding/{OnboardingFlow,NamePicker,CustomizationPicker}.tsx`
- `react/mascot/TutorialArrow.tsx` + `sceneAnchorRegistry.ts`
- `react/screens/SettingsPanel.tsx`
- `types/identity.ts`
- `data/staticConfig/namePresets.ts`
- 8 hair PNG assets at `app/public/assets/player/hair/{male|female}_hair_{a,b,c,d}.png`

### §11.8 — Identity & Settings schema (NEW)

Player identity + settings are 4 SaveState fields:
- `playerName: string | null` — null triggers onboarding gate; set
  non-null persists chosen preset name
- `gender: 'male' | 'female'` — set together with playerName at name
  pick step; can be overridden at customization step
- `hairStyle: 'a' | 'b' | 'c' | 'd'` — picked at customization step
- `hintDifficulty: 'easy' | 'medium' | 'hard'` — controls quiz hint
  button visibility probability (50% / 25% / 0% per question)

Onboarding state machine:
- `playerName === null && !flags.tutorial_completed` → first launch
  full sequence (tutorial → name → customization)
- `playerName !== null && flags.tutorial_completed` → normal play
- Settings "Replay tutorial" → clears TUTORIAL_FLAG, opens tutorial-only
  mode (no name/customization re-prompt)

Tutorial gesture overlay: TutorialStep gains optional `target:
GestureTarget`. GestureTarget is a discriminated union:
`{ type: 'canvas'; selector: string }` (resolves via
sceneAnchorRegistry coordinates + canvas getBoundingClientRect) or
`{ type: 'dom'; selector: string }` (resolves via document
querySelector by data-testid). Engine routes to a single arrow
component which positions via getBoundingClientRect — no Phaser
import in the React layer.

Reward minting: NONE — Sprint E is pure UI + persistence.

### §13 — SaveState v7 (additive over v6)
+ `playerName: string | null` (default `null`)
+ `gender: 'male' | 'female'` (default `'male'`)
+ `hairStyle: 'a' | 'b' | 'c' | 'd'` (default `'a'`)
+ `hintDifficulty: 'easy' | 'medium' | 'hard'` (default `'medium'`)

### §14 — EventBus catalog additions / extensions
None. Sprint E is state-driven (Zustand subscriptions handle re-renders).

## Sprint F — Delta (07/05/2026)

Sprint F ships the return-tomorrow retention loop: daily login calendar
+ Loot Jar + Battle Stars currency. Type B (4 new persisted SaveState
fields + 3 new typed events). No combat code modified.

### §3.1 — Folder structure additions
- `types/dailyReward.ts`
- `domain/{StreakMultiplier,LoginCalendar,DailyRewardEngine,performLoginClaim}.ts`
- `data/staticConfig/loginCalendar.ts`
- `react/components/BattleStarsBadge.tsx` (new `components/` folder)
- `react/overlays/{DailyLoginCalendarOverlay,LootJarOverlay}.tsx`

### §11.9 — Daily Reward schema (NEW)

Four SaveState v8 fields drive the daily reward loop:
- `lastLoginAnchorUtc7: number` — epoch ms of the UTC+7 midnight at
  which the last login claim happened. 0 = never claimed. Reused
  `QuestCycle.dailyAnchor` for math (no new helper).
- `loginStreak: number` — consecutive UTC+7 days claimed. Reset to 1
  on miss (Q2 strict streak break).
- `battleStars: number` — currency earned on combat wins + login
  rewards. Earn-only this sprint; spend in Phase 3 shop.
- `lootJarBattlesSinceLast: number` — counter from 0..3.
  `LOOT_JAR_THRESHOLD = 3` exported. Reset to 0 on `claimLootJar`.

7-day calendar template (`LOGIN_CALENDAR_TEMPLATE`):
- Days 1, 2, 3, 5, 6: `{ kind: 'item', rarity: 'common', qty: 1 }`
- Day 4: `{ kind: 'stars', amount: 50 }`
- Day 7 (boss-of-week): `{ kind: 'mixed', rarity: 'rare', starsBonus: 100 }`

Streak multiplier stair (`STREAK_TIERS`, descending):
- 30+ days → ×2.0 (large flame 🔥🔥🔥)
- 7-29 days → ×1.5 (medium flame 🔥🔥)
- 3-6 days → ×1.2 (small flame 🔥)
- 1-2 days → ×1.0 (no flame)

`applyMultiplier` rounds stars/starsBonus via `Math.round`; item qty
uses `Math.max(1, Math.round(...))` to floor at 1.

`DailyRewardEngine` observer — listens `EXIT_COMBAT { won: true }`:
- Earn formula: `5 * heroLevel` (hero level read from SaveState; spec
  §4.3 originally read `p.combatLevel` but EXIT_COMBAT payload has
  no such field — documented deviation).
- Emits `BATTLE_STARS_EARNED { amount, total }` every win.
- Increments `lootJarBattlesSinceLast`; emits `LOOT_JAR_READY { battlesSince }`
  when counter reaches threshold (3). Resets to 0 on `claimLootJar`.
- Idempotent `start()` (subscriptions guard); explicit `stop()` clears.

`performLoginClaim(now, rng)` orchestration helper:
- Evaluates claimability via `evaluateLoginClaimable`
- Mints item(s) via `rollDrop` (common at hero level for days 1-6;
  rare at `GUARANTEED_LEVEL=99` sentinel for day-7 to bypass minLevel
  gating). Adds via `addInventoryItem`.
- Adds stars (days 4 + 7) via `addBattleStars`.
- Calls `commitLoginClaim(dailyAnchor(now), newStreak)` atomically.
- Emits `LOGIN_CLAIMED { dayOfCycle, streak, items }`.
- Returns null if not claimable (already claimed today).

`claimLootJar(heroLevel, rng?)` SaveState action:
- Precondition: `lootJarBattlesSinceLast >= LOOT_JAR_THRESHOLD`. Returns null otherwise.
- Mints EXACTLY 3 items via `rollDrop` against ITEM_REGISTRY (common pool).
- THROWS on `rollDrop` returning null — internal-only fail-loud invariant
  (registry guarantees common items at level >= 1 via test).
- Resets counter to 0. Returns ItemDef[] length 3.

### §13 — SaveState v8 (additive over v7)
+ `lastLoginAnchorUtc7: number` (default `0`)
+ `loginStreak: number` (default `0`)
+ `battleStars: number` (default `0`)
+ `lootJarBattlesSinceLast: number` (default `0`)

Migration v7→v8 additive: `if (version < 8)` injects defaults. v6 saves
still upgrade through v7→v8 chain.

### §14 — EventBus catalog additions / extensions
+ `BATTLE_STARS_EARNED { amount: number; total: number }` — engine→bus, consumed by BattleStarsBadge
+ `LOOT_JAR_READY { battlesSince: number }` — engine→bus, consumed by LootJarOverlay
+ `LOGIN_CLAIMED { dayOfCycle: number; streak: number; items: string[] }` — overlay→bus, observability seam

## Phase 3 — Delta (12/05/2026)

Phase 3 ships spend-side economy (Shop), pet collection arc (Breeding), and Server Validation seam (Step 3.5). Type C: SaveState v8→v9 + 4 new EventBus events + new Vite middleware surface.

### §3.1 — Folder structure additions
- `types/{shop,breeding}.ts`
- `domain/{ShopEngine,PetBreedingEngine,ServerValidator,performShopPurchase,performBreedingStart,performBreedingHatch}.ts`
- `data/staticConfig/{shopCatalog,breedingPairs,breedingCosts}.ts`
- `react/components/{ShopItemCard,PetSlot,EggHatchAnim}.tsx`
- `react/overlays/{ShopOverlay,PetBreedingOverlay}.tsx`
- `server/validationRoutes.ts`

### §11.10 — Shop schema (NEW)

3 SaveState v9 fields:
- `shopStock: ShopItemSlot[]` — 5-slot daily rotating (3 common + 1 rare + 1 epic per Q3 hard cap)
- `shopStockRefreshedAt: number` — UTC+7 anchor of last refresh
- `purchaseHistory: Record<string, number>` — lifetime per-itemId counts

Pricing (Q2): common 25-50 stars · rare 100-200 · epic 400-600.

Stock refresh reuses `QuestCycle.dailyAnchor`. Refresh triggers on `AppRouter` mount + window focus. `SHOP_STOCK_REFRESHED` event emitted post-refresh.

Catalog (`shopCatalog.ts`) covers all 10 real ITEM_REGISTRY entries; `ShopEngine.rollStock` samples 3+1+1 slots per cycle.

### §11.11 — Breeding schema (NEW)

1 SaveState v9 field:
- `breedingChamber: BreedingSession | null` — single active session (multi-slot defer Phase 4)

`BreedingSession` snapshots offspring spec at "Breed" click (no re-roll at hatch). `durationMs = 0` Phase 3 (Q5 instant). `costBattleStars` charged at start per Q4 cost table:
- common 50 · rare 200 · epic 500 · legendary 1000

Parents stay in roster (Q4). Cost charged via new `spendBattleStars(amount)` SaveState action (mirrors invariant pattern of Sprint F `claimLootJar`).

Compatibility formula (Q6):
- Same element → MEDIUM (×1.0, fall back to higher-rarity parent codename, no rarity upgrade)
- Cross-element with `BREEDING_PAIRS` matrix → HIGH (×1.5, catalog codename, upgrade chance = 0.45)
- Cross-element without matrix → LOW (×0.5, fallback codename, upgrade chance = 0.15)

Roster cap (Q7): `performBreedingStart` returns `roster_full` when `ownedPets.length >= ROSTER_CAP`.

`BREEDING_PAIRS` (15 entries) covers C(6,2) combinations of 6 Sprint C starter elements (Fire, Water, Plant, Ice, Storm, Earth). All `offspringCodename` resolve to STARTER_PETS roster.

### §11.12 — Server validation seam (NEW)

1 SaveState v9 field:
- `clientNonce: number` — monotonically incrementing, replay protection

`ServerValidator.validateAction(endpoint, payload)`:
- HMAC-signs `${nonce}:${body}` via project's WebCrypto `signHex` + `deriveKeyFromString` (Step 9.5 seam)
- POSTs to `/api/{shop,breed}/validate`
- Bumps `clientNonce` BEFORE fetch (so replay attempts always fail even on network error)
- Soft-fails on network error (`console.warn` + `ok: true, reason: 'fetch_failed_soft_allow'`) — Phase 3 internal-deploy treats validation as advisory

Vite middleware (`server/validationRoutes.ts`) verifies HMAC + nonce, returns 200/400/401. Production build skips middleware; client falls through soft-fail.

Shared dev secret: `phase3-game-ss3-validation-secret-v1` (both client `ServerValidator` and server middleware derive same CryptoKey). Phase 4+ can rotate via env var.

### §13 — SaveState v9 (additive over v8)
+ `shopStock: ShopItemSlot[]` (default `[]`)
+ `shopStockRefreshedAt: number` (default `0`)
+ `purchaseHistory: Record<string, number>` (default `{}`)
+ `breedingChamber: BreedingSession | null` (default `null`)
+ `clientNonce: number` (default `0`)

Migration v8→v9 additive: `if (version < 9)` injects defaults.

### §14 — EventBus catalog additions
+ `SHOP_STOCK_REFRESHED { slots: ShopItemSlot[]; anchorUtc7: number }` — SaveState refresh → bus → ShopOverlay
+ `SHOP_PURCHASE_COMPLETED { itemId: string; priceCharged: number; stockRemaining: number }` — orchestration → bus → toast/analytics
+ `BREEDING_STARTED { parentA, parentB, durationMs, expectedRarity }` — orchestration → bus → analytics
+ `EGG_HATCHED { offspringInstanceId, rarity, codename }` — orchestration → bus → toast/celebration

### §11.13 — New SaveState v9 actions (8)
- `spendBattleStars(amount)` — invariant throw on `amount<=0` or `balance<amount`
- `refreshShopStockIfNeeded(now?)` — idempotent
- `applyShopPurchase(itemId, priceCharged)` — atomic mint+spend+stock-- +history
- `startBreeding(session)` — atomic chamber set + stars spend; throws on busy/insufficient
- `clearBreeding()` — chamber → null
- `bumpClientNonce()` — +1
- `isShopStockFresh(now?)` — false when refreshedAt=0, else anchor compare
- `isBreedingChamberBusy()` — boolean

