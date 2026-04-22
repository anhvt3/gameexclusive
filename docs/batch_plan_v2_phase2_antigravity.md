# Asset Generation Plan v2 — Phase 2 — Antigravity Briefing

> **Paste vào Antigravity khi Phase 1 code sắp xong (ISP Step ~22/26).**
> Đừng gửi sớm: scope có thể thay đổi + Antigravity overload.
> **Source specs:** AP v1.1 Section 8 (Phased Roadmap) + Appendix A (20-monster roster) + Appendix C (Mascot Sóc Combat form)
> **Date draft:** 22/04/2026
> **Supersedes:** n/a (Phase 2 lần đầu)

---

## CONTEXT

Game_SS3_exclusive Phase 1 đã giao 60 asset (5 quái starter + UI + mascot Guide). Phase 2 mở rộng:
1. **15 quái còn lại** (mid/boss/rare tier) → full roster 20/20
2. **Mascot Sóc Combat form** (evolved battle mode + cutscene)
3. **3 biome mới** (ngoài forest đã có)
4. **Pet Breeding UI** (feature mới, Q8 accepted CEO review)
5. **Quiz UI extras** cho 4 type mới (Order list / Cloze DD / IF / Visual Choice)

**Tổng Phase 2: ~108 PNG.** Chia 5 batch.

---

## STYLE ANCHOR (giữ nguyên Phase 1)

```
[STYLE]: chibi RPG 2D, thick clean outline 2px, 3-tone cel-shaded flat
[PALETTE CLEVAI]: primary orange #D4691E, warm tan #F4A261, dark brown #8B4513,
                  magical purple #7209B7, gold #FFD700
[AUDIENCE]: học sinh Việt Nam 5-18 tuổi
[TECHNICAL]: transparent PNG background, no text, no watermark
[CONSISTENCY CHECK]: Đồ chiếu style Phase 1 delivered → phải cùng world, cùng feel
```

Chi tiết từng quái xem `appendix_A_monsters_prompts.md`. Mascot Combat xem `appendix_C_mascot_soc_prompts.md` (Section C.3 + C.5-C.8).

---

## 🟢 BATCH 1-P2 — Fire + Water Mid/Boss (16 PNG)

**15 quái còn lại chia 3 batch đầu theo element pair. Prodigy fan sẽ nhận ra ngay:** mỗi starter (Phase 1) giờ có 1 mid-tier và 1 boss trong cùng element family.

| # | Codename | Tier | Element | Appendix A ref |
|---|---|---|---|---|
| 1-4 | Burnewt | Mid | 🔥 Fire | #2 (idle/attack/hurt/death) |
| 5-8 | Pyromar | Boss | 🔥 Fire | #3 (4 states, 256×256 boss size) |
| 9-12 | Diveodile | Mid | 💧 Water | #5 |
| 13-16 | Aegir | Boss | 💧 Water | #6 (256×256 boss) |

**Size notes:** Mid = 128×128. Boss = 256×256 (bigger presence).
**Checkpoint sau B1-P2:** Gửi 1 ảnh Pyromar idle cho user duyệt style boss (có cùng feel với 5 starter Phase 1 không?).

---

## 🟡 BATCH 2-P2 — Plant + Ice Mid/Boss (16 PNG)

| # | Codename | Tier | Element | Appendix A ref |
|---|---|---|---|---|
| 17-20 | Florafox | Mid | 🌿 Plant | #8 (160×160 mid) |
| 21-24 | Aldergasp | Boss | 🌿 Plant | #9 (256×256 boss) |
| 25-28 | Mystember | Mid | ❄️ Ice | #11 |
| 29-32 | Blizzhared | Boss | ❄️ Ice | #12 (256×256 boss) |

---

## 🟠 BATCH 3-P2 — Storm + Earth + Shadow (16 PNG)

| # | Codename | Tier | Element | Appendix A ref |
|---|---|---|---|---|
| 33-36 | Acromi | Boss | ⚡ Storm | #14 (256×256 boss) |
| 37-40 | Gobbler | Starter | 🌍 Earth | #15 (Earth starter — missing from P1) |
| 41-44 | Bovile | Boss | 🌍 Earth | #16 (256×256 boss) |
| 45-48 | Shadowling | Mid | 🌑 Shadow | #20 |

**Note:** Gobbler là Earth starter quái duy nhất (Phase 1 skip vì chỉ 5 starter). Sau B3-P2, game có đủ **7/8 element family starters**.

---

## 🔴 BATCH 4-P2 — Astral Family + Mascot Combat Form (40 PNG)

**Dày nhất. Chia 2 sub-batch nếu cần.**

### Sub-batch 4a — Astral 3 quái (12 PNG)

| # | Codename | Tier | Element | Appendix A ref |
|---|---|---|---|---|
| 49-52 | Peeko | Mid | 🌌 Astral | #17 |
| 53-56 | Luminex | Boss | 🌌 Astral | #18 (256×256 boss) |
| 57-60 | Nebulite | Rare | 🌌 Astral | #19 |

### Sub-batch 4b — Mascot Sóc Combat Evolution (28 PNG)

| # | Asset | Size | Frames | Appendix C ref |
|---|---|---|---|---|
| 61 | Sóc Combat Idle | 256×256 | 4-frame loop | C.3 Pose C5 |
| 62 | Sóc Combat Attack | 256×256 | 6-frame oneshot | C.3 Pose C6 |
| 63 | Sóc Combat Hurt | 256×256 | 3-frame oneshot | C.3 Pose C7 |
| 64 | Sóc Evolution Cutscene spritesheet | 512×512 per frame, 24 frames | 1 sheet or grid | C.3 Pose C8 |

**Delivery note sub-batch 4b:**
- Sóc Combat Idle/Attack/Hurt có thể deliver as **sprite sheets** (horizontal strip) hoặc **separate frames**. Dev team sẽ dùng Phaser spritesheet loader → prefer strips.
- Evolution cutscene 24 frames là **one-time scene** (trigger 1 lần khi tutorial complete). Deliver as 1 large sprite sheet 4×6 grid = 2048×3072 OR 24 separate frames 512×512.

**Checkpoint sau B4-P2:** Sóc evolution cutscene là **brand moment lớn**. Gửi 1 frame mid-evolution cho user duyệt trước khi generate đủ 24.

---

## 🟣 BATCH 5-P2 — Biomes + Pet Breeding UI + Extras (~20 PNG)

### Sub-batch 5a — New Biomes (6 files)

| # | Biome | Tileset | Combat BG | Prompt source |
|---|---|---|---|---|
| 65 | **Volcanic Cave** (Fire boss) | 256×256 | — | F.2 extend: lava glow + obsidian |
| 66 | Volcanic Combat BG | — | 1280×720 | F.3 extend |
| 67 | **Frozen Peak** (Ice boss) | 256×256 | — | F.2 extend: snow + ice crystals |
| 68 | Frozen Peak Combat BG | — | 1280×720 | F.3 extend |
| 69 | **Deep Ocean** (Water boss) | 256×256 | — | F.2 extend: deep blue + bubbles |
| 70 | Deep Ocean Combat BG | — | 1280×720 | F.3 extend |

**3 biome new + 3 BG = 6 asset.**

### Sub-batch 5b — Pet Breeding UI (~10 files)

Q8 accepted CEO review. Mechanic: học sinh combine 2 pets → produce evolved variant.

| # | Asset | Size | Purpose |
|---|---|---|---|
| 71 | Breeding chamber BG | 1280×720 | Main screen breeding UI |
| 72 | Pet slot frame (empty) | 256×256 | Where user drops parent pet |
| 73 | Pet slot frame (filled glow) | 256×256 | Parent assigned, pulsing highlight |
| 74 | Breeding result slot | 256×256 | Center, shows offspring preview |
| 75 | Compatibility meter | 320×64 | Heart bar showing pet synergy |
| 76 | Egg container (brood timer) | 160×160 | Countdown while breeding |
| 77 | Offspring reveal sparkle FX | 400×400 | Moment-of-reveal particles |
| 78 | "Breed" button (ready) | 240×64 | Primary CTA |
| 79 | "Breed" button (disabled) | 240×64 | Greyed out |
| 80 | Pet inventory icon frame | 96×96 | Grid slot in pet collection |

### Sub-batch 5c — Quiz UI Extras (~4 files)

Phase 2 code supports 7/11 quiz types. UI graphics cần minimal vì renderer tự sinh HTML:

| # | Asset | For quiz_type_id |
|---|---|---|
| 81 | Drag handle icon (hamburger) | 2 (Order list) |
| 82 | Drop zone shimmer FX | 4, 8 (Kéo thả variants) |
| 83 | IF check/cross animation | 7 (Điền đáp án đúng) |
| 84 | Visual choice image frame | 9 (Visual choice slot) |

---

## GRAND TOTAL PHASE 2: **~108 PNG**

```
B1-P2: 16  (Fire + Water mid/boss)
B2-P2: 16  (Plant + Ice mid/boss)
B3-P2: 16  (Storm + Earth + Shadow)
B4-P2: 40  (Astral 3 + Mascot Combat + Evolution 24)
B5-P2: 20  (Biomes + Pet Breeding + Quiz extras)
─────
     108 PNG
```

**Estimated effort:** ~108 × 2 phút = **~3.5 giờ** tập trung work.

---

## FOLDER CONVENTION — PHASE 2 EXTENSIONS

```
app/public/assets/
├── monsters/
│   ├── {burnewt|pyromar|diveodile|aegir}_{idle|attack|hurt|death}_{128|256}.png
│   ├── {florafox|aldergasp|mystember|blizzhared}_{state}_{size}.png
│   ├── {acromi|gobbler|bovile|shadowling}_{state}_{size}.png
│   └── {peeko|luminex|nebulite}_{state}_{size}.png
├── mascot/
│   ├── soc_combat_idle_sheet_256x256.png      (4 frames)
│   ├── soc_combat_attack_sheet_256x256.png    (6 frames)
│   ├── soc_combat_hurt_sheet_256x256.png      (3 frames)
│   └── soc_evolution_cutscene_sheet_2048x3072.png  (24 frames 4x6 grid)
├── tilesets/
│   └── {volcanic|frozen_peak|deep_ocean}_tileset_256.png
├── backgrounds/
│   └── combat_{volcanic|frozen_peak|deep_ocean}_1280x720.png
├── breeding/                                   (NEW folder)
│   ├── chamber_bg_1280x720.png
│   ├── pet_slot_{empty|filled}_256.png
│   ├── offspring_slot_256.png
│   ├── compatibility_meter_320x64.png
│   ├── egg_container_160.png
│   ├── reveal_sparkle_fx_400.png
│   ├── breed_button_{ready|disabled}_240x64.png
│   └── inventory_slot_96.png
└── ui/
    ├── drag_handle_icon.png
    ├── drop_zone_shimmer_fx.png
    ├── if_check_anim_sheet.png
    └── vc_image_frame.png
```

---

## RÀNG BUỘC PHASE 2

- ✅ **Consistency first:** Mỗi quái Phase 2 phải cùng style visual với 5 starter Phase 1 (side-by-side comparison test). Không được đột ngột anime-dark hoặc Disney-3D.
- ✅ **Boss scale clarity:** Boss 256×256 phải có **silhouette đủ threatening nhưng vẫn chibi-readable cho kids**.
- ✅ **Sóc Combat form:** Vẫn là mascot Sóc (không phải creature khác). Người lớn lên, armor nhẹ, giữ đuôi xù + mắt to.
- ❌ **Không scrape Prodigy** cho Phase 2 — tất cả phải generate original (Phase 1 dùng Prodigy vì hard commitment replace trước launch; Phase 2 là **cơ hội redo**). Bắt đầu với original từ đầu.
- ✅ **Checkpoint sau mỗi batch** — gửi 1 ảnh representative cho user duyệt trước khi generate đủ batch.

---

## WORKFLOW

Giống Phase 1:
1. Đọc `batch_plan_v2_phase2_antigravity.md` (file này) để biết B1-P2 → B5-P2 làm gì
2. Với mỗi asset, tra prompt trong:
   - `appendix_A_monsters_prompts.md` (monsters)
   - `appendix_C_mascot_soc_prompts.md` (mascot combat + evolution)
   - `appendix_F_ui_assets_prompts.md` (biomes, UI extras, sections F.2/F.3 extend)
   - **NEW for breeding UI:** em sẽ viết bổ sung Appendix G (Pet Breeding UI prompts) khi đến thời điểm gửi
3. Generate Nano Banana Pro
4. Save theo folder convention
5. Checkpoint batch → user duyệt → proceed

---

## WHEN TO SEND TO ANTIGRAVITY

**NOT YET.** Gửi khi:
- [ ] Phase 1 code complete ≥ Step 22/26
- [ ] Phase 2 scope không thay đổi (CEO confirm)
- [ ] Appendix G (Pet Breeding UI) đã viết xong

**Red flags KHOAN gửi:**
- Đang tranh luận scope Pet Breeding
- Phase 1 test UAT phát hiện bug yêu cầu redesign art style
- Budget Antigravity hạn chế → ưu tiên B1-B3-P2 (60 monster PNG) trước, defer B4-B5

---

## PHASE 2 → PHASE 3+ BACKLOG (chưa scope)

Tham khảo, **không generate ở Phase 2**:
- Phase 3 Supham API integration — không cần art mới
- Phase 4 Custom art REPLACE — nếu launch public cần thay hết Prodigy-derived assets Phase 1 (em sẽ viết Phase 4 batch plan riêng)
- Phase 5 Multiplayer UI — guild realtime chat, live boss raid HUD, event banners

---

**END.** Anh review, nếu OK → **chờ Phase 1 gần xong rồi gửi Antigravity session mới với file này làm master plan.**
