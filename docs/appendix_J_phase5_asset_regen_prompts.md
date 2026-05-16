# Appendix J — Phase 5 Asset Re-Generation Prompts

**Author:** Claude (engineering side)
**Audience:** Antigravity (Art Director) + Gemini (image gen)
**Date:** 2026-05-16
**Trigger:** Phase 5 UAT visual QA caught 32 PNG assets where filename advertises one size but native is `1024×1024 RGB` (no alpha) with a fake checker pattern baked in. Engineering fix (`setDisplaySize`) was shipped (`4df4cd3`), but assets are still wrong dimension + lack real alpha. Need re-export.

---

## CRITICAL — Output spec for ALL prompts below

Mỗi prompt phải output:

- **Format:** PNG-32 (RGBA, **8-bit alpha channel BẮT BUỘC**)
- **Background:** Thật sự trong suốt (alpha=0), **KHÔNG được dùng checker pattern bake vào pixel**
- **Color mode in output file:** `RGBA` (verify: `python -c "from PIL import Image; print(Image.open('xxx.png').mode)"` must print `RGBA`, not `RGB`)
- **Dimension:** Match EXACT giá trị ghi trong tên file. KHÔNG được upscale/output 1024×1024 nếu yêu cầu là 192×192.

### ❌ Common AI-gen failures (Phase 5 đã gặp):

1. **Checker bg bake vào pixel** → output `mode=RGB` + visual checker pattern. Cần explicit "transparent alpha channel, NOT checker background"
2. **Dimension drift** → AI default 1024×1024 dù prompt yêu cầu khác. Cần POST-process resize hoặc explicit "exactly 192x192 pixels, no padding"
3. **Spritesheet frame misalignment** → grid không khớp `frameWidth × frameHeight`. Cần specify grid layout (vd: "4 cols × 4 rows of 32×32 frames = 128×128 sheet")

### ✅ Verification checklist trước khi commit asset:

```bash
# 1. Native dimension matches filename
python -c "from PIL import Image; im=Image.open('PATH'); assert im.size==(W,H), f'Got {im.size}'"

# 2. Alpha channel exists
python -c "from PIL import Image; im=Image.open('PATH'); assert im.mode=='RGBA', f'Got {im.mode}'"

# 3. Real transparency (not checker) — sample corner pixel
python -c "from PIL import Image; im=Image.open('PATH'); p=im.getpixel((1,1)); print(f'corner alpha={p[3]}')  # Should be 0 for transparent assets"
```

---

## J.1 — PRIORITY 1: World Map (BLOCKS Phase 5 staging)

### J.1.1 — World Map Background

| Field | Value |
|---|---|
| File path | `app/public/assets/zones/world_map_bg_1920x1080.png` |
| Native target | `1920 × 1080` |
| Mode | `RGB` OK (background, không cần alpha) |
| Status hiện tại | 1024×1024 RGB — wrong dimension |

**Prompt cho Gemini/Recraft:**

```
[STYLE]: Cartoon RPG world map, top-down isometric, cel-shaded flat, Prodigy/Pokemon-inspired,
         readable for ages 5-18, kid-friendly bright palette
[SUBJECT]: 8 floating magical islands scattered across a calm tropical ocean.
           Each island has distinct biome theme — see J.1.2 anchors:
           - Forest (NW, lush green trees with waterfall)
           - Volcanic (N center, rocky island with lava cracks)
           - Frozen (NE, snowy mountain with aurora glow)
           - Storm (W, dark stormy rock with lightning)
           - Ocean (E, coral reef island with palm trees)
           - Earth (SW, sandy desert with cactus)
           - Astral (S center, magical purple sky island)
           - Shadow (SE, dark crystal cave island)
[PALETTE]: ocean blue #4A90E2 (60%), sky cyan #87CEEB (gradient top), white wave foam,
           island palettes per biome
[COMPOSITION]: Empty center area for HUD overlay, islands distributed in roughly 3x3 grid
               around the perimeter, leaving ~30% empty water in middle
[SIZE]: EXACTLY 1920×1080 pixels (16:9 aspect)
[NEGATIVE]: no text labels, no UI elements, no humans, no monsters, no checker pattern,
            no transparent areas, no borders, no watermarks
```

---

### J.1.2 — Island Markers (8 icons)

| Field | Value |
|---|---|
| File path | `app/public/assets/zones/island-icon_<id>_192x192.png` |
| `<id>` values | `forest`, `volcanic`, `frozen`, `storm`, `ocean`, `earth`, `astral`, `shadow` |
| Native target | `192 × 192` |
| Mode | **`RGBA` BẮT BUỘC** (transparent bg) |
| Status hiện tại | All 8 are `1024×1024 RGB` with fake checker bg |

**Common prompt template** (8 lần, thay `[BIOME]` và `[SYMBOL]`):

```
[STYLE]: Cartoon coin-style icon, isometric 3D look but flat-shaded, bold outline,
         Prodigy/Pokemon icon aesthetic, ages 5-18
[SUBJECT]: Circular coin/disc icon representing a magical island biome.
           Outer ring: thick gold/bronze border with subtle gem accents.
           Inner disc: [BIOME] color gradient with [SYMBOL] silhouette at center.
[BIOMES + SYMBOLS]:
  forest    → inner gradient green #7CB342→#558B2F, symbol: blue leaf
  volcanic  → inner blue #4A90E2 background, symbol: orange/red volcano mountain
  frozen    → inner orange #FF8C00 gradient, symbol: blue snowflake
  storm     → inner gray #607D8B gradient, symbol: yellow lightning bolt
  ocean     → inner teal #00ACC1 gradient, symbol: white wave/anchor
  earth     → inner brown #8D6E63 gradient, symbol: tan mountain peak
  astral    → inner purple #9C27B0 gradient, symbol: silver crescent moon + star
  shadow    → inner dark navy #1A237E gradient, symbol: purple crystal/skull
[BACKGROUND]: TRANSPARENT (alpha=0 fully transparent, NOT a checker pattern,
              NOT a white square, NOT a gray box. Alpha channel must be PNG-32 RGBA.)
[SIZE]: EXACTLY 192×192 pixels, no padding, no margin. The coin fills ~90% of canvas
        edge-to-edge with centered composition.
[NEGATIVE]: no checker background, no white/gray solid bg, no text, no English labels,
            no human characters, no rectangular borders outside the coin circle,
            no shadows projected outside the coin shape
[FORMAT]: PNG-32 with 8-bit alpha channel, NOT PNG-24 RGB
```

**Verify after generation:**

```bash
for id in forest volcanic frozen storm ocean earth astral shadow; do
  f="app/public/assets/zones/island-icon_${id}_192x192.png"
  python -c "from PIL import Image; im=Image.open('$f'); assert im.size==(192,192) and im.mode=='RGBA', f'BAD: {im.size} {im.mode}'; print('OK $id')"
done
```

---

## J.2 — PRIORITY 2: Zone Backgrounds (9 files)

| File path pattern | Target | Status |
|---|---|---|
| `app/public/assets/zones/{forest,volcanic,frozen}-{entrance,path,boss-hall}_bg_1280x720.png` | 1280×720 RGB | 1024×1024 RGB |
| `app/public/assets/zones/{forest,volcanic,frozen}-{entrance,path,boss-hall}_walkable_1280x720.png` | 1280×720 RGB (mask) | 1024×1024 RGB |

**9 background prompts** — anh dùng prompt theo template, thay biome + screen:

```
[STYLE]: Top-down 2D RPG biome background, cartoon cel-shaded, Prodigy/Pokemon-inspired,
         readable detail at 1280px width
[SUBJECT]: [BIOME] [SCREEN] view — see matrix below
[BIOMES × SCREENS]:
  forest entrance   → entry to forest island, wooden bridge over creek, tall trees, sunlight rays
  forest path       → winding dirt path through dense forest, mushrooms, fallen logs, sparkles
  forest boss-hall  → ancient stone clearing with vines, ruined pillars, mystical center pad
  volcanic entrance → lava-rock entrance, glowing cracks, ash, dark sky
  volcanic path     → winding path between lava rivers, sulfur vents, obsidian rocks
  volcanic boss-hall→ huge cavern with bubbling lava pool, obsidian throne, fire embers
  frozen entrance   → ice cave entry, icicles, aurora in sky, snow drifts
  frozen path       → narrow snowy mountain path, frozen waterfalls, pine trees
  frozen boss-hall  → ice palace interior, crystal columns, blue glow
[PALETTE]: per-biome consistent with J.1.1 island colors
[COMPOSITION]: Camera looking down at ~30° angle, player will be positioned at center.
               Leave empty walkable area in middle (defined by walkable mask).
[SIZE]: EXACTLY 1280×720 pixels (16:9)
[NEGATIVE]: no humans, no UI, no text, no monster characters, no checker pattern,
            no borders, no logos
```

**9 walkable mask prompts** — simpler:

```
[STYLE]: Binary mask, PURE BLACK (#000000) and PURE WHITE (#FFFFFF) only, no gradients
[SUBJECT]: Walkable path mask matching the [BIOME] [SCREEN] background.
           WHITE pixels = walkable ground
           BLACK pixels = blocked (water, walls, obstacles, trees, lava)
[COMPOSITION]: Must exactly overlay the corresponding _bg image. Use white roughly along
               the visible dirt/stone/path areas; black everywhere else.
[SIZE]: EXACTLY 1280×720 pixels
[NEGATIVE]: no anti-aliasing (pixel-sharp edges), no gray pixels, no transparency,
            no other colors, no decoration
```

---

## J.3 — PRIORITY 3: Chest + Player Spritesheet

### J.3.1 — Chest Icon

| Field | Value |
|---|---|
| File path | `app/public/assets/juice/chest-zone_192x192.png` + `app/public/assets/zones/chest_zone_192x192.png` |
| Native target | `192 × 192` |
| Mode | **`RGBA` BẮT BUỘC** |
| Status | 1024×1024 RGB (both copies) |

```
[STYLE]: Cartoon treasure chest icon, isometric 3D look, cel-shaded flat
[SUBJECT]: Wooden treasure chest with brass corners and lock, lid closed.
           Subtle golden glow halo to signal "rewardable"
[PALETTE]: chest wood #8B5A2B, metal brass #D4A056, glow gold #FFD740
[BACKGROUND]: TRANSPARENT alpha=0 (PNG-32 RGBA, NOT checker pattern)
[SIZE]: EXACTLY 192×192 pixels
[NEGATIVE]: no checker bg, no white box, no rectangular border, no text, no characters
[FORMAT]: PNG-32 RGBA with real alpha channel
```

### J.3.2 — Wizard Walk Spritesheet (CRITICAL — animation broken)

| Field | Value |
|---|---|
| File path | `app/public/assets/player/wizard_male_walk_spritesheet_128x128.png` |
| Native target | Spritesheet với frames 128×128 |
| Code expects | `frameWidth: 128, frameHeight: 128` (Phaser load.spritesheet) |
| Status | 1024×1024 single image, frame info bị mất → animation hỏng |

**Engineering note:** Code load `frameWidth: 128, frameHeight: 128`. Để hợp lệ, tổng sheet phải là multiple of 128 mỗi chiều. Recommend layout: **4 cột × 4 hàng = 512×512 sheet với 16 frames của 128×128**.

```
[STYLE]: Chibi pixel-art-inspired but smooth cel-shaded, top-down RPG character
[SUBJECT]: Young male chibi wizard, ~8 years old appearance, round face, pointy wizard
           hat with star, holding small wooden wand, blue robe with gold trim
[POSE]: 4-direction walk cycle spritesheet, EXACTLY this layout:
  Row 1 (y=0..128):    facing DOWN  — 4 walk frames (idle, step-L, idle, step-R)
  Row 2 (y=128..256):  facing LEFT  — 4 walk frames
  Row 3 (y=256..384):  facing RIGHT — 4 walk frames
  Row 4 (y=384..512):  facing UP    — 4 walk frames
[GRID]: 4 columns × 4 rows = 16 frames total, each frame EXACTLY 128×128 pixels,
        center character in each frame, no gaps/padding between frames
[BACKGROUND]: TRANSPARENT alpha=0 per frame (PNG-32 RGBA, no checker, no white)
[SIZE]: EXACTLY 512×512 pixels total (4 cols × 128 + 4 rows × 128)
[PALETTE]: robe blue #1976D2, hat purple-blue #5C6BC0, trim gold #FBC02D,
           skin tone warm beige, hat star yellow
[NEGATIVE]: no checker bg, no white bg, no frame outlines drawn in pixels,
            no inconsistent character size across frames, no adult features,
            no scary expression, no shadow projected onto neighbor frame
[FORMAT]: PNG-32 RGBA
```

**CRITICAL verify after generation:**

```bash
python -c "
from PIL import Image
im = Image.open('app/public/assets/player/wizard_male_walk_spritesheet_128x128.png')
assert im.size == (512, 512), f'Sheet size {im.size} != 512x512'
assert im.mode == 'RGBA', f'Mode {im.mode} != RGBA'
# Check each frame's corner is transparent
for row in range(4):
    for col in range(4):
        px = im.getpixel((col*128 + 1, row*128 + 1))
        assert px[3] == 0, f'Frame [{row},{col}] corner alpha={px[3]} not 0'
print('OK — 16 frames, all RGBA, all corners transparent')
"
```

**Engineering follow-up:** Nếu Antigravity output layout khác (vd: 8 frames horizontal strip 1024×128), em sẽ update `PreloadScene.ts` `frameWidth/frameHeight` config tương ứng.

---

## J.4 — PRIORITY 4: Banners (low priority, cosmetic)

### J.4.1 — banner_victory + banner_levelup

| File path | Target | Status |
|---|---|---|
| `app/public/assets/ui/banner_victory_800x120.png` | 800×120 RGBA | 182×183 RGB |
| `app/public/assets/ui/banner_levelup_800x120.png` | 800×120 RGBA | 256×256 RGB |

```
[STYLE]: Cartoon victory/levelup banner overlay, comic-book burst shape,
         Prodigy/Pokemon achievement aesthetic
[SUBJECT]: Horizontal banner with central text plaque, bold outline, glow effect.
  - victory: green/gold palette, laurel wreath accents, text area says "CHIẾN THẮNG!"
              (em sẽ overlay text at runtime, leave center as solid plaque)
  - levelup: blue/cyan palette, star burst rays, sparkle effects, text area for "LEVEL UP!"
[BACKGROUND]: TRANSPARENT alpha=0 (PNG-32 RGBA)
[SIZE]: EXACTLY 800×120 pixels (long horizontal banner)
[NEGATIVE]: no text rendered by AI (em overlay Vietnamese text in code),
            no checker bg, no rectangular bg
[FORMAT]: PNG-32 RGBA
```

---

## J.5 — Handoff Workflow

### Anh's role (Art Director):
1. Copy mỗi section trên (J.1.1, J.1.2 × 8, J.2 × 18, J.3.1, J.3.2, J.4 × 2) cho Antigravity/Gemini
2. Generate output → review thủ công xem có đúng style, dimension, alpha không
3. Run verification snippet (the `python -c "..."` block under each prompt)
4. Drop file vào correct path trong `app/public/assets/`
5. Tag em vào chat khi xong → em re-deploy + re-visual QA

### Em's role (Engineering):
1. ✅ Code đã `setDisplaySize` để bù lỗi dimension (commit `4df4cd3`)
2. Sau khi anh drop assets mới: em verify dimensions via Python script + remove `setDisplaySize` calls nếu native size đã đúng (cleanup)
3. Em viết Playwright visual regression test để CATCH bug này tự động trong CI lần sau (F+1 task)
4. Em đề xuất Python helper `Masterdata/scripts/strip_checker_bg.py` nếu Antigravity output vẫn có checker pattern dù prompt yêu cầu transparent

### Verification gate:
Sau khi anh drop assets mới, em chạy:

```bash
python -c "
from PIL import Image
import re, os
root = 'app/public/assets'
fail = 0
for d, _, files in os.walk(root):
    for f in files:
        if not f.endswith('.png'): continue
        m = re.search(r'_(\d+)x(\d+)\.', f)
        if not m: continue
        ew, eh = int(m.group(1)), int(m.group(2))
        p = os.path.join(d, f)
        im = Image.open(p)
        if im.size != (ew, eh):
            print(f'FAIL size {p}: native {im.size} vs filename {ew}x{eh}')
            fail += 1
        # All island icons + chest + spritesheet need RGBA
        if any(x in f for x in ['island-icon_', 'chest_zone', 'spritesheet', 'banner_']) and im.mode != 'RGBA':
            print(f'FAIL alpha {p}: mode {im.mode} not RGBA')
            fail += 1
print(f'Total failures: {fail}')
exit(fail)
"
```

Nếu 0 failures → em remove các `setDisplaySize` calls khỏi WorldMap/Zone/BossHall scenes, ship cleanup commit, verify visual lại trên Vercel.

---

## J.6 — Summary table — 32 assets to regenerate

| # | File | Current native | Target native | Needs RGBA? | Priority |
|---|---|---|---|---|---|
| 1-8 | `zones/island-icon_*.png` (8 files) | 1024×1024 RGB | 192×192 RGBA | ✅ YES | P1 |
| 9 | `zones/world_map_bg_1920x1080.png` | 1024×1024 RGB | 1920×1080 RGB | No | P1 |
| 10-18 | `zones/{biome}-{screen}_bg_1280x720.png` (9 files) | 1024×1024 RGB | 1280×720 RGB | No | P2 |
| 19-27 | `zones/{biome}-{screen}_walkable_1280x720.png` (9 files) | 1024×1024 RGB | 1280×720 RGB | No | P2 |
| 28-29 | `zones/chest_zone_192x192.png` + `juice/chest-zone_192x192.png` | 1024×1024 RGB | 192×192 RGBA | ✅ YES | P3 |
| 30 | `player/wizard_male_walk_spritesheet_128x128.png` | 1024×1024 RGB | 512×512 RGBA (4×4 grid) | ✅ YES | P3 |
| 31-32 | `ui/banner_{victory,levelup}_800x120.png` | varies | 800×120 RGBA | ✅ YES | P4 |

**Total: 32 files. Recommend Antigravity generate trong 1 batch + verify trước khi commit.**

---

## End of Appendix J
