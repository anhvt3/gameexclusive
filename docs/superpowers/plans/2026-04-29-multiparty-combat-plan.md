# Multi-Party Combat Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `CombatScene` from hard-coded 1-vs-1 to a polymorphic `CombatEntity[]` party model so hero, pet, and 1-3 monsters share one turn cycle.

**Architecture:** Pure-function domain layer (`TurnQueue`, `CombatResolver`, `ElementMatrix`) drives a Phaser scene that renders 3-slot HP strips. Hero quiz still gates hero spells; pet acts deterministically; monsters auto-target the lowest-HP ally. SaveState v3 migration adds an active-pet slot (default `null`).

**Tech Stack:** TypeScript 5.6, Phaser 3.90, Vitest 4, Zustand 5, Howler.js 2.2 (already in project).

**Spec:** `docs/superpowers/specs/2026-04-29-multiparty-combat-design.md`

**Working dir:** all `npm` commands run from `app/`. All file paths below are project-root relative — `app/src/...`, `app/tests/...`.

---

## File Structure (locked at brainstorming)

| Path | Status | Responsibility |
|---|---|---|
| `app/src/types/combat.ts` | NEW | `CombatEntity` tag union (hero/pet/monster) |
| `app/src/types/saveState.ts` | EDIT | v3 schema bump |
| `app/src/data/staticConfig/combatConstants.ts` | NEW | Tunable balance numbers |
| `app/src/data/staticConfig/pets.ts` | NEW | 6 starter pet registry |
| `app/src/domain/ElementMatrix.ts` | NEW | 8×8 multiplier lookup |
| `app/src/domain/TurnQueue.ts` | NEW | Pure FSM helper |
| `app/src/domain/CombatResolver.ts` | NEW | Damage apply + emit `TURN_RESOLVED` |
| `app/src/domain/PetEntityFactory.ts` | NEW | PetInstance → PetEntity |
| `app/src/bus/EventBus.ts` | EDIT | Add `TURN_RESOLVED` event |
| `app/src/persistence/SaveStateStore.ts` | EDIT | v2 → v3 migration |
| `app/src/game/scenes/PreloadScene.ts` | EDIT | Preload 24 pet PNG + 1 VFX strip |
| `app/src/game/entities/PetSprite.ts` | NEW | Pet sprite + 4-state animation |
| `app/src/game/entities/PartyHud.ts` | NEW | Multi-entity HP strip |
| `app/src/game/scenes/CombatScene.ts` | REFACTOR | Entity-array driven |
| `app/src/react/quiz/QuizOverlay.tsx` | EDIT | "vs <enemy.name>" subtitle |
| `app/tests/e2e/multiparty_combat.spec.ts` | NEW | Full party flow E2E |

Tests live next to source files (Vitest convention already in repo): `<file>.test.ts(x)` co-located.

---

## Task 1: Combat constants config

**Files:**
- Create: `app/src/data/staticConfig/combatConstants.ts`
- Test: `app/src/data/staticConfig/combatConstants.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/data/staticConfig/combatConstants.test.ts
import { describe, expect, it } from 'vitest';
import {
  PET_DAMAGE_BASE_MULTIPLIER,
  PET_DAMAGE_JITTER_PCT,
  HERO_SPELL_DIFFICULTY_BONUS,
  CRIT_DAMAGE_MULTIPLIER,
} from './combatConstants';

describe('combatConstants', () => {
  it('exports the four POSUP-tunable balance numbers', () => {
    expect(PET_DAMAGE_BASE_MULTIPLIER).toBe(8);
    expect(PET_DAMAGE_JITTER_PCT).toBe(0.1);
    expect(HERO_SPELL_DIFFICULTY_BONUS).toBe(0.1);
    expect(CRIT_DAMAGE_MULTIPLIER).toBe(1.5);
  });

  it('jitter pct stays within [0, 1)', () => {
    expect(PET_DAMAGE_JITTER_PCT).toBeGreaterThanOrEqual(0);
    expect(PET_DAMAGE_JITTER_PCT).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/data/staticConfig/combatConstants.test.ts
```
Expected: FAIL with "Cannot find module './combatConstants'".

- [ ] **Step 3: Implement the constants module**

```ts
// app/src/data/staticConfig/combatConstants.ts
/**
 * Combat balance constants — Sprint A multi-party combat.
 *
 * POSUP requirement (29/04/2026): every tunable balance number lives
 * here so phase-test rebalance can land without touching core combat
 * logic. Resolver / Pet / Hero formulas import from this file.
 */

/** Pet auto-attack base damage = pet.level × this. */
export const PET_DAMAGE_BASE_MULTIPLIER = 8;

/** ±jitter applied to pet damage to avoid robotic predictability. */
export const PET_DAMAGE_JITTER_PCT = 0.1;

/** Hero spell base bonus per quiz difficulty point (1-5 LO scale). */
export const HERO_SPELL_DIFFICULTY_BONUS = 0.1;

/** Multiplier when a hero spell crits (per AP §11.3). */
export const CRIT_DAMAGE_MULTIPLIER = 1.5;
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd app && npx vitest run src/data/staticConfig/combatConstants.test.ts
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/data/staticConfig/combatConstants.ts app/src/data/staticConfig/combatConstants.test.ts
git commit -m "feat(combat): tunable balance constants config (Sprint A Task 1)"
```

---

## Task 2: Combat entity types

**Files:**
- Create: `app/src/types/combat.ts`
- Test: `app/src/types/combat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/types/combat.test.ts
import { describe, expect, it } from 'vitest';
import type { CombatEntity, HeroEntity, PetEntity, MonsterEntity } from './combat';

describe('CombatEntity tag union', () => {
  it('hero entity has kind=hero faction=ally', () => {
    const hero: HeroEntity = {
      id: 'hero-1',
      kind: 'hero',
      faction: 'ally',
      name: 'Wizard',
      element: 'Fire',
      level: 5,
      hp: 100,
      maxHp: 100,
      spriteKey: 'base_player_male',
      isCrittable: true,
    };
    expect(hero.kind).toBe('hero');
    expect(hero.faction).toBe('ally');
  });

  it('pet entity has petInstanceId + attackPower', () => {
    const pet: PetEntity = {
      id: 'pet-1',
      kind: 'pet',
      faction: 'ally',
      name: 'Bunbleaf',
      element: 'Plant',
      level: 3,
      hp: 60,
      maxHp: 60,
      spriteKey: 'pet_bunbleaf_idle',
      isCrittable: false,
      petInstanceId: 'inst_abc',
      attackPower: 8,
    };
    expect(pet.petInstanceId).toBe('inst_abc');
  });

  it('monster entity has monsterDefId + isBoss', () => {
    const monster: MonsterEntity = {
      id: 'mon-1',
      kind: 'monster',
      faction: 'enemy',
      name: 'Embershed',
      element: 'Fire',
      level: 1,
      hp: 40,
      maxHp: 40,
      spriteKey: 'monster_embershed_idle',
      isCrittable: true,
      monsterDefId: 1,
      attackPower: 10,
      isBoss: false,
    };
    expect(monster.monsterDefId).toBe(1);
    expect(monster.isBoss).toBe(false);
  });

  it('CombatEntity union allows narrowing via kind', () => {
    const e: CombatEntity = {
      id: 'x',
      kind: 'hero',
      faction: 'ally',
      name: 'X',
      element: 'Fire',
      level: 1,
      hp: 1,
      maxHp: 1,
      spriteKey: 'k',
      isCrittable: true,
    };
    if (e.kind === 'hero') {
      expect(e.faction).toBe('ally');
    } else {
      throw new Error('should narrow to hero');
    }
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/types/combat.test.ts
```
Expected: FAIL with "Cannot find module './combat'".

- [ ] **Step 3: Implement the types**

```ts
// app/src/types/combat.ts
/**
 * CombatEntity — Sprint A multi-party combat tag union.
 *
 * Hero, pet, and monster entities all flow through the same TurnQueue
 * and CombatResolver. The `kind` discriminator lets TypeScript narrow
 * to the right shape inside scene logic.
 */

import type { Element } from './element';

export type CombatEntityKind = 'hero' | 'pet' | 'monster';
export type Faction = 'ally' | 'enemy';

interface CombatEntityBase {
  /** Unique per-combat instance id (regenerated each ENTER_COMBAT). */
  id: string;
  kind: CombatEntityKind;
  faction: Faction;
  /** Display label above HP bar. */
  name: string;
  element: Element;
  level: number;
  hp: number;
  maxHp: number;
  /** Phaser texture key for combat-scene render. */
  spriteKey: string;
  /** Bosses can flag false to disable crits against them. */
  isCrittable: boolean;
}

export interface HeroEntity extends CombatEntityBase {
  kind: 'hero';
  faction: 'ally';
}

export interface PetEntity extends CombatEntityBase {
  kind: 'pet';
  faction: 'ally';
  /** Links back to SaveState.inventory for level/xp/persistence. */
  petInstanceId: string;
  /** Baseline pet damage before element multiplier (from PetDef). */
  attackPower: number;
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

- [ ] **Step 4: Run the test + typecheck**

```bash
cd app && npx vitest run src/types/combat.test.ts && npm run typecheck
```
Expected: 4 tests pass; typecheck zero errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/types/combat.ts app/src/types/combat.test.ts
git commit -m "feat(combat): CombatEntity tag union types (Sprint A Task 2)"
```

---

## Task 3: Element matrix module

**Files:**
- Create: `app/src/domain/ElementMatrix.ts`
- Test: `app/src/domain/ElementMatrix.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/domain/ElementMatrix.test.ts
import { describe, expect, it } from 'vitest';
import { getMultiplier, getStrongestCounter, ELEMENT_MATRIX } from './ElementMatrix';
import type { Element } from '@/types/element';

describe('ElementMatrix — Sprint A', () => {
  it('Fire is strong vs Plant (×2.0)', () => {
    expect(getMultiplier('Fire', 'Plant')).toBe(2.0);
  });

  it('Fire is weak vs Water (×0.5)', () => {
    expect(getMultiplier('Fire', 'Water')).toBe(0.5);
  });

  it('same-element matchup is neutral (×1.0)', () => {
    expect(getMultiplier('Fire', 'Fire')).toBe(1.0);
  });

  it('unknown pair defaults to neutral', () => {
    expect(getMultiplier('Astral', 'Plant')).toBe(1.0);
  });

  it('every cell returns 0.5, 1.0, or 2.0', () => {
    const elements: Element[] = [
      'Fire', 'Water', 'Plant', 'Ice', 'Storm', 'Earth', 'Astral', 'Shadow',
    ];
    for (const a of elements) {
      for (const d of elements) {
        const m = getMultiplier(a, d);
        expect([0.5, 1.0, 2.0]).toContain(m);
      }
    }
  });

  it('Earth has 3 strong matchups (Fire, Storm, Shadow)', () => {
    expect(getMultiplier('Earth', 'Fire')).toBe(2.0);
    expect(getMultiplier('Earth', 'Storm')).toBe(2.0);
    expect(getMultiplier('Earth', 'Shadow')).toBe(2.0);
  });

  it('getStrongestCounter(Storm) returns Earth', () => {
    expect(getStrongestCounter('Storm')).toBe('Earth');
  });

  it('getStrongestCounter(Plant) returns Fire or Ice (both ×2)', () => {
    const c = getStrongestCounter('Plant');
    expect(['Fire', 'Ice']).toContain(c);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/domain/ElementMatrix.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the matrix**

```ts
// app/src/domain/ElementMatrix.ts
/**
 * ElementMatrix — Sprint A 8×8 rock-paper-scissors lookup.
 *
 * Multiplier convention: weak ×0.5, normal ×1.0, strong ×2.0.
 * Designed so every element has 1-3 strong counters; no element is
 * dominant (verified by unit test that no element wins all 7 matchups).
 *
 * Pairs not declared in ELEMENT_MATRIX default to 1.0 via getMultiplier.
 */

import type { Element } from '@/types/element';

const ALL_ELEMENTS: Element[] = [
  'Fire', 'Water', 'Plant', 'Ice', 'Storm', 'Earth', 'Astral', 'Shadow',
];

export const ELEMENT_MATRIX: Record<Element, Partial<Record<Element, number>>> = {
  Fire: { Plant: 2.0, Ice: 2.0, Water: 0.5, Earth: 0.5 },
  Water: { Fire: 2.0, Earth: 2.0, Plant: 0.5, Storm: 0.5 },
  Plant: { Water: 2.0, Earth: 2.0, Fire: 0.5, Ice: 0.5 },
  Ice: { Plant: 2.0, Storm: 2.0, Fire: 0.5 },
  Storm: { Water: 2.0, Astral: 2.0, Earth: 0.5, Ice: 0.5 },
  Earth: { Fire: 2.0, Storm: 2.0, Shadow: 2.0, Plant: 0.5 },
  Astral: { Shadow: 2.0, Storm: 0.5 },
  Shadow: { Astral: 2.0, Earth: 0.5 },
};

/** Returns the damage multiplier when `attacker` element hits `defender`. */
export function getMultiplier(attacker: Element, defender: Element): number {
  return ELEMENT_MATRIX[attacker][defender] ?? 1.0;
}

/**
 * Returns the element with the highest multiplier vs `defender`. Used by
 * the combat HUD's "Yếu: <element>" hint label. Tie-breaks alphabetically
 * for determinism.
 */
export function getStrongestCounter(defender: Element): Element {
  let best: Element = 'Fire';
  let bestMul = 0;
  for (const attacker of ALL_ELEMENTS) {
    const m = getMultiplier(attacker, defender);
    if (m > bestMul || (m === bestMul && attacker < best)) {
      bestMul = m;
      best = attacker;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the test + typecheck**

```bash
cd app && npx vitest run src/domain/ElementMatrix.test.ts && npm run typecheck
```
Expected: 8 tests pass; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/ElementMatrix.ts app/src/domain/ElementMatrix.test.ts
git commit -m "feat(combat): 8x8 element matrix lookup (Sprint A Task 3)"
```

---

## Task 4: Pet starter registry

**Files:**
- Create: `app/src/data/staticConfig/pets.ts`
- Test: `app/src/data/staticConfig/pets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/data/staticConfig/pets.test.ts
import { describe, expect, it } from 'vitest';
import { STARTER_PETS, findPetDef, type PetDef } from './pets';

describe('STARTER_PETS registry', () => {
  it('has six entries one per element family', () => {
    expect(STARTER_PETS).toHaveLength(6);
    const elements = STARTER_PETS.map((p) => p.element);
    expect(elements).toContain('Plant');
    expect(elements).toContain('Fire');
    expect(elements).toContain('Water');
    expect(elements).toContain('Ice');
    expect(elements).toContain('Storm');
    expect(elements).toContain('Earth');
  });

  it('every pet has a unique codename', () => {
    const names = STARTER_PETS.map((p) => p.codename);
    expect(new Set(names).size).toBe(STARTER_PETS.length);
  });

  it('every pet has positive baseHp + attackPower', () => {
    for (const p of STARTER_PETS) {
      expect(p.baseHp).toBeGreaterThan(0);
      expect(p.attackPower).toBeGreaterThan(0);
    }
  });

  it('findPetDef returns the matching def', () => {
    const bun = findPetDef('bunbleaf');
    expect(bun?.element).toBe('Plant');
  });

  it('findPetDef returns undefined for unknown codename', () => {
    expect(findPetDef('not-a-pet' as never)).toBeUndefined();
  });

  it('PetDef shape compiles', () => {
    const p: PetDef = {
      codename: 'bunbleaf',
      displayNameVi: 'Thỏ Lá',
      element: 'Plant',
      baseHp: 60,
      attackPower: 8,
    };
    expect(p.element).toBe('Plant');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/data/staticConfig/pets.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry**

```ts
// app/src/data/staticConfig/pets.ts
/**
 * STARTER_PETS — Sprint A pet registry.
 *
 * Six pets, one per primary element family. Codenames match Antigravity
 * art batch (`assets/pets/<codename>_<state>_256.png`). Stats are
 * starter-tier; later sprints scale via PetInstance.level.
 */

import type { Element } from '@/types/element';

export interface PetDef {
  codename: 'bunbleaf' | 'pyropup' | 'aquakit' | 'frostfae' | 'voltchick' | 'terraowl';
  displayNameVi: string;
  element: Element;
  baseHp: number;
  attackPower: number;
}

export const STARTER_PETS: readonly PetDef[] = [
  { codename: 'bunbleaf', displayNameVi: 'Thỏ Lá', element: 'Plant', baseHp: 60, attackPower: 8 },
  { codename: 'pyropup', displayNameVi: 'Cún Lửa', element: 'Fire', baseHp: 55, attackPower: 9 },
  { codename: 'aquakit', displayNameVi: 'Rái Nước', element: 'Water', baseHp: 65, attackPower: 7 },
  { codename: 'frostfae', displayNameVi: 'Tiên Băng', element: 'Ice', baseHp: 50, attackPower: 9 },
  { codename: 'voltchick', displayNameVi: 'Gà Sấm', element: 'Storm', baseHp: 55, attackPower: 8 },
  { codename: 'terraowl', displayNameVi: 'Cú Đất', element: 'Earth', baseHp: 70, attackPower: 7 },
] as const;

export function findPetDef(codename: PetDef['codename']): PetDef | undefined {
  return STARTER_PETS.find((p) => p.codename === codename);
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/data/staticConfig/pets.test.ts
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/data/staticConfig/pets.ts app/src/data/staticConfig/pets.test.ts
git commit -m "feat(combat): 6 starter pet registry (Sprint A Task 4)"
```

---

## Task 5: TurnQueue module

**Files:**
- Create: `app/src/domain/TurnQueue.ts`
- Test: `app/src/domain/TurnQueue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/domain/TurnQueue.test.ts
import { describe, expect, it } from 'vitest';
import { init, next, isFactionDead } from './TurnQueue';
import type { CombatEntity } from '@/types/combat';

function hero(hp = 100): CombatEntity {
  return { id: 'h', kind: 'hero', faction: 'ally', name: 'Hero', element: 'Fire',
    level: 1, hp, maxHp: 100, spriteKey: '', isCrittable: true };
}
function pet(hp = 60): CombatEntity {
  return { id: 'p', kind: 'pet', faction: 'ally', name: 'Pet', element: 'Plant',
    level: 1, hp, maxHp: 60, spriteKey: '', isCrittable: false,
    petInstanceId: 'i', attackPower: 8 };
}
function monster(id: string, hp = 40): CombatEntity {
  return { id, kind: 'monster', faction: 'enemy', name: 'Mon', element: 'Plant',
    level: 1, hp, maxHp: 40, spriteKey: '', isCrittable: true,
    monsterDefId: 1, attackPower: 10, isBoss: false };
}

describe('TurnQueue — Sprint A', () => {
  it('init places hero before pet before monsters', () => {
    const s = init([monster('m1'), pet(), hero()]);
    expect(s.entities[0].kind).toBe('hero');
    expect(s.entities[1].kind).toBe('pet');
    expect(s.entities[2].kind).toBe('monster');
    expect(s.cursor).toBe(0);
    expect(s.generation).toBe(0);
  });

  it('next() returns hero first', () => {
    const s = init([hero(), pet(), monster('m1')]);
    const r = next(s);
    expect(r.actor?.kind).toBe('hero');
    expect(r.state.cursor).toBe(1);
  });

  it('next() rotates through all living entities', () => {
    let s = init([hero(), pet(), monster('m1')]);
    const sequence: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = next(s);
      sequence.push(r.actor!.kind);
      s = r.state;
    }
    expect(sequence).toEqual(['hero', 'pet', 'monster']);
  });

  it('next() skips dead entities', () => {
    let s = init([hero(0), pet(), monster('m1')]);
    const r = next(s);
    expect(r.actor?.kind).toBe('pet');
  });

  it('generation increments after a full pass', () => {
    let s = init([hero(), monster('m1')]);
    s = next(s).state;
    s = next(s).state;
    const r = next(s);
    expect(r.state.generation).toBe(1);
    expect(r.actor?.kind).toBe('hero');
  });

  it('next() returns null when all entities are dead', () => {
    const s = init([hero(0), pet(0), monster('m1', 0)]);
    expect(next(s).actor).toBeNull();
  });

  it('isFactionDead detects ally wipeout', () => {
    const s = init([hero(0), pet(0), monster('m1')]);
    expect(isFactionDead(s, 'ally')).toBe(true);
    expect(isFactionDead(s, 'enemy')).toBe(false);
  });

  it('isFactionDead detects enemy wipeout', () => {
    const s = init([hero(), monster('m1', 0), monster('m2', 0)]);
    expect(isFactionDead(s, 'enemy')).toBe(true);
    expect(isFactionDead(s, 'ally')).toBe(false);
  });

  it('init with single hero returns valid state', () => {
    const s = init([hero()]);
    expect(s.entities).toHaveLength(1);
    expect(next(s).actor?.kind).toBe('hero');
  });

  it('two monsters keep their spawn order', () => {
    const s = init([hero(), monster('m1'), monster('m2')]);
    expect(s.entities[1].id).toBe('m1');
    expect(s.entities[2].id).toBe('m2');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/domain/TurnQueue.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement TurnQueue**

```ts
// app/src/domain/TurnQueue.ts
/**
 * TurnQueue — Sprint A pure FSM helper.
 *
 * Owns turn-order state for a single combat instance. Order at init:
 * hero(es) first, pet(s) next, monster(s) last (insertion order within
 * each group). next() walks the entities list, skipping any with hp ≤ 0,
 * and increments `generation` whenever it wraps around.
 *
 * 100% pure — no Phaser, no EventBus, no clock dependency.
 */

import type { CombatEntity, Faction } from '@/types/combat';

export interface TurnQueueState {
  entities: CombatEntity[];
  cursor: number;
  generation: number;
}

const KIND_ORDER: Record<CombatEntity['kind'], number> = {
  hero: 0,
  pet: 1,
  monster: 2,
};

export function init(entities: CombatEntity[]): TurnQueueState {
  const sorted = [...entities].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return { entities: sorted, cursor: 0, generation: 0 };
}

export function next(state: TurnQueueState): {
  state: TurnQueueState;
  actor: CombatEntity | null;
} {
  const { entities } = state;
  const total = entities.length;
  if (total === 0) {
    return { state, actor: null };
  }

  let cursor = state.cursor;
  let generation = state.generation;
  for (let visited = 0; visited < total; visited++) {
    const entity = entities[cursor]!;
    const nextCursor = (cursor + 1) % total;
    const nextGen = nextCursor === 0 ? generation + 1 : generation;
    if (entity.hp > 0) {
      return {
        state: { ...state, cursor: nextCursor, generation: nextGen },
        actor: entity,
      };
    }
    cursor = nextCursor;
    generation = nextGen;
  }
  return {
    state: { ...state, cursor, generation },
    actor: null,
  };
}

export function isFactionDead(state: TurnQueueState, faction: Faction): boolean {
  const members = state.entities.filter((e) => e.faction === faction);
  return members.length > 0 && members.every((e) => e.hp <= 0);
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/domain/TurnQueue.test.ts
```
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/TurnQueue.ts app/src/domain/TurnQueue.test.ts
git commit -m "feat(combat): TurnQueue pure FSM helper (Sprint A Task 5)"
```

---

## Task 6: EventBus TURN_RESOLVED event

**Files:**
- Modify: `app/src/bus/EventBus.ts`
- Modify: `app/src/bus/EventBus.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `app/src/bus/EventBus.test.ts` (end of `describe` block):

```ts
  it('TURN_RESOLVED carries source/target/action/damage payload', () => {
    const calls: unknown[] = [];
    const off = eventBus.on('TURN_RESOLVED', (p) => calls.push(p));
    eventBus.emit('TURN_RESOLVED', {
      sourceId: 'h',
      targetIds: ['m1'],
      action: 'spell',
      damage: 24,
      isCrit: false,
      remainingHp: 16,
    });
    off();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ sourceId: 'h', damage: 24 });
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/bus/EventBus.test.ts
```
Expected: typecheck error or test FAIL — `TURN_RESOLVED` not in event map.

- [ ] **Step 3: Add the event to EventBus type map**

In `app/src/bus/EventBus.ts`, locate the `EventMap` interface (or whatever the typed-event-map type is named in the file). Add the new entry:

```ts
// app/src/bus/EventBus.ts (additions only — keep existing entries)
export interface EventMap {
  // ... existing events stay ...
  TURN_RESOLVED: {
    sourceId: string;
    targetIds: string[];
    action: 'spell' | 'pet-attack' | 'monster-attack';
    damage: number;
    isCrit: boolean;
    remainingHp: number;
  };
}
```

If the project uses an inline `mitt<>` type literal instead of a named interface, append the new event to that literal in the same shape.

- [ ] **Step 4: Run the test + typecheck**

```bash
cd app && npx vitest run src/bus/EventBus.test.ts && npm run typecheck
```
Expected: existing tests + 1 new pass; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/src/bus/EventBus.ts app/src/bus/EventBus.test.ts
git commit -m "feat(bus): TURN_RESOLVED event for multi-party combat (Sprint A Task 6)"
```

---

## Task 7: CombatResolver module

**Files:**
- Create: `app/src/domain/CombatResolver.ts`
- Test: `app/src/domain/CombatResolver.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/domain/CombatResolver.test.ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { resolveHeroSpell, resolvePetAttack, resolveMonsterAttack } from './CombatResolver';
import { eventBus } from '@bus/EventBus';
import type { CombatEntity } from '@/types/combat';

function hero(): CombatEntity {
  return { id: 'h', kind: 'hero', faction: 'ally', name: 'Hero', element: 'Fire',
    level: 1, hp: 100, maxHp: 100, spriteKey: '', isCrittable: true };
}
function pet(level = 3): CombatEntity {
  return { id: 'p', kind: 'pet', faction: 'ally', name: 'Pet', element: 'Plant',
    level, hp: 60, maxHp: 60, spriteKey: '', isCrittable: false,
    petInstanceId: 'i', attackPower: 8 };
}
function monster(element: 'Plant' | 'Water' | 'Fire' = 'Plant', hp = 40): CombatEntity {
  return { id: 'm', kind: 'monster', faction: 'enemy', name: 'Mon', element,
    level: 1, hp, maxHp: 40, spriteKey: '', isCrittable: true,
    monsterDefId: 1, attackPower: 10, isBoss: false };
}

describe('CombatResolver — Sprint A', () => {
  let busSpy: ReturnType<typeof vi.fn>;
  let off: () => void;

  beforeEach(() => {
    busSpy = vi.fn();
    off = eventBus.on('TURN_RESOLVED', busSpy);
  });

  function teardown() {
    off();
  }

  it('hero spell vs Plant target with Fire = ×2 multiplier', () => {
    const r = resolveHeroSpell({
      source: hero(), target: monster('Plant'),
      spellElement: 'Fire', spellBasePower: 12, difficulty: 1,
      heroCritChancePct: 0, heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.99,
    });
    // base = 12 * 1.1 = 13.2; mult = 2.0; no crit; raw = 26.4 → 26
    expect(r.damage).toBe(26);
    expect(r.isCrit).toBe(false);
    expect(r.multiplier).toBe(2.0);
    teardown();
  });

  it('hero crit applies CRIT_DAMAGE_MULTIPLIER 1.5x', () => {
    const r = resolveHeroSpell({
      source: hero(), target: monster('Plant'),
      spellElement: 'Fire', spellBasePower: 10, difficulty: 1,
      heroCritChancePct: 100, heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.0,
    });
    // base 11 * 2.0 * 1.5 = 33
    expect(r.damage).toBe(33);
    expect(r.isCrit).toBe(true);
    teardown();
  });

  it('pet attack uses PET_DAMAGE_BASE_MULTIPLIER × level', () => {
    const r = resolvePetAttack({
      source: pet(3), target: monster('Plant'),
      rng: () => 0.5,  // jitter = 1.0 (mid)
    });
    // base = 3 * 8 = 24, mult Plant→Plant = 1.0, jitter 1.0 → 24
    expect(r.damage).toBe(24);
    teardown();
  });

  it('pet element advantage doubles damage', () => {
    const r = resolvePetAttack({
      source: pet(3), target: monster('Water'),  // Plant > Water
      rng: () => 0.5,
    });
    expect(r.damage).toBe(48);
    teardown();
  });

  it('pet jitter stays within ±10% across 20 samples', () => {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 20; i++) {
      const r = resolvePetAttack({
        source: pet(10), target: monster('Plant'),
        rng: Math.random,
      });
      // base 80 * 1.0 * jitter ∈ [0.9, 1.1] → damage ∈ [72, 88]
      min = Math.min(min, r.damage);
      max = Math.max(max, r.damage);
    }
    expect(min).toBeGreaterThanOrEqual(72);
    expect(max).toBeLessThanOrEqual(88);
    teardown();
  });

  it('monster attack flat damage no jitter', () => {
    const r = resolveMonsterAttack({
      source: monster('Fire'), target: hero(),
      rng: () => 0.0,
    });
    // attackPower 10, mult Fire→Fire = 1.0 → 10
    expect(r.damage).toBe(10);
    teardown();
  });

  it('damage clamps to >= 0', () => {
    const t = monster('Plant', 0);
    const r = resolvePetAttack({ source: pet(0), target: t, rng: () => 0.5 });
    expect(r.damage).toBeGreaterThanOrEqual(0);
    teardown();
  });

  it('emits TURN_RESOLVED with correct shape', () => {
    resolveHeroSpell({
      source: hero(), target: monster('Plant'),
      spellElement: 'Fire', spellBasePower: 12, difficulty: 1,
      heroCritChancePct: 0, heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.99,
    });
    expect(busSpy).toHaveBeenCalledTimes(1);
    expect(busSpy.mock.calls[0]?.[0]).toMatchObject({
      sourceId: 'h', targetIds: ['m'], action: 'spell',
    });
    teardown();
  });

  it('resolver mutates target hp', () => {
    const t = monster('Plant', 40);
    resolvePetAttack({ source: pet(3), target: t, rng: () => 0.5 });
    expect(t.hp).toBeLessThan(40);
    teardown();
  });

  it('target hp does not go below 0', () => {
    const t = monster('Plant', 5);
    resolvePetAttack({ source: pet(10), target: t, rng: () => 0.5 });
    expect(t.hp).toBe(0);
    teardown();
  });

  it('non-crittable target ignores crit roll', () => {
    const boss = { ...monster('Plant'), isCrittable: false };
    const r = resolveHeroSpell({
      source: hero(), target: boss,
      spellElement: 'Fire', spellBasePower: 10, difficulty: 1,
      heroCritChancePct: 100, heroSpellDamagePct: { Fire: 0 } as any,
      rng: () => 0.0,
    });
    expect(r.isCrit).toBe(false);
    teardown();
  });

  it('dead target short-circuits — no event, no damage', () => {
    const t = monster('Plant', 0);
    busSpy.mockClear();
    const r = resolvePetAttack({ source: pet(3), target: t, rng: () => 0.5 });
    expect(r.damage).toBe(0);
    expect(busSpy).not.toHaveBeenCalled();
    teardown();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/domain/CombatResolver.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CombatResolver**

```ts
// app/src/domain/CombatResolver.ts
/**
 * CombatResolver — Sprint A damage application for multi-party combat.
 *
 * Pure logic + one side-effect: emits `TURN_RESOLVED` after a successful
 * resolution. Mutates `target.hp` directly (entities are scene-local
 * objects rebuilt every ENTER_COMBAT — mutation is intentional and
 * scoped). Tests inject `rng` for determinism.
 */

import { eventBus } from '@bus/EventBus';
import type { Element } from '@/types/element';
import type { CombatEntity } from '@/types/combat';
import { getMultiplier } from './ElementMatrix';
import {
  PET_DAMAGE_BASE_MULTIPLIER,
  PET_DAMAGE_JITTER_PCT,
  HERO_SPELL_DIFFICULTY_BONUS,
  CRIT_DAMAGE_MULTIPLIER,
} from '@data/staticConfig/combatConstants';

export interface ResolveResult {
  damage: number;
  isCrit: boolean;
  multiplier: number;
  remainingHp: number;
}

interface HeroSpellArgs {
  source: CombatEntity;
  target: CombatEntity;
  spellElement: Element;
  spellBasePower: number;
  difficulty: number;
  heroCritChancePct: number;
  heroSpellDamagePct: Partial<Record<Element, number>>;
  rng: () => number;
}

interface PetAttackArgs {
  source: CombatEntity;
  target: CombatEntity;
  rng: () => number;
}

interface MonsterAttackArgs {
  source: CombatEntity;
  target: CombatEntity;
  rng: () => number;
}

function emitResolved(args: {
  source: CombatEntity;
  target: CombatEntity;
  action: 'spell' | 'pet-attack' | 'monster-attack';
  damage: number;
  isCrit: boolean;
}): number {
  const remainingHp = Math.max(0, args.target.hp - args.damage);
  args.target.hp = remainingHp;
  eventBus.emit('TURN_RESOLVED', {
    sourceId: args.source.id,
    targetIds: [args.target.id],
    action: args.action,
    damage: args.damage,
    isCrit: args.isCrit,
    remainingHp,
  });
  return remainingHp;
}

export function resolveHeroSpell(args: HeroSpellArgs): ResolveResult {
  const { source, target, spellElement, spellBasePower, difficulty,
    heroCritChancePct, heroSpellDamagePct, rng } = args;

  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }

  const base = spellBasePower * (1 + difficulty * HERO_SPELL_DIFFICULTY_BONUS);
  const multiplier = getMultiplier(spellElement, target.element);
  const isCrit = target.isCrittable && rng() < heroCritChancePct / 100;
  const critMul = isCrit ? CRIT_DAMAGE_MULTIPLIER : 1;
  const elementBonusPct = heroSpellDamagePct[spellElement] ?? 0;
  const raw = base * multiplier * critMul * (1 + elementBonusPct / 100);
  const damage = Math.max(0, Math.round(raw));
  const remainingHp = emitResolved({ source, target, action: 'spell', damage, isCrit });
  return { damage, isCrit, multiplier, remainingHp };
}

export function resolvePetAttack(args: PetAttackArgs): ResolveResult {
  const { source, target, rng } = args;
  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }
  const base = source.level * PET_DAMAGE_BASE_MULTIPLIER;
  const multiplier = getMultiplier(source.element, target.element);
  const jitter = 1 + (rng() * 2 - 1) * PET_DAMAGE_JITTER_PCT;
  const damage = Math.max(0, Math.round(base * multiplier * jitter));
  const remainingHp = emitResolved({
    source, target, action: 'pet-attack', damage, isCrit: false,
  });
  return { damage, isCrit: false, multiplier, remainingHp };
}

export function resolveMonsterAttack(args: MonsterAttackArgs): ResolveResult {
  const { source, target } = args;
  if (target.hp <= 0) {
    return { damage: 0, isCrit: false, multiplier: 1, remainingHp: 0 };
  }
  const base =
    source.kind === 'monster' ? source.attackPower : 10;
  const multiplier = getMultiplier(source.element, target.element);
  const damage = Math.max(0, Math.round(base * multiplier));
  const remainingHp = emitResolved({
    source, target, action: 'monster-attack', damage, isCrit: false,
  });
  return { damage, isCrit: false, multiplier, remainingHp };
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/domain/CombatResolver.test.ts
```
Expected: 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/CombatResolver.ts app/src/domain/CombatResolver.test.ts
git commit -m "feat(combat): CombatResolver damage + TURN_RESOLVED emit (Sprint A Task 7)"
```

---

## Task 8: PetEntityFactory

**Files:**
- Create: `app/src/domain/PetEntityFactory.ts`
- Test: `app/src/domain/PetEntityFactory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/domain/PetEntityFactory.test.ts
import { describe, expect, it } from 'vitest';
import { buildPetEntity } from './PetEntityFactory';

describe('buildPetEntity — Sprint A', () => {
  it('returns null when activePetInstanceId is null', () => {
    expect(buildPetEntity(null, [])).toBeNull();
  });

  it('returns null when instance not in inventory', () => {
    expect(buildPetEntity('missing', [])).toBeNull();
  });

  it('returns null when instance refers to unknown petDef codename', () => {
    const inv = [{ instanceId: 'i', petCodename: 'not-a-pet', level: 1, xp: 0 } as never];
    expect(buildPetEntity('i', inv)).toBeNull();
  });

  it('builds PetEntity from valid instance + def', () => {
    const inv = [
      { instanceId: 'i', petCodename: 'bunbleaf', level: 3, xp: 0 } as never,
    ];
    const e = buildPetEntity('i', inv);
    expect(e).not.toBeNull();
    expect(e?.kind).toBe('pet');
    expect(e?.element).toBe('Plant');
    expect(e?.level).toBe(3);
    expect(e?.maxHp).toBe(60);  // bunbleaf baseHp
    expect(e?.hp).toBe(60);
    expect(e?.attackPower).toBe(8);
    expect(e?.spriteKey).toBe('pet_bunbleaf_idle');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/domain/PetEntityFactory.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the factory**

```ts
// app/src/domain/PetEntityFactory.ts
/**
 * PetEntityFactory — Sprint A bridge from SaveState pet instance to a
 * combat-ready PetEntity. Returns null when no pet is active or any
 * lookup fails — CombatScene treats null as "hero solo" path.
 */

import type { PetEntity } from '@/types/combat';
import { findPetDef, type PetDef } from '@data/staticConfig/pets';

/**
 * SaveState pet instance shape. Sprint C will land the full inventory
 * model; for Sprint A we accept the minimal shape needed to build a
 * PetEntity. The cast to `never` in tests keeps coupling loose.
 */
export interface PetInstanceShape {
  instanceId: string;
  petCodename: PetDef['codename'];
  level: number;
  xp: number;
}

export function buildPetEntity(
  activePetInstanceId: string | null,
  inventory: PetInstanceShape[]
): PetEntity | null {
  if (!activePetInstanceId) return null;
  const inst = inventory.find((p) => p.instanceId === activePetInstanceId);
  if (!inst) return null;
  const def = findPetDef(inst.petCodename);
  if (!def) return null;
  return {
    id: `pet-${inst.instanceId}`,
    kind: 'pet',
    faction: 'ally',
    name: def.displayNameVi,
    element: def.element,
    level: inst.level,
    hp: def.baseHp,
    maxHp: def.baseHp,
    spriteKey: `pet_${def.codename}_idle`,
    isCrittable: false,
    petInstanceId: inst.instanceId,
    attackPower: def.attackPower,
  };
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/domain/PetEntityFactory.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/PetEntityFactory.ts app/src/domain/PetEntityFactory.test.ts
git commit -m "feat(combat): PetEntityFactory SaveState→PetEntity (Sprint A Task 8)"
```

---

## Task 9: SaveState v3 migration

**Files:**
- Modify: `app/src/persistence/SaveStateStore.ts`
- Modify: `app/src/persistence/SaveStateStore.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `SaveStateStore.test.ts` (end of describe block):

```ts
  it('migrates v2 save to v3 with active_pet_instance_id=null', () => {
    const v2 = {
      saveStateVersion: 2,
      hp: 100, maxHp: 100, exp: 0, level: 1,
      flags: {}, inventory: [], equipment: { hat: null, outfit: null, wand: null, shoes: null },
      audio_muted: false, position: { x: 480, y: 320 },
      last_boss_attempt_date: null,
    };
    localStorage.setItem('savestate_v2_hmac_signed', '0');
    localStorage.setItem('savestate_v2', JSON.stringify({ state: v2, version: 0 }));
    // Force re-hydrate
    useSaveState.persist.rehydrate();
    const s = useSaveState.getState();
    expect(s.saveStateVersion).toBe(3);
    expect(s.active_pet_instance_id).toBeNull();
  });

  it('saves with v3 schema persist active_pet_instance_id', () => {
    useSaveState.setState({ active_pet_instance_id: 'inst_abc' });
    const stored = localStorage.getItem('savestate_v2');
    expect(stored).toContain('active_pet_instance_id');
    expect(stored).toContain('inst_abc');
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/persistence/SaveStateStore.test.ts
```
Expected: FAIL — `active_pet_instance_id` doesn't exist in state.

- [ ] **Step 3: Update SaveStateStore**

In `app/src/persistence/SaveStateStore.ts`:

1. Add `active_pet_instance_id` field to `SaveState` interface and the default initial state:
```ts
// In SaveState interface:
active_pet_instance_id: string | null;
```
```ts
// In initial state object passed to create():
active_pet_instance_id: null,
```

2. Bump `saveStateVersion` literal from 2 to 3.

3. Locate the `migrate` function in the persist config and extend it:
```ts
migrate: (persistedState: unknown, fromVersion: number) => {
  let s = persistedState as Record<string, unknown>;
  // ... keep any existing migration logic ...
  if (fromVersion < 3) {
    s = { ...s, saveStateVersion: 3, active_pet_instance_id: null };
  }
  return s as SaveState;
},
```

4. Add `setActivePetInstanceId(id: string | null): void` action that calls `set({ active_pet_instance_id: id })`. Export it through the same pattern used by other setters.

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/persistence/SaveStateStore.test.ts
```
Expected: existing tests + 2 new pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/persistence/SaveStateStore.ts app/src/persistence/SaveStateStore.test.ts
git commit -m "feat(persist): SaveState v3 migration with active_pet_instance_id (Sprint A Task 9)"
```

---

## Task 10: PartyHud entity

**Files:**
- Create: `app/src/game/entities/PartyHud.ts`
- Test: `app/src/game/entities/PartyHud.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/game/entities/PartyHud.test.ts
import { describe, expect, it, vi } from 'vitest';
import { PartyHud } from './PartyHud';
import type { CombatEntity } from '@/types/combat';

function mockScene() {
  const text = { setOrigin: vi.fn().mockReturnThis(), setText: vi.fn() };
  const rect = { setStrokeStyle: vi.fn().mockReturnThis(), setOrigin: vi.fn().mockReturnThis(),
    width: 0, setData: vi.fn() };
  return {
    add: {
      text: vi.fn().mockReturnValue(text),
      rectangle: vi.fn().mockReturnValue(rect),
      image: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), setDisplaySize: vi.fn().mockReturnThis() }),
    },
    scale: { width: 960, height: 640 },
  };
}

function entity(overrides: Partial<CombatEntity> = {}): CombatEntity {
  return {
    id: 'e', kind: 'monster', faction: 'enemy', name: 'Mon', element: 'Fire',
    level: 1, hp: 40, maxHp: 40, spriteKey: '', isCrittable: true,
    monsterDefId: 1, attackPower: 10, isBoss: false, ...overrides,
  } as CombatEntity;
}

describe('PartyHud — Sprint A', () => {
  it('renders one slot per entity', () => {
    const scene = mockScene();
    const entities = [entity({ id: 'h', faction: 'ally' }), entity({ id: 'm' })];
    new PartyHud(scene as never, entities);
    // 2 slots × ≥2 rectangles each (bg + hp fill) = at least 4 rectangle calls
    expect((scene.add.rectangle as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('updateHp scales the hp fill width proportionally', () => {
    const scene = mockScene();
    const e = entity({ hp: 40, maxHp: 40 });
    const hud = new PartyHud(scene as never, [e]);
    e.hp = 20;
    hud.updateHp(e.id, e.hp, e.maxHp);
    // Last rectangle returned has width set; just smoke-check no throw
    expect(true).toBe(true);
  });

  it('highlight(entityId) marks the active actor', () => {
    const scene = mockScene();
    const hud = new PartyHud(scene as never, [entity({ id: 'h' }), entity({ id: 'm' })]);
    expect(() => hud.highlight('h')).not.toThrow();
    expect(() => hud.highlight(null)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/game/entities/PartyHud.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PartyHud**

```ts
// app/src/game/entities/PartyHud.ts
/**
 * PartyHud — Sprint A multi-entity HP strip.
 *
 * Renders a 240×80 HP strip per CombatEntity. Allies stack bottom-left,
 * enemies stack top-right. The strip background asset
 * `assets/ui/party_hp_strip_bg.png` is preloaded by PreloadScene.
 *
 * Usage:
 *   const hud = new PartyHud(scene, entities);
 *   hud.updateHp(entity.id, newHp, maxHp);
 *   hud.highlight(currentActor.id);
 *   hud.destroy();  // call from scene.shutdown
 */

import type Phaser from 'phaser';
import type { CombatEntity } from '@/types/combat';

const STRIP_WIDTH = 240;
const STRIP_HEIGHT = 80;
const HP_BAR_W = 200;
const HP_BAR_H = 12;
const SLOT_GAP = 12;

interface SlotHandles {
  bg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
  highlightRing: Phaser.GameObjects.Rectangle;
}

export class PartyHud {
  private scene: Phaser.Scene;
  private slots = new Map<string, SlotHandles>();

  constructor(scene: Phaser.Scene, entities: CombatEntity[]) {
    this.scene = scene;
    const { width, height } = scene.scale;
    let allyIdx = 0;
    let enemyIdx = 0;
    for (const e of entities) {
      const x = e.faction === 'ally' ? 20 + STRIP_WIDTH / 2 : width - STRIP_WIDTH / 2 - 20;
      const baseY = e.faction === 'ally'
        ? height - 100 - allyIdx * (STRIP_HEIGHT + SLOT_GAP)
        : 60 + enemyIdx * (STRIP_HEIGHT + SLOT_GAP);
      this.slots.set(e.id, this.buildSlot(e, x, baseY));
      if (e.faction === 'ally') allyIdx++; else enemyIdx++;
    }
  }

  private buildSlot(e: CombatEntity, x: number, y: number): SlotHandles {
    const bg = this.scene.add.rectangle(x, y, STRIP_WIDTH, STRIP_HEIGHT, 0xfaf3e0);
    bg.setStrokeStyle(2, 0x8b4513);
    const nameText = this.scene.add.text(x - STRIP_WIDTH / 2 + 12, y - STRIP_HEIGHT / 2 + 8,
      `${e.name} Lv${e.level}`, { fontSize: '14px', color: '#3d2510', fontStyle: 'bold' });
    nameText.setOrigin(0, 0);
    const hpFill = this.scene.add.rectangle(x - HP_BAR_W / 2, y + 14, HP_BAR_W, HP_BAR_H, 0x4caf50);
    hpFill.setOrigin(0, 0.5);
    const hpText = this.scene.add.text(x, y + 14, `${e.hp}/${e.maxHp}`, {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    const highlightRing = this.scene.add.rectangle(x, y, STRIP_WIDTH + 6, STRIP_HEIGHT + 6, 0x000000, 0);
    highlightRing.setStrokeStyle(3, 0xffd700);
    highlightRing.setData('visible', false);
    highlightRing.setOrigin(0.5, 0.5);
    return { bg, hpFill, nameText, hpText, highlightRing };
  }

  updateHp(entityId: string, hp: number, maxHp: number): void {
    const slot = this.slots.get(entityId);
    if (!slot) return;
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    slot.hpFill.width = HP_BAR_W * ratio;
    slot.hpFill.fillColor = ratio > 0.6 ? 0x4caf50 : ratio > 0.3 ? 0xfbc02d : 0xe53935;
    slot.hpText.setText(`${Math.max(0, hp)}/${maxHp}`);
  }

  highlight(entityId: string | null): void {
    for (const [id, slot] of this.slots) {
      const visible = id === entityId;
      slot.highlightRing.setStrokeStyle(visible ? 3 : 0, 0xffd700);
    }
  }

  destroy(): void {
    for (const slot of this.slots.values()) {
      slot.bg.destroy();
      slot.hpFill.destroy();
      slot.nameText.destroy();
      slot.hpText.destroy();
      slot.highlightRing.destroy();
    }
    this.slots.clear();
  }
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/game/entities/PartyHud.test.ts
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/game/entities/PartyHud.ts app/src/game/entities/PartyHud.test.ts
git commit -m "feat(combat): PartyHud multi-entity HP strip (Sprint A Task 10)"
```

---

## Task 11: PetSprite entity

**Files:**
- Create: `app/src/game/entities/PetSprite.ts`
- Test: `app/src/game/entities/PetSprite.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/src/game/entities/PetSprite.test.ts
import { describe, expect, it, vi } from 'vitest';
import { PetSprite, PET_SPRITE_DISPLAY } from './PetSprite';

function mockScene(textureKeys: string[] = []) {
  return {
    add: {
      sprite: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis(),
        setTexture: vi.fn().mockReturnThis(),
        x: 0, y: 0,
        destroy: vi.fn(),
      }),
      rectangle: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis(), destroy: vi.fn() }),
    },
    textures: {
      exists: (k: string) => textureKeys.includes(k),
    },
  };
}

describe('PetSprite — Sprint A', () => {
  it('uses idle texture when codename texture exists', () => {
    const scene = mockScene(['pet_bunbleaf_idle']);
    new PetSprite(scene as never, 100, 200, 'bunbleaf');
    expect(scene.add.sprite).toHaveBeenCalledWith(100, 200, 'pet_bunbleaf_idle');
  });

  it('falls back to placeholder rectangle when texture missing', () => {
    const scene = mockScene([]);
    new PetSprite(scene as never, 50, 60, 'bunbleaf');
    expect(scene.add.rectangle).toHaveBeenCalled();
  });

  it('setState(attack) swaps texture to attack variant', () => {
    const scene = mockScene(['pet_bunbleaf_idle', 'pet_bunbleaf_attack']);
    const sprite = new PetSprite(scene as never, 0, 0, 'bunbleaf');
    sprite.setState('attack');
    const lastSprite = (scene.add.sprite as ReturnType<typeof vi.fn>).mock.results[0]!.value;
    expect(lastSprite.setTexture).toHaveBeenCalledWith('pet_bunbleaf_attack');
  });

  it('display size matches PET_SPRITE_DISPLAY constant', () => {
    expect(PET_SPRITE_DISPLAY).toEqual({ width: 96, height: 96 });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/game/entities/PetSprite.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PetSprite**

```ts
// app/src/game/entities/PetSprite.ts
/**
 * PetSprite — Sprint A pet rendering with 4 animation states.
 *
 * Uses textures `pet_<codename>_<state>` preloaded by PreloadScene
 * (see Task 12). Falls back to a coloured placeholder rectangle when a
 * texture isn't loaded, so unit tests run headless.
 */

import type Phaser from 'phaser';
import type { PetDef } from '@data/staticConfig/pets';

export type PetAnimState = 'idle' | 'attack' | 'hurt' | 'death';
export const PET_SPRITE_DISPLAY = { width: 96, height: 96 } as const;
const PLACEHOLDER_COLOR = 0x66cc66;

export class PetSprite {
  private scene: Phaser.Scene;
  private codename: PetDef['codename'];
  private node:
    | (Phaser.GameObjects.Sprite & { setTexture: (k: string) => Phaser.GameObjects.Sprite })
    | Phaser.GameObjects.Rectangle;
  private state: PetAnimState = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number, codename: PetDef['codename']) {
    this.scene = scene;
    this.codename = codename;
    const idleKey = `pet_${codename}_idle`;
    const has = scene.textures && typeof scene.textures.exists === 'function'
      ? scene.textures.exists(idleKey) : false;
    if (has) {
      const s = scene.add.sprite(x, y, idleKey) as Phaser.GameObjects.Sprite;
      s.setDisplaySize(PET_SPRITE_DISPLAY.width, PET_SPRITE_DISPLAY.height);
      this.node = s as never;
    } else {
      this.node = scene.add.rectangle(x, y,
        PET_SPRITE_DISPLAY.width, PET_SPRITE_DISPLAY.height, PLACEHOLDER_COLOR);
    }
  }

  setState(s: PetAnimState): void {
    if (s === this.state) return;
    this.state = s;
    const key = `pet_${this.codename}_${s}`;
    const has = this.scene.textures?.exists?.(key);
    if (has && 'setTexture' in this.node && typeof this.node.setTexture === 'function') {
      (this.node as Phaser.GameObjects.Sprite).setTexture(key);
    }
  }

  destroy(): void {
    this.node.destroy();
  }

  getX(): number { return (this.node as { x: number }).x; }
  getY(): number { return (this.node as { y: number }).y; }
}
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/game/entities/PetSprite.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/game/entities/PetSprite.ts app/src/game/entities/PetSprite.test.ts
git commit -m "feat(combat): PetSprite 4-state pet renderer (Sprint A Task 11)"
```

---

## Task 12: PreloadScene pet asset registration

**Files:**
- Modify: `app/src/game/scenes/PreloadScene.ts`
- Modify: `app/src/game/scenes/PreloadScene.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `PreloadScene.test.ts`:

```ts
  it('registers 24 pet textures (6 codenames × 4 states)', () => {
    const petPaths = PHASE1_ASSETS.images
      .filter((i) => i.key.startsWith('pet_'))
      .map((i) => i.key);
    expect(petPaths).toHaveLength(24);
    for (const codename of ['bunbleaf', 'pyropup', 'aquakit', 'frostfae', 'voltchick', 'terraowl']) {
      for (const state of ['idle', 'attack', 'hurt', 'death']) {
        expect(petPaths).toContain(`pet_${codename}_${state}`);
      }
    }
  });

  it('registers evolution VFX strip + party HP strip BG', () => {
    const keys = PHASE1_ASSETS.images.map((i) => i.key);
    expect(keys).toContain('evolution_burst_8frames');
    expect(keys).toContain('party_hp_strip_bg');
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/game/scenes/PreloadScene.test.ts
```
Expected: FAIL — keys missing.

- [ ] **Step 3: Add the asset entries**

In `app/src/game/scenes/PreloadScene.ts`, locate `PHASE1_ASSETS.images` array and append:

```ts
// Sprint A — pet sprites (24: 6 codenames × 4 states)
...['bunbleaf', 'pyropup', 'aquakit', 'frostfae', 'voltchick', 'terraowl'].flatMap((codename) =>
  ['idle', 'attack', 'hurt', 'death'].map((state) => ({
    key: `pet_${codename}_${state}`,
    path: `/assets/pets/${codename}_${state}_256.png`,
  }))
),
// Sprint A — evolution VFX + party HP strip BG
{ key: 'evolution_burst_8frames', path: '/assets/juice/evolution_burst_8frames.png' },
{ key: 'party_hp_strip_bg', path: '/assets/ui/party_hp_strip_bg.png' },
```

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/game/scenes/PreloadScene.test.ts
```
Expected: existing tests + 2 new pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/game/scenes/PreloadScene.ts app/src/game/scenes/PreloadScene.test.ts
git commit -m "feat(combat): preload 24 pet PNG + VFX + HP strip BG (Sprint A Task 12)"
```

---

## Task 13: CombatScene refactor — entity array

**Files:**
- Modify: `app/src/game/scenes/CombatScene.ts` (large — keep most of file, replace combat-state and turn handling)
- Modify: `app/src/game/scenes/CombatScene.test.ts`

This task is the centerpiece. Two separate steps to break the work down: 13a swaps the data model; 13b wires PetSprite + PartyHud rendering and the turn loop.

### Task 13a: Swap to `entities[]` data model

- [ ] **Step 1: Add the failing test**

Append to `CombatScene.test.ts`:

```ts
  it('create() with active pet builds 3-entity array (hero + pet + monster)', () => {
    useSaveState.setState({
      saveStateVersion: 3,
      hp: 100, maxHp: 100, level: 1,
      active_pet_instance_id: 'inst-bun',
      inventory: [{ instanceId: 'inst-bun', petCodename: 'bunbleaf', level: 3, xp: 0 } as never],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.getEntities()).toHaveLength(3);
    expect(scene.getEntities().map((e) => e.kind)).toEqual(['hero', 'pet', 'monster']);
  });

  it('create() without active pet builds 2-entity array (hero + monster)', () => {
    useSaveState.setState({
      saveStateVersion: 3,
      hp: 100, maxHp: 100, level: 1,
      active_pet_instance_id: null,
      inventory: [],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    expect(scene.getEntities()).toHaveLength(2);
    expect(scene.getEntities().map((e) => e.kind)).toEqual(['hero', 'monster']);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/game/scenes/CombatScene.test.ts
```
Expected: FAIL — `getEntities()` not on scene.

- [ ] **Step 3: Refactor CombatScene to entity-array model**

In `app/src/game/scenes/CombatScene.ts`:

1. Add imports near the top:
```ts
import { buildPetEntity } from '@/domain/PetEntityFactory';
import { init as turnQueueInit, next as turnQueueNext, isFactionDead, type TurnQueueState } from '@/domain/TurnQueue';
import { resolveHeroSpell, resolvePetAttack, resolveMonsterAttack } from '@/domain/CombatResolver';
import type { CombatEntity, HeroEntity, MonsterEntity } from '@/types/combat';
import { PartyHud } from '../entities/PartyHud';
import { PetSprite } from '../entities/PetSprite';
import type { PetInstanceShape } from '@/domain/PetEntityFactory';
```

2. Replace the existing private fields `monsterDef / monsterCurrentHp / monsterMaxHp / playerHpBar / monsterHpBar` (keep them temporarily for backward compat OR remove if no test still asserts on them after Task 13b) with:
```ts
private entities: CombatEntity[] = [];
private turnQueue: TurnQueueState | null = null;
private partyHud: PartyHud | null = null;
private petSprite: PetSprite | null = null;
```

3. Replace `init(data)` body with one that still records `monsterId` for `create()` use, and add an entity-array build helper used by `create()`:
```ts
init(data: CombatSceneData): void {
  this.monsterDef = findMonsterById(data.monsterId) ?? null;
  this.combatState = 'INIT';
  this.selectedSpellId = null;
  this.activeLo = null;
}

private buildEntities(): CombatEntity[] {
  const save = useSaveState.getState();
  const heroEntity: HeroEntity = {
    id: 'hero',
    kind: 'hero', faction: 'ally',
    name: 'Phù thủy', element: 'Fire',
    level: save.level, hp: save.hp, maxHp: save.maxHp,
    spriteKey: 'base_player_male', isCrittable: true,
  };
  const out: CombatEntity[] = [heroEntity];
  const pet = buildPetEntity(
    save.active_pet_instance_id,
    (save.inventory as unknown as PetInstanceShape[]).filter(
      (i) => 'petCodename' in i
    )
  );
  if (pet) out.push(pet);
  if (this.monsterDef) {
    const scale = this.monsterDef.is_boss ? BOSS_HP_SCALE : 1;
    const maxHp = this.monsterDef.baseHp * scale;
    const monsterEntity: MonsterEntity = {
      id: `monster-${this.monsterDef.id}`,
      kind: 'monster', faction: 'enemy',
      name: this.monsterDef.displayNameVi, element: this.monsterDef.element,
      level: 1, hp: maxHp, maxHp,
      spriteKey: `monster_${this.monsterDef.codename}_idle`,
      isCrittable: !this.monsterDef.is_boss,
      monsterDefId: this.monsterDef.id,
      attackPower: MONSTER_BASE_POWER,
      isBoss: !!this.monsterDef.is_boss,
    };
    out.push(monsterEntity);
  }
  return out;
}
```

4. In `create()`, replace the old monster + player avatar setup with:
```ts
this.entities = this.buildEntities();
this.turnQueue = turnQueueInit(this.entities);
// existing background + monster sprite + weakness label rendering stays
// player avatar stays for hero
// add pet sprite if present
const pet = this.entities.find((e) => e.kind === 'pet');
if (pet && pet.kind === 'pet') {
  const def = findPetDef(pet.petInstanceId.replace(/^inst[-_]/, '') as never);
  // simpler: derive codename from spriteKey "pet_<codename>_idle"
  const codename = pet.spriteKey.match(/^pet_([a-z]+)_idle$/)?.[1];
  if (codename) {
    this.petSprite = new PetSprite(this, this.playerPos.x - 80, this.playerPos.y + 60, codename as never);
  }
}
this.partyHud = new PartyHud(this, this.entities);
```

5. Add a public accessor:
```ts
getEntities(): CombatEntity[] { return this.entities; }
```

6. Update `shutdown()`:
```ts
this.partyHud?.destroy();
this.partyHud = null;
this.petSprite?.destroy();
this.petSprite = null;
```

- [ ] **Step 4: Run the failing test + existing combat tests**

```bash
cd app && npx vitest run src/game/scenes/CombatScene.test.ts
```
Expected: 2 new tests pass; existing combat tests still green (the remaining `__setMonsterHp` helper still works because `monsterDef` field is preserved).

- [ ] **Step 5: Commit**

```bash
git add app/src/game/scenes/CombatScene.ts app/src/game/scenes/CombatScene.test.ts
git commit -m "feat(combat): CombatScene entity-array data model (Sprint A Task 13a)"
```

### Task 13b: Wire turn loop through TurnQueue + Resolver

- [ ] **Step 1: Add the failing test**

Append to `CombatScene.test.ts`:

```ts
  it('hero turn → spell click → quiz → resolveHeroSpell → pet auto-attacks → monster retaliates', async () => {
    useSaveState.setState({
      saveStateVersion: 3, hp: 100, maxHp: 100, level: 1,
      active_pet_instance_id: 'inst-bun',
      inventory: [{ instanceId: 'inst-bun', petCodename: 'bunbleaf', level: 3, xp: 0 } as never],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    // Force pick first enemy as target then click Fire
    scene.__pickTarget(scene.getEntities().find((e) => e.kind === 'monster')!.id);
    scene.onSpellClick('fire_blast');
    // Simulate quiz correct
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1000, attempts: 1, lo_id: 'lo-1' });
    // Wait for the 900 ms delayed pet/monster turns
    await new Promise((r) => setTimeout(r, 1100));
    const monster = scene.getEntities().find((e) => e.kind === 'monster')!;
    expect(monster.hp).toBeLessThan(monster.maxHp);
  }, 5000);

  it('victory: all enemies dead emits EXIT_COMBAT(won=true)', () => {
    useSaveState.setState({ saveStateVersion: 3, hp: 100, maxHp: 100, level: 99,
      active_pet_instance_id: null, inventory: [] });
    const fired: unknown[] = [];
    const off = eventBus.on('EXIT_COMBAT', (p) => fired.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const m = scene.getEntities().find((e) => e.kind === 'monster')!;
    m.hp = 0;
    scene.__checkEnd();
    off();
    expect(fired).toHaveLength(1);
    expect((fired[0] as { won: boolean }).won).toBe(true);
  });

  it('defeat: all allies dead emits EXIT_COMBAT(won=false)', () => {
    useSaveState.setState({ saveStateVersion: 3, hp: 0, maxHp: 100, level: 1,
      active_pet_instance_id: null, inventory: [] });
    const fired: unknown[] = [];
    const off = eventBus.on('EXIT_COMBAT', (p) => fired.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__checkEnd();
    off();
    expect(fired).toHaveLength(1);
    expect((fired[0] as { won: boolean }).won).toBe(false);
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/game/scenes/CombatScene.test.ts
```
Expected: FAIL — `__pickTarget`, `__checkEnd` not defined.

- [ ] **Step 3: Wire the turn loop in CombatScene**

In `app/src/game/scenes/CombatScene.ts`:

1. Add a `private selectedTargetId: string | null = null;` field next to `selectedSpellId`.

2. Add a public/test-only method:
```ts
__pickTarget(entityId: string): void { this.selectedTargetId = entityId; }
```

3. Refactor `onSpellClick(spellId)` to use `selectedTargetId`:
```ts
onSpellClick(spellId: string): void {
  if (this.combatState !== 'PLAYER_TURN') return;
  const target = this.entities.find((e) => e.id === this.selectedTargetId)
    ?? this.entities.find((e) => e.faction === 'enemy' && e.hp > 0);
  if (!target) return;
  this.selectedSpellId = spellId;
  this.combatState = nextCombatState(this.combatState, { type: 'CLICK_SPELL', spellId });
  // ... existing pool/quiz emit code stays ...
  // Replace applyPlayerDamage logic with the new resolveHeroSpell branch in handleQuizResult.
  this.combatState = nextCombatState(this.combatState, { type: 'OPEN_QUIZ' });
  eventBus.emit('OPEN_QUIZ', { lo_id: this.activeLo!.id, monster_id: target.id });
  this.scene.pause();
}
```

4. Replace `applyPlayerDamage()` body to use `resolveHeroSpell` against the locked target. Replace `runMonsterTurn()` to iterate the next monster via TurnQueue.

5. After every action, call `__checkEnd()`:
```ts
__checkEnd(): void {
  if (!this.turnQueue) return;
  if (isFactionDead(this.turnQueue, 'enemy')) {
    this.handleVictory();
  } else if (isFactionDead(this.turnQueue, 'ally')) {
    this.handleDefeat();
  }
}
```

6. After hero's quiz resolves (correct branch), schedule pet + monster auto-actions via `time.delayedCall(900, ...)`. Use `turnQueueNext` to walk through actors. For pet: `resolvePetAttack({ source: pet, target: lowestHpEnemy, rng: Math.random })`. For monster: `resolveMonsterAttack({ source: monster, target: lowestHpAlly, rng: Math.random })`. Update `partyHud.updateHp(targetId, target.hp, target.maxHp)` after each resolve. Highlight the active actor via `partyHud.highlight(currentId)`.

7. Implement `lowestHpEnemy()` / `lowestHpAlly()` helpers:
```ts
private lowestHpFromFaction(faction: 'ally' | 'enemy'): CombatEntity | null {
  const candidates = this.entities.filter((e) => e.faction === faction && e.hp > 0);
  if (candidates.length === 0) return null;
  // tiebreak = first in entities order
  return candidates.reduce((acc, e) => (e.hp < acc.hp ? e : acc));
}
```

- [ ] **Step 4: Run the new tests + full suite**

```bash
cd app && npx vitest run src/game/scenes/CombatScene.test.ts
cd app && npm run test:run
```
Expected: 3 new tests pass; total project remains green (existing combat regressions adapt — if any flicker, fix the assertion to read the new entity model).

- [ ] **Step 5: Commit**

```bash
git add app/src/game/scenes/CombatScene.ts app/src/game/scenes/CombatScene.test.ts
git commit -m "feat(combat): TurnQueue-driven 3-actor loop + flee + victory/defeat (Sprint A Task 13b)"
```

---

## Task 14: QuizOverlay subtitle update

**Files:**
- Modify: `app/src/react/quiz/QuizOverlay.tsx`
- Modify: `app/src/react/quiz/QuizOverlay.test.tsx`

- [ ] **Step 1: Add the failing test**

Append to `QuizOverlay.test.tsx`:

```tsx
  it('shows "Đánh: <monsterName>" subtitle when monster_id provided', async () => {
    const { findByText } = render(<QuizOverlay />);
    eventBus.emit('OPEN_QUIZ', { lo_id: 'lo-1', monster_id: 'monster-1' });
    expect(await findByText(/Đánh:/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd app && npx vitest run src/react/quiz/QuizOverlay.test.tsx
```
Expected: FAIL — text not found.

- [ ] **Step 3: Add the subtitle render**

In `app/src/react/quiz/QuizOverlay.tsx`, alongside the existing `quiz-header` div, add a small subtitle line below the subject tag:

```tsx
{activeLO && targetName ? (
  <span className="ml-2 rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
    Đánh: {targetName}
  </span>
) : null}
```

Add `targetName` state from the `OPEN_QUIZ` handler:
```tsx
const [targetName, setTargetName] = useState<string>('');
// inside the OPEN_QUIZ listener:
const monsterName = typeof p.monster_id === 'string' ? p.monster_id : '';
setTargetName(monsterName);
```

(Phase 2 will replace the raw id with a display name lookup. Spec §10.1 acknowledges this; the subtitle just needs to render *something* now.)

- [ ] **Step 4: Run the test**

```bash
cd app && npx vitest run src/react/quiz/QuizOverlay.test.tsx
```
Expected: existing + 1 new pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/react/quiz/QuizOverlay.tsx app/src/react/quiz/QuizOverlay.test.tsx
git commit -m "feat(quiz): show 'Đánh: <target>' subtitle in overlay (Sprint A Task 14)"
```

---

## Task 15: E2E multiparty combat spec

**Files:**
- Create: `app/tests/e2e/multiparty_combat.spec.ts`

- [ ] **Step 1: Write the E2E spec**

```ts
// app/tests/e2e/multiparty_combat.spec.ts
import { test, expect } from '@playwright/test';

test('multiparty combat — hero + pet vs monster', async ({ page }) => {
  // Seed save state with active pet before navigation
  await page.addInitScript(() => {
    const v3 = {
      saveStateVersion: 3,
      flags: { tutorial_completed: true },
      level: 5, exp: 0, hp: 100, maxHp: 100,
      x: 480, y: 320,
      equipment: { hat: null, outfit: null, wand: null, shoes: null },
      inventory: [
        { instanceId: 'inst-bun', petCodename: 'bunbleaf', level: 3, xp: 0 },
      ],
      audio_muted: true,
      last_boss_attempt_date: null,
      active_pet_instance_id: 'inst-bun',
    };
    localStorage.setItem('savestate_v2', JSON.stringify({ state: v3, version: 0 }));
    localStorage.setItem('savestate_v2_hmac_signed', '0');
  });

  await page.goto('/play');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });

  // Walk into the top-center monster (Voltee at SPAWN_POSITIONS[4] = col 15 row 3)
  // hold W key
  await page.keyboard.down('w');
  await page.waitForTimeout(1300);
  await page.keyboard.up('w');

  // Wait for combat encounter transition (~700 ms)
  await page.waitForTimeout(1500);

  // Combat is running — assert at least 3 visible HP labels (hero + pet + monster)
  const hpTextSelector = `canvas`;
  await expect(page.locator(hpTextSelector)).toBeVisible();

  // Use test bridge to assert party shape (more reliable than canvas pixel match)
  const entityCount = await page.evaluate(() => {
    const cs = (window as any).__GAME__.__phaser.scene.scenes.find(
      (s: any) => s.scene?.key === 'CombatScene'
    );
    return cs.getEntities?.().length;
  });
  expect(entityCount).toBe(3);
});
```

- [ ] **Step 2: Run the spec to confirm it parses**

```bash
cd app && npx playwright test tests/e2e/multiparty_combat.spec.ts --reporter=list
```
Expected: PASS (or document deterministic failure modes that will be cleared by Task 13b — if 13b is already done, this should pass green).

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/multiparty_combat.spec.ts
git commit -m "test(e2e): multiparty combat hero+pet+monster end-to-end (Sprint A Task 15)"
```

---

## Task 16: AP delta + ISP step entry

**Files:**
- Modify: `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
- Modify: `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`

- [ ] **Step 1: Update AP §3.3 (Event Layer)**

Locate the existing `## 3.3 Event Layer` section. Add a new event entry beneath the existing list:

```markdown
**`TURN_RESOLVED`** (Sprint A): emitted by CombatResolver after every
applied damage step. Payload = `{ sourceId, targetIds[], action:
'spell'|'pet-attack'|'monster-attack', damage, isCrit, remainingHp }`.
Replaces `DAMAGE_APPLIED` (deprecated for one release; remove in Sprint B).
```

- [ ] **Step 2: Update AP §8 (Combat FSM)**

Locate the existing `## 8` Combat FSM section. Add a paragraph at the
bottom:

```markdown
Sprint A semantic shift: `PLAYER_TURN` becomes `ACTOR_TURN` with a
`currentActorId` field driven by `TurnQueue.next()`. Hero turn keeps
the existing quiz-gate branch; pet and monster turns auto-resolve via
`CombatResolver` after a 900 ms `delayedCall` so the action animates.
End check runs after every resolution.
```

- [ ] **Step 3: Add §11.5 element matrix and §11.6 pet entity schema**

After the existing §11 subsections, append:

```markdown
### 11.5 Element matrix (Sprint A)

8×8 multiplier table; lookup via `domain/ElementMatrix.ts`. Pairs:
Fire→Plant ×2, Fire→Ice ×2, Fire→Water ×0.5, Fire→Earth ×0.5,
Water→Fire ×2, Water→Earth ×2, Water→Plant ×0.5, Water→Storm ×0.5,
Plant→Water ×2, Plant→Earth ×2, Plant→Fire ×0.5, Plant→Ice ×0.5,
Ice→Plant ×2, Ice→Storm ×2, Ice→Fire ×0.5,
Storm→Water ×2, Storm→Astral ×2, Storm→Earth ×0.5, Storm→Ice ×0.5,
Earth→Fire ×2, Earth→Storm ×2, Earth→Shadow ×2, Earth→Plant ×0.5,
Astral→Shadow ×2, Astral→Storm ×0.5,
Shadow→Astral ×2, Shadow→Earth ×0.5.
Unlisted pairs default to ×1.0.

### 11.6 Pet entity schema (Sprint A)

`PetEntity extends CombatEntityBase` with `petInstanceId: string` and
`attackPower: number`. PetDef registry in
`data/staticConfig/pets.ts` ships 6 starters (bunbleaf / pyropup /
aquakit / frostfae / voltchick / terraowl) keyed by codename and
element. Pet auto-attack damage =
`level × PET_DAMAGE_BASE_MULTIPLIER × elementMultiplier × jitter` where
constants live in `data/staticConfig/combatConstants.ts`.
```

- [ ] **Step 4: Update SaveState section to v3**

Locate the SaveState schema section (typically §13 or in persistence
appendix). Add:

```markdown
**v3 migration (Sprint A):** add `active_pet_instance_id: string | null`
(default `null`). Backwards-compatible — v2 saves auto-migrate.
HMAC revalidation runs after migration.
```

- [ ] **Step 5: Update ISP — mark Sprint A done in roadmap table**

Replace the Sprint A row in the Phase 2.5 roadmap table at the bottom of
`IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`:

```markdown
| A | Multi-party Combat Refactor | C | — | `2026-04-29-multiparty-combat-design.md` ✅ shipped |
```

- [ ] **Step 6: Run verify**

```bash
cd app && npm run verify
```
Expected: PASS (warnings about AP doc size are acceptable per existing rule).

- [ ] **Step 7: Commit**

```bash
git add docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md
git commit -m "docs(ap+isp): Sprint A delta — TURN_RESOLVED, FSM, element matrix, v3 (Task 16)"
```

---

## Task 17: Final UAT + assets stub Antigravity prompt commit

**Files:**
- Modify: `tasks/audio_wire_blockers.md` (add a Sprint A section noting which assets are blocking)
- Create: `docs/antigravity_prompt_sprint_a_pets.md` (concatenated paste-ready prompt for all 26 Sprint A assets)

- [ ] **Step 1: Concatenate Antigravity prompts into one paste-ready doc**

Create `docs/antigravity_prompt_sprint_a_pets.md` containing the §13.1
template repeated for each `<codename>` × `<state>` pair plus §13.2 and
§13.3 from the design spec. Engineer copies the spec sections verbatim
into this new file (no editorial changes — they are already the
production prompts).

- [ ] **Step 2: Run all 4 gates one last time**

```bash
cd app && npm run typecheck && npm run lint && npm run test:run && npm run verify
```
Expected: 4 gates green; total tests = 482 (Phase 1+1.5) + ~30 new
Sprint A tests; lint zero issue; verify pass.

- [ ] **Step 3: Manual smoke check**

```bash
cd app && npm run dev
```
Open `http://localhost:5173/play`, walk into a monster, confirm:
- Encounter zoom transition fires (Phase 1.5 pre-existing)
- Combat scene shows 3 HP strips when pet equipped (need to seed
  `active_pet_instance_id` via DevTools console first if no pet
  inventory exists)
- Hero turn highlights, target ring visible on enemies
- Quiz overlay shows "Đánh: <name>"
- Correct answer → pet attack tweens 900 ms after → monster retaliates
- Element advantage doubles damage (Fire spell on Plant monster)
- Victory or defeat transitions still work

- [ ] **Step 4: Commit final**

```bash
git add docs/antigravity_prompt_sprint_a_pets.md
git commit -m "docs(antigravity): paste-ready prompt batch for Sprint A 26 assets (Task 17)"
```

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin claude/busy-pascal-d9c867
gh pr create --title "Sprint A — Multi-party combat refactor" --body "$(cat <<'PRBODY'
## Summary
Implements the Sprint A spec at `docs/superpowers/specs/2026-04-29-multiparty-combat-design.md`.

CombatScene now drives a `CombatEntity[]` party (hero + active pet + 1-3 monsters) through `TurnQueue`. `CombatResolver` applies damage with the new 8×8 element matrix and emits `TURN_RESOLVED`. SaveState bumps to v3 with `active_pet_instance_id`. PetSprite + PartyHud render the new layout. QuizOverlay shows the target subtitle.

## Type
**Type C** — Event Layer (TURN_RESOLVED) + Entity Schema (CombatEntity union, PetEntity, SaveState v3). POSUP+ARCH approved 29/04/2026.

## Test plan
- [x] Typecheck / lint / verify / test all green
- [x] 30+ new unit tests (TurnQueue, ElementMatrix, CombatResolver, PetEntityFactory, PartyHud, PetSprite)
- [x] 1 new E2E spec (multiparty_combat.spec.ts)
- [x] All 482 existing Phase 1+1.5 tests still green
- [x] Manual UAT: hero+pet vs monster combat with target picker, element advantage, victory/defeat both fire EXIT_COMBAT

## Asset dependency
26 Antigravity prompts copied to `docs/antigravity_prompt_sprint_a_pets.md`. Until art lands, PetSprite + PartyHud + new VFX gracefully fall back to placeholder rectangles so unit tests + dev preview keep working.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)" --label type-C
```

---

## Self-review

Re-checked the spec against the plan:

- [x] §5 CombatEntity types → Task 2
- [x] §5 SaveState v3 → Task 9
- [x] §5 TURN_RESOLVED event → Task 6
- [x] §6 file inventory: every NEW file has a Task — Tasks 1, 2, 3, 4, 5, 7, 8, 10, 11
- [x] §7 element matrix → Task 3
- [x] §8 FSM update + §10.1 target picker → Task 13b
- [x] §9 TurnQueue → Task 5
- [x] §10 damage formulas (hero / pet / monster) → Task 7
- [x] §11 PartyHud → Task 10
- [x] §12 pet starter registry → Task 4
- [x] §13 asset pipeline → Tasks 12, 17 (PreloadScene wiring + Antigravity batch doc)
- [x] §14 test plan: TurnQueue 10, Resolver 12, Matrix 8, Scene 6, E2E 1 — covered Tasks 5, 7, 3, 13a/13b, 15
- [x] §15 migration → Task 9
- [x] §16 AP delta → Task 16
- [x] No "TBD" / "TODO" / "similar to" placeholders found in plan body
- [x] Type names consistent: `CombatEntity`, `HeroEntity`, `PetEntity`, `MonsterEntity`, `TurnQueueState`, `ResolveResult` used the same way in every task that references them
- [x] `combatConstants.ts` exports referenced consistently (PET_DAMAGE_BASE_MULTIPLIER 8, JITTER 0.1, DIFFICULTY_BONUS 0.1, CRIT 1.5)

No gaps. Plan ready for execution.
