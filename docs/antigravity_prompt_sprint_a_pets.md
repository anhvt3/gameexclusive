# Antigravity Prompt Batch — Sprint A (26 assets)

> Paste-ready batch for Sprint A (Multi-Party Combat Refactor).
> POSUP forwards each block to Antigravity. Antigravity drops PNG-32
> RGBA files at the exact filename listed in the `[FILENAME]` line.
> Claude verifies with `file <path>` after each delivery.

**Style anchor (applies to ALL prompts in this batch):**
```
flat 2D vector art, flash-game finish, clean 2px dark outline,
3-tone cel shading, friendly chibi proportions
palette: warm #D4691E, cool #3399FF, accent #FFD700, outline #8B4513
age-appropriate for Vietnamese students 5-18 years
PNG-32 RGBA, transparent background, no JPEG
```

---

## Section 1 — Pet sprites (24 files)

Six pet codenames × four animation states = 24 PNG files.
All 256×256 px, 3/4 front view, soft drop-shadow on ground.

### 1.1 bunbleaf (Plant element — leafy chibi rabbit)

#### bunbleaf_idle
```
[STYLE] flat 2D vector art, flash-game finish, clean 2px dark outline,
        3-tone cel shading, friendly chibi proportions, head ~60% body
[PALETTE] mossy green coat, leaf-shape ears, warm orange paws, accent
          gold #FFD700 on chest tuft, dark brown #8B4513 outline
[SUBJECT] Bunbleaf — chibi pet rabbit with two large leaf-shaped ears,
          mossy green fur, white belly, small tail tuft of clover
[POSE]    idle: standing on hind paws, both forepaws slightly raised,
          ears perked, eyes blinking open, gentle breath frame; soft
          shadow on ground beneath
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] bunbleaf_idle_256.png
```

#### bunbleaf_attack
```
[STYLE]   flat 2D vector art, flash-game finish, clean 2px dark outline,
          3-tone cel shading, friendly chibi proportions
[PALETTE] mossy green coat, leaf ears, warm orange paws, gold accent,
          dark brown outline; add bright lime-green motion lines
[SUBJECT] Bunbleaf in mid-leap forward, forepaws extended, leaf ears
          swept back from speed; small leaf-shaped energy puff trailing
          behind hind paws; mouth open in a friendly battle-cry shape
[POSE]    attack: leaping toward 3 o'clock, body horizontal, intense
          but cute expression — no fangs, no menace
[VIEW]    3/4 front-right, motion-lines drawn behind, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] bunbleaf_attack_256.png
```

#### bunbleaf_hurt
```
[STYLE]   flat 2D vector art, flash-game finish, clean 2px dark outline,
          3-tone cel shading, friendly chibi proportions
[PALETTE] mossy green coat slightly desaturated 80%, leaf ears wilted,
          dust puff in warm grey under paws, dark brown outline
[SUBJECT] Bunbleaf knocked back, body leaning back, ears drooping,
          X-eye expression briefly, small dust puff under hind paws
[POSE]    hurt: stumbling backward, off balance, both forepaws up
          defensively, friendly "ouch!" shape — no blood, no tears
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] bunbleaf_hurt_256.png
```

#### bunbleaf_death
```
[STYLE]   flat 2D vector art, flash-game finish, clean 2px dark outline,
          3-tone cel shading, friendly chibi proportions
[PALETTE] desaturated 60% — mossy green washed pale, leaf ears dropped,
          three sleepy "Z" letters above head in soft blue
[SUBJECT] Bunbleaf lying on side, paws curled, eyes closed, small swirl
          and three "Z" Z-Z-Z above head; non-lethal "fainted" feel
[POSE]    death: lying on right side, defeated nap, peaceful expression
[VIEW]    3/4 above, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] bunbleaf_death_256.png
```

### 1.2 pyropup (Fire element — chibi puppy with flame mane)

#### pyropup_idle
```
[STYLE]   flat 2D vector art, flash-game finish, clean 2px dark outline,
          3-tone cel shading, friendly chibi proportions
[PALETTE] orange-red gradient fur #D4691E base + #F4A261 belly + flame
          mane #FFD700 highlights, dark brown outline
[SUBJECT] Pyropup — chibi puppy with a stylised flame-shaped mane around
          neck and ears; round eyes, tiny fangs hidden, wagging tail
          tipped with a small flame
[POSE]    idle: sitting on haunches, tail wag visible, mane-flames
          flickering gently upward; soft shadow on ground
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] pyropup_idle_256.png
```

#### pyropup_attack
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] orange-red fur, vivid flame mane, gold accent, dark outline
[SUBJECT] Pyropup pouncing forward, all four paws off the ground, mane
          flame-tail trailing motion, tiny puff of orange spark from mouth
[POSE]    attack: forward pounce, paws extended, mouth open releasing a
          small flame burst (cartoon-cute, not scary)
[VIEW]    3/4 front-right, motion-lines, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] pyropup_attack_256.png
```

#### pyropup_hurt
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 80%, mane flame dimmed, dust puff under paws
[SUBJECT] Pyropup recoiling back, ears down, X-eye briefly, small smoke
          puff from mane
[POSE]    hurt: stumbling back, looking surprised, "yelp!" mouth shape
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] pyropup_hurt_256.png
```

#### pyropup_death
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 60%, mane flame extinguished to a wisp of smoke
[SUBJECT] Pyropup lying on side, mane reduced to thin curling smoke,
          three "Z" Z-Z-Z above head, peaceful nap face
[POSE]    death: fainted on side, paws curled
[VIEW]    3/4 above, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] pyropup_death_256.png
```

### 1.3 aquakit (Water element — chibi otter cub)

#### aquakit_idle
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] cool blue #3399FF body, lighter sky-blue belly, white whisker
          tufts, water-droplet motif #66CCFF on chest, dark outline
[SUBJECT] Aquakit — chibi otter cub, plump round body, whiskered face,
          a glowing water-droplet emblem on chest, tiny webbed paws
[POSE]    idle: sitting upright on tail, both forepaws clasped at chest
          like a friendly greeting, eyes half-closed in calm smile
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] aquakit_idle_256.png
```

#### aquakit_attack
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] cool blue body, vivid teal water spray motion lines
[SUBJECT] Aquakit lunging forward, forepaws thrusting a swirl of cartoon
          water droplets toward target; mouth in a determined "haa!" shape
[POSE]    attack: forward lunge, water swirl projecting from forepaws
[VIEW]    3/4 front-right, motion droplets trailing, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] aquakit_attack_256.png
```

#### aquakit_hurt
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 80%, water-droplet emblem dim
[SUBJECT] Aquakit knocked back, whiskers drooping, X-eye, small splash
          puff at feet
[POSE]    hurt: tumbling back, friendly "ow!" face, no blood
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] aquakit_hurt_256.png
```

#### aquakit_death
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 60%, water-droplet emblem dark, three "Z" above
[SUBJECT] Aquakit floating on back like an otter, paws on belly, eyes
          closed peacefully, three blue "Z" Z-Z-Z above
[POSE]    death: floating-nap on back, fainted
[VIEW]    Top-down, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] aquakit_death_256.png
```

### 1.4 frostfae (Ice element — chibi pixie sprite)

#### frostfae_idle
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] pale skin, silver-white hair, snowflake-pattern translucent
          wings, dress accent #66CCFF + gold trim, dark outline
[SUBJECT] Frostfae — chibi pixie with two large snowflake-pattern wings,
          short ice-blue dress, big round eyes, tiny pointy hat with
          snowflake topper
[POSE]    idle: hovering with wings half-spread, hands clasped at front,
          smiling softly; small icy sparkles floating around
[VIEW]    3/4 front, transparent BG, hover slightly above ground
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] frostfae_idle_256.png
```

#### frostfae_attack
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] pale skin, silver-white hair, vivid icy blue spell glow
[SUBJECT] Frostfae casting forward, both hands extended releasing a
          flurry of cartoon snowflakes; wings flared
[POSE]    attack: forward casting, wings fully spread, mouth in "fwoosh!"
          shape; snowflake spray trailing forward
[VIEW]    3/4 front-right, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] frostfae_attack_256.png
```

#### frostfae_hurt
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 80%, wings drooping, ice sparkle dim
[SUBJECT] Frostfae knocked back, wings folded, X-eye, hat tipping off
[POSE]    hurt: tumbling back, hands up defensively, friendly "oof!"
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] frostfae_hurt_256.png
```

#### frostfae_death
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 60%, three "Z" Z-Z-Z above head
[SUBJECT] Frostfae lying on back on the ground, wings folded under,
          hat resting next to her, peaceful sleep face
[POSE]    death: peaceful starfish on back, fainted
[VIEW]    Top-down, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] frostfae_death_256.png
```

### 1.5 voltchick (Storm element — chibi chick with lightning tuft)

#### voltchick_idle
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] bright yellow #FFD700 body, lightning-bolt feather tuft on
          head, orange beak, accent purple #C77DFF static lines, dark outline
[SUBJECT] Voltchick — chibi chick, plump round body, oversized round
          eyes, single lightning-bolt-shaped feather sticking up from
          head, tiny wings
[POSE]    idle: standing on both feet, tiny wings flapping, electric
          static crackle around feather tuft (small purple sparks)
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] voltchick_idle_256.png
```

#### voltchick_attack
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] bright yellow body, vivid purple lightning, gold sparks
[SUBJECT] Voltchick releasing a lightning bolt forward from its
          feather tuft; tiny wings flared, beak open in "tweet!" shape
[POSE]    attack: forward charge, feather tuft glowing bright,
          zigzag lightning bolt projecting forward
[VIEW]    3/4 front-right, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] voltchick_attack_256.png
```

#### voltchick_hurt
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 80%, feather tuft static dim
[SUBJECT] Voltchick stumbling back, feather tuft drooping, X-eye, small
          puff of feathers in air around it
[POSE]    hurt: tumbling, tiny wings flailing, "peep!" face
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] voltchick_hurt_256.png
```

#### voltchick_death
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 60%, three "Z" above head, feather tuft fully
          drooped
[SUBJECT] Voltchick lying on side, eyes closed, three blue "Z" Z-Z-Z
          above head, peaceful nap
[POSE]    death: fainted on side
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] voltchick_death_256.png
```

### 1.6 terraowl (Earth element — chibi barn owl with stone-pattern feathers)

#### terraowl_idle
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] earthy brown #8B4513 + tan #F4A261 feathers, stone-grey
          patterned chest plate, big golden eyes, dark outline
[SUBJECT] Terraowl — chibi barn owl with stone-textured chest patch,
          short rounded wings, big amber eyes, small tuft on head
[POSE]    idle: perched on a small flat stone, head turned slightly,
          slow blink frame, wings folded
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] terraowl_idle_256.png
```

#### terraowl_attack
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] earthy brown + tan feathers, stone-grey rocks flying
[SUBJECT] Terraowl swooping forward with wings spread, talons forward,
          three small cartoon-rounded stones flying outward from a
          ground-stomp burst
[POSE]    attack: swooping forward attack, wings fully spread, claws
          out, "whoosh!" effect around body
[VIEW]    3/4 front-right, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] terraowl_attack_256.png
```

#### terraowl_hurt
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 80%, feathers ruffled
[SUBJECT] Terraowl knocked back, wings flailing for balance, X-eye, a
          few small feathers loose around it
[POSE]    hurt: stumbling, friendly "hoot?!" face, no blood
[VIEW]    3/4 front, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] terraowl_hurt_256.png
```

#### terraowl_death
```
[STYLE]   flat 2D vector art, flash-game finish
[PALETTE] desaturated 60%, three "Z" above head, feathers settled
[SUBJECT] Terraowl tipped on its back, talons folded over chest, eyes
          closed, three blue "Z" Z-Z-Z above
[POSE]    death: peaceful fainted-on-back
[VIEW]    Top-down, transparent BG
[SIZE]    256×256 px PNG-32 RGBA
[FILENAME] terraowl_death_256.png
```

---

## Section 2 — Evolution VFX (1 file)

```
[STYLE]   flat 2D vector art, flash-game finish, no painterly textures
[SUBJECT] Radial light-burst evolution effect, 8-frame horizontal strip:
          frame 1 = small gold spark center (~10% radius)
          frame 2 = 4 short rays starting to expand
          frame 3 = rays at full reach, faint sparkles starting to orbit
          frame 4 = full 8-ray bloom, dense sparkle particles around rim
          frame 5 = peak white-core flash, all rays at max length
          frame 6 = retracting rays, sparkles flying outward
          frame 7 = small core remaining, scattered orbital sparkles
          frame 8 = thin fade-out wisps, almost gone
[PALETTE] gold #FFD700 + white #FFFFFF core + warm orange rim #F4A261
[LAYOUT]  8 frames horizontally, each 256×256, total strip 2048×256
[SIZE]    2048×256 px PNG-32 RGBA, transparent BG between frames
[FILENAME] evolution_burst_8frames.png
```

---

## Section 3 — Party HP strip background (1 file)

```
[STYLE]   flat 2D vector UI plate, flash-game finish, clean 2px outline
[SUBJECT] Horizontal HP-strip background panel for one combat entity.
          Three sub-zones laid out left → right:
            • left:  element-badge slot (40×40 inset square, beveled)
            • middle: name label area with subtle parchment texture
            • bottom: thin HP bar groove (200×12 hollow channel)
[PALETTE] cream fill #FAF3E0, brown outline #8B4513, soft inner shadow
          #00000022
[CORNERS] 16 px rounded; 9-slice safe (corners 16 px, edges stretchable)
[SIZE]    240×80 px PNG-32 RGBA, transparent BG outside the panel
[FILENAME] party_hp_strip_bg.png
```

---

## Drop folder convention

After Antigravity generates each PNG, place at:

```
app/public/assets/pets/<filename>          # 24 pet PNGs
app/public/assets/juice/<filename>         # evolution_burst_8frames.png
app/public/assets/ui/<filename>            # party_hp_strip_bg.png
```

## Verification (Claude runs after each delivery batch)

```bash
cd app/public/assets
for f in pets/bunbleaf_*.png pets/pyropup_*.png pets/aquakit_*.png \
         pets/frostfae_*.png pets/voltchick_*.png pets/terraowl_*.png \
         juice/evolution_burst_8frames.png ui/party_hp_strip_bg.png; do
  if [ -f "$f" ]; then
    file "$f" | grep -q "PNG image data" || echo "BAD FORMAT: $f"
  else
    echo "MISSING: $f"
  fi
done
# Empty output = all 26 assets verified PNG-32 RGBA.
```

If any file lands as JPEG-named-PNG, run
`python scripts/strip_white_bg.py --root app/public/assets/pets` to
auto-convert (script already in repo from earlier sprint).

---

**End of Sprint A asset batch (26 prompts).**
