# Incremental Step Plan — Game_SS3_exclusive

> **Source of truth:** `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` + 5 appendices
> **Tech stack:** `---Clevai_Tech_Stack_Prefer-v1.md` → TypeScript + ReactJS + Tailwind + Vite + Phaser 3 + Zod + jsonwebtoken (Phase 3+) + Vitest + Playwright
> **Scope:** Phase 1 vertical slice — Playable demo: Main Menu → World (1 biome) → Combat (5 quái tier-starter) → Quiz Overlay (3 types: MC/Cloze/DD) → Mascot Sóc Guide (tutorial) → Victory loop
> **Version:** v1.0 — 22/04/2026

---

## 0. Execution Protocol — Áp dụng CHO MỌI STEP

Mỗi step thực hiện theo 2 SUBSTEP bắt buộc. Không có ngoại lệ.

### SUBSTEP 1 — Senior Engineer Discipline
**Rules:**
- One small change per step
- No speculative features
- Tests are mandatory
- If tests fail, fix before proceeding
- Ask for approval between steps

**Output format:**
1. Test cases
2. Implementation
3. How to run tests
4. Known limitations
5. Ask whether to continue

### SUBSTEP 2 — Strict TDD Process
Tuân tự tự 7 phase:
1. **TEST DESIGN** — derive tests từ step's "Test cases" + "Exit criteria", tách backend/frontend, hỏi nếu ambiguous
2. **WRITE FAILING TESTS** — real executable, fail against current codebase, KHÔNG viết implementation
3. **RUN TESTS** — execute backend + frontend headless, capture failures
4. **IMPLEMENT MINIMUM CODE** — chỉ code đủ để pass tests, không thêm endpoint/UI/logic/config
5. **FIX-ON-FAILURE LOOP** — root cause → smallest fix → re-run (repeat until pass)
6. **FINAL VERIFICATION** — re-run all backend + frontend tests, confirm success
7. **STOP AND REPORT** — summary changes, limitations, ask to proceed next step

**Strict prohibitions:** no feature expansion, no cleanup refactors, no skipping test execution, no future-step assumptions.

---

## Step Overview — 22 steps

| # | Step Name | ~Effort | New Concept |
|---|---|---|---|
| 0 | Repo & Tooling Bootstrap | 3h | Vite + Vitest + ESLint |
| 1 | Typed Event Bus | 2h | mitt wrapper + discriminated union events |
| 2 | Element System & Damage Formula (CL1) | 2h | Pure logic module + property-based tests |
| 3 | Mock LO JSON + Zod Schema | 2h | Schema validation at boundary |
| 4 | QuizRenderer — MultipleChoice | 3h | React component + user event testing |
| 5 | QuizRenderer — Cloze | 2h | — (reuse pattern from Step 4) |
| 6 | QuizRenderer — DragDrop | 3h | HTML5 drag-drop testing |
| 7 | QuizFactory Polymorphic Dispatch | 1h | Strategy pattern |
| 8 | QuizOverlay Event-driven Container | 3h | Event Bus subscription lifecycle |
| 9 | SaveState Zustand Store + localStorage | 2h | Zustand + persist middleware |
| 10 | PhaserGame React Wrapper | 3h | Phaser lifecycle + cleanup |
| 11 | Boot + Preload Scenes | 2h | Phaser asset pipeline |
| 12 | WorldScene Tilemap + Player Movement | 4h | Tiled integration + Arcade Physics |
| 13 | Monster Spawn + Overlap → Combat Event | 2h | Phaser overlap + Event Bus bridge |
| 14 | CombatScene Static Layout + HP Bars | 3h | Phaser UI primitives |
| 15 | CombatStateMachine (pure) | 3h | Finite state machine (XState or hand-rolled) |
| 16 | Combat ↔ Quiz Integration | 3h | Cross-layer event roundtrip |
| 17 | Damage Resolution + Victory/Defeat | 3h | State sync React ↔ Phaser |
| 18 | Mascot Sóc Dialog + Tutorial | 3h | Typewriter + dialog tree |
| 19 | Event Stream (Quiz/Combat Events) Local | 3h | IndexedDB append-only log |
| 20 | Adaptive Difficulty (CL2) | 3h | Sliding window accuracy algorithm |
| 21 | Main Menu + App Shell Routing | 2h | react-router + route guards |
| 22 | E2E Integration Test (Playwright) | 4h | Full-flow headless automation |

**Total estimated effort:** ~60 hours (~8 working days, 1 dev).

---

## Step 0 — Repo & Tooling Bootstrap

**Goal:** `npm test` chạy được với 1 sanity test passing trên repo rỗng.

**Scope:**
- ✅ `app/` folder với Vite + React 18 + TypeScript template
- ✅ Cài: vitest, @testing-library/react, @testing-library/user-event, jsdom, eslint, prettier, zod, zustand, mitt, phaser
- ✅ Tailwind CSS setup
- ✅ vitest.config.ts với jsdom env
- ✅ tsconfig strict mode
- ✅ 1 sanity test (`1+1===2`)
- ❌ KHÔNG tạo components, scenes, stores

**Components touched:** Repo root, package.json, vite.config.ts, tsconfig.json, vitest.config.ts, tailwind.config.ts, `app/src/__tests__/sanity.test.ts`

**Preconditions:** None (greenfield)

**Test cases:**
- **Backend tests:** n/a (không có backend)
- **Frontend tests:** `sanity.test.ts` — `expect(1+1).toBe(2)` passing

**Expected artifacts:**
- `app/package.json` với scripts `dev`, `build`, `test`, `test:run`, `lint`
- `app/src/__tests__/sanity.test.ts`

**Exit criteria:**
- [x] `npm run test:run` passes 1/1
- [x] `npm run lint` zero errors
- [x] `npm run build` produces `dist/`
- [x] Git initialized, `.gitignore` ignore `node_modules/` + `dist/`

---

## Step 1 — Typed Event Bus

**Goal:** Emit/subscribe events type-safely; React và Phaser có thể giao tiếp qua 1 singleton bus.

**Scope:**
- ✅ `src/bus/events.ts` — discriminated union `GameEvent` (at least: `OPEN_QUIZ`, `QUIZ_RESULT`, `ENTER_COMBAT`, `EXIT_COMBAT`)
- ✅ `src/bus/EventBus.ts` — wrapper mitt, typed `emit<T>()`, `on<T>()`, `off<T>()`
- ❌ Không gắn vào React/Phaser lifecycle
- ❌ Không persist event

**Components touched:** `src/bus/events.ts`, `src/bus/EventBus.ts`, tests

**Preconditions:** Step 0 done

**Test cases:**
- **Backend tests (unit):**
  - `emit(OPEN_QUIZ, payload)` → listener subscribed via `on(OPEN_QUIZ, cb)` receives payload exactly once
  - `off()` stops listener
  - Type error at compile time if payload shape sai (verify qua `tsc --noEmit`)
  - Multiple listeners same event → all receive
- **Frontend tests:** n/a (pure module)

**Expected artifacts:**
- `EventBus` singleton exported
- 4 event types defined in discriminated union

**Exit criteria:**
- [x] 4 unit tests pass
- [x] `tsc --noEmit` enforces payload shape

---

## Step 2 — Element System & Damage Formula (CL1)

**Goal:** Hàm `calculateDamage(spell, monster)` trả đúng multiplier theo bảng 8-hệ element.

**Scope:**
- ✅ `src/game/systems/ElementSystem.ts` — ELEMENT_MATRIX 8×8, function `getMultiplier(attacker, defender)`, function `calculateDamage(spellPower, attackerElem, defenderElem, difficulty, isCrit)`
- ✅ Types: `Element = 'Fire'|'Water'|'Earth'|'Ice'|'Storm'|'Plant'|'Shadow'|'Astral'`
- ❌ Không load từ JSON (hardcode static)
- ❌ Không tích hợp combat scene

**Components touched:** `src/game/systems/ElementSystem.ts`, tests

**Preconditions:** Step 0

**Test cases:**
- **Backend tests:**
  - Fire vs Plant → multiplier 2.0
  - Water vs Fire → multiplier 2.0
  - Fire vs Water → multiplier 0.5
  - Same element same → multiplier 1.0
  - `calculateDamage(100, 'Fire', 'Plant', difficulty=3, crit=false)` = 100 × 2.0 × 1.3 = 260
  - Crit adds ×1.5
  - Invalid element → throws
- **Frontend tests:** n/a

**Expected artifacts:** `ElementSystem` module, 64-cell matrix with full coverage.

**Exit criteria:**
- [x] 100% branch coverage `ElementSystem.ts`
- [x] 8×8 matrix tested against AP Section CL1

---

## Step 3 — Mock LO JSON + Zod Schema

**Goal:** Load mock learning objects from JSON, validate shape, export typed.

**Scope:**
- ✅ `src/data/mocks/learningObjects/*.json` — 6 files từ Appendix D (MC×2, Cloze×2, DD×2)
- ✅ `src/data/supham/LearningObjectSchema.ts` — Zod schema from Appendix D.7
- ✅ `src/data/supham/LearningObjectAdapter.ts` — `loadMockLOs(quizTypeId, grade)` returns validated array
- ❌ Không gọi API thật
- ❌ Không cache

**Components touched:** `src/data/`, tests

**Preconditions:** Step 0

**Test cases:**
- **Backend tests:**
  - `loadMockLOs(3, 'G5')` returns MathG5 + KEN G8 MC (total 4)
  - `loadMockLOs(1, 'G4')` returns 2 Cloze items
  - Invalid JSON → Zod throws with clear error message
  - Missing field `correct_option_id` on MC → validation fail
- **Frontend tests:** n/a

**Expected artifacts:**
- 6 JSON files
- 1 Zod schema
- 1 adapter function

**Exit criteria:**
- [x] Tất cả 6 mock JSON pass validation
- [x] 4 adapter tests pass

---

## Step 4 — QuizRenderer — MultipleChoice

**Goal:** Component `MultipleChoiceRenderer` render question + 4 options, user click → `onSubmit(answerId)` fires.

**Scope:**
- ✅ `src/react/quiz/renderers/MultipleChoiceRenderer.tsx` — props: `{ lo, onSubmit }`
- ✅ Tailwind styling cơ bản
- ❌ Không có timer UI
- ❌ Không có anti-cheat signals
- ❌ Không có submit button riêng (hoặc có nhưng option click = submit — quyết định tại step này)

**Components touched:** `src/react/quiz/renderers/MultipleChoiceRenderer.tsx`, test

**Preconditions:** Step 3

**Test cases:**
- **Frontend tests (React Testing Library):**
  - Render LO với 4 options → thấy đủ 4 text
  - Click option "B" → `onSubmit` called with `{optionId: 'b', isCorrect: true, timeSpent: number}`
  - Click option sai → `onSubmit` called với `isCorrect: false`
  - Keyboard nav: Tab → focus next option, Enter → select
  - Accessibility: mỗi option có `role="button"` hoặc là native button
- **Backend tests:** n/a

**Expected artifacts:** Renderer component + tests covering 5 cases.

**Exit criteria:**
- [x] 5 RTL tests pass
- [x] Keyboard-only user có thể complete quiz

---

## Step 5 — QuizRenderer — Cloze

**Goal:** Cloze input renderer — blanks với `<input>`, validate từng blank khi submit.

**Scope:**
- ✅ `ClozeRenderer.tsx` — props: `{lo, onSubmit}`; render `question_text` với blank `___(N)___` thay bằng input
- ✅ Submit button (đợi user điền đủ mới active)
- ✅ Case-insensitive compare + trim
- ❌ Không multi-alternative answers complex logic beyond `alternatives` array

**Components touched:** `src/react/quiz/renderers/ClozeRenderer.tsx`

**Preconditions:** Step 3

**Test cases:**
- **Frontend tests:**
  - 2-blank question render 2 inputs
  - Type correct answers → submit → `isCorrect: true`
  - Type "Goes" when answer "goes" + case_sensitive=false → `isCorrect: true`
  - Type wrong one → `isCorrect: false`, result includes blank-level correctness array
  - Submit disabled until all blanks filled
- **Backend tests:** n/a

**Expected artifacts:** Cloze renderer.

**Exit criteria:**
- [x] 5 tests pass
- [x] Visual check trên `npm run dev` renders correctly

---

## Step 6 — QuizRenderer — DragDrop

**Goal:** Drag items từ pool sang drop zones, validate correctness.

**Scope:**
- ✅ `DragDropRenderer.tsx` — HTML5 `draggable` API hoặc `react-dnd` (dev quyết)
- ✅ Drop zones hiển thị items đã drop
- ✅ Submit button khi đủ items được drop
- ❌ Không reorder trong zone (Phase 2)

**Components touched:** `src/react/quiz/renderers/DragDropRenderer.tsx`

**Preconditions:** Step 3

**Test cases:**
- **Frontend tests:**
  - Render pool của 5 items + 2 zones
  - Fire drag events (RTL `fireEvent.dragStart` + `fireEvent.drop`) → item moved
  - Submit với all correct drops → `isCorrect: true`
  - Mix đúng/sai → `isCorrect: false`, result includes per-zone correctness
  - Reset button trả items về pool (nếu có)
- **Backend tests:** n/a

**Expected artifacts:** DragDrop renderer.

**Exit criteria:**
- [x] 4 tests pass (drag events headless simulation work)

---

## Step 7 — QuizFactory Polymorphic Dispatch

**Goal:** `<QuizFactory lo={lo} onSubmit={...}/>` render đúng renderer theo `lo.quiz_type_id`.

**Scope:**
- ✅ `src/react/quiz/QuizFactory.tsx` — switch theo `quiz_type_id` (1/3/8)
- ✅ Fallback component cho quiz_type_id chưa support (Phase 1 hiện "Chưa hỗ trợ")
- ❌ Không lazy-load (Phase 2 tối ưu)

**Components touched:** `src/react/quiz/QuizFactory.tsx`

**Preconditions:** Steps 4, 5, 6

**Test cases:**
- **Frontend tests:**
  - `quiz_type_id: 3` → renders MultipleChoiceRenderer
  - `quiz_type_id: 1` → renders ClozeRenderer
  - `quiz_type_id: 8` → renders DragDropRenderer
  - `quiz_type_id: 99` → renders fallback
  - `onSubmit` passes through to child
- **Backend tests:** n/a

**Expected artifacts:** QuizFactory.

**Exit criteria:**
- [x] 5 tests pass

---

## Step 8 — QuizOverlay Event-driven Container

**Goal:** React component mount sẵn, listen `OPEN_QUIZ`, mở fullscreen overlay, submit → emit `QUIZ_RESULT` → đóng.

**Scope:**
- ✅ `src/react/quiz/QuizOverlay.tsx` — subscribe `OPEN_QUIZ`, render `<QuizFactory>`, fade in/out animation (CSS)
- ✅ Emit `QUIZ_RESULT` với `{correct, timeSpent, attempts}`
- ✅ Cleanup subscription on unmount (không leak)
- ❌ Không whiteboard tool (defer)

**Components touched:** `src/react/quiz/QuizOverlay.tsx`

**Preconditions:** Step 1, 7

**Test cases:**
- **Frontend tests:**
  - Mount component → hidden default
  - Emit `OPEN_QUIZ` with LO payload → overlay visible, correct renderer shown
  - Submit correct → `QUIZ_RESULT` emitted with `correct: true`, overlay hidden after animation
  - Submit wrong → `QUIZ_RESULT` with `correct: false`
  - Unmount component → listener removed (test by emitting after unmount, no callback fire)
- **Backend tests:** n/a

**Expected artifacts:** QuizOverlay component.

**Exit criteria:**
- [x] 5 tests pass
- [x] No memory leak verified (listener removed on unmount)

---

## Step 9 — SaveState Zustand Store + localStorage

**Goal:** Global store cho HP/MP/EXP/level/position, persist qua reload.

**Scope:**
- ✅ `src/persistence/SaveStateStore.ts` — Zustand với persist middleware, localStorage key `game_ss3_save_v1`
- ✅ Actions: `setHp`, `setMp`, `gainExp`, `setPosition`, `reset`
- ✅ Version field for future migration
- ❌ Không sync server (Phase 3)
- ❌ Không IndexedDB (Step 19)

**Components touched:** `src/persistence/SaveStateStore.ts`

**Preconditions:** Step 0

**Test cases:**
- **Backend tests (unit với jsdom localStorage):**
  - `gainExp(50)` → exp +50, level up khi qua threshold (formula CL6)
  - `setHp(-10)` → clamp at 0
  - `setHp(200)` → clamp at max
  - Reload store (create new instance) → state persisted
  - `reset()` → clears localStorage
- **Frontend tests:** n/a (store tested trong isolation)

**Expected artifacts:** SaveStateStore.

**Exit criteria:**
- [x] 5 tests pass
- [x] Store state survives simulated reload

---

## Step 10 — PhaserGame React Wrapper

**Goal:** Mount Phaser instance vào React component, cleanup đúng khi unmount (fix bug R3 memory leak).

**Scope:**
- ✅ `src/game/PhaserGame.tsx` — component với `useEffect` init Phaser, cleanup `game.destroy(true, false)`
- ✅ Empty BootScene placeholder
- ✅ Canvas scale FIT + autoCenter
- ❌ Không có scenes thật (Step 11-17)

**Components touched:** `src/game/PhaserGame.tsx`, `src/game/config.ts`

**Preconditions:** Steps 0, 1

**Test cases:**
- **Frontend tests:**
  - Mount → `game` instance exists on DOM `<canvas>`
  - Unmount → `game.destroy` called, canvas removed from DOM
  - Mount → unmount → mount lại → no "WebGL context" console warning
- **Backend tests:** n/a

**Expected artifacts:** PhaserGame wrapper, Phaser config.

**Exit criteria:**
- [x] 3 tests pass
- [x] Memory snapshot không leak qua 10 mount/unmount cycles (check bằng Chrome DevTools manual trong step này)

---

## Step 11 — Boot + Preload Scenes

**Goal:** BootScene khởi tạo config, PreloadScene load assets (progress bar), chuyển sang WorldScene trống.

**Scope:**
- ✅ `src/game/scenes/BootScene.ts` — set scale, load essential atlas (logo)
- ✅ `src/game/scenes/PreloadScene.ts` — load 1 placeholder tileset + 1 player sprite + progress bar UI
- ✅ Empty `WorldScene` — chỉ render background color
- ❌ Chưa có tilemap thật

**Components touched:** `src/game/scenes/BootScene.ts`, `PreloadScene.ts`, `WorldScene.ts` (stub)

**Preconditions:** Step 10

**Test cases:**
- **Backend tests (Phaser headless):**
  - Start BootScene → transitions to PreloadScene
  - PreloadScene emits `PRELOAD_COMPLETE` → transitions to WorldScene
  - Asset cache includes loaded placeholder sprites
- **Frontend tests:** n/a

**Expected artifacts:** 3 scenes, asset preload list.

**Exit criteria:**
- [x] 3 tests pass
- [x] Game boots to WorldScene background in < 2s

---

## Step 12 — WorldScene Tilemap + Player Movement

**Goal:** Load Tiled JSON tilemap, spawn player sprite, WASD di chuyển 4 hướng với collision.

**Scope:**
- ✅ `public/assets/tilemaps/forest_easy.json` — 30×20 tiles sample map
- ✅ `public/assets/tilesets/forest.png`
- ✅ WorldScene load tilemap + tileset
- ✅ Player entity với Arcade Physics body, WASD control
- ✅ Collision layer từ Tiled
- ❌ Không có quái (Step 13)
- ❌ Không có NPC

**Components touched:** `src/game/scenes/WorldScene.ts`, `src/game/entities/Player.ts`, assets

**Preconditions:** Step 11

**Test cases:**
- **Backend tests:**
  - Load scene → player spawn at tilemap-defined spawnpoint `(x,y)`
  - Simulate keypress 'W' → player.body.velocity.y < 0
  - Simulate collision với wall tile → player stopped
  - Velocity reset khi keyup
- **Frontend tests:** n/a (rendering visual)

**Expected artifacts:** 1 playable tilemap, Player entity, WASD controls.

**Exit criteria:**
- [x] 4 tests pass
- [x] Manual: chạy `npm run dev` → di chuyển được trên map

---

## Step 13 — Monster Spawn + Overlap → Combat Event

**Goal:** Spawn 5 Embershed trên map, player overlap quái → emit `ENTER_COMBAT` event + pause WorldScene.

**Scope:**
- ✅ Monster entities spawn từ Tiled object layer "monsters"
- ✅ Arcade Physics overlap callback
- ✅ On overlap: pause scene, emit `ENTER_COMBAT` event với `{monsterId, playerPos}`
- ❌ Combat scene chưa có (Step 14+)

**Components touched:** `src/game/entities/Enemy.ts`, `WorldScene.ts`

**Preconditions:** Steps 1, 12

**Test cases:**
- **Backend tests:**
  - Scene load → 5 monster instances exist
  - Simulate player moving to monster position → `ENTER_COMBAT` emitted once
  - Scene paused flag true after overlap
  - Listener receives correct `monsterId`
- **Frontend tests:** n/a

**Expected artifacts:** Enemy entity, overlap → event bridge.

**Exit criteria:**
- [x] 4 tests pass
- [x] Manual verify: chạm quái → event fire (`console.log` tạm)

---

## Step 14 — CombatScene Static Layout + HP Bars

**Goal:** CombatScene render player bên phải + monster bên trái + HP bars, không có logic yet.

**Scope:**
- ✅ `src/game/scenes/CombatScene.ts` — load on `ENTER_COMBAT` event
- ✅ Render placeholder sprites + HP bar graphics
- ✅ Reads SaveStateStore cho player HP, monster registry for monster HP
- ❌ Không có spell selection UI (Step 16)
- ❌ Không có state machine (Step 15)

**Components touched:** `src/game/scenes/CombatScene.ts`, `src/game/entities/CombatantUI.ts`

**Preconditions:** Steps 9, 11, 13

**Test cases:**
- **Backend tests:**
  - On `ENTER_COMBAT` event → CombatScene starts, WorldScene sleep
  - HP bar widths match current HP/maxHP ratio
  - Changing HP in store → bar updates reactive
- **Frontend tests:** n/a

**Expected artifacts:** CombatScene, HP bar primitive.

**Exit criteria:**
- [x] 3 tests pass

---

## Step 15 — CombatStateMachine (pure)

**Goal:** Pure TypeScript FSM 7 states (per AP CL3), transitions testable độc lập Phaser.

**Scope:**
- ✅ `src/game/systems/CombatStateMachine.ts` — states: INIT, PLAYER_TURN, SELECT_SPELL, QUIZ_GATE, RESOLVE_DAMAGE, VICTORY, DEFEAT, MONSTER_TURN, MONSTER_ATTACK
- ✅ Transition function `next(currentState, event) → nextState`
- ✅ Invalid transition → throws
- ❌ Không tích hợp Phaser (Step 16)

**Components touched:** `src/game/systems/CombatStateMachine.ts`

**Preconditions:** Step 0

**Test cases:**
- **Backend tests:**
  - INIT + START → PLAYER_TURN
  - PLAYER_TURN + CLICK_SPELL → SELECT_SPELL → QUIZ_GATE
  - QUIZ_GATE + QUIZ_CORRECT → RESOLVE_DAMAGE
  - RESOLVE_DAMAGE + MONSTER_HP_ZERO → VICTORY
  - PLAYER_TURN + invalid event → throws
  - Full happy path: 7 transitions no crash
- **Frontend tests:** n/a

**Expected artifacts:** FSM module + complete transition table.

**Exit criteria:**
- [x] 8+ tests cover all valid + 2 invalid transitions

---

## Step 16 — Combat ↔ Quiz Integration

**Goal:** Combat state machine emit `OPEN_QUIZ` on QUIZ_GATE, listen `QUIZ_RESULT` → transition accordingly.

**Scope:**
- ✅ Wire FSM (Step 15) to EventBus (Step 1) trong CombatScene
- ✅ Spell selection UI (4 buttons) trong Phaser (simple rects)
- ✅ On spell click → emit `OPEN_QUIZ` với LO chosen randomly from mocks
- ✅ On `QUIZ_RESULT` correct → transition RESOLVE_DAMAGE; wrong → MONSTER_TURN
- ❌ Chưa apply damage thật (Step 17)

**Components touched:** `CombatScene.ts`, integration với `QuizOverlay` (existing)

**Preconditions:** Steps 8, 15

**Test cases:**
- **Backend tests:**
  - Click spell button → `OPEN_QUIZ` emitted với valid LO payload
  - Emit `QUIZ_RESULT {correct: true}` → FSM state = RESOLVE_DAMAGE
  - Emit `QUIZ_RESULT {correct: false}` → FSM state = MONSTER_TURN
  - Phaser pause on OPEN_QUIZ, resume on QUIZ_RESULT
- **Frontend tests:** 
  - E2E micro-test: trigger combat → click spell → QuizOverlay visible → submit correct → overlay closed

**Expected artifacts:** Full round-trip event chain working.

**Exit criteria:**
- [x] 4 backend + 1 E2E test pass

---

## Step 17 — Damage Resolution + Victory/Defeat

**Goal:** Apply `ElementSystem.calculateDamage` (Step 2) trên RESOLVE_DAMAGE; HP sync qua SaveStateStore; VICTORY/DEFEAT emit + return WorldScene.

**Scope:**
- ✅ Damage apply reduce monsterHp
- ✅ Monster attack on MONSTER_TURN reduce playerHp from store
- ✅ VICTORY → emit `EXIT_COMBAT(won=true)`, remove monster from WorldScene, gain EXP
- ✅ DEFEAT → emit `EXIT_COMBAT(won=false)`, respawn player tại HUB (position reset)
- ❌ Không animation spell cast (defer to polish)

**Components touched:** `CombatScene.ts`, `SaveStateStore.ts` (gainExp action)

**Preconditions:** Steps 2, 9, 13, 16

**Test cases:**
- **Backend tests:**
  - Fire spell vs Plant monster → damage = power × 2.0 × difficulty multiplier
  - Monster HP ≤ 0 → `EXIT_COMBAT` emitted won=true
  - Player HP ≤ 0 → `EXIT_COMBAT` emitted won=false, position reset to (hubX, hubY)
  - Gain EXP trigger level up at threshold (CL6)
- **Frontend tests:** 
  - E2E: full combat win flow → back to WorldScene, monster gone, EXP increased

**Expected artifacts:** End-to-end single combat playable.

**Exit criteria:**
- [x] 4 backend + 1 E2E test pass
- [x] Manual: win combat + lose combat both handled

---

## Step 18 — Mascot Sóc Dialog + Tutorial

**Goal:** Dialog box render với portrait Sóc + typewriter text; tutorial sequence 4 bước khi first-time.

**Scope:**
- ✅ `src/react/screens/MascotDialog.tsx` — portrait + dialog box + typewriter
- ✅ Tutorial sequence JSON `src/data/tutorials/first_time.json`
- ✅ Flag `SaveStateStore.flags.tutorial_completed` — skip on subsequent sessions
- ✅ Sóc 4 portrait state (happy/excited/thinking/sad) — placeholders nếu chưa có art
- ❌ Không branching dialog phức tạp (Phase 2)

**Components touched:** `src/react/screens/MascotDialog.tsx`, tutorial data

**Preconditions:** Step 9

**Test cases:**
- **Frontend tests:**
  - Render → typewriter appears char-by-char
  - Press Space → skip typewriter to full text
  - Click "ĐỒNG Ý" button → advance to next dialog entry
  - Last entry → fire onComplete callback, mark flag
  - Reload game after tutorial complete → dialog skipped
- **Backend tests:** n/a (pure UI)

**Expected artifacts:** MascotDialog component, tutorial data, flag logic.

**Exit criteria:**
- [x] 5 tests pass

---

## Step 19 — Event Stream (Quiz/Combat Events) Local

**Goal:** Append-only event log trong IndexedDB cho `QuizAnsweredEvent` + `CombatEvent`; replay-able.

**Scope:**
- ✅ `src/persistence/EventQueueStore.ts` — IndexedDB (idb library), methods `append(event)`, `drain()`, `size()`
- ✅ On `QUIZ_RESULT` emit → append QuizAnsweredEvent
- ✅ On `EXIT_COMBAT` → append CombatEvent
- ✅ Idempotency key `{session_id}:{seq}`
- ❌ Không sync server (Phase 3)

**Components touched:** `src/persistence/EventQueueStore.ts`, event wiring

**Preconditions:** Steps 1, 9

**Test cases:**
- **Backend tests (jsdom + fake IndexedDB):**
  - `append(event)` → size +1
  - `drain()` returns all events, clears store
  - Duplicate idempotency key → dedup
  - Events persist across page reload
  - Schema validate (Zod) rejects malformed event
- **Frontend tests:** n/a

**Expected artifacts:** Event queue store, schema validation.

**Exit criteria:**
- [x] 5 tests pass

---

## Step 20 — Adaptive Difficulty (CL2)

**Goal:** `selectNextLO(studentId)` picks LO dựa trên sliding-window accuracy + grade + không lặp 24h.

**Scope:**
- ✅ `src/domain/DifficultyAdapter.ts` — function theo AP CL2
- ✅ Sliding window last 20 QuizAnsweredEvent → accuracy
- ✅ Bump difficulty ±1 theo threshold (>0.85 hay <0.50)
- ✅ Exclude LOs hoàn thành trong 24h
- ❌ Không cá nhân hoá sâu (Phase 5)

**Components touched:** `src/domain/DifficultyAdapter.ts`

**Preconditions:** Steps 3, 19

**Test cases:**
- **Backend tests:**
  - Window accuracy = 0.9 → returns LO difficulty+1
  - Window accuracy = 0.4 → returns LO difficulty-1
  - Empty window → returns LO difficulty default (3)
  - LO played 12h ago → excluded
  - LO played 25h ago → included
- **Frontend tests:** n/a

**Expected artifacts:** DifficultyAdapter pure function.

**Exit criteria:**
- [x] 5 tests pass

---

## Step 21 — Main Menu + App Shell Routing

**Goal:** Main Menu screen (WF1) + react-router routes: `/` → menu, `/play` → game.

**Scope:**
- ✅ `src/react/screens/MainMenu.tsx` — WF1 layout
- ✅ react-router-dom routes
- ✅ "Bắt đầu" button → navigate to `/play`
- ✅ "Tiếp tục" disabled if no SaveState
- ❌ Settings screen (defer)

**Components touched:** `src/react/shell/Router.tsx`, `MainMenu.tsx`, `App.tsx`

**Preconditions:** Steps 9, 10

**Test cases:**
- **Frontend tests:**
  - Navigate to `/` → menu visible
  - Click "Bắt đầu" → navigate to `/play`, Phaser mounts
  - No save → "Tiếp tục" disabled
  - With save → "Tiếp tục" enabled
  - Navigate away from `/play` → Phaser unmount (verify no leak)
- **Backend tests:** n/a

**Expected artifacts:** Router + MainMenu.

**Exit criteria:**
- [x] 5 tests pass

---

## Step 22 — E2E Integration Test (Playwright)

**Goal:** Headless full-flow test: Open → Menu → Click Play → Tutorial → World → Combat → Quiz → Victory → Return → Logout.

**Scope:**
- ✅ `tests/e2e/full_flow.spec.ts` — Playwright test
- ✅ Assertions tại mỗi checkpoint (URL, visible element, store state)
- ✅ CI-ready headless Chrome
- ❌ Không test cross-browser (Chrome only Phase 1)

**Components touched:** `playwright.config.ts`, `tests/e2e/full_flow.spec.ts`

**Preconditions:** Steps 0–21 all green

**Test cases:**
- **Frontend tests (Playwright):**
  - Home page loads, Sóc visible
  - Click "Bắt đầu" → tutorial dialog → skip → WorldScene visible (canvas present)
  - Move player to monster (simulate keydown 'D' 2s) → CombatScene shown
  - Click first spell button → QuizOverlay visible
  - Click correct option → overlay closes, damage applied (check HP bar width change)
  - Repeat until monster HP 0 → VICTORY screen → return to World → monster sprite gone
  - Check localStorage `game_ss3_save_v1` updated with new EXP + position
- **Backend tests:**
  - Event queue IndexedDB has ≥ 1 QuizAnsweredEvent + 1 CombatEvent after flow

**Expected artifacts:** Playwright config, 1 full-flow spec, CI hook.

**Exit criteria:**
- [x] Playwright test passes headless in < 60s
- [x] Integrated into `npm run test:e2e`
- [x] All Steps 0–21 tests still passing (no regression)

---

## Acceptance — End of Phase 1

Khi Step 22 pass, Phase 1 được coi là **COMPLETE** khi tất cả các điều sau đúng:

- [x] 22/22 step tests pass
- [x] E2E full flow Playwright pass
- [x] `npm run lint` zero errors
- [x] `npm run build` succeed
- [x] Manual UAT: chơi được 1 vòng đầy-đủ (menu→tutorial→combat×3→victory) không crash
- [x] Memory stable (không leak sau 10 combat cycles)
- [x] Sync với AP v1.0: không phát sinh entity/event/logic mới (nếu có → update AP trước, theo quy trình 9 bước)

---

## After Phase 1

- Phase 2 sẽ thêm: 4 quiz types còn lại (2, 4, 7, 9), 15 quái còn lại, 3 biome map, Mascot Sóc combat form
- Phase 3: Replace mock bằng Supham API thật, JWT auth, progress sync
- Xem chi tiết AP Section 8 "Phased Roadmap"

---

**Waiting for your confirmation.** Không proceed sang Step 0 execution cho đến khi anh approve ISP này.
