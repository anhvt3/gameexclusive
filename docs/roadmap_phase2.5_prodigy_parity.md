# Roadmap Phase 2.5 — Prodigy-Parity Sprints

> **Status:** approved by POSUP 29/04/2026 after 148-frame visual audit of
> reference Prodigy session. Phase 2.5 sits between current Phase 1+1.5
> (shipped) and the original Phase 2 (Pet Breeding + 15-monster roster
> in `batch_plan_v2_phase2_antigravity.md`). Prodigy-parity sprints take
> precedence; the original Phase 2 batch_plan items get folded into the
> sprint that owns them (Pet Breeding → Sprint C, monster roster → A+B).
>
> **Goal:** Ship the gameplay loop, UI surface, and visual polish needed
> for Clevai students to perceive the game as *equivalent* to a top-tier
> reference edu-RPG. No commercial / paywall features — internal Clevai
> deployment only.
>
> **Asset workflow (POSUP 29/04 directive):** every sprint defines exact
> filenames + Antigravity prompts (style: flat 2D vector art, flash-game
> finish, clean outline). No placeholders ship to dev — Antigravity
> drops final art, Claude wires it.

---

## Sprint A — Multi-Party Combat Refactor ⭐ FIRST

**Why first:** Foundation. Every other sprint depends on the combat
entity model being polymorphic (player, pet, monster all flow through
the same TURN cycle). Today's `CombatScene` hard-codes one player vs
one monster — Sprints C (Pet) and B (Boss Hall) cannot ship cleanly
on top of that.

**Scope:**
- Combat refactor to `CombatEntity[]` (mảng, mỗi entry có
  `id / kind: 'hero' | 'pet' | 'monster' / element / hp / maxHp / level / spritekey`)
- Turn order: initiative-based round (speed stat or fixed
  hero → pet → monsters)
- Targeting: player picks both spell AND target enemy (single-target);
  pet auto-targets weakest enemy
- Pet acts on its own turn — quiz gates apply ONLY to hero spell, pet
  uses a deterministic pet-attack with element/level scaling
- 8-element rock-paper-scissors enforced (already declared in
  `types/element.ts`; new chart in AP §11.5)
- Evolution / level-up VFX (light burst, screen flash, name tag glow)

**Type C** — Entity Schema (CombatEntity polymorphism), Event Layer
(`TURN_RESOLVED { entityId, action, damage }`, replacing single-side
`DAMAGE_APPLIED`). POSUP+ARCH approval required.

**AP impact:** §8 (Combat FSM), §11 (Stat schema), §11.5 (new — element
chart), §13 (Event Layer additions).

**Asset needs (Antigravity prompts in spec):**
- 6 starter pet sprites × 4 states (idle/attack/hurt/death) = 24 PNG
- Evolution VFX spritesheet (8-frame radial light burst)
- Updated combat HUD: party HP strip (3 entries: hero + pet + monster)

**Estimate:** 4 days code + 6 days Antigravity (parallel).

**Spec doc:** `docs/superpowers/specs/2026-04-29-multiparty-combat-design.md`
(generated next).

---

## Sprint B — World Map + Zone Map + Boss Hall

**Scope:**
- `WorldMapScene.tsx` — macro view, 8 floating elemental islands, click to
  travel; locked/unlocked state; current-island marker
- `ZoneMapScene.tsx` — node-based path within an island; nodes are
  level-select dots connected by glowing trail; node types: combat,
  boss, NPC, treasure
- `BossHallScene.ts` — interior combat backdrop (carpet, pillars,
  banners) for Boss tier monsters; reuses combat FSM
- Tilemap (Tiled editor) for 3 starter biomes: Forest (existing),
  Volcanic, Frozen

**Type C** — 3 new scenes + router routes + new event
`ENTER_ZONE { zone_id }`.

**AP impact:** §3.1 (scene tree), §6 (navigation flow), Appendix B
(wireframes for both maps).

**Asset needs:**
- 1 World Map illustration (1920×1080 hero art)
- 1 Zone Map node UI kit (path tile, node circle states ×4, milestone
  banner)
- 1 Boss Hall combat BG (1280×720)
- 2 biome tilesets (Volcanic 256×256, Frozen 256×256) + 2 combat BGs

**Estimate:** 5 days code + 8 days Antigravity.

---

## Sprint C — Pet System (depends on Sprint A)

**Scope:**
- Pet entity (id, name, element, level, exp, rarity, sprite_key, stats)
- Post-victory pet rescue mechanic (10% chance per battle, common pets
  on weak monsters, rare on bosses)
- Pet inventory UI — extend `/inventory` route with pets tab
- Pet equip — choose 1 active pet for combat (slot in equipment array)
- Pet leveling via shared XP from battles
- Pet evolution at level 10 / 20 (Phase 2.5 ships levels, Phase 2
  delivers breeding flow already specced in `appendix_G_pet_breeding_prompts.md`)

**Type B** — Entity Schema (PetDef registry, PetInstance in SaveState).

**AP impact:** §11 (stat schema gains active_pet_instance_id), §11.6
(new — pet rescue rules).

**Asset needs:** already covered by Sprint A (24 pet PNGs); + UI kit
for pet inventory tab (rarity frames, evolution arrow, level badge).

**Estimate:** 3 days code + 5 days Antigravity.

---

## Sprint D — Quests & Goals Panel

**Scope:**
- Goals checklist UI (`react/screens/QuestsPanel.tsx`)
- Quest types: daily (refresh 24h), weekly (7d), main story (no expiry)
- Quest progress hooks — emit `QUEST_PROGRESS { id, delta }` from
  combat / quiz / level-up / pet-rescue events
- Reward chest claim flow (reuse `RewardChestOverlay` from Step 22.14)
- Quest catalog as static config (`data/staticConfig/quests.ts`)

**Type B** — SaveState gains `questProgress: Record<questId, number>`,
`claimedRewards: questId[]`.

**AP impact:** §11.7 (new — quest schema).

**Asset needs:**
- Quest panel banner (1 PNG, 800×120)
- 4 quest-icon variants (combat, quiz, explore, social) — 64×64

**Estimate:** 2 days code + 2 days Antigravity.

---

## Sprint E — Polish & Onboarding

**Scope:**
- Name selection screen (alphabet picker → wizard name display)
- Wizard customization preview (gender × hair × outfit color — picks
  from existing equipment art catalog)
- Tutorial polish: extend Sóc dialog from 4 → 8 beats, add "follow the
  arrow" gesture overlay
- Settings panel (audio mute, hint difficulty, reset save with confirm)

**Type A** — UI only, no schema change.

**Asset needs:**
- Name picker UI plate (parchment scroll motif)
- 4 wizard hair styles + 2 gender base sprites (already partly in
  `assets/juice/base_player_male/female_transparent.png`)

**Estimate:** 2 days code + 1 day Antigravity.

---

## Sprint F — Free Daily Rewards (renamed from Membership)

**Per POSUP 29/04 directive:** drop premium gating, KEEP UI flow + VFX
for the dopamine loop. Every reward Free for Clevai students.

**Scope:**
- Daily login calendar (7-day cycle, claim once per UTC day)
- Loot Jar opening sequence (claimable every 3 battles won; jar shake →
  pop animation → 3 prizes flyout)
- Battle Stars currency (in-game only, earned per battle, spent on
  cosmetic items in Phase 3 shop)
- "Streak" bonus — N consecutive day logins multiplies reward

**Type B** — SaveState gains `lastLoginIso`, `loginStreak`,
`battleStars`, `lootJarBattlesSinceLast`.

**AP impact:** §11.8 (new — daily reward schema).

**Asset needs:**
- Daily calendar UI (7 day-cells × claimed/today/locked states)
- Loot Jar PNG (closed + cracking + popped, 3-frame anim)
- Battle Stars icon + currency badge
- Streak flame icon (3 / 7 / 30 day variants)

**Estimate:** 3 days code + 4 days Antigravity.

---

## Cross-cutting

### Asset workflow (every sprint MUST follow)
1. Spec defines exact filenames under `app/public/assets/<category>/`
2. Spec embeds Antigravity prompt with style anchor: `flat 2D vector
   art, flash-game finish, clean 2px outline, 3-tone cel shading,
   palette warm-#D4691E + cool-#3399FF + accent-#FFD700`
3. POSUP forwards prompt to Antigravity → Antigravity drops PNG/PNG-32
   to repo
4. Claude verifies via `file <path>` (must be PNG-32 RGBA) + visual
   spot-check
5. Code references the file; no `assets/_placeholder/` directory

### Type classification quick reference
- A: dev self-merges (UI / call-site / asset wire)
- B: POSUP approves AP delta (Entity Schema / SaveState)
- C: POSUP+ARCH approves AP delta (Event Layer / scene chain)

### Sequence
```
A (combat refactor) ─→ B (maps) ∥ E (polish) ─→ C (pet, depends on A)
                                              ─→ D (quests)
                                              ─→ F (daily rewards)
```

### What Phase 2.5 explicitly does NOT include
- Multiplayer / real-time (defer Phase 3+)
- Voice chat (never — Clevai 5-18yr deployment)
- Paid currency / IAP (per POSUP scope decision)
- Anti-addiction timer (per POSUP veto)
- AP v1.2 refactor (per POSUP veto — keep v1.1 as base, sprints append)

---

**End Phase 2.5 roadmap.** Sub-project specs ship to
`docs/superpowers/specs/YYYY-MM-DD-<sprint>-design.md`. First spec is
Sprint A (Multi-party Combat Refactor).
