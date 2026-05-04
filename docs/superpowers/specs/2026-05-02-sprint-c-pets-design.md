# Sprint C — Pet System — Design Spec

**Phase:** 2.5 Prodigy-Parity
**Type:** B (Entity Schema delta + SaveState migration — POSUP approval)
**Author:** Claude (Game_SS3 worktree `claude/sprint-c-pets`)
**Status:** Draft → awaiting POSUP review (02/05/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md` (§ Sprint C)
**Predecessors:** Sprint A (multi-party combat) `ed6dbee`, Sprint B (maps) `c5a78b4`

---

## 1. Why this sprint

Sprint A delivered the **mechanical** scaffolding for pets: 6 starter species,
`PetEntityFactory`, `active_pet_instance_id` SaveState field, 24 PNGs, and
`PartyHud` rendering. But Sprint A's pet only appears in combat if the player
manually mutates `useSaveState.setState({ active_pet_instance_id: 'inst-bun', inventory: [...] })`
in DevTools — there is no in-game way to **acquire** a pet, **see** the
roster, or **equip** one. The 6-pet registry sits unused.

Sprint C delivers the **gameplay loop** that turns pets from dead weight
into the central collection mechanic the Prodigy-parity audit (29/04/2026)
identified as the strongest retention driver. After Sprint C, a student
who finishes Sprint B's forest-island traversal will:

1. Defeat a regular monster → 10% chance a "pet rescue" modal appears
2. Decide whether to **Thu thập** (collect) or **Thả đi** (release)
3. Open `/inventory` → switch to Pet tab → see roster
4. Equip an active pet → re-enter combat → pet fights alongside hero
5. Earn EXP from battles → active pet levels up → at lvl 10/20 evolves

POSUP-approved decisions (02/05/2026, brainstorming Q1-Q3):

- **Q1 — Rescue UX:** modal sparkle reveal post-victory, reusing the
  `RewardChestOverlay` pattern from Sprint B. Buttons: **Thu thập** /
  **Thả đi**. No pet naming this sprint (auto-assign Vietnamese display
  name from `PetDef.displayNameVi`).
- **Q2 — Rarity model:** 4-tier rarity (common / rare / epic / legendary)
  rolled at rescue. Same species can appear at any rarity; rarity boosts
  stats. Maximizes the 6-sprite ROI (24 effective creatures, no new art).
- **Q3a — Rescue rate by monster level-bucket** (forward-compatible with
  Phase 2 mid-tier monsters):

  | Bucket | Trigger | Per-battle rescue chance | Common / Rare / Epic / Legendary |
  |---|---|---|---|
  | weak | `monster.level ∈ 1..3` | 10% | 70 / 25 / 5 / 0 |
  | mid | `monster.level ∈ 4..7` | 15% | 30 / 50 / 18 / 2 |
  | boss | `monster.level ≥ 8` OR `is_boss` | **30%** | 0 / 40 / 50 / 10 |

- **Q3b — Stat multipliers per rarity** (gentle scaling so legendary ×
  ElementSystem ×1.5 ≤ ×2.4, balance preserved):

  | Rarity | HP × | ATK × |
  |---|---|---|
  | common | 1.0 | 1.0 |
  | rare | 1.15 | 1.15 |
  | epic | 1.3 | 1.3 |
  | legendary | 1.6 | 1.6 |

  Plus level scaling (additive on top of rarity): per level above 1 →
  `+5 HP, +1 ATK`. Example: level-5 epic bunbleaf =
  `60 × 1.3 + 4 × 5 = 98 HP`, `8 × 1.3 + 4 × 1 = 14 ATK`.

- **Q3c — Visual cues per rarity** (no new art needed; CSS + Phaser tint):

  | Rarity | Border / glow color | Modal effect |
  |---|---|---|
  | common | grey `#9CA3AF` | static reveal |
  | rare | blue `#3B82F6` | soft pulse glow |
  | epic | purple `#A855F7` | sparkle particles + light shake |
  | legendary | gold `#FBBF24` | screen flash + cinematic zoom + audio sting |

## 2. Goals

- Ship the rescue → roster → equip → level → evolve gameplay loop end-to-end
  for the 6 Sprint A starter species.
- Add `ownedPets: PetInstance[]` to SaveState (proper field, replacing the
  Sprint A `inventory` cast hack in `CombatScene.buildEntities`).
- Roll rarity at rescue; persist `rarity` on every `PetInstance`.
- Wire `gainExp` so the **active** pet's level grows alongside the hero.
- Trigger evolution stat boosts at level 10 and 20 (no sprite swap this
  sprint — defer to Phase 2 art batch).
- Extend `/inventory` route with a **Pet tab** (Items vs Pets) that lets
  the student equip / unequip / release pets.
- Reuse `RewardChestOverlay` rendering + audio pattern; add 3 new EventBus
  events (`PET_RESCUE_OFFERED`, `PET_COLLECTED`, `PET_RELEASED`).
- Stay within the 3-day code budget the roadmap allotted (8 days art is
  N/A — Sprint A already shipped pet sprites; only UI kit deferred).

## 3. Non-goals

- **Pet breeding** — explicit Phase 2 scope per `appendix_G_pet_breeding_prompts.md`.
  Breeding chamber UI, parent slots, egg hatch, offspring reveal are NOT
  this sprint.
- **Sprite swap on evolution** — Antigravity has not shipped evo-stage 2
  or evo-stage 3 sprites. Sprint C ships *stat-only* evolution (level 10
  / 20 unlock multipliers); Phase 2 art batch ships the new sprites and
  Sprint C+1 wires them with a single `evolutionStage`-keyed texture
  lookup.
- **Pet skill / move customisation** — pets always use the deterministic
  `pet-attack` action defined in Sprint A's `CombatResolver`. No move
  picker, no skill tree, no pet-spell selection.
- **Pet trading / multiplayer** — single-player only, no inter-account
  pet exchange. (Phase 5 deferred.)
- **Pet wandering in WorldMap / ZoneScene** — no companion sprite
  following the player on the overworld. The active pet only manifests
  in combat. (Phase 3+.)
- **Pet rename / customise display** — auto-assign `PetDef.displayNameVi`
  to every instance. Naming UI is Phase 3+.
- **Pet roster sort / filter** — flat grid only this sprint. Sort and
  filter UI is a Phase 3 polish task.
- **Pet release confirmation undo** — release is final, no "trash bin"
  recovery.

## 4. Architecture overview

### 4.1 SaveState v4 → v5

```ts
interface SaveStateV5 extends SaveStateV4 {
  ownedPets: PetInstance[];       // NEW — full roster
  // active_pet_instance_id was added in v3 (Sprint A); reused unchanged
}

interface PetInstance {
  instanceId: string;             // genInstanceId() at rescue time
  petCodename: PetDef['codename']; // 'bunbleaf' | ... | 'terraowl'
  rarity: PetRarity;              // 'common' | 'rare' | 'epic' | 'legendary'
  level: number;                  // 1..hero level (cap)
  xp: number;                     // current XP toward next pet level
  capturedAt: number;             // Date.now() at rescue
  evolutionStage: 1 | 2 | 3;      // derived: <10 → 1, 10-19 → 2, 20+ → 3
}

type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';
```

Migration `v4 → v5`: additive — old saves get `ownedPets: []`. The
existing `active_pet_instance_id` field stays at v3's value; if it
references a missing instance after migration, `buildPetEntity` already
returns null (Sprint A behavior). The Sprint A test in
`CombatScene.test.ts:536` that put a pet into `inventory` is migrated
to `ownedPets` in this sprint's Task 5.

### 4.2 Folder placement (AP §3.1 layer rules)

```
app/src/
├── types/
│   └── pet.ts                       NEW — PetInstance, PetRarity, MonsterBucket
├── domain/
│   ├── PetRescue.ts                 NEW — rollRarity(), shouldOfferRescue()
│   ├── PetRescue.test.ts
│   ├── PetEntityFactory.ts          EDIT — apply rarity + level multipliers
│   ├── PetEntityFactory.test.ts     EDIT — new tests for multiplier paths
│   ├── PetLeveling.ts               NEW — gainPetExp(), thresholds
│   └── PetLeveling.test.ts
├── data/staticConfig/
│   └── pets.ts                      EDIT — add rarity multiplier table + monster-bucket helper
├── persistence/
│   ├── SaveStateStore.ts            EDIT — v5 schema + 4 new actions
│   └── SaveStateStore.test.ts
├── bus/
│   ├── EventBus.ts                  EDIT — +3 events
│   └── EventBus.test.ts
├── react/
│   ├── overlays/
│   │   ├── PetRescueOverlay.tsx     NEW — modal sparkle reveal
│   │   └── PetRescueOverlay.test.tsx
│   └── screens/
│       └── InventoryScreen.tsx      EDIT — add Pet tab + grid + equip toggle
├── game/scenes/
│   └── CombatScene.ts               EDIT — emit PET_RESCUE_OFFERED on victory; replace inventory→ownedPets read
└── testing/
    └── gameTestBridge.ts            EDIT — +offerPetRescue, +acceptPet, +releasePet helpers
```

Layer rules (ESLint `boundaries/element-types`):

- `types/`, `data/staticConfig/`, `domain/` are pure TS. No Phaser, React,
  or DOM imports.
- `react/overlays/PetRescueOverlay.tsx` may NOT import Phaser. It reads
  `eventBus`, `useSaveState`, and `getPetDef`.
- `game/scenes/CombatScene.ts` may NOT import React. It only emits the
  `PET_RESCUE_OFFERED` event; the React overlay subscribes.
- `domain/PetRescue.ts` and `PetLeveling.ts` are pure functions —
  unit-testable without any Phaser or React mock.

### 4.3 Rescue flow (post-combat hook)

```
CombatScene.handleVictory() {
  ... existing EXP grant + gainExp() ...
  ... existing boss-only rollDrop() ...

  // NEW Sprint C — pet rescue offer
  const monster = monsterDef!;
  const playerLevel = useSaveState.getState().level;
  const offer = maybeOfferPetRescue({
    monster,
    rng: this._rng,                      // shared deterministic RNG (test-injectable)
  });
  if (offer) {
    eventBus.emit('PET_RESCUE_OFFERED', {
      petCodename: offer.codename,
      rarity: offer.rarity,
    });
  }

  ... existing EXIT_COMBAT emit + scene.stop() ...
}
```

`maybeOfferPetRescue` (in `domain/PetRescue.ts`) returns `null` if the
roll fails the per-battle rescue chance, else returns the rolled
species + rarity. The species roll is uniform across the 6 starters
(no element-monster matching this sprint — Phase 3+ refinement).

```ts
export interface PetRescueOffer {
  codename: PetDef['codename'];
  rarity: PetRarity;
}

export function maybeOfferPetRescue(params: {
  monster: MonsterDef;
  rng: () => number;
}): PetRescueOffer | null {
  const bucket = monsterBucket(params.monster);    // weak | mid | boss
  const r1 = params.rng();
  if (r1 >= RESCUE_CHANCE[bucket]) return null;
  const rarity = rollRarity(bucket, params.rng);
  const codename = rollSpecies(params.rng);        // uniform among 6
  return { codename, rarity };
}
```

### 4.4 Modal lifecycle (React overlay)

```
1. Combat victory → eventBus.emit('PET_RESCUE_OFFERED', {petCodename, rarity})
2. PetRescueOverlay subscribes → setState({offer: ...}) → render modal
3. Modal renders:
   - PetDef.displayNameVi as title
   - Pet sprite (texture: pet_<codename>_idle, scaled 1.5×)
   - Rarity badge (color per Q3c)
   - Two buttons:
     - "Thu thập" (collect) → mint PetInstance + push to ownedPets +
       emit PET_COLLECTED → close modal
     - "Thả đi" (release) → emit PET_RELEASED (audit only) → close modal
4. On collect, if ownedPets.length === ROSTER_CAP (12) before push:
   - Show secondary picker: "Chọn 1 pet để thả đi" with current roster
   - Selected pet → release → mint new pet → close
   - Cancel → close without minting (offer wasted)
```

Per-rarity reveal animations (CSS + Tailwind, no new art):
- common: opacity fade-in 200ms, no glow
- rare: 300ms scale-in + soft blue ring pulse
- epic: 400ms with `motion-safe` sparkle particles overlay
  (CSS pseudo-element grid of `<span>` dots animating)
- legendary: 500ms with screen-flash overlay (full-screen `bg-gold-200`
  div fading from `opacity-50` → `opacity-0`) + camera zoom on the
  underlying canvas for 200ms via `cameras.main.zoomTo(1.2, 200)`

Audio cues (reuse Sprint A bank):
- common/rare → `chest_open` SFX
- epic/legendary → `chest_open` + `victory_fanfare` (existing tracks)

### 4.5 Roster cap (12) + cap-handling

`ROSTER_CAP = 12` (= 6 species × 2 rarity-tier slots, generous enough for
Sprint C without inventory bloat).

When `ownedPets.length === 12` and a rescue is collected:
- Modal pivots to a release-picker view: 3×4 grid of current pets, each
  showing codename + rarity badge + level. Player taps one to release.
- After picker confirms → released pet removed from `ownedPets` →
  rescued pet added → modal closes.
- If picker is cancelled (×) → no mutation; the rescue offer is
  discarded silently. Rationale: the `Thu thập` decision shouldn't
  hold the modal open indefinitely.

### 4.6 Pet leveling (active pet gains hero's EXP)

```
SaveStateStore.gainExp(amount) {
  ... existing hero-side cascade ...

  // NEW Sprint C — propagate to active pet
  const activePet = state.ownedPets.find(p => p.instanceId === state.active_pet_instance_id);
  if (activePet) {
    activePet.xp += scaledAmount;
    while (activePet.xp >= petThresholdForLevel(activePet.level)
           && activePet.level < state.level) {
      activePet.xp -= petThresholdForLevel(activePet.level);
      activePet.level += 1;
      eventBus.emit('PET_LEVEL_UP', {
        petInstanceId: activePet.instanceId,
        newLevel: activePet.level,
        evolved: activePet.level === 10 || activePet.level === 20,
      });
    }
  }
}
```

`petThresholdForLevel(level)` mirrors `thresholdForLevel` from the hero
(same XP curve), so a player who keeps their first rescue equipped will
see the pet level up roughly in step with the hero.

**Pet level cap = hero level.** A pet cannot out-level its trainer.
This prevents grinding a single pet past the player's progression curve.

**Inactive pets gain 0 XP.** Only the equipped pet earns. Switching
active pets at `/inventory` swaps which one accumulates next battle.

### 4.7 Evolution (stat boost only — no sprite swap)

Evolution stages are **derived** from `level`:

```ts
function evolutionStage(level: number): 1 | 2 | 3 {
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

function evolutionMultiplier(stage: 1 | 2 | 3): number {
  return [1.0, 1.3, 1.6][stage - 1];
}
```

Stat formula in `buildPetEntity` (replaces Sprint A's flat read):

```ts
const stage = evolutionStage(inst.level);
const evoMult = evolutionMultiplier(stage);
const rarityMult = rarityMultiplier(inst.rarity);
const levelBonus = inst.level - 1;

const hp = Math.round(def.baseHp * rarityMult * evoMult + levelBonus * 5);
const atk = Math.round(def.attackPower * rarityMult * evoMult + levelBonus * 1);
```

Visual cue (Sprint C, no new art):
- stage 1 → no glow
- stage 2 → soft white aura around portrait (CSS `box-shadow: 0 0 8px white`)
- stage 3 → rainbow shimmer animation

When a pet hits level 10 or 20, the `PET_LEVEL_UP` event flag
`evolved: true` triggers a brief celebration overlay (1.5s lock with
"Pet đã tiến hóa!" text) using the same CSS technique as the legendary
rescue reveal — reuse code, no new asset.

### 4.8 Inventory UI — Pet tab on `/inventory`

```
+-----------------------------------------+
|  /inventory                          [×] |
+-----------------------------------------+
| [ Items ]  [ Pets ]                     | ← tab bar
+-----------------------------------------+
| ┌───┐ ┌───┐ ┌───┐ ┌───┐                 |
| │   │ │   │ │   │ │   │  ← 4-col grid   |
| │ 🐰│ │ 🔥│ │ 💧│ │   │     (rows of 4) |
| └───┘ └───┘ └───┘ └───┘                 |
|  Lv5  Lv2   ★    [empty]                |
|  rare epic                              |
|                                         |
| Slot active: 🐰 Thỏ Lá (Lv5, rare)       | ← bottom panel
| [ Đổi pet khác ] [ Thả pet đang chọn ]   |
+-----------------------------------------+
```

Tab implementation: use existing tab component pattern from
`/inventory` if one exists; otherwise simple `useState<'items' | 'pets'>`
toggle with conditional render. No new routing — Pet tab is a sibling
panel inside the same `/inventory` route to honor the roadmap.

Per-card visual:
- Sprite: `pet_<codename>_idle` texture rendered as `<img>` (React, not
  Phaser, since this UI is React-overlay). The PNG is at
  `/assets/pets/<codename>_idle_256.png` (already shipped, public path).
- Rarity border (per Q3c color)
- Level badge (top-right corner, e.g. `Lv5`)
- Equipped indicator (gold star at top-left of the active pet's card)
- Click card → set as active (`setActivePetInstanceId(instanceId)`)
- Long-press / right-click card → "Thả pet" confirmation (optional —
  ship as long-press only, mobile-first)

### 4.9 EventBus delta

| Event | Payload | Direction | Replaces |
|---|---|---|---|
| `PET_RESCUE_OFFERED` | `{ petCodename: PetCodename; rarity: PetRarity }` | CombatScene → React overlay | none |
| `PET_COLLECTED` | `{ petInstanceId: string; petCodename: PetCodename; rarity: PetRarity }` | overlay → bus | none |
| `PET_RELEASED` | `{ petCodename: PetCodename; rarity: PetRarity; reason: 'rejected-offer' \| 'roster-cap-replace' \| 'manual' }` | overlay → bus | none |
| `PET_LEVEL_UP` | `{ petInstanceId: string; newLevel: number; evolved: boolean }` | SaveStateStore.gainExp → bus | none |

Existing `LEVEL_UP` is unchanged (hero-only). The new `PET_LEVEL_UP`
keeps pet progression observable without coupling to hero events.

### 4.10 SaveState v5 actions

```ts
addPet(codename, rarity, level=1, xp=0): PetInstance     // mints + pushes; returns the instance
removePet(instanceId): boolean                            // returns true if found+removed
setActivePet(instanceId | null): void                     // alias for setActivePetInstanceId
hasPetAtCap(): boolean                                    // ownedPets.length >= ROSTER_CAP
findOwnedPet(instanceId): PetInstance | null
```

`addPet` auto-equips the new pet IF `active_pet_instance_id === null`
(quality-of-life — first rescue becomes the active pet automatically).

### 4.11 Telemetry / observability (Sentry breadcrumbs)

Three new breadcrumbs (already auto-captured by the existing EventBus
→ Sentry bridge — no new wiring):

- `PET_RESCUE_OFFERED` → records species + rarity per offer
- `PET_COLLECTED` → records collection rate
- `PET_RELEASED` → records release reasons

No metric counters change (5-metric contract preserved).

## 5. Acceptance criteria

1. **Schema v5**: `useSaveState.getState().ownedPets` exists, defaults `[]`.
   Old v4 saves migrate cleanly to v5 with `ownedPets: []` and
   pre-existing `active_pet_instance_id` preserved.
2. **Rescue offer**: defeating an `is_boss` monster offers a rescue
   30% of the time (deterministic with seeded RNG); defeating a
   level-1-3 monster offers 10%. Distribution roughly matches Q3a
   weights across 1000 trials in tests.
3. **Modal flow**: pressing **Thu thập** mints a `PetInstance` with
   rolled rarity and pushes to `ownedPets`; pressing **Thả đi** does
   not mutate state. Both close the modal.
4. **Roster cap**: 12 pets in `ownedPets` and a fresh rescue collected
   → release-picker appears. Releasing one + collecting new → still
   12 pets, with the released one absent and the new one present.
5. **Stat scaling**: `buildPetEntity` returns `hp = baseHp × rarityMult × evoMult + (level-1)×5` for any combination.
6. **Active-pet leveling**: hero gains 100 XP → active pet gains 100 XP
   → if threshold crossed, pet level += 1 and `PET_LEVEL_UP` fires.
   Inactive pets unchanged.
7. **Pet level cap**: when `pet.level === hero.level`, further pet XP
   accumulates but level does NOT increment until hero level rises.
8. **Evolution**: pet at level 10 returns `evolutionStage === 2` and
   `buildPetEntity` HP = `baseHp × rarityMult × 1.3 + 9×5`. Level 20
   → stage 3, multiplier 1.6.
9. **Inventory UI**: `/inventory` route shows two tabs (Items | Pets).
   Pets tab renders `ownedPets` in a 4-col grid with rarity borders.
   Clicking a card sets it active; the active card has a gold-star
   badge. Long-press shows release confirm.
10. **Type B gates**: lint + typecheck + verify + full unit suite green.
    New tests required:
    - `domain/PetRescue.test.ts` — `monsterBucket()`, `rollRarity()`,
      `rollSpecies()`, `maybeOfferPetRescue()` deterministic against
      seeded RNG; weighted distribution over 1000 trials.
    - `domain/PetLeveling.test.ts` — `petThresholdForLevel()`,
      `evolutionStage()`, `evolutionMultiplier()` boundary cases.
    - `domain/PetEntityFactory.test.ts` — extend with rarity+evo
      multiplier paths.
    - `persistence/SaveStateStore.test.ts` — v4→v5 migration, all 4
      new actions, dedupe semantics if any.
    - `bus/EventBus.test.ts` — 4 new events typed.
    - `game/scenes/CombatScene.test.ts` — handleVictory emits
      `PET_RESCUE_OFFERED` per RNG seed.
    - `react/overlays/PetRescueOverlay.test.tsx` — fresh roster collect,
      decline, roster-cap replace flow.
    - `react/screens/InventoryScreen.test.tsx` — Pet tab render,
      equip toggle, release confirm.
    - E2E `app/tests/e2e/sprint_c_pet_rescue.spec.ts` — kill boss with
      seeded RNG → modal appears → click Thu thập → /inventory shows
      one pet → equip it → re-enter combat → pet visible in PartyHud.

## 6. Risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Active-pet XP propagation creates state-mutation race in `set()` | Med | Med | Pet XP/level updated inside the same `set((state) => ...)` callback as hero XP, never via separate `setState` chains. Test: gain 1000 XP across multiple level breakpoints in one call. |
| R2 | Roster cap "release picker" interrupts the post-combat flow | Low | Low | Picker is opt-in (only when at cap). Cancel button discards offer silently — no required interaction. |
| R3 | Rarity multipliers stacking with ElementSystem ×1.5 multiplier breaks combat balance | Med | Med | Cap at legendary 1.6 (not 2.0); pet damage in `CombatResolver.autoAct` already uses `attackPower × elementMultiplier` — max compound = 1.6 × 1.5 = 2.4× (acceptable per Sprint A balance review). Phase 3 retunes if needed. |
| R4 | v5 migration collides with v3→v4 if save was never opened on v4 | Low | High | Migration runs sequentially (Sprint B established the pattern): v3→v4 then v4→v5. Test from a v3 fixture jumps both steps. |
| R5 | "evolved" celebration overlay clashes with `RewardChestOverlay` if both fire same battle | Low | Low | Overlays queue: PET_RESCUE_OFFERED waits for any open overlay to close; `PET_LEVEL_UP{evolved:true}` does the same via a small `overlayQueue` in the React layer. Sprint C ships the queue (1 file, ~30 lines). |
| R6 | `inventory` cast hack in `CombatScene.buildEntities` breaks when migrated to `ownedPets` | High | Low | Task 6 explicitly migrates `buildEntities` to read `save.ownedPets`. Sprint A test at `CombatScene.test.ts:536` is updated in the same task — flag as breaking change in commit message. |
| R7 | Long-press release UX fails on desktop (mouse only) | Med | Low | Right-click also triggers release confirm (same handler). E2E covers click path; long-press is mobile-only nice-to-have. |
| R8 | Level cap (pet.level ≤ hero.level) silently swallows pet XP | Low | Low | Document in `PetLeveling.ts`; surface in inventory tooltip "Pet đã đạt cấp tối đa cho cấp anh hùng hiện tại". |

## 7. AP / ISP impact

### 7.1 AP delta (additive, no version bump)

Append "Sprint C — Delta" section to AP v1.1:

- **§3.1** — add `domain/PetRescue.ts`, `domain/PetLeveling.ts`,
  `react/overlays/PetRescueOverlay.tsx`, `types/pet.ts`.
- **§11** — add §11.6 *Pet rescue rules* with the Q3a/Q3b tables and
  formulas; reference Sprint A §11.5 element matrix unchanged.
- **§13** — add SaveState v5 row: `ownedPets: PetInstance[]` (defaults
  `[]`); existing `active_pet_instance_id` annotated as referenced
  by Sprint C's roster.
- **§14** — append 4 events: `PET_RESCUE_OFFERED`, `PET_COLLECTED`,
  `PET_RELEASED`, `PET_LEVEL_UP` with payload signatures.

### 7.2 ISP delta

Append a Sprint C row table:

| # | Step | Status |
|---|---|---|
| S-C.0 | Preflight | ⏳ |
| S-C.1 | `types/pet.ts` + rarity/evolution constants | ⏳ |
| S-C.2 | `domain/PetRescue.ts` + tests | ⏳ |
| S-C.3 | `domain/PetLeveling.ts` + tests | ⏳ |
| S-C.4 | `PetEntityFactory` rarity+evo multiplier wiring | ⏳ |
| S-C.5 | SaveState v4→v5 migration + 4 actions | ⏳ |
| S-C.6 | EventBus +4 events | ⏳ |
| S-C.7 | `CombatScene.buildEntities` → `ownedPets` migration + handleVictory rescue offer emit | ⏳ |
| S-C.8 | `gainExp` propagates to active pet (`PetLeveling`) | ⏳ |
| S-C.9 | `PetRescueOverlay` + roster-cap picker | ⏳ |
| S-C.10 | `InventoryScreen` Pet tab + grid + equip toggle + release | ⏳ |
| S-C.11 | E2E spec `sprint_c_pet_rescue.spec.ts` | ⏳ |
| S-C.12 | AP/ISP delta + sprint roll-up | ⏳ |

12 steps, ~3 days code per the roadmap budget. Bigger than Sprint B's
unit count per task but each task is self-contained.

## 8. Test strategy

### 8.1 Unit (Vitest)

Per acceptance criteria §5, listed in §10 ISP rows. Target ≥ 50 new
unit tests across the 8 new/edited spec files.

### 8.2 E2E (Playwright)

`app/tests/e2e/sprint_c_pet_rescue.spec.ts`:

```
test('sprint C: rescue → collect → equip → pet battles', async ({ page }) => {
  await page.goto('/');
  await waitForGame(page);
  await page.evaluate(() => __GAME__.seedRng(0.05));    // seed for guaranteed offer
  await page.evaluate(() => __GAME__.startBossHall('forest-island'));
  await page.evaluate(() => __GAME__.engageBoss());
  // resolve combat to victory ...
  await answerQuizUntilVictory(page);
  // PET_RESCUE_OFFERED fires
  await page.waitForSelector('[data-testid="pet-rescue-overlay"]');
  await page.click('[data-testid="pet-rescue-collect"]');
  // navigate to inventory
  await page.click('[data-testid="menu-inventory"]');
  await page.click('[data-testid="inventory-tab-pets"]');
  await page.click('[data-testid="pet-card-0"]');   // equip
  // re-enter combat
  await page.evaluate(() => __GAME__.startCombat(/* mob */));
  await expect(page.locator('[data-testid="party-hud-pet-name"]')).toBeVisible();
});
```

### 8.3 Visual UAT (Antigravity)

Real Chromium walk-through:
- Beat boss (forest) ⇒ rare/epic offer modal appears ≤ 200 ms
  post-victory, sparkle animation matches rarity tier
- Click Thu thập ⇒ pet flies into roster (CSS transform animation)
- Open `/inventory` ⇒ Pet tab visible, 1 card, rarity border correct
- Equip + battle a regular monster ⇒ pet HP bar in PartyHud

## 9. Type classification

**Type B** — Entity Schema delta (PetInstance new field with rarity +
evolutionStage derived) + SaveState v5 migration. POSUP approval at
spec stage. **NOT** Type C — no Event Layer protocol change (the new
events are additive observers, not state transitions).

CI label gate: `type-B`.

## 10. Open questions baked as defaults (anh review khi review spec)

These were not asked in brainstorming Q1-Q3; em chose defaults that
follow the principle of *minimum-viable-completeness*. Anh override at
spec review if khác ý:

- **Q4 — Pet leveling EXP propagation:** *Active pet gains 100% of hero
  EXP per battle.* Inactive pets gain 0%. Pet level cap = hero level.
  (Alternative: split XP across all owned pets — rejected because it
  dilutes the "your pet" feeling.)
- **Q5 — Evolution mechanic:** *Stat-only evolution* at level 10 / 20
  via `evolutionMultiplier(stage)`. NO sprite swap (Phase 2 art batch).
  Visual cue: CSS glow on inventory portrait + on-screen "Pet đã tiến
  hóa!" text. (Alternative: defer evolution entirely until art ships
  — rejected because spec says "Phase 2.5 ships levels".)
- **Q6 — Roster cap:** *12 pets soft cap.* At cap, rescue triggers
  release-picker; cancel discards offer silently. (Alternative: hard
  cap, rescues silently rejected when full — rejected as confusing UX.)
- **Q7 — Equip slot:** *Pet has its own slot* (`active_pet_instance_id`),
  NOT in `EquipmentMap`. Inventory UI: Pet tab alongside Items tab on
  the `/inventory` route. (Alternative: add fifth slot to EquipmentMap
  — rejected because pets are categorically different from gear.)

---

**End Sprint C design spec.** Next step: anh review → user approval → invoke `writing-plans` skill to produce `docs/superpowers/plans/2026-05-02-sprint-c-pets-plan.md`.
