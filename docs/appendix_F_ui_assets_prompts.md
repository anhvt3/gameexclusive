# APPENDIX F — UI & World Assets Prompts (v1.1)

> Companion to AP v1.1 Section 4 + Appendix A (monsters) + Appendix C (mascot Sóc).
> This file covers **non-monster, non-mascot** assets: player, tilesets, UI frames, VFX.
> All prompts ready to paste into Antigravity → Nano Banana Pro.

---

## F.0 Global Style Anchor (reuse across all prompts)

```
[STYLE]: chibi RPG 2D, Clevai warm-friendly, thick clean outline 2px, 3-tone cel-shaded
[PALETTE]: Clevai primary orange (#D4691E), warm tan (#F4A261), dark brown (#8B4513),
           bright accent colors by element
[TECHNICAL]: transparent PNG background, no text, no watermark, no UI overlay
[PHILOSOPHY]: readable for kids 5-18 tuổi, không dark-horror, không photorealistic
```

---

## F.1 Player Wizard Avatar

### F.1.1 Wizard Male — Walk Spritesheet

```
[PROMPT]:
[STYLE]: chibi RPG sprite, Clevai warm-friendly, thick 2px outline, cel-shaded flat, 
         pixel-art style (32x32 per frame)
[PALETTE]: robe #4A90E2 royal blue, belt gold #FFD700, skin warm tan, hat purple #7209B7, 
           wand wood brown + star tip
[SUBJECT]: Young chibi male wizard, ~8 years old looking, round cheerful face, 
           pointy wizard hat with star, holding small wooden wand
[POSE - walk spritesheet 4-direction]: 
  Row 1 (down-facing): 4 frames walk cycle
  Row 2 (left-facing): 4 frames walk cycle
  Row 3 (right-facing): 4 frames walk cycle  
  Row 4 (up-facing): 4 frames walk cycle
[LAYOUT]: 4x4 grid = 16 frames, each 32x32, total 128x128 sheet
[SIZE]: 128x128 transparent PNG sprite sheet
[NEGATIVE]: no background, no adult features, no scary expression, no realistic proportions
```

### F.1.2 Wizard Female — Walk Spritesheet

Cùng prompt F.1.1, thay:
```
[SUBJECT]: Young chibi female wizard with twin braids, round cheerful face, 
           pointy wizard hat with flower, holding small crystal staff
[PALETTE]: robe pink #FF6B9D / lavender #B5A7E6, accents gold, crystal teal
```

### F.1.3 Wizard Portraits (for HUD + dialog)

```
[STYLE]: chibi portrait close-up head+shoulders
[SUBJECT]: Same wizard as F.1.1/F.1.2, expression variants
[POSES]: 
  1. neutral smile (default HUD)
  2. excited (victory)
  3. worried (low HP)
  4. focused (during quiz)
[SIZE]: 128x128 each, 4 separate files
[NEGATIVE]: no body below shoulders, no background
```

---

## F.2 Forest Biome Tileset

### F.2.1 Base Tileset 32×32

```
[STYLE]: chibi RPG tileset, top-down orthographic view, cel-shaded flat, 
         16-tile palette cohesive
[PALETTE]: grass green #7CB342 + #558B2F shades, dirt #8D6E63, stone gray #607D8B, 
           water blue #29B6F6, flower pink/yellow accents
[SUBJECT]: Forest biome tileset for 2D top-down RPG — Prodigy-inspired, 
           readable, kid-friendly
[TILES NEEDED] (each 32x32, arranged in 8x8 grid = 256x256 sheet):
  Row 1: grass (plain, tall, short, with-flower, edge-N, edge-S, edge-E, edge-W)
  Row 2: dirt path (plain, curve-NE, curve-NW, curve-SE, curve-SW, intersection-T, cross, end)
  Row 3: water (still, wave-1, wave-2, shore-top, shore-bottom, shore-left, shore-right, corner)
  Row 4: trees (small-1, small-2, medium, large, stump, bush-1, bush-2, flower-patch)
  Row 5: rocks (small-1, small-2, boulder, cluster, crystal-blue, crystal-pink, mushroom-1, mushroom-2)
  Row 6: decor (flower-1, flower-2, lantern, sign, log, fence-H, fence-V, arch)
  Row 7: walls/buildings (wood-wall, wood-door, window, roof-1, roof-2, chimney, porch, step)
  Row 8: special (portal-blue, portal-pink, spawn-point, treasure, trap, save-point, heal-crystal, exit)
[SIZE]: 256x256 PNG, 32x32 per tile, transparent or with light-green default
[NEGATIVE]: no inconsistent lighting, no perspective shift between tiles, no text labels
```

### F.2.2 Sample Tilemap — Forest Starter Area

```
[STYLE]: sample tilemap rendered from F.2.1 tileset, 30×20 tiles (960×640 pixels)
[SUBJECT]: Starter area — small clearing with:
  - Central spawn point (grass clearing ~10x8)
  - Dirt path leading south to exit
  - 3 trees scattered around perimeter
  - 1 water pond upper-right
  - 2 rocks as natural obstacles
  - 1 flower patch for decoration
  - 2 spawn points for early monsters (tagged with red markers for dev)
[SIZE]: 960x640 PNG reference image (for designer to recreate in Tiled editor)
[NEGATIVE]: no monsters drawn in, no UI overlay, no player sprite
```

---

## F.3 Combat Scene Assets

### F.3.1 Combat Background — Forest Clearing

```
[STYLE]: Prodigy-inspired combat background, chibi-compatible, painted digital style
[SUBJECT]: Forest clearing at golden hour — soft sunset light filtering through trees,
           grass foreground, distant trees bokeh-blurred, warm inviting atmosphere
[COMPOSITION]: player position right-foreground space reserved, monster position 
               left-foreground space reserved, central-bottom clear for UI
[SIZE]: 1280x720 PNG (matches canvas base resolution)
[PALETTE]: warm golden sun tones + forest greens + soft purple shadows
[NEGATIVE]: no characters, no UI, no text, not too dark
```

### F.3.2 Additional Combat Backgrounds (Phase 2+)
Biome variants: Cave (Earth boss), Frozen Peak (Ice), Beach (Water), Volcanic (Fire)

---

## F.4 UI Frames & HUD Elements

### F.4.1 HP Bar Frame

```
[STYLE]: chibi UI element, flat + slight gradient, Clevai warm palette
[SUBJECT]: HP bar container frame — rounded rectangle with heart icon on left, 
           inner fill area has subtle gradient from red (low HP) to green (full HP)
[STATES NEEDED]:
  1. Frame only (empty, just outline) — 256x48
  2. Filled 100% — 256x48
  3. Filled 50% — 256x48
  4. Filled 20% (critical, red pulse aura) — 256x48
[SIZE]: 256x48 each, 4 separate PNG files
[NEGATIVE]: no text labels, no numbers baked in
```

### F.4.2 MP Bar Frame

Cùng F.4.1, thay:
- Icon: blue diamond/crystal
- Fill gradient: bright blue (full) to pale blue (empty)
- No red critical state (MP 0 = just empty)

### F.4.3 Spell Button Icons (8 elements)

```
[STYLE]: chibi magical icon, circular frame, colored by element, glowing center
[PALETTE]: per element — Fire #FF6B35, Water #00B4D8, Earth #774936, Ice #CAF0F8,
           Storm #FFD60A, Plant #7CB342, Shadow #10002B, Astral #7209B7
[SUBJECT]: 8 circular spell button icons, each 96x96
  1. Fire — flame silhouette
  2. Water — droplet
  3. Earth — boulder/mountain
  4. Ice — snowflake
  5. Storm — lightning bolt
  6. Plant — leaf
  7. Shadow — crescent moon
  8. Astral — 5-point star
[SIZE]: 96x96 each, 8 separate PNG files (name: spell_icon_fire.png, etc)
[NEGATIVE]: no text on icon, no element name baked, no background (transparent)
```

### F.4.4 Generic UI Primitives

```
[STYLE]: chibi UI kit, rounded corners, Clevai warm palette
[SUBJECT]: UI primitives sheet containing:
  1. Primary button (orange fill + dark brown outline) — 240x64 normal + hover + disabled states
  2. Secondary button (white fill + orange outline) — 240x64 × 3 states
  3. Text input field — 320x48 × 2 states (normal + focused)
  4. Dialog box frame — 640x240 rounded with soft shadow
  5. Modal overlay dimmer — subtle gradient
  6. Coin icon — 48x48
  7. EXP icon (star) — 48x48
  8. Inventory slot — 96x96 empty frame
[SIZE]: single sprite sheet 1024x768 OR 8 separate files
[NEGATIVE]: no text on buttons (use CSS text overlay), no icons inside slots
```

### F.4.5 Notification Banners

```
[SUBJECT]: 3 horizontal banner frames 800x120:
  1. Victory banner — gold gradient + sparkle particles + "🌟"
  2. Defeat banner — gray/red gradient + subdued tones
  3. Level-up banner — rainbow gradient + confetti
[SIZE]: 800x120 each × 3 files
[NEGATIVE]: no text baked in (will overlay via CSS)
```

---

## F.5 VFX Sprite Sheets (Combat Spell Animations)

```
[STYLE]: 2D VFX animation sprite sheet, chibi-compatible, 12fps frame rate
[FRAMES]: 12-frame sequence per spell (1.0s animation at 12fps)
[LAYOUT]: horizontal sheet 12 × 64px wide = 768x64 per spell
[SUBJECTS — 8 spells]:
  1. Fire Blast — explosion from small to big
  2. Water Jet — stream of droplets
  3. Vine Whip — green vines lashing
  4. Ice Shard — ice crystals forming + shattering
  5. Thunder Bolt — lightning strike from top
  6. Rock Throw — boulder arc + impact dust
  7. Star Fall — cascade of starlets
  8. Shadow Pulse — dark ripple expanding
[SIZE]: 768x64 each × 8 files
[NEGATIVE]: no character, pure FX, transparent background
```

---

## F.6 Menu & HUB Backgrounds

### F.6.1 Main Menu Background

```
[STYLE]: Prodigy-inspired whimsical sky + floating island, warm + magical
[SUBJECT]: Floating island with Clevai logo placeholder space center-top, 
           rolling clouds, distant rainbow, small floating books/stars, 
           golden hour lighting, inviting atmosphere
[COMPOSITION]: center-top reserved for logo, center-middle reserved for mascot Sóc, 
               bottom reserved for CTA buttons
[SIZE]: 1920x1080 PNG (scales to 1280x720)
[NEGATIVE]: no characters yet (mascot added separately), no UI, no text
```

### F.6.2 HUB — Clevai Village

```
[SUBJECT]: Top-down RPG village scene — small cluster of 4-5 buildings 
           (shop/home/library/training hall), central plaza with fountain,
           path leading north to world map, warm sunset lighting
[SIZE]: 1280x960 (larger than canvas for slight pan)
[REFERENCE]: Prodigy Academy HUB aesthetic
[NEGATIVE]: no NPCs baked in, no player, grid-aligned tiles so can overlay player sprite
```

---

## F.7 Priority Delivery Order (theo timeline ISP)

| Priority | Asset | Step cần | Ước tính |
|---|---|---|---|
| **1** | F.1.1 Wizard male walk spritesheet (128×128) | Step 12 | 1 generation |
| **1** | F.2.1 Forest tileset 32×32 (256×256) | Step 12 | 1 generation |
| **1** | 5 monsters (Appendix A #1, #4, #7, #10, #13) × 4 states | Step 13 | 20 generations |
| **1** | Mascot Sóc Guide (Appendix C C.1 + C.2) | Step 18 | 4 generations |
| **2** | F.4.1 HP bar 4 states | Step 14 | 4 generations |
| **2** | F.4.3 Spell icons 8 elements | Step 16 | 8 generations |
| **2** | F.3.1 Forest combat background | Step 14 | 1 generation |
| **3** | F.4.4 UI primitives kit | Step 21 | 1 generation |
| **3** | F.6.1 Main menu background | Step 21 | 1 generation |
| **3** | F.4.5 Notification banners | Step 17 | 3 generations |
| **4** | F.5 VFX spell sheets 8 spells | Step 17 | 8 generations |
| **5** | Phase 2: wizard female, other biomes, mascot combat form | Phase 2 | Later |

**Phase 1 minimum total: ~50 generations.**

---

## F.8 Delivery Workflow

```
1. Em (Claude) viết prompt theo format trên
2. Anh paste prompt → Antigravity → Nano Banana Pro
3. Anh download PNG → lưu vào public/assets/{category}/{codename}_{state}_{size}.png
4. Em (code) reference trong PhaserScene.preload() hoặc React <img>
5. Nếu output không đạt → em tweak prompt (palette/pose) → regenerate
```

**Folder convention:**
```
app/public/assets/
├── player/
│   ├── wizard_male_walk_32x32x16.png      (F.1.1)
│   ├── wizard_male_portrait_neutral_128.png (F.1.3)
│   └── ...
├── tilemaps/
│   └── forest_01.json                      (Tiled output)
├── tilesets/
│   └── forest_tileset_256.png              (F.2.1)
├── monsters/
│   └── embershed_idle_128.png              (Appendix A)
├── mascot/
│   └── soc_guide_greet_512.png             (Appendix C)
├── ui/
│   ├── hp_bar_empty_256x48.png             (F.4.1)
│   ├── spell_icon_fire_96.png              (F.4.3)
│   └── ...
├── backgrounds/
│   ├── combat_forest_1280x720.png          (F.3.1)
│   └── main_menu_1920x1080.png             (F.6.1)
└── vfx/
    └── fire_blast_sheet_768x64.png         (F.5)
```

---

**End Appendix F. Anh bắt đầu generation theo priority 1 ngay khi có thời gian.**
