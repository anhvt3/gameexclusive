# Sprint A — Multi-Party Combat Refactor — Design Spec

**Phase:** 2.5 Prodigy-Parity
**Type:** C (Event Layer + Entity Schema delta — POSUP+ARCH approval)
**Author:** Claude (Game_SS3 worktree `claude/busy-pascal-d9c867`)
**Status:** Draft → awaiting POSUP review (29/04/2026)
**Roadmap parent:** `docs/roadmap_phase2.5_prodigy_parity.md`

---

## 1. Why this sprint

Phase 1+1.5 ships a 1-vs-1 combat loop: one hero entity hard-coded into
`CombatScene`, one monster entity hard-coded as the antagonist. The
148-frame audit showed the reference edu-RPG runs a **party combat loop**
where the player's hero fights alongside one active pet against one to
three enemies. Without the party loop, three later sprints cannot ship
cleanly:

- **Sprint C (Pet System)** has no slot for the pet to act — pets become
  cosmetic stat boosters instead of teammates.
- **Sprint B (Boss Hall)** needs to spawn 2-3 minions alongside a boss.
- **Sprint F (Daily Loot Jar)** loses meaning — collecting pets carries
  no gameplay weight if pets do not battle.

Sprint A refactors `CombatScene` and the supporting domain layer to a
polymorphic `CombatEntity[]` model. Hero, pet, and monster all flow
through the same turn cycle with their own HP, element, level, and
skills. POSUP-approved decisions (29/04/2026):

- **Party shape:** 1 hero + 1 pet (active, equipped) vs 1-3 enemies
- **Turn order:** fixed Hero → Pet → Monsters → loop
- **Quiz gating:** only the Hero's spell requires a quiz; Pet attacks
  use a deterministic damage formula
- **Targeting:** Hero picks the target enemy via on-screen monster
  tap (default = first enemy in entities order if hero declines);
  Pet auto-targets the lowest-HP enemy; Monsters auto-target the
  lowest-HP ally; **tiebreaker for "lowest HP" = first match in
  entities order (deterministic, reproducible in tests)**
- **End condition:** all enemies dead → VICTORY; all allies dead →
  DEFEAT; no last-stand mechanic
- **Pet damage formula:** `pet.level × 8 × elementMultiplier × (1 ± 0.1)`

## 2. Goals

- One combat entity model used by hero, pet, and every monster tier
- Eight-element rock-paper-scissors matrix enforced (today's combat
  uses a single `weak-against` field, not a full matrix)
- Pet acts as an independent teammate with its own HP bar, turn,
  and element
- Backwards-compatible with players who have no pet equipped (combat
  collapses to current 1-vs-1 path)
- Every new asset specified by exact filename and Antigravity prompt;
  no placeholder art reaches dev

## 3. Non-goals

- Pet rescue mechanic (Sprint C)
- Pet breeding (Phase 2 Appendix G — already specced)
- Boss-tier enemies with multi-target abilities (Sprint B)
- Speed-based initiative (deferred — fixed turn order ships first)
- Pet skill customisation UI (Sprint C)
- Multi-target hero spells (deferred — single-target only this sprint)

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────┐
│ CombatScene (Phaser, src/game/scenes)                │
│   entities: CombatEntity[]                           │
│   turnQueue: TurnQueue                               │
│   resolver:  CombatResolver                          │
│                                                      │
│   create() → buildEntities() → turnQueue.init()     │
│   tick():                                            │
│     entity = turnQueue.next()                        │
│     switch(entity.kind):                             │
│       hero    → openSpellPicker → OPEN_QUIZ          │
│       pet     → resolver.autoAct(entity)             │
│       monster → resolver.autoAct(entity)             │
│     emit TURN_RESOLVED                               │
│     check VICTORY / DEFEAT / continue                │
└──────────────────────────────────────────────────────┘
        │
        │ uses
        ▼
┌─────────────────────┐  ┌─────────────────────┐
│ TurnQueue           │  │ CombatResolver      │
│ pure function       │  │ pure function +     │
│ next(): Entity|null │  │ EventBus emitter    │
│ skips dead entities │  │ uses ElementMatrix  │
└─────────────────────┘  └─────────────────────┘
```

Layer compliance (AP §3.1):
- `domain/` — TurnQueue, CombatResolver, ElementMatrix (pure TS, no
  Phaser, no React)
- `game/` — CombatScene, PartyHud, PetSprite (Phaser only)
- `react/` — QuizOverlay (already exists; minor copy update only)
- `bus/` — `TURN_RESOLVED` event added; `DAMAGE_APPLIED` retained for
  one release as a deprecation alias
- `persistence/` — SaveStateStore v3 migration

## 5. Data model

### 5.1 CombatEntity (`src/types/combat.ts` — NEW)

```ts
export type CombatEntityKind = 'hero' | 'pet' | 'monster';
export type Faction = 'ally' | 'enemy';

export interface CombatEntityBase {
  id: string;             // unique per-combat instance id
  kind: CombatEntityKind;
  faction: Faction;
  name: string;           // display label above HP bar
  element: Element;       // from src/types/element.ts
  level: number;
  hp: number;             // current
  maxHp: number;
  spriteKey: string;      // Phaser texture key
  isCrittable: boolean;   // bosses can flag false
}

export interface HeroEntity extends CombatEntityBase {
  kind: 'hero';
  faction: 'ally';
  // hero spells come from CombatScene's SPELLS constant — no per-entity
  // skill array (Phase 1.5 design preserved). Future Sprint extends.
}

export interface PetEntity extends CombatEntityBase {
  kind: 'pet';
  faction: 'ally';
  petInstanceId: string;  // links back to SaveState.inventory
  attackPower: number;    // baseline damage before element multiplier
}

export interface MonsterEntity extends CombatEntityBase {
  kind: 'monster';
  faction: 'enemy';
  monsterDefId: number;
  attackPower: number;
  isBoss: boolean;
}

export type CombatEntity = HeroEntity | PetEntity | MonsterEntity;
```

### 5.2 SaveState v3 delta (`src/types/saveState.ts`)

```ts
export interface SaveStateV3 extends SaveStateV2 {
  saveStateVersion: 3;
  active_pet_instance_id: string | null;  // NEW (default null)
}
```

Migration v2 → v3: add field with `null`, bump `saveStateVersion`. v2
loads continue to work — pet path is skipped when null.

### 5.3 New EventBus event

```ts
'TURN_RESOLVED': {
  sourceId: string;       // entity.id of the actor
  targetIds: string[];    // entity.id(s) hit (Phase 1: always single-target)
  action: 'spell' | 'pet-attack' | 'monster-attack';
  damage: number;         // post-element-multiplier damage applied
  isCrit: boolean;
  remainingHp: number;    // target's hp AFTER application
}
```

`DAMAGE_APPLIED` (current event) stays as a deprecated alias for one
release: handlers receive `TURN_RESOLVED` with side derived from
`source.faction`. Removed in Sprint B.

## 6. Component / file inventory

| Layer | File | Status | Purpose |
|---|---|---|---|
| types | `src/types/combat.ts` | NEW | CombatEntity tag union |
| types | `src/types/saveState.ts` | EDIT | v3 schema |
| domain | `src/domain/TurnQueue.ts` | NEW | Order + skip-dead |
| domain | `src/domain/CombatResolver.ts` | NEW | Damage apply + events |
| domain | `src/domain/ElementMatrix.ts` | NEW | 8×8 multiplier lookup |
| domain | `src/domain/PetEntityFactory.ts` | NEW | Build PetEntity from SaveState |
| game | `src/game/scenes/CombatScene.ts` | REFACTOR | Entity-array driven |
| game | `src/game/entities/PartyHud.ts` | NEW | Multi-entity HP strip |
| game | `src/game/entities/PetSprite.ts` | NEW | Pet idle/attack/hurt anim |
| game | `src/game/scenes/PreloadScene.ts` | EDIT | Preload 24 pet PNG + 1 VFX strip |
| react | `src/react/quiz/QuizOverlay.tsx` | EDIT | Show "vs <enemy.name>" subtitle |
| persistence | `src/persistence/SaveStateStore.ts` | EDIT | v3 migration |
| bus | `src/bus/EventBus.ts` | EDIT | Add TURN_RESOLVED type |
| data | `src/data/staticConfig/pets.ts` | NEW | 6 starter pet defs |
| data | `src/data/staticConfig/combatConstants.ts` | NEW | Tunable balance numbers (POSUP requirement) |

## 7. Element matrix (AP §11.5 NEW)

8×8 multiplier table. Multipliers: weak ×0.5, normal ×1.0, strong ×2.0.

```ts
export const ELEMENT_MATRIX: Record<Element, Partial<Record<Element, number>>> = {
  Fire:    { Plant: 2.0, Ice: 2.0, Water: 0.5, Earth: 0.5 },
  Water:   { Fire: 2.0, Earth: 2.0, Plant: 0.5, Storm: 0.5 },
  Plant:   { Water: 2.0, Earth: 2.0, Fire: 0.5, Ice: 0.5 },
  Ice:     { Plant: 2.0, Storm: 2.0, Fire: 0.5 },
  Storm:   { Water: 2.0, Astral: 2.0, Earth: 0.5, Ice: 0.5 },
  Earth:   { Fire: 2.0, Storm: 2.0, Shadow: 2.0, Plant: 0.5 },
  Astral:  { Shadow: 2.0, Storm: 0.5 },
  Shadow:  { Astral: 2.0, Earth: 0.5 },
};

export function getMultiplier(attacker: Element, defender: Element): number {
  return ELEMENT_MATRIX[attacker][defender] ?? 1.0;
}
```

`getWeaknessElement(monsterElement)` (already in `ElementSystem.ts`)
upgrades to scan the matrix for the strongest counter, returning the
element with the highest multiplier vs the monster's element.

## 8. Combat flow (FSM update)

Existing `CombatStateMachine` states stay (`INIT / PLAYER_TURN /
QUIZ_GATE / RESOLVE_DAMAGE / MONSTER_TURN / VICTORY / DEFEAT`). Three
shifts:

- `PLAYER_TURN` becomes `ACTOR_TURN` semantically, with a
  `currentActorId` field. Hero turn re-uses the existing branch (open
  spell picker → OPEN_QUIZ); pet turn uses `RESOLVE_DAMAGE` directly.
- Between turns, `TurnQueue.next()` selects the next actor. If the
  next is hero, scene re-enters spell-picker; if pet/monster, scene
  schedules an auto-action via `time.delayedCall(900ms)` so kids see
  the action animate.
- After every `RESOLVE_DAMAGE`, scene checks both factions for
  all-dead → VICTORY/DEFEAT.

```
                ┌────────────────────┐
                │       INIT         │
                └────────┬───────────┘
                         │ START
                ┌────────▼───────────┐
            ┌───┤    ACTOR_TURN      │◄──────────┐
            │   └────────┬───────────┘            │
            │            │ TurnQueue.next         │
            │            ▼                        │
            │   ┌────────────────────┐            │
            │   │  hero?  pet?  mon? │            │
            │   └─┬─────┬───────┬────┘            │
            │     │ hero│ pet/mon                 │
            │     ▼     ▼                          │
            │  QUIZ_GATE  → AUTO_ACTION           │
            │     │           │                    │
            │     ▼           ▼                    │
            │  RESOLVE_DAMAGE ◄───────────────────┘
            │     │
            │     ▼
            │   side-dead check
            │     │
            └─────┴── VICTORY | DEFEAT | next ACTOR_TURN
```

## 9. Turn-order spec (`src/domain/TurnQueue.ts`)

Pure function module. State = `{ entities, cursor, generation }`.

```ts
interface TurnQueueState {
  entities: CombatEntity[];   // ordering: heroes first, pets next, monsters last
  cursor: number;             // index of next actor in entities
  generation: number;         // increments each full pass for telemetry
}

export function init(entities: CombatEntity[]): TurnQueueState;
export function next(state: TurnQueueState): {
  state: TurnQueueState;
  actor: CombatEntity | null;  // null when no living entity remains
};
export function isFactionDead(state: TurnQueueState, faction: Faction): boolean;
```

Algorithm:
1. Sort entities at init: allies (hero, pet) before monsters; within
   ally group `kind=hero` first then `kind=pet`.
2. `next()` returns first living entity at-or-after cursor; advances
   cursor; wraps with `generation++`.
3. If a full pass yields no living actor → return `null`.
4. `isFactionDead(faction)` returns true when every entity of that
   faction has hp ≤ 0.

100% pure — testable without any Phaser/EventBus context.

## 10. Damage calculation (`src/domain/CombatResolver.ts`)

```ts
export interface ResolveOptions {
  source: CombatEntity;
  target: CombatEntity;
  spellElement?: Element;       // hero turn only
  spellBasePower?: number;      // hero turn only
  difficulty?: number;          // hero turn only (1-5 from quiz LO)
  rng: () => number;            // injected for determinism in tests
}

export interface ResolveResult {
  damage: number;
  isCrit: boolean;
  remainingHp: number;
  multiplier: number;
}
```

Formulas:

- **Hero spell:**
  ```
  base = spellBasePower * (1 + difficulty / 10)
  multiplier = getMultiplier(spellElement, target.element)
  isCrit = rng() < heroCritChancePct / 100   // from EffectiveStats
  raw = base * multiplier * (isCrit ? 1.5 : 1)
  damage = round(raw * (1 + heroSpellDamagePct[spellElement] / 100))
  ```

- **Pet auto-attack (per POSUP α-ε ε):**
  ```
  base = pet.level * PET_DAMAGE_BASE_MULTIPLIER
  multiplier = getMultiplier(pet.element, target.element)
  jitter = 1 + (rng() * 2 - 1) * PET_DAMAGE_JITTER_PCT   // ±10% default
  damage = round(base * multiplier * jitter)
  ```

  **Tuning constants live in `src/data/staticConfig/combatConstants.ts`
  (NEW)** — POSUP requirement so balance numbers can be tweaked at
  Phase test without touching core logic. Defaults:
  ```ts
  export const PET_DAMAGE_BASE_MULTIPLIER = 8;
  export const PET_DAMAGE_JITTER_PCT = 0.1;
  export const HERO_SPELL_DIFFICULTY_BONUS = 0.1;   // per difficulty point
  export const CRIT_DAMAGE_MULTIPLIER = 1.5;
  ```
  Resolver imports from this file; tests stub via `vi.mock` if a fixed
  value is needed.

- **Monster attack:**
  ```
  base = monster.attackPower
  multiplier = getMultiplier(monster.element, target.element)
  damage = round(base * multiplier)   // no jitter, no crit
  ```

Resolver clamps `damage = max(0, damage)` and emits `TURN_RESOLVED`
after applying.

## 10.1 Target picker UX

When it is the hero's turn:
1. CombatScene draws a thin animated highlight ring on each living
   enemy entity sprite (ring tween 1 s pulse).
2. Spell-row buttons grey out and show prompt "Chọn mục tiêu" above
   the row until a target is selected.
3. Tapping a monster sprite locks it as `selectedTargetId`, removes
   highlight rings, enables spell row.
4. Tapping a spell triggers `onSpellClick(spellId, targetId)` →
   OPEN_QUIZ as before.
5. If only one enemy remains, target auto-locks; player skips step 1-3.

Backwards compat: when entities have exactly one enemy, behavior is
identical to Phase 1 (no target picker shown).

## 11. UI / `PartyHud` (`src/game/entities/PartyHud.ts`)

3-slot horizontal strip: ally side bottom-left (hero + pet), enemy
side top-right (1-3 monsters). Each slot shows:

- Name label (12 px white, dark stroke)
- HP bar (filled green → yellow → red as hp drops)
- Element icon (left of name)
- Level chip (yellow star + level number, like Phase 1)
- Highlight ring on the slot whose entity is `currentActorId`

Layout: party HP strip stacks vertically inside the same anchor area
(648 px viewport width). Strip background asset specified in §13.

## 12. Pet starter registry (`src/data/staticConfig/pets.ts`)

```ts
export const STARTER_PETS: PetDef[] = [
  { codename: 'bunbleaf',  element: 'Plant',  baseHp: 60, attackPower: 8 },
  { codename: 'pyropup',   element: 'Fire',   baseHp: 55, attackPower: 9 },
  { codename: 'aquakit',   element: 'Water',  baseHp: 65, attackPower: 7 },
  { codename: 'frostfae',  element: 'Ice',    baseHp: 50, attackPower: 9 },
  { codename: 'voltchick', element: 'Storm',  baseHp: 55, attackPower: 8 },
  { codename: 'terraowl',  element: 'Earth',  baseHp: 70, attackPower: 7 },
];
```

PetInstance (in SaveState.inventory) carries instanceId + level + xp;
PetDef provides static properties keyed by codename.

## 13. Asset pipeline

All filenames under `app/public/assets/` rooted in worktree
`busy-pascal-d9c867`. Antigravity drops PNG-32 RGBA — Claude verifies
with `file <path>` before wiring.

### 13.1 Pet sprites (24 files)

Path: `app/public/assets/pets/<codename>_<state>_256.png`
Sizes: 256×256 px each, transparent BG.

Codenames: `bunbleaf`, `pyropup`, `aquakit`, `frostfae`, `voltchick`,
`terraowl`. States: `idle`, `attack`, `hurt`, `death`. Total = 24 PNG.

**Antigravity prompt template** (replace `<codename>` and `<state>`):

```
[STYLE] flat 2D vector art, flash-game finish, clean 2px dark outline,
        3-tone cel shading, friendly chibi proportions, head ~60% body
[PALETTE] warm #D4691E + cool #3399FF + accent #FFD700, outline #8B4513
[SUBJECT] <codename> chibi pet creature in <state> pose
          - bunbleaf  = leafy rabbit, leaf-shaped ears, mossy green coat
          - pyropup   = puppy with flame mane, orange-red gradient fur
          - aquakit   = otter cub, blue water-droplet motif on chest
          - frostfae  = pixie sprite, snowflake-pattern wings, pale skin
          - voltchick = chick with lightning-bolt feather tuft, yellow
          - terraowl  = barn owl with stone-pattern feathers, earthy
[POSE]
          idle    = relaxed standing, gentle breath frame, eyes open
          attack  = lunging forward, mouth open mid-action, motion-line
          hurt    = knocked back stumble, X-eye briefly, dust puff
          death   = lying on side, swirl Z above, faded saturation 60%
[VIEW] 3/4 front, soft drop-shadow on ground, transparent BG
[AGE-APPROPRIATE] friendly, no fangs/blood/scary expressions; suits
                  Vietnamese students 5-18 years
[SIZE] 256×256 px, PNG-32 RGBA, no JPEG
[FILENAME] <codename>_<state>_256.png
```

### 13.2 Evolution VFX strip

Path: `app/public/assets/juice/evolution_burst_8frames.png`
Size: 2048×256 (8 frames × 256 wide), PNG-32 RGBA.

```
[STYLE] flat 2D vector art, flash-game finish
[SUBJECT] radial light-burst evolution effect, 8-frame horizontal strip
          frame 1 = small gold spark center
          frame 2 = rays starting to expand 4-direction
          frame 3 = rays full-length, sparkles starting to orbit
          frame 4 = full bloom 8-ray star with sparkle particles
          frame 5 = peak white-core flash, all rays at max
          frame 6 = retracting rays, sparkles flying outward
          frame 7 = small core remaining, scattered sparkles
          frame 8 = fade-out wisps
[PALETTE] gold #FFD700 + white #FFFFFF core + warm orange rim #F4A261
[SIZE] 2048×256 px (8 × 256×256 frames horizontal), transparent BG
[FILENAME] evolution_burst_8frames.png
```

### 13.3 Party HP strip background

Path: `app/public/assets/ui/party_hp_strip_bg.png`
Size: 240×80, 9-slice friendly, PNG-32 RGBA.

```
[STYLE] flat 2D vector UI plate, flash-game finish, clean 2px outline
[SUBJECT] horizontal HP-strip background panel with three sub-zones:
          - left:   element-badge slot (40×40 inset)
          - middle: name label area (full width minus left+right)
          - bottom: thin HP bar groove (200×12 hollow)
[PALETTE] cream fill #FAF3E0, brown outline #8B4513, soft inner shadow
[SIZE] 240×80 px, PNG-32 RGBA, transparent BG, 9-slice safe (16 px corners)
[FILENAME] party_hp_strip_bg.png
```

### 13.4 Element badge icons (8 files, optional reuse)

Phase 1 already shipped `assets/ui/spell_icon_<element>.png`. Sprint A
reuses these as element badges in PartyHud — no new asset request.

## 14. Test plan

### Unit (target ≥ 30 new tests)

- **TurnQueue** (~10 tests):
  - init with 1 hero, 1 pet, 1 monster → cursor=0
  - next() returns hero first
  - hero dies (hp=0) → next() skips hero
  - all enemies dead → isFactionDead('enemy')=true
  - all entities dead → next() returns null
  - generation increments after full pass
- **CombatResolver** (~12 tests):
  - hero spell vs target with multiplier 2.0 → damage doubled
  - pet attack with element neutral → multiplier 1.0
  - jitter range 0.9-1.1 (ten samples staying in band)
  - damage clamps to 0 minimum
  - emit TURN_RESOLVED with correct payload shape
  - crit roll with rng=0.0 always crits
  - target dead before resolve → resolver short-circuits, no event
- **ElementMatrix** (~8 tests):
  - all 8×8 cells return either 0.5, 1.0, or 2.0
  - getMultiplier(Fire, Plant) = 2.0
  - getMultiplier(Astral, Astral) = 1.0
  - getWeaknessElement(Storm) = Earth (or first ×2 hit in matrix)

### Integration

- **CombatScene** (~6 tests, mocked Phaser scene):
  - create() with active pet → entities.length === 3
  - create() without active pet → entities.length === 2
  - hero turn → spell click → pet turn auto-fires after delay
  - all enemies dead → emits EXIT_COMBAT(won=true)
  - all allies dead → emits EXIT_COMBAT(won=false)
  - target picker tap on monster → onSpellClick uses that target

### E2E (1 new spec)

`tests/e2e/multiparty_combat.spec.ts`:
- equip pet via `/inventory` → walk to enemy → enter combat
- screenshot 3 HP bars visible
- click spell, answer quiz correctly
- pet auto-attacks within 1500 ms
- monster retaliates
- continue until VICTORY
- assert pet HP unchanged from start (monster preferred lower-HP =
  hero)

### Regression

Existing 482 tests must stay green. The hero-only path collapses to
Phase 1 behavior (entities.length=2, no pet branch hit).

## 15. Migration

`SaveStateStore` migration v2 → v3:

```ts
function migrateV2toV3(v2: SaveStateV2): SaveStateV3 {
  return { ...v2, saveStateVersion: 3, active_pet_instance_id: null };
}
```

Triggered automatically on load when `saveStateVersion < 3`. HMAC
revalidation runs after migration so tampered saves still fail.

## 16. AP delta (Type C — POSUP+ARCH approval)

- §3.3 Event Layer: add `TURN_RESOLVED` payload spec; mark
  `DAMAGE_APPLIED` deprecated until Sprint B
- §8 Combat FSM: state name `PLAYER_TURN` → `ACTOR_TURN` (semantic);
  add `currentActorId` field
- §11.5 NEW: Element Matrix table (Section 7 of this spec)
- §11.6 NEW: Pet Entity Schema (Section 5.1 PetEntity interface)
- §13 SaveState: bump v2 → v3 migration block

## 17. Risk register

| Risk | Mitigation |
|---|---|
| Pet asset slip blocks dev | Implement combat with placeholder magic-circle until Antigravity ships PNG; spec rule says no placeholder ART, so we will pause CombatScene rendering integration until PNG arrives but will land domain layer (TurnQueue, Resolver, Matrix) first |
| Element matrix balance off (one element dominates) | Add unit test asserting no element wins all 7 matchups; balance pass after Day 3 |
| Quiz fatigue from longer combats (more rounds) | Hero damage scales with quiz difficulty; one correct answer ends 1-2 monsters in starter tier |
| Migration corrupts existing saves | E2E spec loads a v2 save snapshot, asserts v3 boot |
| Type C delay (ARCH review) | Spec submitted to ARCH same day as POSUP; parallel review |

## 18. Acceptance criteria

- [ ] Spec POSUP-approved
- [ ] Spec ARCH-approved (Type C)
- [ ] Implementation plan committed via writing-plans skill
- [ ] All 24 pet PNG + evolution VFX + party HP strip BG delivered by
      Antigravity (PNG-32 verified)
- [ ] 4 gates green: typecheck / lint / test / verify
- [ ] 482 + ~30 new unit tests pass
- [ ] 5 + 1 new E2E specs pass
- [ ] Manual UAT: combat with pet shows 3 HP bars, hero quiz, pet
      auto-attack, monster retaliate, victory chest
- [ ] AP §3.3, §8, §11.5, §11.6, §13 updated in same PR as code
- [ ] No `assets/_placeholder/` ships
- [ ] SaveState v2 → v3 migration verified by E2E load-old-save test

## 19. Estimate & sequencing

- **Day 1** Domain layer: types + TurnQueue + ElementMatrix + tests
- **Day 2** CombatResolver + integration with EventBus + tests
- **Day 3** CombatScene refactor + PartyHud + PetSprite + integration
  tests (Antigravity art arrives end of Day 3 latest)
- **Day 4** Quiz overlay copy + E2E spec + manual UAT + AP updates +
  PR

Antigravity track (parallel):
- **Day 1** Receive prompts (this spec ships)
- **Day 2-5** Pet PNG batch (24 files)
- **Day 5-6** Evolution VFX + HP strip BG

## 20. Open questions

1. Does the hero spell list expand when the pet is equipped, e.g. a
   shared "combo spell" that costs both turns? (Defer — Sprint C add-on.)
2. Should pet HP regenerate between battles or persist? (Default in
   this spec: persist; Sprint C re-evaluates.)
3. How does the existing daily-boss quest read into the new
   `entities[]` shape? (Boss is just one MonsterEntity with `isBoss=
   true`; `BOSS_HP_SCALE` still applies.)

---

**End spec.** Ready for POSUP review. After approval, Claude invokes
the writing-plans skill to produce the day-by-day implementation plan.
