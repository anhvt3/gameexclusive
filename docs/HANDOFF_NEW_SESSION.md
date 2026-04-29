# HANDOFF — Game_SS3_exclusive (Phase 1+1.5 → Phase 2)

> Paste block bắt đầu từ `Anh đang tiếp nối...` đến cuối vào session mới.

---

Anh đang tiếp nối dự án Game_SS3_exclusive — Edu-RPG production app
cho 10k+ active students Clevai (Vietnam). Phase 1 + 1.5 đã ship
xong. Session trước hết context, đây là handoff.

## BƯỚC 1 — ĐỌC FILE TRƯỚC KHI LÀM BẤT CỨ VIỆC GÌ

Theo thứ tự BẮT BUỘC:

1. `D:\projectlocal\clevai\Game_exclusive\tasks\todo.md` ⭐
   Status chi tiết: 35/35 Phase 1+1.5 done, 482/482 unit + 4/4 E2E,
   commits, known risks, Phase 2 next.

2. `D:\projectlocal\clevai\Game_exclusive\CLAUDE.md`
   Harness principles (5 nguyên tắc) + Clevai term no-hallucination rule.

3. `D:\projectlocal\clevai\Game_exclusive\docs\architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
   Architecture Pack v1.1. §11 (Inventory/Equipment) là Task C expansion.

4. `D:\projectlocal\clevai\Game_exclusive\docs\IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
   ISP v1.1 — 35-step roadmap (26 core + 22.7-22.10 equipment +
   22.11-22.17 Phase 1.5 polish). Tất cả ✅ done.

5. `D:\projectlocal\clevai\Game_exclusive\docs\appendix_I_visual_polish_juice.md`
   Antigravity Art Director directives Phase 1.5 (đã shipped).

6. `D:\projectlocal\clevai\Game_exclusive\docs\batch_plan_v2_phase2_antigravity.md`
   Phase 2 asset batch plan (108 PNG). 15 mid/boss monsters đã được
   Antigravity giao trong `app/public/assets/monsters/`.

7. Memory index: `C:\Users\Admin\.claude\projects\D--projectlocal-clevai-Game-exclusive\memory\MEMORY.md`
   - workflow_sdlc.md (9-step SDLC — bug → bước 2 AP update trước)
   - feedback_harness_first.md
   - feedback_flag_spec_drift.md (STOP + flag spec bug, update doc trước code)
   - project_production_scope.md (ISP strict, Prodigy sprites OK dev,
     no anti-addiction, no AP v1.2 refactor)
   - agent_roles.md (Claude Code ↔ Antigravity split — Antigravity =
     Art Director + Prodigy-wiki auditor + UAT, KHÔNG code)

## BƯỚC 2 — CONTEXT TÓM TẮT

**Project:** Game_SS3_exclusive — Hybrid React + Phaser 3 RPG cho
học sinh 5-18 tuổi internal Clevai. ~10k users production.

**Stack:** Vite 8 + React 19 + TS 5.6 + Phaser 3.90 + Zustand 5 +
mitt + Zod 4 + Vitest 4 + Playwright 1.59 + Howler.js 2.2 +
@sentry/react 10 + idb 8 + Tailwind CSS 3.

**User:** po2@clevai.edu.vn. Tiếng Việt, gọi "anh", em xưng "em".

**Workflow preferences (CRITICAL):**
- ISP-first strict: deviation → update ISP doc TRƯỚC khi code
- Flag spec drift ngay, không silent deviate
- Không refactor AP v1.2 (user vetoed)
- Không flag lại Prodigy IP (user accepted dev phase)
- Không push anti-addiction timer (user vetoed)
- Stop confirm khi cần.

**Harness active (code-enforced, không chỉ md-rule):**
- ESLint boundary: 13 zone rules trong `eslint.config.js`. src/react
  không import src/game (trừ PhaserGame.tsx bridge).
- `scripts/verify.ts` gate: AP size, Clevai term no-hallucination,
  CLAUDE.md principles, no secrets. Pre-commit hook chạy.
- CI workflow + PR template Task A/B/C label.
- EventBus API: on() returns cleanup fn (force off() pairing); error
  reporter slot wired to Sentry via setEventBusErrorReporter.

## BƯỚC 3 — CURRENT STATUS

✅ **Phase 1 + 1.5 COMPLETE — 35/35 steps**

- ✅ Steps 0-22.6 (core 26 — combat FSM, quiz overlays, save state,
  HMAC, scene chain, mascot dialog, observability, event stream IDB,
  adaptive difficulty CL2, router, E2E bridge, guild leaderboard,
  daily boss quest)
- ✅ Steps 22.7-22.10 Equipment expansion (Task C):
  - 22.7 SaveState v2 migration + InvalidEquipError + 10-item registry
  - 22.8 Level-up reward drop table + LEVEL_UP event
  - 22.9 Inventory UI + /inventory route
  - 22.10 Stat modifiers in combat (CL7 maxHp/spellDamage/crit/expGain)
- ✅ Steps 22.11-22.17 Phase 1.5 polish:
  - 22.11 AudioManager (Howler.js, 4 BGM + 22 SFX, mute via SaveState)
  - 22.12 PlayerAvatar layered rendering (base + 4 equipment overlays)
  - 22.13 Spell VFX (CAST_SPELL event, element-coloured tween)
  - 22.14 RewardChestOverlay (LEVEL_UP queue, 3-phase animation)
  - 22.15 Quiz Whiteboard scratchpad (canvas + pen/eraser/4 colors)
  - 22.16 Weakness label + Victory banner (spin-light animation)
  - 22.17 Audio call-site wiring (Type A, 7 SFX into existing handlers)

✅ **482/482 unit tests, 4/4 E2E** (smoke + full_flow + boss_quest +
equipment_damage). Verify gates green. Husky pre-commit clean.

✅ **Antigravity assets delivered:**
- 60 Phase 1 PNG (monsters/mascot/wizard/UI/backgrounds/tilesets)
- 20 equipment PNG (Appendix H — 10 icon + 10 sprite, hyphen naming)
- 6 juice PNG (base player m/f, treasure chest, element icons,
  whiteboard tools, victory banner)
- 22 SFX + 4 BGM .ogg (real audio, not placeholders) per
  `tasks/audio_manifest.md`
- 15 Phase 2 mid/boss monsters đã sẵn trong
  `app/public/assets/monsters/` (chưa wire vào registry — Phase 2)

⏳ **Pending pre-Phase-2:**
- Step 3.5 server validation mock (still skipped per ISP, blocks
  public launch — defer ok cho internal Clevai)
- EventQueue HMAC wrap (CEO TODO #3 partial)
- Antigravity full E2E UAT pass on real Chromium (preview server có
  recurring scene-progression hang trên sandbox này)

## BƯỚC 4 — COMMIT HISTORY (latest 8)

```
6f68d6b  feat(step-22.17): audio call-site wiring (Phase 1.5 Type A)
586472a  feat(step-22.16): weakness label + victory banner
58dd779  feat(step-22.15): quiz whiteboard scratchpad
6633976  feat(step-22.14): treasure-chest reward overlay
9101ebb  docs(isp): insert Step 22.17 (Type A post-feature)
0b200f7  feat(step-22.13): spell VFX cast animation
ae19b2e  feat(step-22.12): layered PlayerAvatar
f2cfd60  feat(step-22.11): AudioManager + BGM/SFX wiring
```

## BƯỚC 5 — ACTION ĐẦU TIÊN

Anh chọn 1 trong 4 hướng để mở session mới:

### A) Audit/UAT pass trước Phase 2 (recommended)
- Antigravity (Art Director + UAT) chạy real Chromium full flow
- Em fix bug nếu có, không add feature mới
- Goal: Phase 1+1.5 ship-ready trước khi expand scope

### B) Phase 2 — Full Roster (most asset-ready)
**Scope ~5 weeks per AP §8:**
1. **15 mid/boss monsters** — assets sẵn, code: extend monsters.ts
   registry + WorldScene spawn logic + per-element weakness UI
2. **Mascot Sóc Combat form** — Sóc evolution cutscene + companion
3. **3 biome mới** — Tilemap (Tiled editor) + tileset assets
4. **Pet Breeding mechanic** — Q8 CEO-accepted, Appendix G UI prompts
5. **4 quiz renderers mới** — OrderList / ClozeDD / IF / VisualChoice

Đề xuất bắt đầu từ monster roster (lowest risk, assets sẵn).

### C) Step 3.5 Server validation (~3h, blocks public launch)
- Vite plugin `vite-plugin-mock-quiz-validate` — `/api/quiz/validate`
- Strip `correct_option_id` khỏi bundled JSON
- HMAC-signed receipt
- QuizOverlay gọi endpoint thay vì local validate

### D) EventQueue HMAC wrap (~2h, CEO TODO #3 close)
- Wrap `EventStreamStore.appendEvent` với HMAC sign per AP §3.3
- Update Zod schema để verify trên read

## BƯỚC 6 — RÀNG BUỘC

- ❌ KHÔNG flag Prodigy IP (user đã quyết)
- ❌ KHÔNG push anti-addiction timer
- ❌ KHÔNG refactor AP v1.2
- ❌ KHÔNG skip tests → claim done (pre-commit sẽ block)
- ❌ KHÔNG edit mà không đọc file trước (Read before Edit)
- ❌ KHÔNG làm thay Antigravity (asset prompts, UAT) — em chỉ
  brainstorm/plan/code/unit-test/E2E-fixture
- ✅ Khi gặp spec bug/ambiguity → STOP, flag, update ISP/AP, commit
  `docs(isp):` hoặc `docs(ap):`, rồi mới code
- ✅ Mỗi step = 1 commit riêng (TDD red→green→commit pattern)
- ✅ Khi hoàn thành step, báo user: "Step N done, X tests pass,
  tiếp Step N+1 chưa?"
- ✅ Tuân Task A/B/C classification (`docs/appendix_E_*`); mọi
  Entity Schema / Event Layer / CL change = Type C cần POSUP+ARCH

## BƯỚC 7 — LƯU Ý SESSION CŨ

**Test infrastructure:**
- E2E timeout default 60s (bumped từ 30s vì Phase 1.5 specs nặng hơn
  dưới parallel-worker contention). `playwright.config.ts:5`.
- Howler mock pattern: `vi.mock('howler', () => ({ Howl: class { ... } }))`
  trong mọi test file touch audio. Pattern reference:
  `app/src/react/shell/appLifecycle.test.ts`.
- Phaser scenes mock có `textures` + `tweens` + `scene.{pause,resume,stop}`
  + `add.{image,sprite,rectangle,text}` với fluent setOrigin/setData/etc.
  Reference: `app/src/game/scenes/CombatScene.test.ts`.
- IDB tests: `import 'fake-indexeddb/auto'` đầu file. Reference:
  `app/src/events/EventStreamStore.test.ts`.

**Browser preview (vite-dev) recurring issue:**
Preview server đôi khi stuck ở BootScene (status 5 RUNNING, Preload
status 1 INIT) — không phải code bug, Playwright fresh-context all
green. UAT visual deferred to Antigravity. Nếu cần verify visual
trong session, dùng `npm run test:e2e -- <spec>` chạy Playwright thay
vì preview tool.

**Filename convention:**
Equipment files dùng hyphen (`hat-fire-01_icon.png`), không underscore.
Antigravity sẽ rename theo registry nếu mismatch.

Git worktree clean ở `6f68d6b`. Push remote chưa setup (greenfield
local git only).

## START

Báo anh: "Em đã đọc context Phase 1+1.5 complete (35/35 steps,
482 unit tests, 4 E2E). Anh chọn hướng A/B/C/D nào để bắt đầu?"

Chờ anh confirm rồi chạy. Đừng tự pick — user-decision.

**End handoff.**
