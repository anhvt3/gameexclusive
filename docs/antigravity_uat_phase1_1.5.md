# Antigravity UAT Prompt — Phase 1 + 1.5 (ready to paste)

> Paste vào Antigravity session MỚI sau khi audio drift fix branch
> đã merge. Replace `<COMMIT_SHA>` ở §3 bằng commit thực tế trước khi gửi.
> Mục tiêu: ship-readiness gate trước khi mở Phase 2.

---

```
# NHIỆM VỤ — UAT Phase 1 + 1.5 cho Game_SS3_exclusive

Bạn là Antigravity, role kép: (1) Art Director — audit visual style
consistent Prodigy-anchor, (2) UAT runner — chạy real Chromium qua
toàn bộ user flow Phase 1+1.5, log bug để Claude Code fix.

Bạn KHÔNG code. Bạn KHÔNG sửa file source. Bạn chỉ:
- Run Chromium thật (không headless), thao tác như học sinh 10 tuổi
- Capture screenshot mỗi milestone + console + network
- Viết bug report theo format §6
- Audit visual consistency vs style anchor Prodigy

## BƯỚC 1 — ĐỌC 6 FILE NGUỒN (BẮT BUỘC, ĐÚNG THỨ TỰ)

1. `tasks/todo.md`
   → Status 35/35 steps Phase 1+1.5, commit history, known risks

2. `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
   → Acceptance criteria từng step (especially 22.11-22.17 polish)

3. `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
   → §6 (UI flow), §8 (combat FSM), §11 (inventory/equipment),
     §13 (event stream), §14 (observability)

4. `docs/appendix_I_visual_polish_juice.md`
   → Phase 1.5 art directives: layered avatar, spell VFX colors,
     reward chest 3-phase animation, victory banner spin-light,
     whiteboard pen colors, weakness label palette

5. `docs/appendix_E_task_classification_examples.md`
   → Hiểu Type A/B/C để bug report classify đúng

6. `docs/appendix_A_monsters_prompts.md` + `appendix_F_ui_assets_prompts.md`
   → Style anchor reference cho asset audit

## BƯỚC 2 — MÔI TRƯỜNG TEST

OS: Windows 11
Browser: Chromium real (Playwright launch headed) hoặc Chrome
canary có DevTools mở
Resolution: 1920×1080 desktop primary, sample 1366×768 laptop
DPR: 1.0 và 2.0 (Retina simulation)
Network: throttle "Fast 3G" cho 2/10 sessions để check loading state

## BƯỚC 3 — CHECKOUT + BOOT

```bash
git fetch origin
git checkout <COMMIT_SHA>      # ← Claude sẽ fill commit fix branch
cd app
npm install
npm run verify                 # phải PASS
npm run lint                   # phải PASS
npm run typecheck              # phải PASS (zero error)
npm run test:run               # phải PASS (482+ unit)
npm run test:e2e               # phải PASS (4+ E2E)
npm run dev                    # khởi server :5173
```

Nếu BẤT KỲ command nào fail → STOP UAT, log "PRE-UAT GATE FAIL"
kèm output cuối, gửi Claude. Đừng test tiếp.

Known issue: vite-dev đôi khi stuck ở BootScene trên sandbox cụ thể.
Nếu reload 3 lần vẫn stuck → log "BOOT_HANG" + console snapshot,
chuyển sang Playwright headed thay thế: `npm run test:e2e -- --headed`.

## BƯỚC 4 — UAT FLOW (10 SCENARIO)

Mỗi scenario: screenshot trước & sau action, log mọi console
warning/error, save vào `uat_results/scenario_NN/`.

### S1 — Cold start → MainMenu
- Clear localStorage + IndexedDB trước
- Reload trang, đợi BootScene → Preload → MainMenu
- Verify: 5 button hiển thị, mascot Sóc idle anim, BGM map play
- AC: < 3s từ blank tới MainMenu interactive

### S2 — Mascot tutorial 4-step
- Click "Bắt đầu" lần đầu, mascot Sóc dẫn 4 dialog
- AC: nhấn next-next-next-finish, mỗi câu < 80 chars VN, anim
  smooth, không clip text

### S3 — World exploration + first combat
- WASD di chuyển 30s, gặp 1 enemy (overlap), trigger ENTER_COMBAT
- AC: BGM crossfade map→combat, CombatScene layout đúng AP §8
  (player trái, monster phải, HP bar trên), mascot weakness hint
  hiện đúng element

### S4 — Quiz overlay + correct answer
- 3 round combat: MultipleChoice, Cloze, DragDrop
- AC: ui_popup_open SFX khi mở overlay, Whiteboard scratchpad
  toggle button hoạt động (pen/eraser/4 màu/clear), submit đúng
  → math_correct SFX + spell VFX color đúng element, monster
  HP giảm đúng formula AP §2

### S5 — Quiz wrong answer + retry
- Cố tình sai 1 câu
- AC: math_wrong SFX, monster phản công, player HP giảm,
  RetryQueue thêm question, không crash khi sai 3 lần liên tiếp

### S6 — Victory + reward chest + level up
- Hạ monster
- AC: VictoryBanner spin-light anim 1.5s (per Appendix I §4),
  EXP delta hiện, nếu đủ EXP → LEVEL_UP event →
  RewardChestOverlay 3-phase (closed → open → item flyout) +
  world_chest_open SFX + level_up SFX, item vào inventory

### S7 — Inventory + equip
- Mở `/inventory` route từ MainMenu
- AC: 4 slot + bag grid, rarity border đúng (common gray /
  rare blue / epic purple / legendary gold), click item →
  detail panel, Trang bị → slot fill + sprite onto PlayerAvatar
  (layered render Appendix I §1), Tháo → slot empty

### S8 — Combat with equipped gear (stat modifier)
- Equip "Mũ Lửa" + "Kiếm Băng" + "Áo Sấm" + "Khiên Đất"
- Combat 1 round
- AC: Player maxHP tăng theo gear, spell damage tăng nếu element
  match, crit chance áp dụng (CL7 AP §11), modifiers hiển thị
  trong tooltip

### S9 — Daily Boss Quest Aldergasp
- Trigger boss quest từ MainMenu (button "Boss hôm nay")
- AC: Aldergasp spawn 5× HP, weakness Plant hiện rõ, hạ được
  trong 8-15 round, victory → 500 EXP + guaranteed item drop
  (per ISP step 22.6)

### S10 — Save state + reload
- Reload trang giữa combat
- AC: SaveState v2 restore — level/EXP/inventory/equipped/HP
  intact, scene resume đúng vị trí, HMAC verify pass (kiểm tra
  console không có "Invalid HMAC" warning)

## BƯỚC 5 — VISUAL & AUDIO AUDIT (PARALLEL)

### A) Style consistency (vs Prodigy anchor + Phase 1 delivery)
- Side-by-side: 5 monster bất kỳ với reference pose Embershed
- Pen weight 2px ± 0.5px, palette #D4691E/#F4A261/#8B4513
- Layered avatar render: 4 equipment overlay không lệch pixel,
  z-order = base → áo → khiên → kiếm → mũ
- Spell VFX color match element (Fire orange-red, Water cyan,
  Plant green, Storm yellow-purple, Ice white-blue, Earth
  brown-gold, Light white, Dark purple-black)
- Reward chest sprite 3 phase đúng frame
- Victory banner spin-light 8 ray, gold #FFD700

### B) Audio audit (CRITICAL — handoff claim "real audio delivered")
- Verify `app/public/assets/audio/` có đủ 22 SFX + 4 BGM .ogg
- Liệt kê file thiếu (handoff trước claim đã giao nhưng có thể
  drift)
- Test mute toggle: SaveState.flags.audio_muted = true → tất
  cả SFX + BGM stop ngay, refresh → vẫn mute
- Volume balance: BGM ≤ 0.4, SFX ≤ 0.6 (per AudioManager const)
- BGM crossfade map↔combat không pop/click

### C) UX micro-issue
- Button hover state hiện ngay (< 50ms)
- Touch target ≥ 44px trên 1366×768
- Vietnamese diacritic không bị clip ở label
- Disabled state contrast đủ (WCAG AA 4.5:1)

## BƯỚC 6 — BUG REPORT FORMAT

File: `uat_results/bug_report_phase1_1.5.md`

```
## BUG-NN — <Tên ngắn>

**Severity:** P0 blocker | P1 fix-before-ship | P2 polish | P3 nit
**Type classification:** A (dev fix) | B (POSUP review) | C (POSUP+ARCH)
**Scenario:** S<N> hoặc Visual-Audit-<X>
**ISP step ref:** Step <N> hoặc N/A
**AP ref:** §<N> hoặc N/A

**Repro:**
1. <bước cụ thể>
2. <bước cụ thể>

**Expected:** <theo AC>
**Actual:** <observed>
**Screenshot:** uat_results/scenario_NN/img_M.png
**Console log (relevant):** ```paste```
**Network log (nếu API):** ```paste```

**Suggested fix scope:** <1-2 câu, KHÔNG viết code>
```

Sort bug list: P0 → P1 → P2 → P3.

## BƯỚC 7 — PASS CRITERIA (ship-ready gate)

- 0× P0 bug
- ≤ 2× P1 bug (mỗi bug có owner + ETA từ Claude)
- 100% asset audit pass HOẶC list rõ asset gap
- Tất cả 10 scenario reach AC chính
- Audio bank present hoặc gap report rõ ràng

Nếu pass → reply "✅ UAT PASS Phase 1+1.5, ready Phase 2 kickoff".
Nếu fail → reply "❌ UAT FAIL — N P0 / M P1 — see bug_report_phase1_1.5.md"
+ ping Claude với top 3 P0.

## BƯỚC 8 — RÀNG BUỘC

- ❌ KHÔNG sửa source file (chỉ Read)
- ❌ KHÔNG đẩy git commit
- ❌ KHÔNG generate asset thay (đó là job riêng — Phase 2 batch plan)
- ✅ Có thể tạo file trong `uat_results/` mới
- ✅ Có thể chạy npm script (verify/lint/typecheck/test/e2e/dev)
- ✅ Báo cáo tiếng Việt, technical term giữ nguyên Anh

## START

Bắt đầu BƯỚC 1 ngay. Khi xong, ping: "Đã đọc 6 source doc, sẵn
sàng vào BƯỚC 3 checkout commit <SHA>?"
```

---

## Notes cho Claude (đừng paste vào Antigravity)

- **Trước khi gửi prompt này:** phải có commit fix audio drift.
  Pre-existing bug trên `main` 6f68d6b: missing `useGameAudio.ts`,
  SfxKey union outdated, audio assets folder không tồn tại. Antigravity
  sẽ stuck ở BƯỚC 3 nếu typecheck đỏ.
- **Replace `<COMMIT_SHA>`** sau khi fix branch merge.
- **Audio asset gap** sẽ là ground truth của handoff drift —
  Antigravity confirm bằng `ls public/assets/audio/`.
- **Antigravity bug feedback loop:** sau khi nhận report, Claude
  Code phải `STOP → flag spec drift → update ISP/AP → commit doc → fix code`
  per `feedback_flag_spec_drift.md`.
- **Output dir `uat_results/`** thêm vào `.gitignore` nếu chưa.
