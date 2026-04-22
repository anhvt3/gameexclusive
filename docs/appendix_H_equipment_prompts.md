# APPENDIX H — Equipment Assets Prompts (v1.1)

> Companion to AP v1.1 §11 (Inventory / Equipment / Level-up Reward) and
> ISP Steps 22.7–22.10.
> Covers the 10 starter equipment items for Phase 1 — 3 hats, 3 robes,
> 3 wands, 1 boots. Each item ships **two** assets:
>
>   1. **Icon** — 128×128 square, centered item on transparent bg, used in
>      inventory tiles, reward banners, tooltip art.
>   2. **Overlay sprite** — same base resolution as the wizard walk sheet
>      (128×128 for now, 32×32 per-frame when we move to spritesheet
>      attachments) — rendered on top of the player avatar at the
>      anchor point listed per slot.
>
> All prompts are ready to paste into Antigravity → Nano Banana Pro.
>
> Naming convention:
>   - Item id: `hat-apprentice-01` (kebab-case, slot-name-variant)
>   - Icon key: `item_<slot>_<variant>_icon`
>   - Sprite key: `item_<slot>_<variant>_sprite`
>   - File path: `/assets/items/<slot>/<variant>_icon.png` and
>     `/assets/items/<slot>/<variant>_sprite.png`

---

## H.0 Global Style Anchor (reuse across every prompt)

```
[STYLE]: chibi RPG 2D equipment icon, Clevai warm-friendly, thick 2px clean outline,
         3-tone cel-shaded flat, slight top-light highlight + bottom soft shadow
[PALETTE]: Clevai primary orange (#D4691E), warm tan (#F4A261), dark brown (#8B4513);
           accent colors chosen per item rarity + element
[RARITY CUES]:
  common    → neutral browns / whites, no glow
  rare      → cool blue highlights, subtle rim light
  epic      → purple #7209B7 accents, glow halo soft
  legendary → gold #FFD700 + orange glow, particle sparkle
[TECHNICAL]: transparent PNG background, no text, no frame, no watermark
[PHILOSOPHY]: friendly-magic, readable at 32×32 thumbnail, never scary, never realistic
```

**Anchor points (for overlay sprite placement on wizard avatar):**

| Slot    | Anchor on 32×32 base | Notes |
|---------|----------------------|-------|
| hat     | (16, 2)              | top of head, centered |
| outfit  | (16, 18)             | torso center |
| wand    | (22, 16)             | held in right hand |
| shoes   | (16, 30)             | feet baseline |

---

## H.1 Hats (slot: hat)

### H.1.1 Apprentice Hat (`hat-apprentice-01`, rarity: common)

**Icon prompt (128×128):**
```
[STYLE]: H.0 global anchor
[SUBJECT]: classic pointed wizard apprentice hat, slightly droopy tip with a tiny star
           stitched at the point, wide soft brim curling up
[PALETTE]: deep brown felt #6B4423, brim trim warm tan #F4A261, star accent pale gold
[COMPOSITION]: centered, floating, 3/4-front view, casting soft round shadow underneath
[SIZE]: 128x128 square transparent PNG
[NEGATIVE]: no head, no body, no text, no background scene
```

**Overlay sprite prompt (128×128 character-attach):**
```
[STYLE]: H.0 anchor, rendered as a clean cutout to overlay on 32×32 chibi wizard head
[SUBJECT]: same Apprentice Hat, pinned on anchor (16, 2), tilted forward 5° to match
           chibi proportions; 4 angles to match wizard walk spritesheet rows
           (down/left/right/up)
[LAYOUT]: 2×2 grid, each 32×32; total 64×64 — upscale to 128×128 with nearest-neighbor
[SIZE]: 128×128 transparent PNG, alpha-clean edges
[NEGATIVE]: no character body, no face, no cast shadow extending beyond hat rim
```

**Modifier hint for item registry:** `[{ kind: 'expGain', pct: 2 }]`

---

### H.1.2 Fire Wizard Hat (`hat-fire-01`, rarity: rare)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, rare-tier cool blue rim light behind warm subject
[SUBJECT]: tall wizard hat with a small ember pattern stitched around the brim, tiny
           curling smoke wisp rising from the tip, warm orange flame gem front-center
[PALETTE]: crimson-orange felt #D14A1E, gold brim trim #FFD700, ember glow #FF7A29
[COMPOSITION]: centered, 3/4-front, glow centered on front gem, soft under-shadow
[SIZE]: 128×128 square transparent PNG
[NEGATIVE]: no real fire VFX, no scary skull motif, no text, no head
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, matches F.1.1 wizard_walk spritesheet silhouette
[SUBJECT]: same Fire Wizard Hat, pinned anchor (16, 2), 4-direction 32×32 frames;
           tip smoke wisp subtly animates (frame 1 → frame 4 = two-pixel drift)
[LAYOUT]: 2×2 = 4 frames at 32×32, upscale 128×128 nearest-neighbor
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no body, no face, no flame emitting beyond 2 pixels
```

**Modifier hint:** `[{ kind: 'spellDamage', element: 'Fire', pct: 5 }]`

---

### H.1.3 Storm Sage Hat (`hat-storm-01`, rarity: epic)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, epic-tier purple accent + soft halo glow
[SUBJECT]: wide-brimmed sage hat, curled upward at the sides, a lightning-bolt pin
           near the band, two tiny storm clouds hovering over the brim
[PALETTE]: deep indigo #2D1B6B, accent violet #7209B7, yellow bolt #FFD60A, cloud white
[COMPOSITION]: centered, 3/4-front, purple halo radiating 4–6px soft behind hat
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no real weather system, no full-size cloud, no text
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, cutout match for 32×32 chibi head
[SUBJECT]: Storm Sage Hat at anchor (16, 2); cloud pair gently bobs between frames
           (1px offset on odd frames), bolt pin stays fixed
[LAYOUT]: 2×2 = 4 directions at 32×32, upscale to 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no lightning VFX leaving hat silhouette, no rain
```

**Modifier hint:** `[{ kind: 'critChance', pct: 4 }]`

---

## H.2 Robes / Outfits (slot: outfit)

### H.2.1 Apprentice Robe (`outfit-apprentice-01`, rarity: common)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor
[SUBJECT]: simple student wizard robe, long sleeves, rope belt, star patch at chest;
           displayed hanging on an invisible hanger 3/4-front
[PALETTE]: oatmeal cream #E8DCC4, rope belt warm tan #F4A261, star patch pale gold
[COMPOSITION]: centered, robe symmetrical, very soft floor shadow under hem
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no body inside robe, no text, no stains, no torn edges
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, blended to replace torso area of wizard_walk base sheet
[SUBJECT]: Apprentice Robe body segment only (hem bottom flares on walk frames),
           4-direction 32×32 frames
[LAYOUT]: 2×2 = 4 frames, upscale 128×128 nearest-neighbor
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no head, no limbs, no boots overlap
```

**Modifier hint:** `[{ kind: 'maxHp', delta: 5 }]`

---

### H.2.2 Fire Mage Robe (`outfit-fire-01`, rarity: rare)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, rare cool-blue rim light
[SUBJECT]: warm-coloured mage robe, asymmetric hem, ember-pattern trim along cuffs
           and neckline, small flame sigil on chest
[PALETTE]: deep red #A4161A, orange trim #D4691E, gold sigil outline
[COMPOSITION]: centered, 3/4-front on invisible hanger
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no real fire, no realistic fabric wrinkle detail, no skin
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, torso overlay for 32×32 wizard walk
[SUBJECT]: Fire Mage Robe torso-only segment, hem flutter adds 1px on walk frames
[LAYOUT]: 2×2 at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no head, no arms beyond sleeves, no flame effect
```

**Modifier hint:** `[{ kind: 'maxHp', delta: 8 }, { kind: 'spellDamage', element: 'Fire', pct: 3 }]`

---

### H.2.3 Ice Guardian Robe (`outfit-ice-01`, rarity: epic)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, epic purple halo + cool cyan rim
[SUBJECT]: layered ceremonial robe, fur-trim collar, frost-crystal brooch at chest,
           snowflake embroidery along hem
[PALETTE]: pale ice blue #CAF0F8, navy accent #03045E, silver embroidery, brooch cyan
[COMPOSITION]: centered, 3/4-front, faint snowflake particle (static) behind robe
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no fog VFX, no cold-breath puff, no face
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, torso overlay matching wizard_walk
[SUBJECT]: Ice Guardian Robe torso-only, fur collar visible at neckline in each
           4-direction frame, brooch twinkle animates over 2 frames
[LAYOUT]: 2×2 at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no ice VFX outside robe silhouette
```

**Modifier hint:** `[{ kind: 'maxHp', delta: 12 }, { kind: 'spellDamage', element: 'Ice', pct: 5 }]`

---

## H.3 Wands (slot: wand)

### H.3.1 Apprentice Wand (`wand-apprentice-01`, rarity: common)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor
[SUBJECT]: short wooden wand, smooth grain, small carved star at the tip, leather
           grip wrap near base
[PALETTE]: warm brown wood #8B4513, grip dark brown #5D3317, star pale gold
[COMPOSITION]: diagonal 45° tip-up-right, centered, gentle highlight along the shaft
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no sparkles, no text, no runes
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, attached to wizard right hand (anchor 22, 16)
[SUBJECT]: Apprentice Wand, 4-direction frames; side views show wand held outward,
           down/up views show it tucked close to body
[LAYOUT]: 2×2 at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no hand in the sprite (hand is part of base wizard sheet), no glow
```

**Modifier hint:** `[{ kind: 'spellDamage', element: 'Astral', pct: 2 }]`

---

### H.3.2 Fire Wand (`wand-fire-01`, rarity: rare)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, rare rim light
[SUBJECT]: wand carved from ember-toned wood, orange crystal tip, small flame shape
           etched into grip
[PALETTE]: ember-brown wood #6B2A14, orange crystal #FF6B35, gold cap
[COMPOSITION]: diagonal 45° tip-up-right, crystal glow 4px soft halo
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no real flame, no smoke particles
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, hand-held attachment for wizard
[SUBJECT]: Fire Wand, tip crystal pulses subtly (frame 1 dim → frame 3 bright),
           4-direction
[LAYOUT]: 2×2 at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no flame leaving crystal silhouette
```

**Modifier hint:** `[{ kind: 'spellDamage', element: 'Fire', pct: 10 }]`

---

### H.3.3 Plant Wand (`wand-plant-01`, rarity: rare)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor, rare rim light
[SUBJECT]: living wand — twisted green-branch shaft wrapped in tiny ivy leaves,
           dewdrop gem at the tip, small acorn pommel at base
[PALETTE]: fresh green #7CB342, dewdrop cyan, acorn warm brown, leaf vein yellow-green
[COMPOSITION]: diagonal 45° tip-up-right, dew gem 3px soft highlight
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no thorns, no scary dark green, no real plant photography
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, wizard right-hand attachment
[SUBJECT]: Plant Wand, leaves gently sway (1px offset frame 1 vs 3), 4-direction
[LAYOUT]: 2×2 at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no falling leaves outside silhouette
```

**Modifier hint:** `[{ kind: 'spellDamage', element: 'Plant', pct: 10 }]`

---

## H.4 Boots (slot: shoes)

### H.4.1 Apprentice Boots (`shoes-apprentice-01`, rarity: common)

**Icon prompt (128×128):**
```
[STYLE]: H.0 anchor
[SUBJECT]: pair of short leather boots, mid-calf, simple lace front, rounded toe box,
           small star stitched on outer side
[PALETTE]: warm brown leather #8B4513, laces off-white, star pale gold
[COMPOSITION]: centered, paired 3/4-front, slight parallax so right boot sits in front
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no legs, no scuff marks, no mud
```

**Overlay sprite prompt (128×128):**
```
[STYLE]: H.0 anchor, replaces default feet area of wizard_walk
[SUBJECT]: Apprentice Boots, feet-only overlay, 4-direction walk cycle showing
           stepping motion (left foot forward on frame 1, right on frame 3)
[LAYOUT]: 4×4 = 16 frames at 32×32, upscale 128×128
[SIZE]: 128×128 transparent PNG
[NEGATIVE]: no legs, no robe overlap, no shadow bleed
```

**Modifier hint:** `[{ kind: 'expGain', pct: 3 }]`

---

## H.5 Batch-send checklist for Antigravity

Copy this block into the Phase 2 batch plan when it's time to ship these:

```
Items (10 total, 2 assets each = 20 files):
  [ ] hat-apprentice-01 icon  + sprite
  [ ] hat-fire-01       icon  + sprite
  [ ] hat-storm-01      icon  + sprite
  [ ] outfit-apprentice-01 icon + sprite
  [ ] outfit-fire-01       icon + sprite
  [ ] outfit-ice-01        icon + sprite
  [ ] wand-apprentice-01   icon + sprite
  [ ] wand-fire-01         icon + sprite
  [ ] wand-plant-01        icon + sprite
  [ ] shoes-apprentice-01  icon + sprite
Output tree:
  app/public/assets/items/hat/<id>_{icon,sprite}.png
  app/public/assets/items/outfit/<id>_{icon,sprite}.png
  app/public/assets/items/wand/<id>_{icon,sprite}.png
  app/public/assets/items/shoes/<id>_{icon,sprite}.png
```

Verify sizes: icon=128×128, sprite=128×128 (2×2 grid of 32×32 frames, or 4×4 for boots).
Transparent background, alpha edges, no text, no watermark.

---

**END Appendix H.** Registered in AP §11.1 item registry; consumed by ISP
Steps 22.7 (schema) + 22.9 (inventory UI) + 22.10 (combat modifier wiring).
