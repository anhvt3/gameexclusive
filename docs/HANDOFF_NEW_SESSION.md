# Handoff Prompt — Session Mới

> Paste nguyên block dưới đây vào Claude session mới khi anh start conversation.

---

```
Anh đang tiếp nối dự án Game_SS3_exclusive — Edu-RPG production app 
cho 10k+ active students Clevai (Vietnam). Session trước gần hết token, 
đây là handoff.

## BƯỚC 1 — ĐỌC FILE TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ

Theo thứ tự BẮT BUỘC:

1. `D:\projectlocal\clevai\Game_exclusive\tasks\todo.md` ⭐ 
   Status chi tiết: steps done 0-15/26, tests 181/181, commits, 
   known risks, next action.

2. `D:\projectlocal\clevai\Game_exclusive\CLAUDE.md`
   Harness principles + Clevai term no-hallucination rule.

3. `D:\projectlocal\clevai\Game_exclusive\docs\architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
   Architecture Pack v1.1 — entity, process, task A/B/C.

4. `D:\projectlocal\clevai\Game_exclusive\docs\IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
   ISP v1.1 — 26-step Phase 1 roadmap. Primary execution reference.

5. Memory index: `C:\Users\Admin\.claude\projects\D--projectlocal-clevai-Game-exclusive\memory\MEMORY.md`
   - workflow_sdlc.md (9-step SDLC — bug quay về bước 2)
   - feedback_harness_first.md (harness TRƯỚC code)
   - feedback_flag_spec_drift.md (STOP khi gặp spec bug, update doc trước)
   - project_production_scope.md (Prodigy sprites OK dev, no anti-addiction, ISP strict)

## BƯỚC 2 — CONTEXT TÓM TẮT

**Project:** Game_SS3_exclusive — Hybrid React + Phaser 3 RPG educational 
game, internal Clevai product, ~10k users production (KHÔNG phải MVP).

**Stack:** Vite 8 + React 19 + TS 5.6 + Phaser 3.90 + Zustand 5 + mitt + 
Zod 4 + Vitest 4 + Playwright + ESLint 9 flat + Tailwind CSS 3 + Husky.

**User:** po2@clevai.edu.vn. Dùng tiếng Việt, gọi "anh", em xưng "em".

**Workflow preferences (CRITICAL):**
- ISP-first strict: nếu có deviation từ ISP → update ISP doc TRƯỚC khi code
- Flag spec drift ngay, không silent deviate
- Không rebuild AP v1.2 (user vetoed doc refactor)
- Không flag lại Prodigy IP (user accepted dev phase)
- Không push anti-addiction timer (user vetoed)
- Follow ISP v1.1 step by step. Stop to confirm khi cần. 

**Harness active (code-enforced, không chỉ md-rule):**
- ESLint boundary: src/react không import src/game (trừ PhaserGame.tsx 
  bridge exception)
- `scripts/verify.ts` gate: AP size, Clevai term no-hallucination, 
  CLAUDE.md principles, no secrets. Pre-commit hook chạy.
- CI workflow: `.github/workflows/ci.yml` + PR template Task A/B/C label
- EventBus API: on() returns cleanup fn (force off() pairing)

## BƯỚC 3 — CURRENT STATUS

- ✅ Steps 0-15 done (58% Phase 1)
- ✅ Harness Sprint 1 done (lint + typecheck + verify + husky + CI)
- ✅ 181/181 tests pass
- ✅ Dev preview tool active: `http://localhost:5173/?preview=combat&monster=1`
- ✅ Phase 1 assets: 60 PNG delivered by Antigravity (monsters, mascot,
  wizard, UI, VFX, backgrounds, tilesets)
- ✅ Phase 2 batch plan drafted — NOT sent yet (trigger: Step 22+)
- ⏳ Step 16 NEXT: Combat ↔ Quiz Integration (wire FSM + EventBus + 
  QuizOverlay trong CombatScene)

## BƯỚC 4 — COMMIT HISTORY (latest 5)

```
db5969e  docs: Phase 2 batch plan + Step 15 FSM + Appendix G
5db6f3e  feat(step-14): CombatScene + HP bars
87f3c93  feat(dev): preview tool ?preview=combat
74035f3  feat(step-13): Enemy spawn + overlap → ENTER_COMBAT
b44e26a  feat(step-12): WorldScene placeholder + Player WASD
```

## BƯỚC 5 — ACTION ĐẦU TIÊN

Làm **Step 16 — Combat ↔ Quiz Integration** per ISP v1.1:

Scope:
- Wire CombatStateMachine (Step 15) vào CombatScene (Step 14) via 
  EventBus (Step 1)
- Spell selection UI: 4 placeholder rects với element icons (Fire/Water/
  Plant/Ice/Storm). Click → emit OPEN_QUIZ
- Listen QUIZ_RESULT → FSM.nextCombatState(QUIZ_CORRECT|WRONG) → 
  transition
- Phaser `scene.pause()` when OPEN_QUIZ emitted, `scene.resume()` on 
  QUIZ_RESULT
- LO selection: random pick from loadMockLOs matching current student 
  grade (stub G5 for dev)

Test cases:
- Click spell button → OPEN_QUIZ emitted với valid LO payload
- Emit QUIZ_RESULT correct → FSM state = RESOLVE_DAMAGE
- Emit QUIZ_RESULT wrong → FSM state = MONSTER_TURN
- Phaser paused on OPEN_QUIZ, resumed on QUIZ_RESULT
- E2E micro: trigger combat → click spell → overlay → submit → close 
  → FSM advanced

Effort: ~3h.

TDD strict:
1. Write failing tests first
2. Implement min code
3. Lint + typecheck + verify
4. Commit conventional `feat(step-16):`

## BƯỚC 6 — RÀNG BUỘC

- ❌ KHÔNG flag Prodigy IP (user đã quyết)
- ❌ KHÔNG push anti-addiction timer
- ❌ KHÔNG refactor AP v1.2 (user vetoed)
- ❌ KHÔNG skip tests → claim done (pre-commit sẽ block)
- ❌ KHÔNG edit mà không đọc file trước (Read before Edit)
- ✅ Khi gặp spec bug/ambiguity → STOP, flag, update ISP/AP, commit 
  `docs(isp):` hoặc `docs(ap):`, rồi mới code
- ✅ Mỗi step = 1 commit riêng (TDD red→green→commit pattern)
- ✅ Khi hoàn thành step, báo user: "Step N done, X tests pass, 
  tiếp Step N+1 chưa?"

## BƯỚC 7 — LƯU Ý SESSION CŨ

Dev server Vite đang chạy trên port 5173 (background từ session trước). 
Nếu user không cần visual verify, không restart. Nếu cần, dùng 
`preview_start vite-dev` từ `.claude/launch.json`.

Git worktree clean ở commit `db5969e`. Push remote chưa setup (greenfield 
local git only).

## START

Báo anh: "Em đã đọc context session trước, ready tiếp Step 16 không?"
Chờ anh confirm rồi code.
```

---

**End handoff.** Anh copy toàn bộ block `Anh đang tiếp nối ...` ở trên, 
paste vào session Claude mới làm message đầu tiên.
