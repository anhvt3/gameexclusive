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

**Total Phase 1 remaining:** ~70h (↑ từ 60h v1.0, ~9 working days).

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
