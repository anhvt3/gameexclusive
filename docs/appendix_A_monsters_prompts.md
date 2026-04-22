# APPENDIX A — 20 Monsters Spec + Nano Banana Pro Prompts

> Companion to `architecturepack_Game_SS3_exclusive_v1.0_22042026.md` Section 4.
> Purpose: Spec chi tiết cho 20 quái + prompts để anh paste vào Antigravity / Nano Banana Pro.

---

## A.0 Global Art Direction

**Style anchor:** *"Chibi fantasy RPG, Prodigy-inspired, Clevai warm-friendly"*
- 2D sprite, flat cel-shaded, thick outline (2px), 3-tone shading
- Palette warm + vivid (không tối dark như Pokémon Gen 5+)
- Chibi proportion: head = 1.5x body, big eyes (kid-friendly)
- Neutral pose facing 3/4 angle (dễ flip ngang cho attack animation)

**Common prompt segment (reuse cho mọi quái):**
```
[STYLE]: chibi RPG sprite, Prodigy-inspired, thick clean outline 2px, 3-tone cel-shaded, centered subject
[TECHNICAL]: transparent PNG background, no text, no watermark, no UI, no shadow ground
[FORMAT]: 128x128 or 256x256 square, character centered with 10% padding
```

**4 states mỗi quái:**
- `idle` — standing, breathing, neutral
- `attack` — mid-action cast/strike, forward lean
- `hurt` — flinched, eyes squinted, slight back-lean
- `death` — faded/dissolving, closing eyes

---

## A.1 Roster Table — 20 quái

| # | Codename | Display VN | Element | Tier | Base HP | Spells | Biome |
|---|---|---|---|---|---|---|---|
| 1 | Embershed | Đom Đóm Lửa | 🔥 Fire | Starter | 40 | Flame Fang, Ember | Rừng khô |
| 2 | Burnewt | Kỳ Nhông Hỏa | 🔥 Fire | Mid | 75 | Fire Whip, Lava Spit | Núi lửa |
| 3 | Pyromar | Rồng Dung Nham | 🔥 Fire | Boss | 180 | Meteor, Scorch Storm | Hang dung nham |
| 4 | Tidus | Rái Cá Sóng | 💧 Water | Starter | 42 | Bubble, Water Jet | Bờ biển |
| 5 | Diveodile | Cá Sấu Thủy | 💧 Water | Mid | 80 | Acid Rain, Tidal Chomp | Đầm lầy |
| 6 | Aegir | Thủy Thần | 💧 Water | Boss | 190 | Tsunami, Ice Lance | Đại dương sâu |
| 7 | Applepot | Táo Gai | 🌿 Plant | Starter | 45 | Seed Bomb, Thorn Whip | Rừng táo |
| 8 | Florafox | Cáo Hoa | 🌿 Plant | Mid | 78 | Pollen Mist, Vine Grasp | Rừng thần |
| 9 | Aldergasp | Cây Cổ Thụ | 🌿 Plant | Boss | 200 | Root Prison, Healing Gust | Trung tâm rừng |
| 10 | Frostfang | Cáo Tuyết | ❄️ Ice | Starter | 40 | Ice Shard, Frost Bite | Đỉnh tuyết |
| 11 | Mystember | Linh Băng | ❄️ Ice | Mid | 82 | Blizzard, Glacial Beam | Hang băng |
| 12 | Blizzhared | Thỏ Băng Vương | ❄️ Ice | Boss | 185 | Avalanche, Aurora Freeze | Đỉnh Everest game |
| 13 | Voltee | Điện Điểu | ⚡ Storm | Starter | 38 | Spark, Thunder Peck | Đồng cỏ mưa |
| 14 | Acromi | Rồng Sét | ⚡ Storm | Boss | 195 | Thunder Storm, Chain Lightning | Đỉnh núi bão |
| 15 | Gobbler | Đất Răng | 🌍 Earth | Starter | 48 | Rock Throw, Dig | Hang động |
| 16 | Bovile | Bò Đá Khổng Lồ | 🌍 Earth | Boss | 210 | Earthquake, Boulder Smash | Sa mạc |
| 17 | Peeko | Tinh Cầu Bé | 🌌 Astral | Mid | 72 | Starfall, Cosmic Ray | Thư viện Học Viện |
| 18 | Luminex | Ánh Sáng Hành Tinh | 🌌 Astral | Boss | 220 | Supernova, Galaxy Slash | Đỉnh Học Viện |
| 19 | Nebulite | Tinh Vân Linh | 🌌 Astral | Rare | 95 | Cosmic Orb, Warp | Sự kiện đêm |
| 20 | Shadowling | Bóng Đêm | 🌑 Shadow | Mid | 70 | Shadow Claw, Dark Pulse | Khe hư vô |

**HP scaling formula (SS3 v1):**
- Starter: 40-50 / Mid: 70-85 / Boss: 180-220 / Rare: 90-100

---

## A.2 Prompts chi tiết (20 quái × 4 states)

### #1 — Embershed (Đom Đóm Lửa) 🔥 Starter

```
[STYLE]: chibi RPG sprite, Prodigy-inspired, thick clean outline 2px, 3-tone cel-shaded, centered
[PALETTE]: #FF6B35, #FFB627, #FF4E00, #2A1810, ivory highlight
[SUBJECT]: Embershed — small salamander-fox hybrid, glowing amber fur, tiny flame tufts on ears and tail tip, curious big eyes
[POSE - idle]: standing on 4 legs, tail flame gently swaying, looking forward
[POSE - attack]: leaping forward, mouth open breathing small ember, front paws extended
[POSE - hurt]: legs buckled, eyes squeezed shut, tail flame flickering weak
[POSE - death]: lying on side, flame extinguished to smoke, eyes gently closed
[SIZE]: 128x128 transparent PNG, character centered
[NEGATIVE]: no background, no text, no shadow on ground, not realistic, not anime teenage
```

### #2 — Burnewt (Kỳ Nhông Hỏa) 🔥 Mid

```
[PALETTE]: #D62828, #F77F00, #FCBF49, #390099, deep purple accent
[SUBJECT]: Burnewt — mid-sized newt with volcanic rock scales on back, glowing cracks revealing magma beneath, fierce but not menacing
[POSE - idle]: stance on 4 legs with back arched, eyeing challenger
[POSE - attack]: whipping tail forward like a lash of fire, mouth agape
[POSE - hurt]: one leg raised, cracks dimming to dull red
[POSE - death]: cooling to stone gray, eyes closed, magma cracks dark
[SIZE]: 160x160
[NEGATIVE]: same as global
```

### #3 — Pyromar (Rồng Dung Nham) 🔥 Boss

```
[PALETTE]: #8B0000, #FF4500, #FFD700, obsidian black, lava glow
[SUBJECT]: Pyromar — massive chibi dragon made of obsidian and flowing lava, wings of fire, crown of volcanic spikes, imposing but readable for kids
[POSE - idle]: perched on hind legs, wings half-open, glowering down
[POSE - attack]: rearing back breathing meteor swarm, wings fully spread
[POSE - hurt]: one wing folded, roaring with pain, lava crown dimmed
[POSE - death]: collapsing forward, lava solidifying to gray stone, eyes dim
[SIZE]: 256x256 boss size
[NEGATIVE]: not scary-horror, not dark-grim, keep chibi proportions
```

### #4 — Tidus (Rái Cá Sóng) 💧 Starter

```
[PALETTE]: #00B4D8, #90E0EF, #CAF0F8, white foam, navy outline
[SUBJECT]: Tidus — chibi sea otter with a small wave cresting on its head, webbed paws, playful smile
[POSE - idle]: sitting upright holding a pearl, head-wave bobbing
[POSE - attack]: tossing a bubble orb with both paws forward
[POSE - hurt]: falling backward, pearl dropped, head-wave flattened
[POSE - death]: floating on back, eyes closed peaceful
[SIZE]: 128x128
```

### #5 — Diveodile (Cá Sấu Thủy) 💧 Mid

```
[PALETTE]: #023E8A, #0077B6, #48CAE4, acid green highlight
[SUBJECT]: Diveodile — chibi crocodile with translucent aqua scales, glowing green belly, acid droplets dripping from jaws
[POSE - idle]: low stance like lurking in water, only eyes above
[POSE - attack]: mouth wide open spraying acid mist forward
[POSE - hurt]: jaw slammed shut, one eye squinted
[POSE - death]: belly up, legs limp, green glow fading
[SIZE]: 160x160
```

### #6 — Aegir (Thủy Thần) 💧 Boss

```
[PALETTE]: deep ocean #001845, #0466C8, #7209B7 tidal purple, white foam
[SUBJECT]: Aegir — majestic chibi merman-like sea king with trident, crown of coral, cape made of flowing water
[POSE - idle]: floating upright, trident held diagonally, cape billowing
[POSE - attack]: raising trident summoning tsunami behind him
[POSE - hurt]: trident lowered, crown cracked
[POSE - death]: kneeling with trident dropped, water cape dissipating
[SIZE]: 256x256 boss
```

### #7 — Applepot (Táo Gai) 🌿 Starter

```
[PALETTE]: #43AA8B, #90BE6D, #F94144 apple red, earth brown
[SUBJECT]: Applepot — chibi creature made of a terracotta pot bottom with a sprouting apple plant on top, two leaf arms, red apple head with eyes
[POSE - idle]: rocking pot body, leaves swaying
[POSE - attack]: hurling a small apple seed bomb
[POSE - hurt]: pot tilted, one leaf drooping
[POSE - death]: pot cracked, apple head detached rolling
[SIZE]: 128x128
```

### #8 — Florafox (Cáo Hoa) 🌿 Mid

```
[PALETTE]: #588157, #A3B18A, #DAD7CD, pink #FFB5A7 petal accent
[SUBJECT]: Florafox — chibi fox with flower petal fur pattern, blossom collar, tail shaped like a bouquet
[POSE - idle]: sitting gracefully, tail-bouquet on display
[POSE - attack]: releasing pollen cloud from tail shake
[POSE - hurt]: petals falling, ears back
[POSE - death]: curled up, petals scattered wilting
[SIZE]: 160x160
```

### #9 — Aldergasp (Cây Cổ Thụ) 🌿 Boss

```
[PALETTE]: #3A5A40, #588157, moss green, bark brown #774936, golden sap highlight
[SUBJECT]: Aldergasp — ancient chibi tree ent with a wise face carved in bark, massive root arms, glowing sap eyes, moss beard
[POSE - idle]: standing tall, roots gnarled, arms folded
[POSE - attack]: slamming root arm down summoning vines
[POSE - hurt]: leaning forward, sap leaking from cracks
[POSE - death]: toppling backward, leaves falling, face peaceful
[SIZE]: 256x256 boss
```

### #10 — Frostfang (Cáo Tuyết) ❄️ Starter

```
[PALETTE]: #CAF0F8, #90E0EF, #0077B6 accent, silver highlight
[SUBJECT]: Frostfang — chibi arctic fox with ice crystal fur tufts, breath visible as cold mist, bright blue eyes
[POSE - idle]: ears perked, mist breath drifting
[POSE - attack]: pouncing forward exhaling ice shard cone
[POSE - hurt]: skidding back, tail tucked
[POSE - death]: curled up, fur frost melting to water drops
[SIZE]: 128x128
```

### #11 — Mystember (Linh Băng) ❄️ Mid

```
[PALETTE]: #ADE8F4, #48CAE4, translucent #FFFFFFAA, violet #7B2CBF mystical core
[SUBJECT]: Mystember — ethereal chibi ice spirit, translucent ice body, floating, purple core visible inside chest
[POSE - idle]: floating, arms crossed, gentle bob
[POSE - attack]: hands forward launching glacial beam from core
[POSE - hurt]: body cracking, core flickering
[POSE - death]: shattering into snow particles
[SIZE]: 160x160
```

### #12 — Blizzhared (Thỏ Băng Vương) ❄️ Boss

```
[PALETTE]: #001233, #023E8A, #ADE8F4, aurora greens and pinks
[SUBJECT]: Blizzhared — regal chibi snow hare king, ice crown, long ears with frosted tips, royal cape of aurora light
[POSE - idle]: standing on hind legs, staff of ice held
[POSE - attack]: raising staff summoning avalanche from above
[POSE - hurt]: kneeling on one leg, crown tilted
[POSE - death]: lying on side, aurora cape dissolving
[SIZE]: 256x256 boss
```

### #13 — Voltee (Điện Điểu) ⚡ Starter

```
[PALETTE]: #FFD60A, #FFC300, #003566 navy, white spark
[SUBJECT]: Voltee — small chibi bird with lightning bolt tail feathers, yellow plumage with navy accents, static spark halo
[POSE - idle]: perched, head cocked, sparks around feet
[POSE - attack]: diving forward beak charged with lightning
[POSE - hurt]: knocked backward, feathers ruffled
[POSE - death]: fallen on back, sparks fading
[SIZE]: 128x128
```

### #14 — Acromi (Rồng Sét) ⚡ Boss

```
[PALETTE]: #03045E deep navy, #FFC300 electric yellow, white arc
[SUBJECT]: Acromi — serpentine chibi storm dragon, body made of cloud with lightning veins, horns like lightning rods
[POSE - idle]: coiled in sky, eyes glowing
[POSE - attack]: uncoiling launching chain lightning forward
[POSE - hurt]: cloud body dissipating, one horn cracked
[POSE - death]: unraveling into rainstorm, eyes dim
[SIZE]: 256x256 boss
```

### #15 — Gobbler (Đất Răng) 🌍 Starter

```
[PALETTE]: #774936, #B08968, #DDB892, moss green accent
[SUBJECT]: Gobbler — chibi mole-rock hybrid, body like compact boulder with big toothy grin, tiny digging claws
[POSE - idle]: half-buried, just head showing grinning
[POSE - attack]: bursting up from ground throwing rock
[POSE - hurt]: cracks appearing on boulder body
[POSE - death]: crumbling into rubble pile
[SIZE]: 128x128
```

### #16 — Bovile (Bò Đá Khổng Lồ) 🌍 Boss

```
[PALETTE]: #5A3A31 earth brown, #B08968 tan, glowing orange core cracks
[SUBJECT]: Bovile — massive chibi stone bull, body composed of stacked boulders, glowing magma cracks, huge curved horns
[POSE - idle]: grounded stance, snorting dust
[POSE - attack]: charging forward horns-first causing earthquake
[POSE - hurt]: one horn broken, body cracks widening
[POSE - death]: collapsing into boulder pile, cracks dim
[SIZE]: 256x256 boss
```

### #17 — Peeko (Tinh Cầu Bé) 🌌 Mid

```
[PALETTE]: #7209B7 purple, #560BAD, #F72585 pink accent, starlight white
[SUBJECT]: Peeko — chibi round celestial creature, body like a tiny planet with rings, big curious eyes, sparkles trailing
[POSE - idle]: floating, rings rotating
[POSE - attack]: releasing starfall shower from rings
[POSE - hurt]: rings wobbling off-axis, eyes shut tight
[POSE - death]: rings breaking apart into star dust
[SIZE]: 160x160
```

### #18 — Luminex (Ánh Sáng Hành Tinh) 🌌 Boss

```
[PALETTE]: radiant gold #FFD700, cosmic purple #3A0CA3, white core glow
[SUBJECT]: Luminex — humanoid chibi astral knight, armor made of solidified starlight, halo of galaxies around head, sword of pure light
[POSE - idle]: standing heroically, sword pointed down, halo rotating
[POSE - attack]: sword raised high summoning supernova behind
[POSE - hurt]: sword lowered, halo dim
[POSE - death]: kneeling, light armor shattering to stars
[SIZE]: 256x256 boss
```

### #19 — Nebulite (Tinh Vân Linh) 🌌 Rare

```
[PALETTE]: cosmic purple + teal + pink nebula mix, iridescent
[SUBJECT]: Nebulite — small elusive chibi spirit made of swirling nebula clouds, always shifting shape, face barely visible
[POSE - idle]: floating, body slowly morphing
[POSE - attack]: condensing into orb then bursting forward
[POSE - hurt]: body diffusing chaotically
[POSE - death]: fading into transparent cosmic wind
[SIZE]: 160x160
```

### #20 — Shadowling (Bóng Đêm) 🌑 Mid

```
[PALETTE]: #10002B, #240046, #9D4EDD mystical, cyan eye glow
[SUBJECT]: Shadowling — chibi shadowy wraith, hooded cloak of darkness, only glowing cyan eyes visible, wispy tendrils for hands
[POSE - idle]: floating low, cloak flowing
[POSE - attack]: lunging forward with shadow claw extended
[POSE - hurt]: cloak torn, one eye closed
[POSE - death]: dissolving into shadow puddle then evaporating
[SIZE]: 160x160
```

---

## A.3 Spell FX Prompts (shared across element)

For spell animations, request sprite sheets:

```
[STYLE]: 2D VFX sprite sheet, chibi RPG, cel-shaded
[SUBJECT]: {Fire Blast | Water Jet | Vine Whip | Ice Shard | Thunder Bolt | Rock Throw | Star Fall | Shadow Pulse}
[FRAMES]: 8-frame sequence left-to-right
[SIZE]: 512x64 (8 frames × 64x64)
[PALETTE]: match element color scheme
[NEGATIVE]: no character, pure FX only, transparent background
```

---

## A.4 Delivery Checklist

Mỗi quái cần bàn giao:
- [ ] 4 PNG 128/160/256 (idle/attack/hurt/death)
- [ ] 1 portrait 256x256 (cho UI combat header)
- [ ] Icon 64x64 (cho inventory)
- [ ] Validate: transparent BG, center align, consistent outline width
- [ ] File name theo convention `{codename}_{state}_{size}.png`

Total output Phase 4 goal: **20 quái × 6 files = 120 files PNG**.
