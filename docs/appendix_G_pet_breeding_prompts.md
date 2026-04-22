# APPENDIX G — Pet Breeding UI Prompts (Phase 2)

> Companion to `batch_plan_v2_phase2_antigravity.md` Sub-batch 5b.
> Q8 accepted CEO review: internal (no pay-to-win), learn-from-Pokémon mechanic.

---

## G.0 Mechanic Context (cho Antigravity hiểu UI purpose)

**Pet Breeding flow:**
1. Student đã collect nhiều pets qua combat wins (Phase 2+)
2. Vào Breeding Chamber (screen riêng)
3. Drop 2 pets vào 2 slot parent
4. Compatibility meter hiển thị synergy (based on element matching)
5. Bấm "Breed" → egg container counts down (~5 phút real-time hoặc instant for Phase 2)
6. Offspring reveal với sparkle FX
7. Offspring = evolved tier pet (element blend nếu parents khác element)

UI philosophy:
- Warm chibi Clevai style (cùng Phase 1)
- Nhấn **wonder + surprise** (nuôi pet, chờ nở trứng)
- Không gambling aesthetic (không casino flash)

---

## G.1 Style Anchor

```
[STYLE]: chibi warm-friendly UI, flat + soft gradient, rounded corners 16px
[PALETTE]: Clevai orange #D4691E primary, soft lavender #E0BBE4 magical,
           gold #FFD700 accent, cream #FFF8E7 backgrounds
[MOOD]: cozy, magical-nursery vibe (NOT casino, NOT clinical lab)
[TECHNICAL]: transparent PNG unless otherwise noted, no text baked in,
             allow CSS text overlay
```

---

## G.2 Prompts — 10 assets

### G.2.1 Breeding Chamber Background (1280×720)

```
[STYLE]: painted digital background, warm cozy nursery aesthetic,
         Clevai palette
[SUBJECT]: Magical pet breeding chamber interior — stone walls with glowing 
           runes, large central circular pedestal where eggs hatch, shelves 
           of potion bottles along walls, soft golden lanterns, 2 pedestals 
           flanking center for parent pet slots, warm fireplace bottom-right 
           corner adding cozy glow
[COMPOSITION]: center-bottom reserved for UI panels, left/right pedestals 
               clearly marked for pet slots
[SIZE]: 1280×720 PNG
[NEGATIVE]: no pets baked in, no UI overlay, no text, not dark-gothic 
            laboratory, not sci-fi
```

### G.2.2 Pet Slot Frame — Empty (256×256)

```
[STYLE]: chibi UI frame, soft gradient, Clevai warm
[SUBJECT]: Ornate circular pedestal frame, open empty, inviting drop zone.
           Dashed outline suggests "put pet here". Soft pink glow pulse
           hint, small floating sparkles around rim.
[POSE]: front-facing, centered
[SIZE]: 256×256 transparent PNG
[NEGATIVE]: no content inside (empty ready-state), no pet silhouette
```

### G.2.3 Pet Slot Frame — Filled (256×256)

Biến thể của G.2.2 nhưng outline **solid + stronger gold glow** + confetti 
mini particles orbiting. Same size, same style anchor.

```
[POSE]: same pedestal frame but bordered in solid gold, pulsing aura,
        small magical particles orbiting to suggest parent is assigned
[NEGATIVE]: no pet silhouette (CSS will overlay pet PNG on top)
```

### G.2.4 Offspring Result Slot (256×256)

```
[STYLE]: central reveal frame, more dramatic than parent slots
[SUBJECT]: Large circular frame with 8-pointed star motif overlay, 
           empty waiting state, mystical purple-to-gold radial gradient 
           background inside, "question mark" or soft "?" silhouette 
           placeholder (very faint, ghost-like)
[SIZE]: 256×256
[NEGATIVE]: no specific pet, no text
```

### G.2.5 Compatibility Meter (320×64)

```
[STYLE]: chibi status bar, heart-themed
[SUBJECT]: Horizontal bar with pink heart icon left-most, bar fill area
           showing 3 segment states (empty outlines of small hearts going
           from dim to bright). Right end shows sparkle cluster when full.
[STATES TO GENERATE]: 3 variants — 0% (empty outlines), 50% (half pink fill,
                      2-3 hearts colored), 100% (full gold + sparkles cluster)
[SIZE]: 320×64 each × 3 = 3 PNGs
[NEGATIVE]: no numerical percentage text, no character
```

### G.2.6 Egg Container — Brooding Timer (160×160)

```
[STYLE]: cute chibi egg nestled in straw/leaves basket
[SUBJECT]: Pastel-colored speckled egg sitting in small woven basket,
           gentle warm orange glow beneath (implying warmth incubating),
           small wisps of steam/magic rising
[STATES NEEDED]: 3 variants in one asset OR separate:
  - State 1: fresh egg (0% ready) — dim glow, no cracks
  - State 2: half ready (50%) — brighter glow, tiny surface shimmer  
  - State 3: about to hatch (95%) — stronger glow, small cracks visible
[SIZE]: 160×160 each × 3 = 3 PNGs
[NEGATIVE]: no baby pet peeking (keeps mystery for reveal), no timer numbers
```

### G.2.7 Offspring Reveal Sparkle FX (400×400)

```
[STYLE]: magical particle burst animation sheet, 12 frames
[SUBJECT]: Radial sparkle explosion starting as small bright core, expanding
           outward with gold + pink + white particles, fading at edges.
           Peak frame has 5-pointed star burst overlay.
[FORMAT]: 12-frame spritesheet horizontal = 4800×400 total
          (or 3×4 grid = 1200×1600)
[SIZE]: Single spritesheet
[USE]: Played 1-shot when egg hatches, reveals offspring
[NEGATIVE]: no specific pet shape (FX is overlay, pet renders underneath)
```

### G.2.8 + G.2.9 — "Breed" Button 2 states (240×64 each)

```
[STYLE]: chibi UI button, rounded 20px radius, Clevai warm palette

STATE READY (enabled):
[SUBJECT]: Primary orange #D4691E gradient fill, dark brown outline,
           soft drop shadow, subtle glow aura. Interior has small 
           heart+sparkle icon motif.

STATE DISABLED:
[SUBJECT]: Desaturated gray-brown fill, thinner outline, no glow.
           Muted appearance — clearly un-clickable.

[SIZE]: 240×64 each, 2 separate PNGs
[NEGATIVE]: no "BREED" text baked (CSS overlays), no hover state (Phase 2+)
```

### G.2.10 Pet Inventory Slot (96×96)

```
[STYLE]: small collectable card frame
[SUBJECT]: Square rounded slot with soft cream background, dashed outline
           if empty, subtle shadow. Corner indicator space for tier badge
           (top-right 24×24 reserved).
[VARIANTS]: 2 states
  - Empty: dashed outline
  - Filled: solid border + soft glow behind (pet PNG overlays CSS)
[SIZE]: 96×96 each × 2
[NEGATIVE]: no pet content baked
```

---

## G.3 Delivery Summary

```
10 asset slots → 13 PNG files (some variants):
- G.2.1 Chamber BG           (1 file,  1280×720)
- G.2.2 Pet slot empty       (1 file,  256×256)
- G.2.3 Pet slot filled      (1 file,  256×256)
- G.2.4 Offspring slot       (1 file,  256×256)
- G.2.5 Compat meter         (3 files, 320×64 each)
- G.2.6 Egg container        (3 files, 160×160 each)
- G.2.7 Reveal FX sheet      (1 file,  4800×400 or 1200×1600)
- G.2.8 Breed btn ready      (1 file,  240×64)
- G.2.9 Breed btn disabled   (1 file,  240×64)
- G.2.10 Inventory slot      (2 files, 96×96 each)
═══════════════════════════════════════════════════════════
Total: 15 PNG (slightly higher than batch_plan_v2_phase2 estimate 10).
       Update B5-P2 sub-batch 5b count: 15 not 10.
```

### Folder path (append to batch_plan_v2_phase2):

```
app/public/assets/breeding/
├── chamber_bg_1280x720.png
├── pet_slot_empty_256.png
├── pet_slot_filled_256.png
├── offspring_slot_256.png
├── compat_meter_{0|50|100}_320x64.png
├── egg_container_{fresh|half|ready}_160.png
├── reveal_fx_sheet_4800x400.png
├── breed_button_{ready|disabled}_240x64.png
└── inventory_slot_{empty|filled}_96.png
```

---

## G.4 Checkpoint Policy

Sau khi generate **G.2.1 Chamber BG + G.2.6 Egg fresh**, gửi user duyệt 
mood aesthetic trước khi tiếp tục 13 asset còn lại. Lý do: đây là 
**brand moment** (first time student see breeding flow) — phải đúng 
feel cozy-magical-nursery, không được slot hay gacha casino.
