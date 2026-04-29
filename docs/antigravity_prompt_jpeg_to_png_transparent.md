# Antigravity Prompt — Re-export sprites as transparent PNG (URGENT)

> Paste vào Antigravity session MỚI. Đây là fix art critical, không phải
> Phase 2 batch — chặn UAT visual của Phase 1+1.5.

---

```
# NHIỆM VỤ — Re-export 30+ sprite assets từ JPEG (white BG) sang PNG (alpha)

Nhiều file art trong `app/public/assets/` đặt tên `.png` nhưng thực tế
là JPEG → không có alpha channel → khi render lên Phaser scene các
sprite có viền trắng vuông xấu xí, đặc biệt nhân vật player + monster
+ mascot chồng lên forest tileset.

Bug visual lộ ra ở UAT 29/04/2026: player wizard hiện ra viền trắng
vuông giữa rừng cỏ. Monster Voltee (yellow chick) hiện box trắng. Mascot
Sóc rendering OK ở MainMenu (vì BG amber gradient gần trắng) nhưng sẽ vỡ
nếu place lên dark theme.

## File cần re-export (33 files)

Tất cả phải:
1. Định dạng: **PNG-32 (RGBA)**, không JPEG, không PNG-24.
2. Background: **alpha 0** (transparent), không trắng, không màu nền.
3. Resolution: **giữ nguyên** kích thước hiện tại (số trong filename là gợi ý).
4. Style: giữ nguyên — không vẽ lại, chỉ chuột-magic-wand white BG → erase.

### Player (8 files)
- `app/public/assets/player/wizard_male_walk.png` (1024×1024 spritesheet, 8×8 frames của 128×128)
- `app/public/assets/player/wizard_male_walk_spritesheet_128x128.png` (DUPLICATE — same file)
- `wizard_male_portrait_excited.png`, `wizard_male_portrait_focused.png`, `wizard_male_portrait_neutral.png`, `wizard_male_portrait_worried.png`
- `wizard_male_portrait_focused_128.png`, `wizard_male_portrait_worried_128.png`

### Monsters (9 files)
- `aegir_idle_256.png`
- `burnewt_idle_160.png`
- `diveodile_idle_160.png`
- `pyromar_idle_256.png`
- `voltee_idle_128.png`, `voltee_attack_128.png`, `voltee_hurt_128.png`, `voltee_death_128.png`
- `aegir_attack_256.png`, `aegir_death_256.png`, `aegir_hurt_256.png` (cần check)

### Mascot Sóc (4 files)
- `soc_guide_cheer.png`
- `soc_guide_greet.png`
- `soc_guide_talk.png`
- `soc_guide_think.png`
- (CÁC file `_512.png`/`_256.png` đã PNG-alpha OK, KHÔNG re-export những file này)

### Backgrounds (3 files)
- `combat_forest.png`
- `combat_forest_1280x720.png`
- `main_menu_bg.png`
- ⚠️ Background CÓ THỂ giữ JPEG (không cần alpha) — chỉ rename thành `.jpg` cho đúng + update path trong `PreloadScene.ts` line 39-40, hoặc re-export PNG-24 cũng OK.

### Tilesets (2 files)
- `forest_tileset.png`
- `forest_tileset_256.png`
- Đây là tile background, KHÔNG cần alpha → chỉ rename `.jpg` HOẶC re-export PNG-24 cũng được.

### UI Banners (3 files)
- `banner_defeat.png`
- `banner_levelup.png`
- `banner_victory.png`
- ⚠️ Banner cần alpha (overlay lên scene khác).

### HP/MP bars + Spell icons
- `hp_bar_*.png`, `mp_bar_*.png`, `spell_icon_*.png` — kiểm tra batch, alpha bắt buộc nếu đè lên HP bar/scene.

## Verify command (chạy trước khi giao)

```bash
cd app/public/assets
find . -name "*.png" | while read f; do
  if file "$f" | grep -q JPEG; then
    echo "STILL JPEG: $f"
  fi
done
# Output rỗng = pass.
```

## Output mong đợi

1. List file đã re-export (PASS) + file giữ nguyên (BG/tileset OK as JPEG).
2. Verify command rỗng output.
3. Diff git: chỉ là binary-replace, KHÔNG đụng code.
4. PR title: `chore(assets): re-export Phase 1 sprites to PNG-32 alpha`
5. PR label: `type-A` (asset-only, không đổi schema/event).

## RÀNG BUỘC

- ❌ KHÔNG vẽ lại sprite — chỉ remove background.
- ❌ KHÔNG đổi resolution / aspect ratio.
- ❌ KHÔNG resave PNG-24 cho file player/monster/mascot (cần alpha).
- ✅ Có thể dùng `magick mogrify -fuzz 5% -transparent white *.png` (ImageMagick) cho batch white→alpha.
- ✅ Verify mỗi file bằng `file <path>` trước khi commit.

## START

Bắt đầu từ player + monster (visible bug nhiều nhất). Mascot sau. BG/tileset cuối.
```

---

## Notes cho Claude

- Khi Antigravity giao xong, em re-test bằng preview server: navigate `/play` → screenshot → confirm không còn viền trắng quanh player + monster.
- Sau khi merge: em chuyển PRELOAD_SPRITE_KEY của Player từ `base_player_male` về `wizard_walk` (frame 0) để dùng spritesheet thật.
