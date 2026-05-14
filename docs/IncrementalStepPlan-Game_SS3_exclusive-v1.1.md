# Incremental Step Plan — Game_SS3_exclusive v1.1

> **Supersedes:** v1.0
> **Source of truth:** AP v1.1
> **Scope delta:** harness Sprint 1 done → Step 0 completed; add server-validation + HMAC steps; revise Step 10, Step 22
> **Date:** 22/04/2026

---

## Execution Protocol

Áp dụng SUBSTEP 1 + 2 như v1.0 (xem v1.0 doc cho full protocol). Không repeat ở đây.

---

## Status Snapshot 22/04/2026

| Step | Status | Commit/Note |
|---|---|---|
| **Step 0** Repo & Tooling Bootstrap | ✅ **DONE** | Harness Sprint 1 `bc3ebfd` |
| **Step 1** Typed Event Bus | ✅ **DONE** (seed version) | `src/bus/EventBus.ts` + 4 tests pass |
| Step 2 onward | ⏳ pending | |

**→ Start từ Step 2** với ISP v1.1.

---

## v1.1 Change Log

| Change | Step | Why |
|---|---|---|
| Step 0 **DONE** via harness Sprint 1 | 0 | Committed |
| Step 1 **DONE** (seed EventBus + 4 tests) | 1 | Committed |
| Step 2 ElementSystem — **add `fast-check` property-based test** | 2 | CEO TODO #8 |
| **Step 3 spec fix**: v1.0 wording "loadMockLOs(3,'G5') returns MathG5 + KEN G8 (total 4)" is semantically wrong — the function filters strictly by grade. Corrected to "G5 only (3 LOs)". Implementation at commit `1f1bf44` is correct; v1.0 spec was imprecise. | 3 | Discovered during implementation |
| **NEW Step 3.5**: Server-side validation gate (mock endpoint) | 3.5 | CEO critical #2 |
| **NEW Step 9.5**: HMAC signing wrapper for SaveState + EventQueue | 9.5 | CEO critical #3 |
| Step 10 — replace manual memory leak test với automated assertion | 10 | CEO TODO #7 |
| Step 18.5: Sentry init + 5 metrics wiring | 18.5 NEW | AP v1.1 Section 6 |
| Step 19 — add Zod event schema validation trước append | 19 | CEO #1 |
| Step 22 — re-estimate **4h → 12h** + `window.__GAME__` exposé | 22 | CEO TODO #7 |
| **NEW Step 22.5**: Guild leaderboard (single-player static) | 22.5 NEW | CEO Q2 accept |
| **NEW Step 22.6**: Boss quest (1 boss, single-player) | 22.6 NEW | CEO Q4 accept |

---

## Updated Step Overview — 26 steps (v1.1)

| # | Step | Effort | Status |
|---|---|---|---|
| 0 | Repo & Tooling Bootstrap | — | ✅ DONE |
| 1 | Typed Event Bus | — | ✅ DONE |
| 2 | Element System + property-based test | 3h | ⏳ |
| 3 | Mock LO JSON + Zod Schema | 2h | ⏳ |
| **3.5** | **Server-side validation mock endpoint** | 3h | ⏳ NEW |
| 4 | QuizRenderer — MultipleChoice | 3h | ⏳ |
| 5 | QuizRenderer — Cloze | 2h | ⏳ |
| 6 | QuizRenderer — DragDrop | 3h | ⏳ |
| 7 | QuizFactory Polymorphic Dispatch | 1h | ⏳ |
| 8 | QuizOverlay Event-driven Container | 3h | ⏳ |
| 9 | SaveState Zustand + localStorage | 2h | ⏳ |
| **9.5** | **HMAC signing wrapper (SaveState + EventQueue)** | 2h | ⏳ NEW |
| 10 | PhaserGame React Wrapper + **automated leak test** | 4h | ⏳ (updated) |
| 11 | Boot + Preload Scenes | 2h | ⏳ |
| 12 | WorldScene Tilemap + Player Movement | 4h | ⏳ |
| 13 | Monster Spawn + Overlap → Combat Event | 2h | ⏳ |
| 14 | CombatScene Static Layout + HP Bars | 3h | ⏳ |
| 15 | CombatStateMachine (pure) | 3h | ⏳ |
| 16 | Combat ↔ Quiz Integration | 3h | ⏳ |
| 17 | Damage Resolution + Victory/Defeat | 3h | ⏳ |
| 18 | Mascot Sóc Dialog + Tutorial | 3h | ⏳ |
| **18.5** | **Sentry init + 5 metrics wiring** | 2h | ⏳ NEW |
| 19 | Event Stream Local + Zod schema validate | 3h | ⏳ |
| 20 | Adaptive Difficulty (CL2) | 3h | ⏳ |
| 21 | Main Menu + App Shell Routing | 2h | ⏳ |
| 22 | E2E Integration Test | 12h | ⏳ (updated) |
| **22.5** | **Guild leaderboard (static single-player)** | 3h | ⏳ NEW |
| **22.6** | **Boss quest (1 boss single-player)** | 4h | ⏳ NEW |
| **22.7** | **Inventory + Equipment schema (v2 migration)** | 3h | ⏳ NEW v1.1 |
| **22.8** | **Level-up reward (drop table + LEVEL_UP event)** | 3h | ⏳ NEW v1.1 |
| **22.9** | **Inventory UI + Equip/Unequip screen** | 4h | ⏳ NEW v1.1 |
| **22.10** | **Equipment stat modifiers wired into combat** | 3h | ⏳ NEW v1.1 |

### Phase 1.5 — Visual Polish & Juice (Appendix I, Antigravity 23/04)

Independent polish layer — unblocks after core Phase 1 ships. Each step is
isolated enough to defer without blocking Phase 2 content work.

| # | Step | Effort | Risk |
|---|---|---|---|
| **22.11** | **AudioManager + BGM/SFX wiring (Howler.js)** | 3h | Low — additive utility, no state |
| **22.12** | **Base player layered rendering (body + equipment overlay)** | 4h | Med — touches PhaserGame + CombatScene sprite composition |
| **22.13** | **Spell VFX sprite-sheet system** | 3h | Low — cosmetic overlay on executeSpell |
| **22.14** | **Treasure-chest reward animation (LEVEL_UP overlay)** | 3h | Low — React overlay subscribing LEVEL_UP. Inline-wires `world_chest_open` SFX |
| **22.15** | **Quiz whiteboard scratchpad (`<canvas>` tool)** | 4h | Med — new child in QuizOverlay, pen/eraser/palette. Inline-wires `math_whiteboard_draw` SFX |
| **22.16** | **Element icons on HP bar + Victory banner animation** | 2h | Low — two small cosmetic wins. Inline-binds `combat_victory` to banner reveal |
| **22.17** | **Audio call-site wiring (Type A, post-feature pass)** | 3h | Low — wires the 7 non-co-located SFX into now-existing call-sites |

**Phase 1 + 1.5 total:** ~83h + 22h = **~105h (~13 working days)**.

**Scheduling rule:** Steps 22.11 → 22.16 may run **after** 22.10 lands OR
interleave with early Phase 2 content work. Priority = 22.11 (audio is
felt immediately) then 22.12 (player layering enables visible equipment
progression).

---

## Step 2 — Element System + Property-Based Test (v1.1)

**Goal:** Pure function `calculateDamage(spell, monster)` đúng per AP CL1, kèm property tests chứng minh invariants.

**Scope delta v1.1:**
- ✅ Original scope giữ nguyên
- ➕ Add `fast-check` package
- ➕ Property tests: (1) multiplier ∈ {0.5, 1, 1.5, 2}, (2) crit always ×1.5, (3) damage ≥ 0, (4) all 64 element pairs covered

**Test cases:**
- **Unit (example-based):** 8 cases (Fire×Plant=2, Water×Fire=2, Ice×Plant=2, same-elem=1, crit add, etc.)
- **Property (fast-check):**
  - For any (attackerElem, defenderElem, difficulty ∈ [1,5], crit ∈ {T,F}, power ∈ [1,100]): damage ≥ 0
  - Multiplier in valid set {0.5, 1, 1.5, 2}
  - Crit multiplier independent of element match
  - Damage deterministic (same input → same output)

**Exit criteria:** 8 unit + 4 property tests pass. 100% branch coverage.

---

## Step 3.5 — Server-side Validation Mock Endpoint (NEW)

**Goal:** `POST /api/quiz/validate` trả về `{correct, explanation, signed_receipt}`. Client không tự validate.

**Scope:**
- Vite plugin `vite-plugin-mock-quiz-validate` — serves `/api/quiz/validate` tại dev
- Bundle build strip `correct_option_id` / `correct_answer` / `alternatives` từ public JSON
- `QuizOverlay` gọi endpoint này thay vì validate local

**Test:**
- POST đúng → `{correct:true, receipt:<signed>}`
- POST sai → `{correct:false, explanation:<text>}`
- Bundled JSON grep không có `correct_option_id` (vite plugin transform test)

---

## Step 9.5 — HMAC Signing Wrapper (NEW)

**Goal:** `SaveStateStore` + `EventQueueStore` ký HMAC mọi write, verify mọi read. Tamper detect.

**Scope:**
- `src/persistence/hmac.ts`: `sign(data, key)` + `verify(data, hmac, key)` dùng Web Crypto `SubtleCrypto.sign('HMAC', ...)` với SHA-256
- Session key: sinh random on login, lưu memory-only (Zustand non-persisted state)
- Wrap `SaveStateStore.setItem` + `EventQueueStore.append`

**Test:**
- Sign + verify roundtrip
- Tamper detect (modify data → verify fail)
- Missing HMAC → treat as v0 legacy, auto-resign
- Session key rotation → re-sign all localStorage

---

## Step 10 — PhaserGame Wrapper + Automated Leak Test (v1.1)

**Goal delta:** Replace "manual Chrome DevTools" exit criteria bằng automated assertion.

**New test case:**
```ts
it('no memory leak across 10 mount/unmount cycles', async () => {
  const initialListenerCount = getListenerCount();
  for (let i = 0; i < 10; i++) {
    const { unmount } = render(<PhaserGame />);
    await waitFor(() => expect(document.querySelector('canvas')).toBeInTheDocument());
    unmount();
  }
  const finalListenerCount = getListenerCount();
  expect(finalListenerCount).toBeLessThanOrEqual(initialListenerCount + 1); // tolerance
  expect(document.querySelectorAll('canvas')).toHaveLength(0);
});
```

**Helper:** expose `EventBus.getListenerCount()` trong test-only export.

---

## Step 18.5 — Sentry + 5 Metrics Wiring (NEW)

**Goal:** Wire Sentry + 5 core metric events (per AP v1.1 Section 6.2).

**Scope:**
- `npm i @sentry/react`
- `src/observability/sentry.ts` init + error boundary wrapper cho App
- `src/observability/metrics.ts`: 5 typed event emitter functions
- Wire metric events vào existing code (combat_started khi enter CombatScene, etc.)

**Test:**
- Mock Sentry.captureException → EventBus rescue triggers capture
- Metric event schema validated by Zod
- 5 events fire at expected lifecycle hooks

---

## Step 22 — E2E Integration Test (v1.1 updated)

**Effort:** 4h → **12h** (Phaser canvas testing adds complexity).

**New approach:**
- Expose `window.__GAME__` in dev/test build: `{ activeScene, playerHp, combatMonsterId, simulate: { movePlayer, clickSpell, submitQuiz } }`
- Playwright assertions qua `page.evaluate(() => window.__GAME__.activeScene)` thay vì pixel snapshot
- Keyboard simulation cho WASD movement
- Wait-for patterns cho scene transitions

**Test checklist:**
- Full flow: Menu → Tutorial → World → Combat → Quiz × 3 → Victory → Return
- localStorage + IndexedDB state assertions sau flow
- No console errors
- HMAC verification passes

**Exit criteria:** Test completes < 90s headless. Run twice in row pass (no flakiness).

---

## Step 22.5 — Guild Leaderboard Single-Player (NEW)

**Goal:** Màn hình "Bảng xếp hạng lớp" — hiển thị 30 học sinh giả với EXP, student mình ở giữa. Static data Phase 1.

**Scope:**
- `src/react/screens/GuildLeaderboard.tsx` + WF spec mới
- Mock data `src/data/mocks/guild_classmates.json` (30 rows per class)
- Sort by weekly EXP, highlight current student
- Phase 5 sẽ replace bằng Supham real class data

**Test:** 
- 30 rows render
- Current student highlighted correctly
- Sort by weekly_exp desc

---

## Step 22.6 — Boss Quest Single-Player (NEW)

**Goal:** 1 Boss (chọn Aldergasp - Plant boss) là "daily challenge". Học sinh đánh 1 lần/ngày, thắng → reward lớn.

**Scope:**
- CombatScene đọc flag `is_boss: true` → HP x5, spell moveset dày hơn
- Daily reset — `SaveStateStore.last_boss_attempt_date`
- Reward: 500 EXP + 1 guaranteed item (vs normal 50 EXP)

**Test:**
- Boss HP scales correctly
- 2 attempts cùng ngày → 2nd blocked với message
- Next day → unlocked again
- Reward calculation test

---

## Step 22.7 — Inventory + Equipment Schema (v2 migration) (NEW)

**Goal:** Extend `SaveStateStore` with `inventory` + `equipment` per AP §11.1,
ship the v1 → v2 migration, land Zod schemas + static item registry.

**Scope:**
- `src/types/item.ts` — ITEM_SLOTS, EquipmentSlot, ITEM_RARITIES enums
- `src/data/staticConfig/items.ts` — 10 starter items (3 hats/3 robes/3 wands/1 boots) matching Appendix H
- `SaveStateStore` schema v2: add `inventory: InventoryItem[]`, `equipment: EquipmentMap`, `lastLevelUpAt: number | null`
- `persist({ version: 2, migrate })` — v1 rows get empty inventory/equipment injected
- `equipItem(slot, instanceId)` + `unequipItem(slot)` actions
- HMAC re-sign after migration (AP §3.2 compatibility)

**Test:**
- Migration v1 save → v2 adds empty inventory/equipment without losing hp/exp
- Zod rejects malformed item instance (bad slot enum)
- equipItem on missing instanceId → throws InvalidEquipError (AP E12)
- unequipItem on empty slot → noop (AP E13)
- HMAC verify still passes after migration

---

## Step 22.8 — Level-Up Reward (drop table + LEVEL_UP event) (NEW)

**Goal:** `gainExp` grants 1 item per level-gained via weighted drop table;
emits `LEVEL_UP` on EventBus so UI can banner + metrics can log.

**Scope:**
- `src/domain/LevelUpReward.ts` — pure `rollDrop(level, rng)` against item registry
- Extend `gainExp` to loop per level gained, call `rollDrop`, push `InventoryItem`
- New EventBus event: `LEVEL_UP { newLevel, grantedItemId }`
- Wire `eventStreamBridge` to append `level_up` events (new type, extends discriminated union)
- Metrics: emit `level_up_reward` (new 6th metric? — keep 5-metric contract; route through Sentry breadcrumb instead)
- Empty drop pool → warn + skip (AP E14)

**Test:**
- Fixed RNG (seed=0) → deterministic drop
- Multi-level jump (exp awards 2 levels at once) → 2 items granted
- drop_weight=0 items never selected (property test)
- minLevel gate respected
- LEVEL_UP event fires once per level, with correct grantedItemId

---

## Step 22.9 — Inventory UI + Equip Screen (NEW)

**Goal:** React screen to view inventory, equip/unequip per slot. Route `/inventory`
reachable from MainMenu + in-world HUD button.

**Scope:**
- `src/react/screens/InventoryScreen.tsx` — 4 equipment slots on left, bag grid on right
- Click item in bag → preview modifiers + "Trang bị" CTA → calls `equipItem`
- Click equipped slot → "Tháo" action → `unequipItem`
- Rarity color border (common gray, rare blue, epic purple, legendary orange)
- Empty slot placeholder icon
- Route registered in `AppRouter`; MainMenu adds "Kho đồ" button after leaderboard

**Test:**
- Renders empty state when inventory = []
- 10 items → 10 bag tiles
- Click → equip → slot shows item sprite + item removed from bag
- Equip over occupied slot → previous item returns to bag
- Unequip → bag reclaims item
- Stat preview panel shows totals from `computeEffectiveStats`

---

## Step 22.10 — Equipment Stat Modifiers in Combat (NEW)

**Goal:** Equipment modifiers per AP §11.3 actually change gameplay:
- `maxHp` extends player HP bar ceiling + heal to new max on equip
- `spellDamage` element bump applied in `CombatScene.applyPlayerDamage`
- `expGain` applied in `gainExp` before level-up roll
- `critChance` fed into `calculateDamage(isCrit=...)` via a roll

**Scope:**
- `src/domain/EffectiveStats.ts` — pure `computeEffectiveStats(saveState)` selector
- Hook into `CombatScene`: read effective stats at `create()` + on equipment change
- `HpBar.setHp(current, effectiveMaxHp)`
- Damage calc in `applyPlayerDamage`: multiply by `(1 + spellDamagePct[spell.element])`
- Crit chance roll: `rng() < critPct` → pass `isCrit: true` to `calculateDamage`
- E2E spec: equip wand-fire-01 (+10% fire damage) → assert damage delta vs baseline

**Test:**
- computeEffectiveStats with no equipment → baseline (100 maxHp, 0% all)
- Equip outfit +10 maxHp → effectiveMaxHp = 110, hp clamped to new max
- Fire wand (+5% Fire dmg) × Fire spell vs Plant monster: damage × 1.05
- Unequip → stats back to baseline (inverse invariant via property test)
- E2E: victory achievable faster with equipped vs naked (deterministic RNG)

---

## Step 22.11 — AudioManager (Phase 1.5)

**Goal:** Single audio entry point for Phaser scenes + React UI. Howler.js
over Phaser sound for cross-layer simplicity.

**Scope:**
- `src/utils/AudioManager.ts` — singleton with `playBgm(key)` / `stopBgm()` /
  `playSfx(key)` / `setMuted(bool)` / `getMuted()`. Persists mute flag in
  SaveState `flags.audio_muted` (additive, no migration).
- Asset manifest in `app/public/assets/audio/` (Antigravity's placeholders
  at `bgm_map.wav`, `bgm_combat.wav`, `sfx_click.wav`, `sfx_correct.wav`,
  `sfx_wrong.wav`, `sfx_spell_fire.wav`, `sfx_spell_water.wav`,
  `sfx_hit.wav`, `sfx_chest_open.wav`, `sfx_level_up.wav`).
- Wire: MainMenu → `playBgm('map')`; WorldScene → keep map BGM;
  CombatScene create → `playBgm('combat')`, cleanup → restore map BGM;
  QuizOverlay submit correct → `playSfx('correct')`, wrong → `sfx_wrong`.
  LEVEL_UP listener → `sfx_level_up`.
- Mute toggle: add to MainMenu settings later — wiring only this step.

**Test:**
- `playBgm('map')` stops prior BGM before starting new (no overlap)
- `setMuted(true)` gates both BGM and SFX
- Missing sound key logs warn + no-throw
- SaveState `audio_muted` round-trips

---

## Step 22.12 — Base Player Layered Rendering (Phase 1.5)

**Goal:** Visible equipment — render base player body then z-layer outfit,
shoes, hat, wand sprites from equipped items.

**Scope:**
- PreloadScene: load `base_player_male_transparent.png` + item sprites
  referenced by equipped `ItemDef.spriteKey`.
- New entity `src/game/entities/PlayerAvatar.ts` that composes N Phaser
  sprites (base + overlays) at a single logical position. Listens
  SaveState equipment changes + re-renders overlay set.
- CombatScene + WorldScene swap `this.add.sprite(...wizard_walk)` calls
  for `new PlayerAvatar(this, x, y)`.
- Z-index: base 0, outfit 1, shoes 2, hat 3, wand 4.

**Test:**
- No equipment → only base sprite rendered
- Equip hat → hat overlay count + position match anchor (16, 2) from
  Appendix H
- Equip item then unequip → overlay removed + Phaser sprite destroyed
- Change equipment during combat → layers re-sync

---

## Step 22.13 — Spell VFX (Phase 1.5)

**Goal:** Cast-spell animation — a sprite-sheet element beam flies toward
the monster and explodes on impact.

**Scope:**
- New event `CAST_SPELL { element, origin, target }` on EventBus (doesn't
  change FSM; purely cosmetic). Emitted from `CombatScene.onSpellClick`
  before `OPEN_QUIZ`.
- `src/game/systems/SpellVfx.ts` — per-element sprite sheet lookup,
  tweens a sprite from origin to target over ~400ms, plays explosion
  frames, destroys.
- Assets: 4 element VFX sheets (Phase 2 Antigravity delivery). Step ships
  a placeholder rectangle tween if sheets absent.

**Test:**
- CAST_SPELL emits exactly once per spell click
- VFX sprite destroyed after tween completes (no leak)
- Missing sheet → placeholder + console.warn, no throw

---

## Step 22.14 — Treasure-Chest Reward Animation (Phase 1.5)

**Goal:** Replace silent inventory bump with a React overlay showing
chest wobble → open → item icon float-up, driven by LEVEL_UP event.

**Scope:**
- `src/react/overlays/RewardChestOverlay.tsx` mounted at app shell.
  Subscribes LEVEL_UP → queues rewards so multi-level cascades animate
  sequentially (~1.2s each).
- Uses `treasure_chest_transparent.png` (3-state sprite — closed /
  wobble / open) + `findItemDef(grantedItemId).iconPath`.
- `sfx_chest_open` on open; `sfx_level_up` on queue start.
- Skip button advances animation immediately.

**Test:**
- Single LEVEL_UP → overlay visible → auto-closes after animation
- Multi-level LEVEL_UP × 3 → queue plays sequentially
- grantedItemId=null → "Lên cấp!" banner only (no chest)
- Unmount clears queue + cancels timers

---

## Step 22.15 — Quiz Whiteboard Scratchpad (Phase 1.5)

**Goal:** A `<canvas>` pad inside QuizOverlay so kids can work out math
problems without paper.

**Scope:**
- `src/react/quiz/WhiteboardPad.tsx` — canvas + tools (pen, eraser,
  clear, 4-color palette). Uses `whiteboard_tools_transparent.png`
  for tool icons.
- Toggle button at QuizOverlay header: "🖊 Nháp". Default hidden.
- Scratch state resets per LO submit (no persistence).
- Pointer events only (mouse + touch); keyboard shortcuts skipped.

**Test:**
- Toggle shows/hides canvas
- Pen draws on canvas (spy on getContext '2d' calls)
- Clear button wipes
- Canvas resets when next OPEN_QUIZ fires

---

## Step 22.16 — Element Icons on HP Bar + Victory Banner (Phase 1.5)

**Goal:** Two small cosmetic wins.

**Scope:**
- HpBar (monster variant) shows a small element icon + "Yếu:" tag using
  `element_icons_transparent.png`. Takes weakness element from
  ElementSystem matrix (lowest-multiplier attacker).
- `src/react/overlays/VictoryBanner.tsx` — subscribes EXIT_COMBAT{won=true},
  drops `victory_banner_transparent.png` with spin-light behind. 1.5s
  auto-dismiss.

**Test:**
- Fire monster → HP bar shows Water weakness icon
- EXIT_COMBAT won=true → banner visible, auto-dismisses
- EXIT_COMBAT won=false → banner not shown

---

## Step 22.17 — Audio Call-Site Wiring (Phase 1.5, Type A)

**Goal:** Wire the 7 SFX that aren't co-located with feature work
(22.14/22.15/22.16 each handle their own). One consolidated pass over
the screens + scenes that already exist; pure additive — no schema or
event-layer change.

**Scope:**
- UI category (5 SFX × multiple screens):
  - `ui_btn_hover` on primary buttons of MainMenu, InventoryScreen,
    GuildLeaderboard (skip list rows — would spam)
  - `ui_btn_click` on the same primary buttons
  - `ui_popup_open` on QuizOverlay setActiveLO transition (null → lo)
  - `ui_popup_close` on QuizOverlay handleSubmit before closing
  - `ui_error_beep` on InventoryScreen invalid-equip path + CombatScene
    spell-with-no-MP path (when CL adds MP cost)
- Combat category (3 SFX in CombatScene):
  - `combat_hit_impact` × 2 — applyPlayerDamage on monster, runMonsterTurn
    on player
  - `combat_miss` — when calculated damage rounds to 0 OR crit-fail path
  - `combat_monster_cry` — once on CombatScene.create after monster
    sprite mounts (avoid overlap with `combat_encounter` already on
    ENTER_COMBAT bus event)
- World category (2 SFX in WorldScene + MascotDialog):
  - `world_collect_item` — when collision callback grants an inventory
    drop on the map (Phase 2 feature; defer note if not yet wired)
  - `world_npc_talk` — when MascotDialog mounts with a non-null text
    prop (covers tutorial + future NPC interactions)

**Patterns to reuse:**
- Phaser scenes: `import { audioManager } from '@/utils/AudioManager'`
  (matches Player.ts footstep pattern)
- React components: `useGameAudio()` hook (refs stable, bind directly
  to `onMouseEnter` / `onClick` without `useCallback`)
- Throttle ≥80ms for any pointer/move-driven SFX (reuse
  `PLAYER_STEP_INTERVAL_MS=350` shape)

**Test:**
- Each touched file gets `vi.mock('howler', ...)` per the
  `appLifecycle.test.ts` pattern
- Hover + click handler tests assert `audioManager.playSfx` called once
  per interaction with the exact key
- Combat hit/miss tests gate on damage value (0 → miss, >0 → impact)

**Defers (note in PR if features absent):**
- `combat_miss` MP-fail path waits on Step 22.10b MP-cost CL (not in
  current scope — log a TODO instead of force-fitting)
- `world_collect_item` waits on Phase 2 world drop mechanic

**Exit criteria:** verify gates green; new tests cover every newly
wired call-site; mute flag still honoured (no bypass code added).

---

## Acceptance — End of Phase 1 (v1.1)

Khi Step 22.6 pass, Phase 1 COMPLETE khi tất cả:
- [ ] 26 step tests pass
- [ ] E2E Playwright pass < 90s
- [ ] `npm run lint / typecheck / verify / build` all green
- [ ] Manual UAT: full flow không crash, boss quest work, guild leaderboard show
- [ ] Sentry captures at least 1 test error event
- [ ] runs.jsonl có ≥ 100 entries sau 1h play
- [ ] HMAC tamper test: edit localStorage → next load detects
- [ ] Server validation: bundled JSON không chứa `correct_option_id`
- [ ] Memory stable (automated 10-cycle test pass)
- [ ] Sync AP v1.1: không phát sinh entity/event mới (nếu có → quy trình 9 bước)

---

**Next:** Step 2 Element System (ready to execute).

---

## Phase 2.5 — Prodigy-Parity Roadmap (added 29/04/2026)

After Phase 1+1.5 landed (35/35 steps, 482 unit tests), POSUP approved
a 6-sprint Prodigy-parity push. Each sprint has its own design spec
under `docs/superpowers/specs/`; this section is the ISP-side index.

| # | Sprint | Type | Depends on | Spec |
|---|---|---|---|---|
| A | Multi-party Combat Refactor | C | — | `2026-04-29-multiparty-combat-design.md` ✅ shipped |
| B | World / Zone / Boss-Hall Scenes | C | — | TBD |
| C | Pet System | B | A | TBD |
| D | Quests & Goals Panel | B | — | TBD |
| E | Polish & Onboarding | A | — | TBD |
| F | Free Daily Rewards (Loot Jar UI) | B | — | TBD |

Detail roadmap: `docs/roadmap_phase2.5_prodigy_parity.md`.

Asset workflow rule: every sprint spec defines exact filenames +
Antigravity prompts (style: flat 2D vector art, flash-game finish,
clean 2px outline). Antigravity drops PNG-32 RGBA, Claude wires.
No placeholder art reaches dev.

### Phase 2.5 — Sprint B (02/05/2026) — World Map + Zone + Boss Hall

| # | Step | Status |
|---|---|---|
| S-B.1 | Types + ISLANDS static config (3 active + 5 locked) | ✅ |
| S-B.2 | WalkableMask reader (alpha+luminance threshold) | ✅ |
| S-B.3 | A* pathfinding (8-direction, octile, deterministic) | ✅ |
| S-B.4 | Waypoint smoothing (Bresenham LOS merge) | ✅ |
| S-B.5 | SaveState v3→v4 migration + 5 actions | ✅ |
| S-B.6 | EventBus +ENTER_ZONE/EXIT_ZONE/BOSS_DEFEATED/CHEST_OPENED/LOCKED_ISLAND_HINT | ✅ |
| S-B.7 | PreloadScene Sprint B asset wiring (27 entries) | ✅ |
| S-B.8 | WorldMapScene + LockedIslandTooltip + test bridge | ✅ |
| — | Referential integrity test (pathMonsters/bossId/itemId resolve) | ✅ |
| S-B.9 | ZoneScene (entrance + path branches) + A* walk | ✅ |
| S-B.10 | BossHallScene (3 branches: fresh / defeated / conquered) | ✅ |
| S-B.11 | RewardChestOverlay listens to CHEST_OPENED + Về Bản Đồ button | ✅ |
| S-B.12 | PhaserGame wiring + useLegacyWorldScene flag | ✅ |
| S-B.13 | E2E + AP/ISP delta + roll-up | ✅ |

**Sprint B closed.** Pending: Antigravity 27-PNG delivery.

### Phase 2.5 — Sprint C (02/05/2026) — Pet System

| # | Step | Status |
|---|---|---|
| S-C.1 | types/pet.ts + rarity/evolution constants | ✅ |
| S-C.2 | domain/PetRescue (bucket, rolls, offer gate) | ✅ |
| S-C.3 | domain/PetLeveling (XP curve, evolution stages, applyPetXp) | ✅ |
| S-C.4 | PetEntityFactory rarity + evolution multiplier wiring | ✅ |
| S-C.5 | SaveState v4→v5 migration + 4 actions | ✅ |
| S-C.6 | EventBus +4 events | ✅ |
| S-C.7 | CombatScene reads ownedPets + emits PET_RESCUE_OFFERED | ✅ |
| S-C.8 | gainExp propagates to active pet | ✅ |
| S-C.9 | PetRescueOverlay (modal + roster-cap picker) | ✅ |
| S-C.10 | InventoryScreen Pet tab + grid + equip + release | ✅ |
| S-C.11 | E2E sprint_c_pet_rescue.spec.ts | ✅ |
| S-C.12 | AP/ISP delta + sprint roll-up | ✅ |

**Sprint C closed.** Pending: Phase 2 sprite swap on evolution stages
(when Antigravity ships evo art).

### Phase 2.5 — Sprint D (02/05/2026) — Quests & Goals Panel

| # | Step | Status |
|---|---|---|
| S-D.1 | types/quest.ts + tier/reward constants | ✅ |
| S-D.2 | data/staticConfig/quests.ts (8 quests) + tests | ✅ |
| S-D.3 | domain/QuestCycle.ts (UTC+7 anchors) + tests | ✅ |
| S-D.4 | domain/QuestReward.ts (tier→rarity rollDrop wrapper) + tests | ✅ |
| S-D.5 | domain/QuestEngine.ts (event listener + dispatch) + tests | ✅ |
| S-D.6 | SaveState v5→v6 + 4 actions + refreshCyclesIfNeeded | ✅ |
| S-D.7 | EventBus +QUEST_PROGRESS, CHEST_OPENED.label?: string | ✅ |
| S-D.8 | RewardChestOverlay honors optional label (default "Về Bản Đồ") | ✅ |
| S-D.9 | QuestProgressToast (queue + dismiss) + tests | ✅ |
| S-D.10 | QuestsPanel (/quests route, 3-tier groups, claim flow) | ✅ |
| S-D.11 | MainMenu "Nhiệm vụ" button + sparkle indicator | ✅ |
| S-D.12 | AppRouter wires QuestEngine + refresh + /quests + toast | ✅ |
| S-D.13 | E2E sprint_d_quests.spec.ts | ✅ |
| S-D.14 | AP §11.7 + §13 + §14 delta + ISP roll-up + tasks/todo.md | ✅ |

**Sprint D closed.** Pending: 5 Antigravity quest UI assets (1 banner +
4 tier icons; CSS+emoji fallback shipped this sprint).

### Phase 2.5 — Sprint E (02/05/2026) — Polish & Onboarding

| # | Step | Status |
|---|---|---|
| S-E.1 | types/identity.ts + namePresets.ts | ✅ |
| S-E.2 | SaveState v6→v7 + 4 setters | ✅ |
| S-E.3 | tutorialSteps extend (target field + 4 new beats, "bạn" alignment) | ✅ |
| S-E.4 | TutorialArrow + sceneAnchorRegistry (hybrid Phaser/DOM positioning) | ✅ |
| S-E.5 | TutorialSequence integrates TutorialArrow | ✅ |
| S-E.6 | NamePicker (12 preset + Random button) | ✅ |
| S-E.7 | CustomizationPicker (real hair PNG layered render) | ✅ |
| S-E.7b | PreloadScene 8 hair textures + Player.setHairOverlay slot | ✅ |
| S-E.8 | OnboardingFlow orchestrator | ✅ |
| S-E.9 | MainMenu personalization + Settings button + onboarding trigger | ✅ |
| S-E.10 | SettingsPanel (4 controls) | ✅ |
| S-E.11 | QuizCard hint visibility | ✅ |
| S-E.12 | CombatScene + QuestsPanel personalization callsites | ✅ |
| S-E.13 | AppRouter /settings route | ✅ |
| S-E.14 | E2E sprint_e_onboarding.spec.ts | ✅ |
| S-E.15 | AP §11.8 + §13 delta + ISP roll-up + tasks/todo.md | ✅ |

**Sprint E closed.** 8 hair PNG assets bundled with this branch
(committed pre-T1 per pre-merge gate convention; squash merge bundles
them with code).

### Phase 2.5 — Sprint F (07/05/2026) — Free Daily Rewards

| # | Step | Status |
|---|---|---|
| S-F.0 | Preflight (baseline 874 tests, lint/typecheck/verify green) | ✅ |
| S-F.1 | types/dailyReward.ts (LoginDayReward + StreakTierDef) | ✅ |
| S-F.2 | domain/StreakMultiplier.ts stair (1.0/1.2/1.5/2.0) + 7 tests | ✅ |
| S-F.3 | data/staticConfig/loginCalendar.ts 7-day template + applyMultiplier + 8 tests | ✅ |
| S-F.4 | domain/LoginCalendar.ts evaluateLoginClaimable + computeNewStreak (pure) + 10 tests | ✅ |
| S-F.6 | SaveState v7→v8 (4 fields + 6 actions including claimLootJar throw-on-null contract) + 22 tests | ✅ |
| S-F.7 | EventBus +BATTLE_STARS_EARNED +LOOT_JAR_READY +LOGIN_CLAIMED + 3 tests | ✅ |
| S-F.5 | domain/DailyRewardEngine.ts observer (EXIT_COMBAT → stars+jar) + 10 tests | ✅ |
| S-F.8 | react/components/BattleStarsBadge.tsx (new components/ folder) + 4 tests | ✅ |
| S-F.9 | DailyLoginCalendarOverlay + performLoginClaim orchestration + 13 tests | ✅ |
| S-F.10 | LootJarOverlay (3-frame reveal + idempotency guard) + 6 tests | ✅ |
| S-F.11 | MainMenu Battle Stars badge + Quà Hằng Ngày button + 5 tests | ✅ |
| S-F.12 | AppRouter wire DailyRewardEngine + LootJarOverlay | ✅ |
| S-F.13 | E2E sprint_f_rewards.spec.ts (login claim + jar reveal flow) | ✅ |
| S-F.14 | AP §11.9 + §13 + §14 delta + ISP roll-up + tasks/todo.md | ✅ |

**Sprint F closed.** Tasks 5/6/7 reordered (6+7 before 5) per dependency
analysis. Asset delivery pending Antigravity: calendar plate, jar 3-frame,
star icon+badge, 3 flame variants — Sprint F ships with emoji/Tailwind
fallback (CSS shake animation). Phase 2.5 COMPLETE: 6/6 sprints shipped.

### Phase 3 (12/05/2026) — Shop + Pet Breeding + Server Validation

| # | Step | Status |
|---|---|---|
| P3.0 | Preflight (baseline 964 tests green) | ✅ |
| P3.1 | types/{shop,breeding}.ts | ✅ |
| P3.2 | data/staticConfig/shopCatalog.ts (10 real items) + tests | ✅ |
| P3.3 | data/staticConfig/{breedingPairs,breedingCosts}.ts + tests | ✅ |
| P3.6 | SaveState v8→v9 + 8 actions + tests (reordered before 4/5) | ✅ |
| P3.7 | EventBus +4 events + tests | ✅ |
| P3.4 | domain/ShopEngine.ts (refresh + validate) + tests | ✅ |
| P3.5 | domain/PetBreedingEngine.ts (compat + roll) + tests | ✅ |
| P3.8 | domain/ServerValidator.ts (HMAC envelope + soft-fail) + tests | ✅ |
| P3.9 | server/validationRoutes.ts (Vite middleware) + Connect types | ✅ |
| P3.10 | domain/performShopPurchase.ts orchestration + tests | ✅ |
| P3.11 | domain/{performBreedingStart,performBreedingHatch}.ts + tests | ✅ |
| P3.12 | components: ShopItemCard + PetSlot + EggHatchAnim + tests (3 commits) | ✅ |
| P3.13 | overlays/ShopOverlay.tsx (stock grid + buy) + tests | ✅ |
| P3.14 | overlays/PetBreedingOverlay.tsx (2-slot + breed + hatch) + tests | ✅ |
| P3.15 | MainMenu edits (+🛒 +🥚 buttons) | ✅ |
| P3.16 | AppRouter wire refreshShopStockIfNeeded on mount+focus | ✅ |
| P3.17 | E2E phase_3_shop_pets.spec.ts (earn → buy → breed → roster grows) | ✅ |
| P3.18 | AP §11.10-13 + ISP Phase 3 row + todo.md roll-up | ✅ |

**Phase 3 closed.** 19 atomic tasks shipped. Schema v8→v9 with 5 new fields + 8 actions. 4 new EventBus events. HMAC server validation seam (Step 3.5 CEO TODO #2 ✅). 1072 → ~1085 unit + 11 E2E (added phase_3_shop_pets). Asset delivery still pending Antigravity per Appendix G § + new shop UI prompts (Appendix F append for Phase 4).

### Phase 4 (12/05/2026) — LiveOps Foundations

| # | Step | Status |
|---|---|---|
| P4.0 | Preflight (baseline 1072 tests green) | ✅ |
| P4.1 | types/breeding.ts +hatchAt +rushedAt -durationMs +2 failure reasons | ✅ |
| P4.2 | domain/BreedingDurations.ts (Q2 5/15/60/120) + tests | ✅ |
| P4.3 | domain/BreedingRush.ts (Q3 parity + validateRush) + tests | ✅ |
| P4.4 | SaveState v9→v10 + rushBreeding action + tests | ✅ |
| P4.5 | performBreedingStart sets hatchAt + rushedAt | ✅ |
| P4.8 | EventBus EGG_HATCHED +wasRushed?: boolean (additive) | ✅ |
| P4.6 | performBreedingHatch gates on hatchAt + emits wasRushed | ✅ |
| P4.7 | performBreedingRush orchestration | ✅ |
| P4.9 | observability/Telemetry.ts (Zod + dual transport) + tests | ✅ |
| P4.10 | observability/TelemetryEngine.ts (observer) + AppRouter wire + trackBreedingRush wire | ✅ |
| P4.11 | server/telemetryRoute.ts (Vite mock middleware) | ✅ |
| P4.12 | react/components/BreedingCountdown.tsx + tests | ✅ |
| P4.13 | react/components/EggHatchAnim.tsx +mode prop + tests | ✅ |
| P4.14 | react/overlays/PetBreedingOverlay.tsx incubating+ready states | ✅ |
| P4.15 | react/screens/MainMenu.tsx breedingReady sparkle | ✅ |
| P4.16 | docs/.../2026-05-12-phase-4-production-deploy.md (design-only) | ✅ |
| P4.17 | E2E phase_4_breeding_timer.spec.ts | ⚠️ test.fixme (parent-selection state race) — unit tests cover logic |
| P4.18 | AP §11.11 + §11.14 + §11.15 + ISP Phase 4 row + todo.md | ✅ |

**Phase 4 closed.** 19 atomic tasks shipped. Schema v9→v10 (BreedingSession reshape with hatchAt + rushedAt). 1 new SaveState action (rushBreeding). New observability layer with Zod + dual transport. EGG_HATCHED payload extended (backward-compat). 1072 → 1129 unit tests (+57 new). E2E P4.17 skipped due to React-local-state parent selection race; tracked as Phase 5 follow-up (bridge helper `seedParentsForBreeding`). Production deploy design spec shipped as P4.16 sibling — Phase 5 implements per that design.

