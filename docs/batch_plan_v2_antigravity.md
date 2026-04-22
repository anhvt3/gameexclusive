# Asset Generation Plan v2 — Antigravity Briefing

> **Paste document này vào Antigravity để AI agent plan lại việc generate asset cho Game_SS3_exclusive Phase 1.**
> **Source:** AP v1.1 Appendix A (monsters) + C (mascot) + F (UI/world)
> **Date:** 22/04/2026

---

## CONTEXT cho Antigravity agent

Dự án: **Game_SS3_exclusive** — Edu-RPG internal cho học sinh Clevai 5-18 tuổi, lấy cảm hứng từ Prodigy.
Stack: React 19 + Phaser 3 + Vite. Base resolution 1280×720 desktop/tablet landscape.

**Mục tiêu batch này:** Generate đủ asset cho Phase 1 MVP playable demo (1 biome rừng + 5 quái tier-starter + mascot Sóc tutorial + UI cơ bản).

**⚠️ QUAN TRỌNG:** Chỉ generate **5 quái starter** cho Phase 1 (KHÔNG phải toàn bộ 20 roster). 15 quái còn lại để Phase 2.

---

## STYLE ANCHOR (áp dụng mọi prompt)

```
[STYLE]: chibi RPG 2D, Clevai warm-friendly, thick clean outline 2px, 3-tone cel-shaded
[PALETTE CLEVAI]: primary orange #D4691E, warm tan #F4A261, dark brown #8B4513,
                  magical purple #7209B7, gold accent #FFD700
[PHILOSOPHY]: readable cho kids 5-18 tuổi, không dark-horror, không photorealistic
[TECHNICAL]: transparent PNG background, no text, no watermark, no UI overlay
```

---

## 🟢 BATCH 1 — Characters & Hero Tileset (15 hình)

**Priority 1 — block Step 12 + 18 của dev team.**

| # | Asset | Size | Source prompt |
|---|---|---|---|
| 1 | Sóc Clevai Guide — **Pose Greet** (greeting/menu default) | 512×512 | Appendix C.2 Pose C1 |
| 2 | Sóc Clevai Guide — **Pose Talk** (dialog mode) | 256×256 | Appendix C.2 Pose C2 |
| 3 | Sóc Clevai Guide — **Pose Cheer** (reward moment) | 512×512 | Appendix C.2 Pose C3 |
| 4 | Sóc Clevai Guide — **Pose Think** (hint/encouragement) | 256×256 | Appendix C.2 Pose C4 |
| 5 | Wizard Male — **Walk spritesheet 4-direction** (16 frames grid) | 128×128 | Appendix F.1.1 |
| 6 | Wizard Male portrait — **Neutral** | 128×128 | Appendix F.1.3 pose 1 |
| 7 | Wizard Male portrait — **Excited** | 128×128 | Appendix F.1.3 pose 2 |
| 8 | Wizard Male portrait — **Worried** | 128×128 | Appendix F.1.3 pose 3 |
| 9 | Wizard Male portrait — **Focused** | 128×128 | Appendix F.1.3 pose 4 |
| 10 | Forest Tileset 32×32 (8×8 grid = 256×256 sheet, 64 tiles) | 256×256 | Appendix F.2.1 |
| 11 | Forest Combat Background (golden hour, player+monster spaces reserved) | 1280×720 | Appendix F.3.1 |
| 12 | Embershed **idle** (🔥 Fire starter) | 128×128 | Appendix A #1 pose idle |
| 13 | Embershed **attack** | 128×128 | Appendix A #1 pose attack |
| 14 | Embershed **hurt** | 128×128 | Appendix A #1 pose hurt |
| 15 | Embershed **death** | 128×128 | Appendix A #1 pose death |

**Checkpoint sau B1:** dev team có đủ character + tileset + 1 quái mẫu → chạy được combat demo khung xương.

---

## 🟡 BATCH 2 — Remaining Starter Monsters (16 hình)

**4 quái starter còn lại × 4 states + HP bar.**

| # | Asset | Size | Source |
|---|---|---|---|
| 16-19 | Tidus (💧 Water) × 4 states | 128×128 | Appendix A #4 |
| 20-23 | Applepot (🌿 Plant) × 4 states | 128×128 | Appendix A #7 |
| 24-27 | Frostfang (❄️ Ice) × 4 states | 128×128 | Appendix A #10 |
| 28-31 | Voltee (⚡ Storm) × 4 states | 128×128 | Appendix A #13 |

**Checkpoint sau B2:** đủ 5 starter monsters × 4 states = 20 PNG. Phase 1 combat content complete.

---

## 🟠 BATCH 3 — UI System (15 hình)

**HP + MP bars, spell icons, menu BG, UI primitives.**

| # | Asset | Size | Source |
|---|---|---|---|
| 32 | HP bar empty (frame only) | 256×48 | Appendix F.4.1 state 1 |
| 33 | HP bar 100% | 256×48 | F.4.1 state 2 |
| 34 | HP bar 50% | 256×48 | F.4.1 state 3 |
| 35 | HP bar 20% critical red pulse | 256×48 | F.4.1 state 4 |
| 36 | MP bar empty | 256×48 | F.4.2 state 1 |
| 37 | MP bar 100% | 256×48 | F.4.2 state 2 |
| 38 | MP bar 50% | 256×48 | F.4.2 state 3 |
| 39 | MP bar 20% | 256×48 | F.4.2 state 4 |
| 40-47 | Spell icons 8 elements (Fire/Water/Earth/Ice/Storm/Plant/Shadow/Astral) | 96×96 each | Appendix F.4.3 |

**Checkpoint sau B3:** HUD + spell selection UI complete.

---

## 🔴 BATCH 4 — VFX + Banners + Menu (14 hình)

**Animation + notifications + main menu.**

| # | Asset | Size | Source |
|---|---|---|---|
| 48 | Main Menu Background (floating island, Clevai logo space center-top) | 1920×1080 | Appendix F.6.1 |
| 49 | UI Primitives Kit sheet (buttons, input, dialog frame, icons) | 1024×768 | Appendix F.4.4 |
| 50 | Victory banner | 800×120 | Appendix F.4.5 |
| 51 | Defeat banner | 800×120 | Appendix F.4.5 |
| 52 | Level-up banner | 800×120 | Appendix F.4.5 |
| 53 | Fire Blast VFX spritesheet (12 frames) | 768×64 | Appendix F.5 #1 |
| 54 | Water Jet VFX | 768×64 | F.5 #2 |
| 55 | Vine Whip VFX | 768×64 | F.5 #3 |
| 56 | Ice Shard VFX | 768×64 | F.5 #4 |
| 57 | Thunder Bolt VFX | 768×64 | F.5 #5 |
| 58 | Rock Throw VFX | 768×64 | F.5 #6 |
| 59 | Star Fall VFX | 768×64 | F.5 #7 |
| 60 | Shadow Pulse VFX | 768×64 | F.5 #8 |
| 61 | Sample Tilemap reference render (960×640 forest starter area) | 960×640 | Appendix F.2.2 |

---

## GRAND TOTAL PHASE 1: **60 PNG files**

```
B1: 15 (characters + tileset + combat BG + Embershed)
B2: 16 (4 remaining starter monsters × 4 states)
B3: 15 (HP/MP bars + 8 spell icons)
B4: 14 (VFX + banners + menu BG + UI kit + tilemap ref)
────
     60 PNG
```

---

## FOLDER CONVENTION (anh lưu theo đúng path này)

```
app/public/assets/
├── mascot/
│   ├── soc_guide_greet_512.png
│   ├── soc_guide_talk_256.png
│   ├── soc_guide_cheer_512.png
│   └── soc_guide_think_256.png
├── player/
│   ├── wizard_male_walk_spritesheet_128x128.png
│   └── wizard_male_portrait_{neutral|excited|worried|focused}_128.png
├── tilesets/
│   └── forest_tileset_256.png
├── tilemaps/
│   └── forest_reference_960x640.png     (use in Tiled editor)
├── monsters/
│   └── {embershed|tidus|applepot|frostfang|voltee}_{idle|attack|hurt|death}_128.png
├── backgrounds/
│   ├── combat_forest_1280x720.png
│   └── main_menu_1920x1080.png
├── ui/
│   ├── hp_bar_{empty|100|50|20}_256x48.png
│   ├── mp_bar_{empty|100|50|20}_256x48.png
│   ├── spell_icon_{fire|water|earth|ice|storm|plant|shadow|astral}_96.png
│   ├── ui_primitives_kit_1024x768.png
│   └── banner_{victory|defeat|levelup}_800x120.png
└── vfx/
    └── {fire_blast|water_jet|vine_whip|ice_shard|thunder_bolt|rock_throw|star_fall|shadow_pulse}_sheet_768x64.png
```

---

## WORKFLOW cho Antigravity

Với mỗi asset trong 4 batch:
1. Đọc source prompt từ Appendix A/C/F trong `docs/` của dự án
2. Sử dụng Nano Banana Pro generate PNG theo đúng style anchor
3. Save vào folder path như convention trên
4. Validate: transparent bg, đúng size, outline consistent, palette khớp Clevai warm
5. Nếu output sai style → lặp lại với prompt refined

**Timeline estimate:** 60 generation × ~2 phút/cái = ~2 giờ tập trung work.

**Ưu tiên batches theo thứ tự B1 → B2 → B3 → B4** để dev team unblock sớm.

---

## CHECKPOINT BETWEEN BATCHES

Sau mỗi batch, gửi back dev team 1 ảnh mẫu để validate style trước khi generate full. Tránh redo.

---

**END.** Anh paste toàn bộ doc này vào Antigravity session, yêu cầu chạy batch B1 trước, checkpoint với 1 ảnh mascot Sóc Greet rồi mới proceed.
