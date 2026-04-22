# Antigravity Prompt — Phase 2 (ready to paste)

> Paste vào Antigravity session MỚI khi Phase 1 code done ≥ Step 22/26.
> Em đã verify Appendix G viết xong, style anchor consistent Phase 1.

---

```
# NHIỆM VỤ — Asset Generation cho Game_SS3_exclusive PHASE 2

Bạn là AI agent tiếp tục deliver asset cho Game_SS3_exclusive. Phase 1 đã 
hoàn thành 60 PNG. Phase 2 mở rộng thêm 108 PNG: 15 quái mid/boss/rare, 
mascot Sóc Combat form (evolved), 3 biome mới, Pet Breeding UI, quiz UI extras.

## BƯỚC 1 — ĐỌC 5 FILE NGUỒN (THỨ TỰ BẮT BUỘC)

1. `docs/batch_plan_v2_phase2_antigravity.md` ⭐ MASTER PLAN
   → 5 batch B1-P2 → B5-P2, 108 PNG, folder convention, checkpoint policy

2. `docs/appendix_A_monsters_prompts.md`
   → Prompts cho 15 quái Phase 2: Burnewt, Pyromar, Diveodile, Aegir, 
     Florafox, Aldergasp, Mystember, Blizzhared, Acromi, Gobbler, Bovile,
     Peeko, Luminex, Nebulite, Shadowling

3. `docs/appendix_C_mascot_soc_prompts.md`
   → Section C.3 Sóc Combat form (4 poses: C5-C8)
   → Section C.5 Pose Evolution cutscene 24 frames

4. `docs/appendix_F_ui_assets_prompts.md`
   → F.2 section: biome tileset format (extend for volcanic/frozen/ocean)
   → F.3 section: combat background format (extend for 3 new biomes)

5. `docs/appendix_G_pet_breeding_prompts.md` ⭐ PHASE 2 NEW
   → 15 PNG Pet Breeding UI (chamber, slots, meter, egg, FX, buttons)

## BƯỚC 2 — STYLE ANCHOR CONSISTENCY

⚠️ **CRITICAL:** Phase 2 MUST match Phase 1 delivered style. Side-by-side 
compare Burnewt (Fire mid) với Embershed (Fire starter, P1) — phải cùng 
world, cùng palette #D4691E/#F4A261, cùng outline weight 2px.

```
[STYLE]: chibi RPG 2D, thick clean outline 2px, 3-tone cel-shaded flat
[PALETTE CLEVAI]: 
  - Primary: orange #D4691E
  - Secondary: warm tan #F4A261
  - Outline: dark brown #8B4513
  - Magical: purple #7209B7
  - Gold: #FFD700
[AUDIENCE]: học sinh Việt Nam 5-18 tuổi — thân thiện, không dark-horror
[TECHNICAL]: transparent PNG, no text, no watermark, centered với 10% padding
```

## BƯỚC 3 — WORKFLOW

Với mỗi asset trong batch_plan_v2_phase2:
1. Tra prompt từ appendix tương ứng (batch plan chỉ rõ mỗi asset)
2. Apply Style Anchor Bước 2 + prompt chi tiết
3. Nano Banana Pro generate
4. Validate:
   - Style khớp Phase 1 delivered? (compare Embershed vs Burnewt)
   - Đúng size (128×128 mid, 256×256 boss)?
   - Transparent bg + no text baked?
   - Outline 2px consistent?
5. Save theo folder convention:
   - Monsters: `app/public/assets/monsters/{codename}_{state}_{size}.png`
   - Mascot: `app/public/assets/mascot/soc_combat_{state}_sheet_{size}.png`
   - Tilesets: `app/public/assets/tilesets/{volcanic|frozen_peak|deep_ocean}_tileset_256.png`
   - Backgrounds: `app/public/assets/backgrounds/combat_{biome}_1280x720.png`
   - Breeding: `app/public/assets/breeding/*.png` (NEW folder)
   - Quiz UI extras: `app/public/assets/ui/*.png`

## BƯỚC 4 — THỨ TỰ BATCH (NGHIÊM NGẶT)

### 🟢 BATCH 1-P2 — 16 PNG (~30 min)
Fire+Water mid/boss: Burnewt×4 + Pyromar×4 + Diveodile×4 + Aegir×4

**CHECKPOINT sau B1-P2:** Gửi 1 ảnh Pyromar idle cho user duyệt boss scale
consistency với Phase 1 monsters. CHỜ user confirm "OK tiếp" mới sang B2-P2.

### 🟡 BATCH 2-P2 — 16 PNG (~30 min)
Plant+Ice mid/boss: Florafox×4 + Aldergasp×4 + Mystember×4 + Blizzhared×4

### 🟠 BATCH 3-P2 — 16 PNG (~30 min)
Storm+Earth+Shadow: Acromi×4 + Gobbler×4 + Bovile×4 + Shadowling×4

### 🔴 BATCH 4-P2 — 40 PNG (~1 hour)
- Sub-batch 4a: Astral 3 × 4 states = 12 PNG (Peeko, Luminex, Nebulite)
- Sub-batch 4b: Mascot Sóc Combat 4 poses + Evolution cutscene 24 frames
                = 28 PNG

**CHECKPOINT giữa 4a và 4b:** Gửi 1 frame Sóc Combat Idle cho user duyệt
evolution aesthetic. Sóc vẫn phải là Sóc (không creature khác), battle 
form chỉ thêm armor nhẹ + staff + tail-flame.

### 🟣 BATCH 5-P2 — 20 PNG (~45 min)
- Sub-batch 5a: 3 new biomes — volcanic/frozen/deep_ocean tilesets + 
                3 combat BGs = 6 PNG
- Sub-batch 5b: 15 PNG Pet Breeding UI (per Appendix G)
- Sub-batch 5c: 4 PNG Quiz UI extras

**CHECKPOINT đầu 5b:** Gửi 2 ảnh (Chamber BG + Egg fresh) cho user duyệt
cozy-magical-nursery mood BEFORE continue 13 asset Pet Breeding còn lại.

**Tổng Phase 2: 108 PNG, ~3.5 giờ tập trung.**

## BƯỚC 5 — REPORT FORMAT

Sau mỗi batch xong, trả về user:
- Count generated / total trong batch
- Folder path đã lưu
- Thumbnail 3-4 ảnh representative (prefer checkpoint-worthy: boss, mascot, chamber)
- Flag asset nào redo (nếu có)
- Confirm sẵn sàng batch tiếp

## RÀNG BUỘC TUYỆT ĐỐI

- ❌ KHÔNG scrape/copy từ Prodigy. Phase 2 phải 100% original AI generation.
  (Phase 1 dùng Prodigy adjusted vì hard commitment replace — Phase 2 là
  cơ hội redo từ đầu với original art).
- ❌ KHÔNG đổi palette sang anime dark, Disney 3D, realistic. Giữ chibi warm.
- ❌ KHÔNG save sai folder convention.
- ❌ KHÔNG skip checkpoint (style drift rất dễ xảy ra khi batch dài).
- ✅ Nếu phần prompt trong Appendix chưa đủ rõ, hỏi user, không đoán.
- ✅ Sau 3 lần refine 1 asset mà output không đạt → flag user + skip tạm.

## BẮT ĐẦU

Confirm đã đọc 5 file + hiểu nhiệm vụ. Start Batch 1-P2 với Burnewt idle 
(Fire mid) — asset #1.
```

---

**End Antigravity prompt.** Anh paste nguyên block `# NHIỆM VỤ ...` ở trên 
vào Antigravity session mới khi Phase 1 code gần xong.
