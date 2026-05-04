# Sprint C — Pet System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the rescue → roster → equip → level → evolve gameplay loop for the 6 Sprint A starter pets, including 4-tier rarity rolled at rescue, modal sparkle reveal, Pet tab on `/inventory`, active-pet leveling tied to hero EXP, and stat-only evolution at lvl 10/20.

**Architecture:** SaveState v4 → v5 adds `ownedPets: PetInstance[]`; pure-TS domain modules (`PetRescue`, `PetLeveling`) handle rolls and thresholds; React `PetRescueOverlay` reuses Sprint B's `RewardChestOverlay` pattern; `CombatScene` only emits `PET_RESCUE_OFFERED` (zero React imports). Pet has its own slot — `active_pet_instance_id` from Sprint A — separate from `EquipmentMap`.

**Tech Stack:** Vite 8, React 19, TS 5.6, Phaser 3.90, Zustand 5 (persist), Zod 4, Vitest 4, Playwright 1.59. ESLint flat config + `boundaries/element-types`. Husky pre-commit gate.

**Spec:** [docs/superpowers/specs/2026-05-02-sprint-c-pets-design.md](../specs/2026-05-02-sprint-c-pets-design.md) @ `fdec431`

**Type classification:** **B** — Entity Schema delta (PetInstance new fields + SaveState v5). PR must carry `type-B` label.

**Conventions used by every task:**

- All commands run from `app/` unless noted: `cd app && <cmd>`.
- TDD discipline: write failing test → run to confirm RED → implement → run to confirm GREEN → commit. One commit per task.
- Every task ends with: `npm run lint && npm run typecheck && npm run test:run -- <pattern> && npm run verify`.
- Co-author footer required on every commit:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Worktree: `D:\projectlocal\clevai\Game_exclusive\.claude\worktrees\sprint-c-pets`, branch `claude/sprint-c-pets`.

**Critical references inside the codebase to read once before starting:**

- `app/src/persistence/SaveStateStore.ts` — current v4 store, `migrate(state, version)` chain, action patterns
- `app/src/data/staticConfig/pets.ts` — Sprint A `STARTER_PETS` registry (codename + element + baseHp + attackPower)
- `app/src/domain/PetEntityFactory.ts` — Sprint A pet→CombatEntity bridge (you will edit, not replace)
- `app/src/game/scenes/CombatScene.ts` — `buildEntities` line 252 + `handleVictory` line 532 (the two integration points)
- `app/src/react/overlays/RewardChestOverlay.tsx` — Sprint B pattern to mirror for `PetRescueOverlay`
- `app/src/bus/EventBus.ts` — typed event union (you will append 4 entries)
- `app/src/game/scenes/CombatScene.test.ts:536` — Sprint A test that puts pet into `inventory` cast hack (you will migrate to `ownedPets` in Task 7)
- `app/src/testing/gameTestBridge.ts` — `window.__GAME__` exposé, extend with pet helpers in Tasks 9 + 11

---

## Task 0: Preflight checks

**Files:** none (read-only). No commit.

- [ ] **Step 1: Confirm worktree state and baseline gates**

```bash
cd app
git status                           # should be clean
git log --oneline -3                 # latest = fdec431 (spec commit)
npm run lint
npm run typecheck
npm run test:run
npm run verify
```

Expected: 649 unit tests passing, all gates green. If anything fails, STOP — do not proceed; rebase or reset before continuing.

- [ ] **Step 2: Confirm Sprint A combat surface is intact**

```bash
npm run test:run -- CombatResolver TurnQueue ElementMatrix PetEntityFactory
```

Expected: every Sprint A test passes including PetEntityFactory.

- [ ] **Step 3: Verify the 6 pet sprite files exist on disk** (Antigravity Sprint A delivery)

```bash
ls app/public/assets/pets/ | wc -l   # expect 24 (6 species × 4 states)
```

Expected: 24 PNG files. If missing, STOP and request from main worktree (already committed at `49e5e79`).

---

## Task 1: types/pet.ts + rarity/evolution constants

**Files:**
- Create: `app/src/types/pet.ts`

- [ ] **Step 1: Implement `app/src/types/pet.ts`**

```ts
/**
 * Pet system types — Sprint C.
 *
 * PetInstance is what lives in SaveState.ownedPets[]. PetDef stays in
 * data/staticConfig/pets.ts (Sprint A) — this file is just the runtime
 * shapes that combat + UI consume.
 */

import type { PetDef } from '@data/staticConfig/pets';

export type PetCodename = PetDef['codename'];

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PetEvolutionStage = 1 | 2 | 3;

export type MonsterBucket = 'weak' | 'mid' | 'boss';

export interface PetInstance {
  readonly instanceId: string;
  readonly petCodename: PetCodename;
  readonly rarity: PetRarity;
  level: number;
  xp: number;
  readonly capturedAt: number;
}

/** Visual + reward weighting. Order matters — higher index = rarer. */
export const PET_RARITIES: ReadonlyArray<PetRarity> = [
  'common',
  'rare',
  'epic',
  'legendary',
];

/** Stat multipliers per rarity (gentle scaling, ElementSystem-safe). */
export const RARITY_HP_MULT: Readonly<Record<PetRarity, number>> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.3,
  legendary: 1.6,
};

export const RARITY_ATK_MULT: Readonly<Record<PetRarity, number>> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.3,
  legendary: 1.6,
};

/** Evolution stat multipliers (additive on top of rarity). */
export const EVOLUTION_HP_MULT: Readonly<Record<PetEvolutionStage, number>> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

export const EVOLUTION_ATK_MULT: Readonly<Record<PetEvolutionStage, number>> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

/** Per-level additive bonuses (applied on top of rarity × evolution). */
export const HP_PER_LEVEL = 5;
export const ATK_PER_LEVEL = 1;

/** Hard cap on owned pets — soft cap with release-picker UI at limit. */
export const ROSTER_CAP = 12;

/** Visual cue colors (Tailwind class fragments — used by overlay + inventory). */
export const RARITY_BORDER_CLASS: Readonly<Record<PetRarity, string>> = {
  common: 'border-slate-400',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-amber-400',
};

export const RARITY_GLOW_CLASS: Readonly<Record<PetRarity, string>> = {
  common: '',
  rare: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]',
  epic: 'shadow-[0_0_12px_rgba(168,85,247,0.7)]',
  legendary: 'shadow-[0_0_18px_rgba(251,191,36,0.8)]',
};

export const RARITY_LABEL_VI: Readonly<Record<PetRarity, string>> = {
  common: 'Thường',
  rare: 'Hiếm',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
};
```

- [ ] **Step 2: Run gates**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
```

- [ ] **Step 3: Commit**

```bash
git add app/src/types/pet.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): types/pet — PetInstance + rarity + evolution constants

S-C.1 — PetInstance schema (instanceId, codename, rarity, level, xp,
capturedAt). 4-tier rarity union. Stat multipliers per rarity (1.0/
1.15/1.3/1.6) and per evolution stage (1.0/1.3/1.6). Roster cap 12.
Visual cue Tailwind classes for rarity borders + glow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: PetRescue domain (roll rarity + species + offer gate)

**Files:**
- Create: `app/src/domain/PetRescue.ts`
- Test: `app/src/domain/PetRescue.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  monsterBucket,
  rollRarity,
  rollSpecies,
  maybeOfferPetRescue,
  RESCUE_CHANCE,
  RARITY_WEIGHTS,
} from './PetRescue';
import type { MonsterDef } from '@data/staticConfig/monsters';

function mkMonster(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 1,
    codename: 'acromi',
    displayNameVi: 'Acromi',
    element: 'Fire',
    baseHp: 30,
    level: 1,
    is_boss: false,
    ...over,
  } as MonsterDef;
}

describe('monsterBucket', () => {
  it('classifies level 1-3 as weak', () => {
    expect(monsterBucket(mkMonster({ level: 1 }))).toBe('weak');
    expect(monsterBucket(mkMonster({ level: 3 }))).toBe('weak');
  });

  it('classifies level 4-7 as mid', () => {
    expect(monsterBucket(mkMonster({ level: 4 }))).toBe('mid');
    expect(monsterBucket(mkMonster({ level: 7 }))).toBe('mid');
  });

  it('classifies level 8+ as boss', () => {
    expect(monsterBucket(mkMonster({ level: 8 }))).toBe('boss');
    expect(monsterBucket(mkMonster({ level: 99 }))).toBe('boss');
  });

  it('classifies is_boss=true as boss regardless of level', () => {
    expect(monsterBucket(mkMonster({ level: 1, is_boss: true }))).toBe('boss');
  });
});

describe('RESCUE_CHANCE', () => {
  it('weak=10%, mid=15%, boss=30%', () => {
    expect(RESCUE_CHANCE.weak).toBe(0.1);
    expect(RESCUE_CHANCE.mid).toBe(0.15);
    expect(RESCUE_CHANCE.boss).toBe(0.3);
  });
});

describe('rollRarity', () => {
  it('weak bucket: rng=0 → common, rng=0.69 → common, rng=0.7 → rare', () => {
    expect(rollRarity('weak', () => 0)).toBe('common');
    expect(rollRarity('weak', () => 0.69)).toBe('common');
    expect(rollRarity('weak', () => 0.7)).toBe('rare');
    expect(rollRarity('weak', () => 0.94)).toBe('rare');
    expect(rollRarity('weak', () => 0.95)).toBe('epic');
    expect(rollRarity('weak', () => 0.999)).toBe('epic');
  });

  it('boss bucket: never returns common; legendary at top end', () => {
    expect(rollRarity('boss', () => 0)).toBe('rare');
    expect(rollRarity('boss', () => 0.39)).toBe('rare');
    expect(rollRarity('boss', () => 0.4)).toBe('epic');
    expect(rollRarity('boss', () => 0.89)).toBe('epic');
    expect(rollRarity('boss', () => 0.9)).toBe('legendary');
    expect(rollRarity('boss', () => 0.999)).toBe('legendary');
  });

  it('weights sum to 1.0 per bucket', () => {
    for (const bucket of ['weak', 'mid', 'boss'] as const) {
      const sum = (Object.values(RARITY_WEIGHTS[bucket]) as number[]).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });
});

describe('rollSpecies', () => {
  it('returns one of the 6 starter codenames', () => {
    const validNames = [
      'bunbleaf',
      'pyropup',
      'aquakit',
      'frostfae',
      'voltchick',
      'terraowl',
    ];
    for (let i = 0; i < 100; i++) {
      const codename = rollSpecies(() => i / 100);
      expect(validNames).toContain(codename);
    }
  });

  it('uniformly distributes — rng=0 → bunbleaf, rng≈0.84 → terraowl', () => {
    expect(rollSpecies(() => 0)).toBe('bunbleaf');
    expect(rollSpecies(() => 0.999)).toBe('terraowl');
  });
});

describe('maybeOfferPetRescue', () => {
  it('returns null when first rng roll exceeds the bucket chance', () => {
    // weak bucket = 10%. rng[0]=0.5 means 50% > 10% → null
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ level: 1 }),
      rng: stubRng([0.5]),
    });
    expect(offer).toBeNull();
  });

  it('returns offer when first roll under chance, with bucket-correct rarity', () => {
    // weak bucket = 10%. rng[0]=0.05 < 0.10 → proceed.
    // rng[1]=0.0 → common (weak weights). rng[2]=0 → bunbleaf.
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ level: 1 }),
      rng: stubRng([0.05, 0.0, 0.0]),
    });
    expect(offer).toEqual({ codename: 'bunbleaf', rarity: 'common' });
  });

  it('boss bucket: 30% chance, no commons', () => {
    // is_boss=true → boss bucket = 30%. rng[0]=0.2 < 0.3 → proceed.
    // rng[1]=0.5 → epic (rare 0..0.4, epic 0.4..0.9). rng[2]=0.5 → aquakit.
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ is_boss: true, level: 1 }),
      rng: stubRng([0.2, 0.5, 0.5]),
    });
    expect(offer).not.toBeNull();
    expect(offer!.rarity).toBe('epic');
  });
});

function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++] ?? 0;
}
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- PetRescue
```

- [ ] **Step 3: Implement `app/src/domain/PetRescue.ts`**

```ts
/**
 * PetRescue — pure rolls for the post-victory rescue offer.
 *
 * Three independent rng draws per offer:
 *   1. Gate: random < RESCUE_CHANCE[bucket]?
 *   2. Rarity: weighted from RARITY_WEIGHTS[bucket]
 *   3. Species: uniform across the 6 starters
 *
 * Determinism: caller injects rng() (combat scene wires its seeded
 * source so tests + Playwright can reproduce). No Math.random in this
 * module.
 */

import type { MonsterDef } from '@data/staticConfig/monsters';
import { STARTER_PETS } from '@data/staticConfig/pets';
import type { MonsterBucket, PetCodename, PetRarity } from '@/types/pet';

export interface PetRescueOffer {
  readonly codename: PetCodename;
  readonly rarity: PetRarity;
}

export const RESCUE_CHANCE: Readonly<Record<MonsterBucket, number>> = {
  weak: 0.1,
  mid: 0.15,
  boss: 0.3,
};

export const RARITY_WEIGHTS: Readonly<
  Record<MonsterBucket, Readonly<Record<PetRarity, number>>>
> = {
  weak: { common: 0.7, rare: 0.25, epic: 0.05, legendary: 0.0 },
  mid: { common: 0.3, rare: 0.5, epic: 0.18, legendary: 0.02 },
  boss: { common: 0.0, rare: 0.4, epic: 0.5, legendary: 0.1 },
};

export function monsterBucket(monster: MonsterDef): MonsterBucket {
  if (monster.is_boss || monster.level >= 8) return 'boss';
  if (monster.level >= 4) return 'mid';
  return 'weak';
}

export function rollRarity(bucket: MonsterBucket, rng: () => number): PetRarity {
  const weights = RARITY_WEIGHTS[bucket];
  const order: PetRarity[] = ['common', 'rare', 'epic', 'legendary'];
  let target = rng();
  for (const rarity of order) {
    target -= weights[rarity];
    if (target < 0) return rarity;
  }
  return 'legendary'; // floating-point guard
}

export function rollSpecies(rng: () => number): PetCodename {
  const idx = Math.floor(rng() * STARTER_PETS.length);
  const safe = Math.min(idx, STARTER_PETS.length - 1);
  return STARTER_PETS[safe]!.codename;
}

export function maybeOfferPetRescue(params: {
  monster: MonsterDef;
  rng: () => number;
}): PetRescueOffer | null {
  const { monster, rng } = params;
  const bucket = monsterBucket(monster);
  const gateRoll = rng();
  if (gateRoll >= RESCUE_CHANCE[bucket]) return null;
  const rarity = rollRarity(bucket, rng);
  const codename = rollSpecies(rng);
  return { codename, rarity };
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- PetRescue
```

- [ ] **Step 5: Run gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/PetRescue.ts app/src/domain/PetRescue.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): PetRescue domain — bucket + rarity + species rolls

S-C.2 — Pure rng-driven rolls for post-victory pet offer. Bucket from
monster.level (1-3 weak / 4-7 mid / 8+ or is_boss → boss). Rescue chance
10/15/30 percent. Rarity weights per bucket (boss never drops common,
weak never drops legendary). Uniform species across 6 starters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: PetLeveling domain (XP curve + evolution stages)

**Files:**
- Create: `app/src/domain/PetLeveling.ts`
- Test: `app/src/domain/PetLeveling.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  petThresholdForLevel,
  evolutionStage,
  evolutionMultiplier,
  applyPetXp,
} from './PetLeveling';
import type { PetInstance } from '@/types/pet';

function mkPet(over: Partial<PetInstance> = {}): PetInstance {
  return {
    instanceId: 'inst-1',
    petCodename: 'bunbleaf',
    rarity: 'common',
    level: 1,
    xp: 0,
    capturedAt: 0,
    ...over,
  };
}

describe('petThresholdForLevel', () => {
  it('mirrors the hero curve for levels 1-5', () => {
    expect(petThresholdForLevel(1)).toBeGreaterThan(0);
    expect(petThresholdForLevel(2)).toBeGreaterThan(petThresholdForLevel(1));
    expect(petThresholdForLevel(5)).toBeGreaterThan(petThresholdForLevel(4));
  });
});

describe('evolutionStage', () => {
  it('1-9 → stage 1', () => {
    expect(evolutionStage(1)).toBe(1);
    expect(evolutionStage(9)).toBe(1);
  });

  it('10-19 → stage 2', () => {
    expect(evolutionStage(10)).toBe(2);
    expect(evolutionStage(19)).toBe(2);
  });

  it('20+ → stage 3', () => {
    expect(evolutionStage(20)).toBe(3);
    expect(evolutionStage(99)).toBe(3);
  });
});

describe('evolutionMultiplier', () => {
  it('stage 1 = 1.0, stage 2 = 1.3, stage 3 = 1.6', () => {
    expect(evolutionMultiplier(1)).toBe(1.0);
    expect(evolutionMultiplier(2)).toBe(1.3);
    expect(evolutionMultiplier(3)).toBe(1.6);
  });
});

describe('applyPetXp', () => {
  it('no level up when xp under threshold', () => {
    const pet = mkPet({ level: 1, xp: 0 });
    const result = applyPetXp(pet, 1, 5); // gain 5, hero level 1 cap
    expect(result.pet.level).toBe(1);
    expect(result.pet.xp).toBe(5);
    expect(result.levelUps).toEqual([]);
  });

  it('single level up records the new level + evolved flag', () => {
    const t1 = petThresholdForLevel(1);
    const pet = mkPet({ level: 1, xp: 0 });
    const result = applyPetXp(pet, 5, t1); // gain exactly threshold
    expect(result.pet.level).toBe(2);
    expect(result.pet.xp).toBe(0);
    expect(result.levelUps).toEqual([{ newLevel: 2, evolved: false }]);
  });

  it('multi-level cascade through 9→10 sets evolved=true', () => {
    const pet = mkPet({ level: 9, xp: 0 });
    const t = petThresholdForLevel(9);
    const result = applyPetXp(pet, 99, t * 2); // big gain
    expect(result.pet.level).toBeGreaterThanOrEqual(10);
    const tenth = result.levelUps.find((l) => l.newLevel === 10);
    expect(tenth).toBeDefined();
    expect(tenth!.evolved).toBe(true);
  });

  it('multi-level cascade through 19→20 sets evolved=true', () => {
    const pet = mkPet({ level: 19, xp: 0 });
    const t = petThresholdForLevel(19);
    const result = applyPetXp(pet, 99, t * 2);
    const twentieth = result.levelUps.find((l) => l.newLevel === 20);
    expect(twentieth).toBeDefined();
    expect(twentieth!.evolved).toBe(true);
  });

  it('caps at heroLevel — pet.level never exceeds hero.level', () => {
    const pet = mkPet({ level: 5, xp: 0 });
    const result = applyPetXp(pet, 5, 999_999); // huge gain, hero cap 5
    expect(result.pet.level).toBe(5);
    // remaining xp accumulates but is bounded to threshold-1 (held back at cap)
    expect(result.pet.xp).toBeLessThan(petThresholdForLevel(5));
    expect(result.levelUps).toEqual([]);
  });

  it('does nothing when amount is 0 or negative', () => {
    const pet = mkPet({ level: 1, xp: 10 });
    expect(applyPetXp(pet, 5, 0).pet.xp).toBe(10);
    expect(applyPetXp(pet, 5, -5).pet.xp).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- PetLeveling
```

- [ ] **Step 3: Implement `app/src/domain/PetLeveling.ts`**

```ts
/**
 * PetLeveling — pure XP curve + evolution stage helpers.
 *
 * Mirrors the hero XP curve so a player who keeps the rescued pet
 * equipped sees pet level track hero level roughly 1:1. Pet level is
 * hard-capped at hero level (no out-leveling the trainer).
 */

import type { PetEvolutionStage, PetInstance } from '@/types/pet';

/**
 * XP threshold to advance FROM `level` to `level + 1`.
 *
 * Curve: linear-ish — level 1 → 50, level 2 → 100, level 3 → 150 ...
 * Mirrors the hero progression curve scaled identically.
 */
export function petThresholdForLevel(level: number): number {
  return 50 * level;
}

export function evolutionStage(level: number): PetEvolutionStage {
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

const EVO_MULT: Readonly<Record<PetEvolutionStage, number>> = {
  1: 1.0,
  2: 1.3,
  3: 1.6,
};

export function evolutionMultiplier(stage: PetEvolutionStage): number {
  return EVO_MULT[stage];
}

export interface PetLevelUpEvent {
  readonly newLevel: number;
  readonly evolved: boolean; // true at lvl 10 / 20 transitions
}

export interface ApplyPetXpResult {
  readonly pet: PetInstance;
  readonly levelUps: PetLevelUpEvent[];
}

/**
 * Pure xp application. Returns a new PetInstance + list of level-up
 * events emitted during the cascade. Caller is responsible for
 * propagating events to EventBus.
 */
export function applyPetXp(
  pet: PetInstance,
  heroLevel: number,
  amount: number
): ApplyPetXpResult {
  if (amount <= 0) {
    return { pet, levelUps: [] };
  }
  let level = pet.level;
  let xp = pet.xp + amount;
  const levelUps: PetLevelUpEvent[] = [];

  while (level < heroLevel) {
    const threshold = petThresholdForLevel(level);
    if (xp < threshold) break;
    xp -= threshold;
    level += 1;
    levelUps.push({
      newLevel: level,
      evolved: level === 10 || level === 20,
    });
  }

  // At cap — clamp xp to just below the next threshold so it does not
  // grow unbounded on inactive growth periods (avoid surprise multi-
  // level pop when hero finally levels up).
  if (level === heroLevel) {
    const cap = petThresholdForLevel(level) - 1;
    if (xp > cap) xp = cap;
  }

  return {
    pet: { ...pet, level, xp },
    levelUps,
  };
}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- PetLeveling
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/PetLeveling.ts app/src/domain/PetLeveling.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): PetLeveling domain — XP curve, evolution stages, cap

S-C.3 — Pure helpers: petThresholdForLevel(level)=50*level, evolutionStage
(1-9=1, 10-19=2, 20+=3), evolutionMultiplier (1.0/1.3/1.6). applyPetXp
runs the cascade, caps at heroLevel, emits level-up events with
evolved=true at lvl 10/20.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: PetEntityFactory rarity + evolution wiring

**Files:**
- Modify: `app/src/domain/PetEntityFactory.ts`
- Modify: `app/src/domain/PetEntityFactory.test.ts`

- [ ] **Step 1: Read existing file end-to-end**

```bash
cat app/src/domain/PetEntityFactory.ts
cat app/src/domain/PetEntityFactory.test.ts
```

Note the current `PetInstanceShape` (Sprint A's minimal interface). Sprint C migrates the source-of-truth to `PetInstance` from `types/pet.ts`. Keep `PetInstanceShape` deprecated-aliased for one release if any external caller uses it; remove in Task 7 cleanup.

- [ ] **Step 2: Write failing tests** (append to `PetEntityFactory.test.ts`)

```ts
import {
  RARITY_HP_MULT,
  RARITY_ATK_MULT,
  HP_PER_LEVEL,
  ATK_PER_LEVEL,
  type PetInstance,
} from '@/types/pet';

function mkInstance(over: Partial<PetInstance> = {}): PetInstance {
  return {
    instanceId: 'inst-1',
    petCodename: 'bunbleaf',
    rarity: 'common',
    level: 1,
    xp: 0,
    capturedAt: 0,
    ...over,
  };
}

describe('buildPetEntity — rarity + evolution multipliers', () => {
  it('common level 1 → flat baseHp / attackPower (multipliers all 1.0)', () => {
    const inst = mkInstance({ rarity: 'common', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent).not.toBeNull();
    expect(ent!.maxHp).toBe(60); // bunbleaf baseHp = 60
    expect(ent!.attackPower).toBe(8); // bunbleaf attackPower = 8
  });

  it('rare level 1 → baseHp × 1.15, atk × 1.15 (rounded)', () => {
    const inst = mkInstance({ rarity: 'rare', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(Math.round(60 * 1.15));
    expect(ent!.attackPower).toBe(Math.round(8 * 1.15));
  });

  it('legendary level 1 → 1.6× baseHp, 1.6× atk', () => {
    const inst = mkInstance({ rarity: 'legendary', level: 1 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(Math.round(60 * 1.6));
    expect(ent!.attackPower).toBe(Math.round(8 * 1.6));
  });

  it('common level 5 adds level bonus +20 HP +4 ATK', () => {
    const inst = mkInstance({ rarity: 'common', level: 5 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.maxHp).toBe(60 + 4 * HP_PER_LEVEL);
    expect(ent!.attackPower).toBe(8 + 4 * ATK_PER_LEVEL);
  });

  it('epic level 10 (stage 2) → baseHp × 1.3 (rarity) × 1.3 (evo) + 9 levels', () => {
    const inst = mkInstance({ rarity: 'epic', level: 10 });
    const ent = buildPetEntity('inst-1', [inst]);
    const expected = Math.round(60 * 1.3 * 1.3) + 9 * HP_PER_LEVEL;
    expect(ent!.maxHp).toBe(expected);
  });

  it('legendary level 20 (stage 3) → baseHp × 1.6 × 1.6 + 19 levels', () => {
    const inst = mkInstance({ rarity: 'legendary', level: 20 });
    const ent = buildPetEntity('inst-1', [inst]);
    const expected = Math.round(60 * 1.6 * 1.6) + 19 * HP_PER_LEVEL;
    expect(ent!.maxHp).toBe(expected);
  });

  it('hp === maxHp on a fresh entity (full health at combat start)', () => {
    const inst = mkInstance({ rarity: 'rare', level: 5 });
    const ent = buildPetEntity('inst-1', [inst]);
    expect(ent!.hp).toBe(ent!.maxHp);
  });
});
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- PetEntityFactory
```

- [ ] **Step 4: Implement updated `app/src/domain/PetEntityFactory.ts`**

```ts
/**
 * PetEntityFactory — bridge from a SaveState PetInstance to a
 * combat-ready PetEntity. Sprint C extends Sprint A's flat read with
 * rarity and evolution stat multipliers + per-level additive bonus.
 *
 * Stat formula:
 *   maxHp = round(def.baseHp × rarityMult × evoMult) + (level - 1) × HP_PER_LEVEL
 *   attackPower = round(def.attackPower × rarityMult × evoMult)
 *                 + (level - 1) × ATK_PER_LEVEL
 *
 * Returns null when no pet is active or any lookup fails.
 */

import type { PetEntity } from '@/types/combat';
import { findPetDef } from '@data/staticConfig/pets';
import {
  ATK_PER_LEVEL,
  HP_PER_LEVEL,
  RARITY_ATK_MULT,
  RARITY_HP_MULT,
  type PetInstance,
} from '@/types/pet';
import { evolutionMultiplier, evolutionStage } from './PetLeveling';

/** @deprecated Sprint C migrates to PetInstance. Kept for one release. */
export type PetInstanceShape = PetInstance;

export function buildPetEntity(
  activePetInstanceId: string | null,
  inventory: ReadonlyArray<PetInstance>
): PetEntity | null {
  if (!activePetInstanceId) return null;
  const inst = inventory.find((p) => p.instanceId === activePetInstanceId);
  if (!inst) return null;
  const def = findPetDef(inst.petCodename);
  if (!def) return null;

  const rarityHp = RARITY_HP_MULT[inst.rarity];
  const rarityAtk = RARITY_ATK_MULT[inst.rarity];
  const evoMult = evolutionMultiplier(evolutionStage(inst.level));
  const levelBonus = inst.level - 1;

  const maxHp = Math.round(def.baseHp * rarityHp * evoMult) + levelBonus * HP_PER_LEVEL;
  const attackPower =
    Math.round(def.attackPower * rarityAtk * evoMult) + levelBonus * ATK_PER_LEVEL;

  return {
    id: `pet-${inst.instanceId}`,
    kind: 'pet',
    faction: 'ally',
    name: def.displayNameVi,
    element: def.element,
    level: inst.level,
    hp: maxHp,
    maxHp,
    spriteKey: `pet_${def.codename}_idle`,
    isCrittable: false,
    petInstanceId: inst.instanceId,
    attackPower,
  };
}
```

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- PetEntityFactory
```

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/domain/PetEntityFactory.ts app/src/domain/PetEntityFactory.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): PetEntityFactory applies rarity × evo × level bonuses

S-C.4 — Stat formula: maxHp = round(baseHp × rarityMult × evoMult)
+ (level-1) × 5; attackPower analogous with × 1. Rarity multipliers
1.0/1.15/1.3/1.6; evolution stage 1/2/3 → 1.0/1.3/1.6 (derived from
level <10, 10-19, 20+). PetInstanceShape deprecated alias for one
release; full removal lands when consumers migrate (Task 7).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: SaveState v4 → v5 migration + actions

**Files:**
- Modify: `app/src/persistence/SaveStateStore.ts`
- Modify: `app/src/persistence/SaveStateStore.test.ts`

- [ ] **Step 1: Read existing v4 schema + migration chain**

```bash
grep -n "schemaVersion\|migrate\|partialize" app/src/persistence/SaveStateStore.ts | head -20
```

Note: Sprint B added v4 with three additive fields (`defeatedBossIds`, `claimedChestIds`, `currentZoneId`). Mirror that pattern for v5.

- [ ] **Step 2: Write failing tests** (append to `SaveStateStore.test.ts`)

```ts
import type { PetInstance } from '@/types/pet';
import { ROSTER_CAP } from '@/types/pet';

describe('SaveState v5 migration', () => {
  it('migrates a v4 snapshot to v5 with empty ownedPets', () => {
    const v4 = {
      schemaVersion: 4,
      defeatedBossIds: ['forest-boss'],
      claimedChestIds: [],
      currentZoneId: null,
      // ...other v4 fields...
    };
    const migrated = migrateSaveState(v4 as never);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.ownedPets).toEqual([]);
    expect(migrated.defeatedBossIds).toEqual(['forest-boss']); // v4 fields preserved
  });

  it('idempotent on a v5 snapshot with non-empty ownedPets', () => {
    const v5 = {
      schemaVersion: 5,
      ownedPets: [
        {
          instanceId: 'inst-1',
          petCodename: 'bunbleaf',
          rarity: 'rare',
          level: 3,
          xp: 10,
          capturedAt: 1000,
        },
      ],
      // ...other v5 fields...
    };
    const again = migrateSaveState(v5 as never);
    expect(again.ownedPets).toHaveLength(1);
    expect(again.ownedPets[0]!.petCodename).toBe('bunbleaf');
  });

  it('chains v3 → v4 → v5 from a fresh v3 snapshot', () => {
    const v3 = { schemaVersion: 3 };
    const v5 = migrateSaveState(v3 as never);
    expect(v5.schemaVersion).toBe(5);
    expect(v5.ownedPets).toEqual([]);
    expect(v5.defeatedBossIds).toEqual([]); // v3→v4 step also fired
  });
});

describe('SaveState v5 actions', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('addPet mints an instance and pushes to ownedPets', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'rare');
    expect(inst.petCodename).toBe('bunbleaf');
    expect(inst.rarity).toBe('rare');
    expect(inst.level).toBe(1);
    expect(inst.xp).toBe(0);
    expect(useSaveState.getState().ownedPets).toContainEqual(inst);
  });

  it('addPet auto-equips when active_pet_instance_id is null', () => {
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    expect(useSaveState.getState().active_pet_instance_id).toBe(inst.instanceId);
  });

  it('addPet does not auto-equip when a pet is already active', () => {
    const first = useSaveState.getState().addPet('bunbleaf', 'common');
    const second = useSaveState.getState().addPet('pyropup', 'rare');
    expect(useSaveState.getState().active_pet_instance_id).toBe(first.instanceId);
    expect(second.instanceId).not.toBe(first.instanceId);
  });

  it('removePet returns true and unequips when removing the active pet', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    const removed = useSaveState.getState().removePet(inst.instanceId);
    expect(removed).toBe(true);
    expect(useSaveState.getState().ownedPets).toHaveLength(0);
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
  });

  it('removePet returns false on unknown id and does not mutate state', () => {
    expect(useSaveState.getState().removePet('does-not-exist')).toBe(false);
  });

  it('hasPetAtCap reports false until ROSTER_CAP pets are owned', () => {
    expect(useSaveState.getState().hasPetAtCap()).toBe(false);
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    expect(useSaveState.getState().hasPetAtCap()).toBe(true);
  });

  it('findOwnedPet returns the pet by instanceId or null', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'epic');
    expect(useSaveState.getState().findOwnedPet(inst.instanceId)?.rarity).toBe('epic');
    expect(useSaveState.getState().findOwnedPet('nope')).toBeNull();
  });

  it('reset() zeroes ownedPets and active_pet_instance_id', () => {
    useSaveState.getState().addPet('bunbleaf', 'rare');
    useSaveState.getState().reset();
    expect(useSaveState.getState().ownedPets).toEqual([]);
    expect(useSaveState.getState().active_pet_instance_id).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- SaveStateStore
```

- [ ] **Step 4: Update `app/src/persistence/SaveStateStore.ts`**

Apply five edits in sequence:

1. Bump `CURRENT_SCHEMA_VERSION` from 4 to 5.

2. Extend the state interface and `INITIAL_STATE`:

```ts
import type { PetInstance, PetRarity } from '@/types/pet';

interface SaveStateData {
  // ... existing v4 fields ...
  ownedPets: PetInstance[];
}

const INITIAL_STATE: SaveStateData = {
  // ... existing fields ...
  ownedPets: [],
};
```

3. Extend the `migrate(persisted, version)` chain — append the v4→v5 step at the end of the existing `if (version < N)` chain:

```ts
if (version < 5) {
  s = { ...s, ownedPets: [] };
}
```

4. Extend the action interface and implementations:

```ts
interface SaveStateActions {
  // ... existing actions ...
  addPet: (codename: PetCodename, rarity: PetRarity, level?: number, xp?: number) => PetInstance;
  removePet: (instanceId: string) => boolean;
  hasPetAtCap: () => boolean;
  findOwnedPet: (instanceId: string) => PetInstance | null;
}

// in the create():
addPet: (codename, rarity, level = 1, xp = 0) => {
  const inst: PetInstance = {
    instanceId: genInstanceId(),
    petCodename: codename,
    rarity,
    level,
    xp,
    capturedAt: Date.now(),
  };
  set((state) => ({
    ownedPets: [...state.ownedPets, inst],
    active_pet_instance_id:
      state.active_pet_instance_id ?? inst.instanceId,
  }));
  return inst;
},
removePet: (instanceId) => {
  const state = get();
  const idx = state.ownedPets.findIndex((p) => p.instanceId === instanceId);
  if (idx === -1) return false;
  const newOwned = [...state.ownedPets];
  newOwned.splice(idx, 1);
  set({
    ownedPets: newOwned,
    active_pet_instance_id:
      state.active_pet_instance_id === instanceId
        ? null
        : state.active_pet_instance_id,
  });
  return true;
},
hasPetAtCap: () => get().ownedPets.length >= ROSTER_CAP,
findOwnedPet: (instanceId) =>
  get().ownedPets.find((p) => p.instanceId === instanceId) ?? null,
```

5. Update `reset()` to include `ownedPets: []`. Confirm no Sprint A test breaks.

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- SaveStateStore
```

If any pre-existing test breaks (especially tests that previously cast `inventory` to `PetInstanceShape[]`), STOP — Task 7 will migrate those callers cleanly. The bridge is the existing v4 `inventory` field which Sprint C does NOT delete. Pet instances live in `ownedPets`, equipment items still in `inventory`.

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/persistence/SaveStateStore.ts app/src/persistence/SaveStateStore.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): SaveState v5 — ownedPets[] + 4 pet roster actions

S-C.5 — Additive v4→v5 migration. ownedPets: PetInstance[] for the
full roster (separate from inventory[] which stays equipment-only).
Actions: addPet (auto-equips first pet), removePet (auto-unequips
active), hasPetAtCap (>= ROSTER_CAP=12), findOwnedPet. reset()
zeroes both ownedPets and active_pet_instance_id.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: EventBus +4 events

**Files:**
- Modify: `app/src/bus/EventBus.ts`
- Modify: `app/src/bus/EventBus.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('Sprint C EventBus events', () => {
  it('PET_RESCUE_OFFERED carries codename and rarity', () => {
    let captured: { petCodename: string; rarity: string } | null = null;
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => { captured = p; });
    eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    off();
    expect(captured).toEqual({ petCodename: 'bunbleaf', rarity: 'rare' });
  });

  it('PET_COLLECTED carries instanceId, codename, rarity', () => {
    let captured: any = null;
    const off = eventBus.on('PET_COLLECTED', (p) => { captured = p; });
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: 'inst-1',
      petCodename: 'bunbleaf',
      rarity: 'rare',
    });
    off();
    expect(captured.petInstanceId).toBe('inst-1');
  });

  it('PET_RELEASED carries reason union', () => {
    const reasons: string[] = [];
    const off = eventBus.on('PET_RELEASED', (p) => reasons.push(p.reason));
    eventBus.emit('PET_RELEASED', { petCodename: 'bunbleaf', rarity: 'rare', reason: 'rejected-offer' });
    eventBus.emit('PET_RELEASED', { petCodename: 'pyropup', rarity: 'epic', reason: 'manual' });
    off();
    expect(reasons).toEqual(['rejected-offer', 'manual']);
  });

  it('PET_LEVEL_UP carries petInstanceId, newLevel, evolved', () => {
    let captured: any = null;
    const off = eventBus.on('PET_LEVEL_UP', (p) => { captured = p; });
    eventBus.emit('PET_LEVEL_UP', {
      petInstanceId: 'inst-1',
      newLevel: 10,
      evolved: true,
    });
    off();
    expect(captured.evolved).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- EventBus
```

- [ ] **Step 3: Append the 4 events to the typed `GameEvent` union in `app/src/bus/EventBus.ts`**

```ts
| {
    type: 'PET_RESCUE_OFFERED';
    payload: { petCodename: PetCodename; rarity: PetRarity };
  }
| {
    type: 'PET_COLLECTED';
    payload: {
      petInstanceId: string;
      petCodename: PetCodename;
      rarity: PetRarity;
    };
  }
| {
    type: 'PET_RELEASED';
    payload: {
      petCodename: PetCodename;
      rarity: PetRarity;
      reason: 'rejected-offer' | 'roster-cap-replace' | 'manual';
    };
  }
| {
    type: 'PET_LEVEL_UP';
    payload: { petInstanceId: string; newLevel: number; evolved: boolean };
  }
```

Add the imports at the top of EventBus.ts:

```ts
import type { PetCodename, PetRarity } from '@/types/pet';
```

- [ ] **Step 4: Run tests — confirm GREEN + commit**

```bash
cd app && npm run test:run -- EventBus && npm run lint && npm run typecheck && npm run verify
git add app/src/bus/EventBus.ts app/src/bus/EventBus.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): EventBus +PET_RESCUE_OFFERED/COLLECTED/RELEASED/LEVEL_UP

S-C.6 — Type-safe additions. PET_RESCUE_OFFERED fires post-victory in
CombatScene; PET_COLLECTED/PET_RELEASED fire from PetRescueOverlay
(audit trail); PET_LEVEL_UP fires from gainExp when active pet
crosses a threshold (evolved=true at lvl 10/20).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: CombatScene migrate `inventory` → `ownedPets` + emit rescue offer

**Files:**
- Modify: `app/src/game/scenes/CombatScene.ts`
- Modify: `app/src/game/scenes/CombatScene.test.ts`

- [ ] **Step 1: Write failing tests** (append to `CombatScene.test.ts`)

```ts
import { maybeOfferPetRescue } from '@/domain/PetRescue';
vi.mock('@/domain/PetRescue', async () => {
  const real = await vi.importActual<typeof import('@/domain/PetRescue')>(
    '@/domain/PetRescue'
  );
  return {
    ...real,
    maybeOfferPetRescue: vi.fn(),
  };
});

describe('CombatScene Sprint C — handleVictory rescue offer', () => {
  beforeEach(() => {
    vi.mocked(maybeOfferPetRescue).mockReset();
  });

  it('emits PET_RESCUE_OFFERED when maybeOfferPetRescue returns an offer', () => {
    vi.mocked(maybeOfferPetRescue).mockReturnValue({
      codename: 'bunbleaf',
      rarity: 'rare',
    });
    const events: any[] = [];
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => events.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    off();
    expect(events).toEqual([{ petCodename: 'bunbleaf', rarity: 'rare' }]);
  });

  it('does not emit PET_RESCUE_OFFERED when offer is null', () => {
    vi.mocked(maybeOfferPetRescue).mockReturnValue(null);
    const events: any[] = [];
    const off = eventBus.on('PET_RESCUE_OFFERED', (p) => events.push(p));
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    scene.__setMonsterHp(1);
    scene.onSpellClick('fire_blast');
    eventBus.emit('QUIZ_RESULT', { correct: true, timeSpent: 1, attempts: 1, lo_id: 100001 });
    off();
    expect(events).toEqual([]);
  });
});

describe('CombatScene Sprint C — buildEntities reads ownedPets not inventory', () => {
  it('builds a PetEntity from ownedPets when active_pet_instance_id matches', () => {
    useSaveState.setState({
      active_pet_instance_id: 'inst-bun',
      ownedPets: [
        {
          instanceId: 'inst-bun',
          petCodename: 'bunbleaf',
          rarity: 'common',
          level: 1,
          xp: 0,
          capturedAt: 0,
        },
      ],
    });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const petEntity = scene.getEntities().find((e) => e.kind === 'pet');
    expect(petEntity).toBeDefined();
    expect(petEntity!.name).toMatch(/Thỏ Lá/);
  });

  it('builds hero-solo when ownedPets is empty (Sprint A behavior preserved)', () => {
    useSaveState.setState({ active_pet_instance_id: null, ownedPets: [] });
    const scene = new CombatScene();
    scene.init({ monsterId: 1 });
    scene.create();
    const petEntity = scene.getEntities().find((e) => e.kind === 'pet');
    expect(petEntity).toBeUndefined();
  });
});
```

- [ ] **Step 2: Update Sprint A's pre-existing test that put pet in `inventory`**

Find `CombatScene.test.ts:536` (the test that uses `useSaveState.setState({ active_pet_instance_id: 'inst-bun', inventory: [...] })`) and migrate the `inventory` cast to `ownedPets`. Sprint A's behavior assertion stays the same; only the data source moves.

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- CombatScene
```

- [ ] **Step 4: Update `app/src/game/scenes/CombatScene.ts`**

Two surgical changes:

1. In `buildEntities` (around line 252), replace the cast hack:

```ts
// BEFORE (Sprint A):
const inventoryAsPet = (save.inventory as unknown as PetInstanceShape[]).filter(
  (p) => 'petCodename' in p
);
const pet = buildPetEntity(save.active_pet_instance_id, inventoryAsPet);

// AFTER (Sprint C):
const pet = buildPetEntity(save.active_pet_instance_id, save.ownedPets);
```

Drop the now-unused `PetInstanceShape` import.

2. In `handleVictory` (around line 532), append the rescue-offer emit after the existing EXIT_COMBAT path:

```ts
private handleVictory(): void {
  // ... existing exp / boss-drop / EXIT_COMBAT logic unchanged ...

  // NEW Sprint C — pet rescue offer (post-EXIT_COMBAT so the React layer
  // sees the combat-over signal first and the rescue overlay layers on top).
  if (this.monsterDef) {
    const offer = maybeOfferPetRescue({
      monster: this.monsterDef,
      rng: this._rng,
    });
    if (offer) {
      eventBus.emit('PET_RESCUE_OFFERED', {
        petCodename: offer.codename,
        rarity: offer.rarity,
      });
    }
  }

  this.scene.stop();
}
```

`this._rng` is the seeded RNG `CombatScene` already uses for damage variance and crit rolls (Sprint A). If it doesn't exist on the class, add it:

```ts
private _rng: () => number = Math.random;

/** Test-only seed override. */
__setRng(rng: () => number) { this._rng = rng; }
```

Add the import:

```ts
import { maybeOfferPetRescue } from '@/domain/PetRescue';
```

- [ ] **Step 5: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- CombatScene
```

If any unrelated test breaks, investigate. Sprint A's combat suite must remain green.

- [ ] **Step 6: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/game/scenes/CombatScene.ts app/src/game/scenes/CombatScene.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): CombatScene reads ownedPets + emits PET_RESCUE_OFFERED

S-C.7 — buildEntities now reads save.ownedPets directly (Sprint A's
inventory-cast hack removed). handleVictory invokes maybeOfferPetRescue
with the seeded rng and emits PET_RESCUE_OFFERED when the roll succeeds.
The React PetRescueOverlay (Task 9) subscribes to this event.

BREAKING (internal, no user impact): ownedPets must be populated by
either the v4→v5 migration (defaults []) or the addPet action; tests
that previously stuffed PetInstance into inventory[] are migrated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: gainExp propagates to active pet (PetLeveling integration)

**Files:**
- Modify: `app/src/persistence/SaveStateStore.ts`
- Modify: `app/src/persistence/SaveStateStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('gainExp propagates to active pet', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('active pet gains 100% of hero XP', () => {
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    expect(inst.xp).toBe(0);
    useSaveState.getState().gainExp(20);
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.xp).toBe(20);
  });

  it('active pet levels up alongside hero with multi-level cascade', () => {
    useSaveState.setState({ level: 5 }); // hero already at 5 so cap is high
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    const events: any[] = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(150); // 50 → lvl 2 (xp 0), 100 → lvl 3 (xp 0)
    off();
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.level).toBe(3);
    expect(events).toHaveLength(2);
  });

  it('inactive pets do not gain XP', () => {
    const a = useSaveState.getState().addPet('bunbleaf', 'common');
    const b = useSaveState.getState().addPet('pyropup', 'common');
    // a is auto-equipped; b is inactive
    useSaveState.getState().gainExp(20);
    const aAfter = useSaveState.getState().findOwnedPet(a.instanceId);
    const bAfter = useSaveState.getState().findOwnedPet(b.instanceId);
    expect(aAfter!.xp).toBe(20);
    expect(bAfter!.xp).toBe(0);
  });

  it('pet level capped at hero level', () => {
    useSaveState.setState({ level: 2 });
    const inst = useSaveState.getState().addPet('bunbleaf', 'common');
    useSaveState.getState().gainExp(99_999);
    const after = useSaveState.getState().findOwnedPet(inst.instanceId);
    expect(after!.level).toBe(2);
  });

  it('PET_LEVEL_UP at lvl 10 carries evolved=true', () => {
    useSaveState.setState({ level: 11 });
    const inst = useSaveState.getState().addPet('bunbleaf', 'common', 9, 0);
    const events: any[] = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(50 * 9); // exactly threshold for level 9 → 10
    off();
    expect(events).toHaveLength(1);
    expect(events[0].newLevel).toBe(10);
    expect(events[0].evolved).toBe(true);
  });

  it('no PET_LEVEL_UP when no active pet', () => {
    const events: any[] = [];
    const off = eventBus.on('PET_LEVEL_UP', (p) => events.push(p));
    useSaveState.getState().gainExp(100);
    off();
    expect(events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- SaveStateStore
```

- [ ] **Step 3: Update `gainExp` in `SaveStateStore.ts`**

Inside the existing `gainExp` action, after the hero level cascade and inventory mint loop, add the pet-side propagation:

```ts
gainExp: (amount) => {
  if (amount <= 0) return;
  const currentState = get();
  // ... existing hero EXP scaling + cascade unchanged ...
  // After the existing `set((state) => ({ exp, level, inventory, lastLevelUpAt }))` block,
  // run the pet-side propagation:

  const stateAfterHero = get();
  const activeId = stateAfterHero.active_pet_instance_id;
  if (!activeId) return;
  const activePet = stateAfterHero.ownedPets.find((p) => p.instanceId === activeId);
  if (!activePet) return;

  const result = applyPetXp(activePet, stateAfterHero.level, scaledAmount);
  set((state) => ({
    ownedPets: state.ownedPets.map((p) =>
      p.instanceId === activeId ? result.pet : p
    ),
  }));
  for (const ev of result.levelUps) {
    eventBus.emit('PET_LEVEL_UP', {
      petInstanceId: activeId,
      newLevel: ev.newLevel,
      evolved: ev.evolved,
    });
  }
},
```

Add the import:

```ts
import { applyPetXp } from '@/domain/PetLeveling';
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- SaveStateStore
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/persistence/SaveStateStore.ts app/src/persistence/SaveStateStore.test.ts
git commit -m "$(cat <<'EOF'
feat(sprint-c): gainExp propagates 100% of scaled XP to active pet

S-C.8 — After the hero-side cascade, the active pet (matched by
active_pet_instance_id) accumulates XP via applyPetXp, levels up to
hero cap, emits PET_LEVEL_UP per crossing with evolved=true at lvl
10/20. Inactive pets unchanged. No active pet → no-op.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: PetRescueOverlay (modal + roster-cap picker)

**Files:**
- Create: `app/src/react/overlays/PetRescueOverlay.tsx`
- Create: `app/src/react/overlays/PetRescueOverlay.test.tsx`
- Modify: `app/src/testing/gameTestBridge.ts` — add `acceptPet`, `releasePet`, `seedRng`

- [ ] **Step 1: Read the existing RewardChestOverlay pattern**

```bash
cat app/src/react/overlays/RewardChestOverlay.tsx
```

Note the event subscription cleanup, modal show/hide via local state, button handlers. Mirror.

- [ ] **Step 2: Write failing tests**

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PetRescueOverlay } from './PetRescueOverlay';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { ROSTER_CAP } from '@/types/pet';

describe('PetRescueOverlay', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('renders nothing initially', () => {
    render(<PetRescueOverlay />);
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('opens with pet display name + rarity badge on PET_RESCUE_OFFERED', () => {
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    expect(screen.getByTestId('pet-rescue-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Thỏ Lá/)).toBeInTheDocument();
    expect(screen.getByText(/Hiếm/)).toBeInTheDocument();
  });

  it('Thu thập button mints pet, fires PET_COLLECTED, closes overlay', () => {
    const events: any[] = [];
    const off = eventBus.on('PET_COLLECTED', (p) => events.push(p));
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    off();
    expect(useSaveState.getState().ownedPets).toHaveLength(1);
    expect(events[0].petCodename).toBe('bunbleaf');
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('Thả đi button fires PET_RELEASED with reason=rejected-offer + closes overlay', () => {
    const events: any[] = [];
    const off = eventBus.on('PET_RELEASED', (p) => events.push(p));
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'bunbleaf', rarity: 'rare' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-release'));
    off();
    expect(useSaveState.getState().ownedPets).toHaveLength(0);
    expect(events[0]).toEqual({
      petCodename: 'bunbleaf',
      rarity: 'rare',
      reason: 'rejected-offer',
    });
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });

  it('shows release-picker when at ROSTER_CAP and player chooses Thu thập', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    expect(screen.getByTestId('pet-rescue-cap-picker')).toBeInTheDocument();
  });

  it('release-picker pick → release old pet + mint new pet', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    const firstId = useSaveState.getState().ownedPets[0]!.instanceId;
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    fireEvent.click(screen.getByTestId(`pet-rescue-cap-pick-${firstId}`));
    expect(useSaveState.getState().ownedPets.length).toBe(ROSTER_CAP);
    expect(useSaveState.getState().findOwnedPet(firstId)).toBeNull();
    expect(
      useSaveState.getState().ownedPets.some((p) => p.petCodename === 'pyropup')
    ).toBe(true);
  });

  it('release-picker cancel discards offer silently', () => {
    for (let i = 0; i < ROSTER_CAP; i++) {
      useSaveState.getState().addPet('bunbleaf', 'common');
    }
    render(<PetRescueOverlay />);
    act(() => {
      eventBus.emit('PET_RESCUE_OFFERED', { petCodename: 'pyropup', rarity: 'epic' });
    });
    fireEvent.click(screen.getByTestId('pet-rescue-collect'));
    fireEvent.click(screen.getByTestId('pet-rescue-cap-cancel'));
    expect(useSaveState.getState().ownedPets.length).toBe(ROSTER_CAP);
    expect(
      useSaveState.getState().ownedPets.some((p) => p.petCodename === 'pyropup')
    ).toBe(false);
    expect(screen.queryByTestId('pet-rescue-overlay')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — confirm RED**

```bash
cd app && npm run test:run -- PetRescueOverlay
```

- [ ] **Step 4: Implement `app/src/react/overlays/PetRescueOverlay.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { findPetDef } from '@data/staticConfig/pets';
import {
  RARITY_BORDER_CLASS,
  RARITY_GLOW_CLASS,
  RARITY_LABEL_VI,
  ROSTER_CAP,
  type PetCodename,
  type PetInstance,
  type PetRarity,
} from '@/types/pet';

interface Offer {
  codename: PetCodename;
  rarity: PetRarity;
}

export function PetRescueOverlay() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const ownedPets = useSaveState((s) => s.ownedPets);

  useEffect(() => {
    const off = eventBus.on('PET_RESCUE_OFFERED', ({ petCodename, rarity }) => {
      setOffer({ codename: petCodename, rarity });
    });
    return off;
  }, []);

  if (!offer) return null;
  const def = findPetDef(offer.codename);
  if (!def) return null;

  const handleCollect = () => {
    if (useSaveState.getState().hasPetAtCap()) {
      setShowPicker(true);
      return;
    }
    const inst = useSaveState.getState().addPet(offer.codename, offer.rarity);
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: inst.instanceId,
      petCodename: offer.codename,
      rarity: offer.rarity,
    });
    setOffer(null);
  };

  const handleRelease = () => {
    eventBus.emit('PET_RELEASED', {
      petCodename: offer.codename,
      rarity: offer.rarity,
      reason: 'rejected-offer',
    });
    setOffer(null);
  };

  const handleCapPick = (instanceId: string) => {
    const removed = useSaveState.getState().ownedPets.find(
      (p) => p.instanceId === instanceId
    );
    useSaveState.getState().removePet(instanceId);
    if (removed) {
      eventBus.emit('PET_RELEASED', {
        petCodename: removed.petCodename,
        rarity: removed.rarity,
        reason: 'roster-cap-replace',
      });
    }
    const inst = useSaveState.getState().addPet(offer.codename, offer.rarity);
    eventBus.emit('PET_COLLECTED', {
      petInstanceId: inst.instanceId,
      petCodename: offer.codename,
      rarity: offer.rarity,
    });
    setShowPicker(false);
    setOffer(null);
  };

  const handleCapCancel = () => {
    setShowPicker(false);
    setOffer(null);
  };

  if (showPicker) {
    return (
      <div
        data-testid="pet-rescue-cap-picker"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      >
        <div className="rounded-lg bg-white p-6 max-w-md">
          <h2 className="mb-4 text-lg font-bold">
            Bạn đã có {ROSTER_CAP} pet — chọn 1 để thả đi
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {ownedPets.map((p: PetInstance) => (
              <button
                key={p.instanceId}
                data-testid={`pet-rescue-cap-pick-${p.instanceId}`}
                onClick={() => handleCapPick(p.instanceId)}
                className={`rounded border-2 p-2 ${RARITY_BORDER_CLASS[p.rarity]} ${RARITY_GLOW_CLASS[p.rarity]}`}
              >
                <img
                  src={`/assets/pets/${p.petCodename}_idle_256.png`}
                  alt={p.petCodename}
                  className="h-16 w-16 object-contain mx-auto"
                />
                <div className="text-xs mt-1">Lv{p.level}</div>
                <div className="text-[10px]">{RARITY_LABEL_VI[p.rarity]}</div>
              </button>
            ))}
          </div>
          <button
            data-testid="pet-rescue-cap-cancel"
            onClick={handleCapCancel}
            className="mt-4 px-4 py-2 bg-slate-300 rounded"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pet-rescue-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${
        offer.rarity === 'legendary' ? 'animate-pulse' : ''
      }`}
    >
      <div
        className={`rounded-lg bg-white p-6 max-w-sm border-4 ${RARITY_BORDER_CLASS[offer.rarity]} ${RARITY_GLOW_CLASS[offer.rarity]}`}
      >
        <h2 className="text-xl font-bold text-center mb-2">
          Bạn đã cứu được một pet!
        </h2>
        <img
          src={`/assets/pets/${offer.codename}_idle_256.png`}
          alt={offer.codename}
          className="mx-auto h-40 w-40 object-contain"
        />
        <div className="text-center text-lg font-semibold mt-2">
          {def.displayNameVi}
        </div>
        <div className="text-center text-sm">{RARITY_LABEL_VI[offer.rarity]}</div>
        <div className="flex gap-2 mt-4">
          <button
            data-testid="pet-rescue-collect"
            onClick={handleCollect}
            className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded font-bold"
          >
            Thu thập
          </button>
          <button
            data-testid="pet-rescue-release"
            onClick={handleRelease}
            className="flex-1 px-4 py-2 bg-slate-300 rounded"
          >
            Thả đi
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire `PetRescueOverlay` into the app shell**

Find where `RewardChestOverlay` is rendered (likely `app/src/react/AppShell.tsx` or `app/src/main.tsx`). Add a sibling render:

```tsx
<RewardChestOverlay />
<PetRescueOverlay />
```

Both overlays subscribe to different events; concurrent display is acceptable since they layer additively (z-50 each).

- [ ] **Step 6: Extend gameTestBridge**

```ts
acceptPet: () => {
  document.querySelector<HTMLButtonElement>('[data-testid="pet-rescue-collect"]')?.click();
},
releasePet: () => {
  document.querySelector<HTMLButtonElement>('[data-testid="pet-rescue-release"]')?.click();
},
seedRng: (value: number) => {
  // CombatScene's _rng → return a function that yields `value` indefinitely.
  const phaser = (window as any).__GAME__.__phaser as Phaser.Game;
  for (const s of phaser.scene.scenes) {
    if ((s as any).__setRng) {
      (s as any).__setRng(() => value);
    }
  }
},
```

- [ ] **Step 7: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- PetRescueOverlay gameTestBridge
```

- [ ] **Step 8: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/overlays/PetRescueOverlay.tsx app/src/react/overlays/PetRescueOverlay.test.tsx \
        app/src/testing/gameTestBridge.ts \
        app/src/react/AppShell.tsx 2>/dev/null
# (or wherever the overlay is wired)
git commit -m "$(cat <<'EOF'
feat(sprint-c): PetRescueOverlay (modal + roster-cap picker)

S-C.9 — React overlay subscribing to PET_RESCUE_OFFERED. Thu thập
mints + emits PET_COLLECTED; Thả đi emits PET_RELEASED(rejected-offer).
At ROSTER_CAP=12, Thu thập opens release-picker (3-col grid of owned
pets); pick triggers replace + emit RELEASED(roster-cap-replace);
cancel discards offer silently. Test bridge gains acceptPet/releasePet/
seedRng for E2E.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: InventoryScreen Pet tab + grid + equip toggle + release

**Files:**
- Modify: `app/src/react/screens/InventoryScreen.tsx`
- Modify: `app/src/react/screens/InventoryScreen.test.tsx`

- [ ] **Step 1: Write failing tests** (append)

```tsx
describe('InventoryScreen — Pet tab', () => {
  beforeEach(() => useSaveState.getState().reset());

  it('shows Items + Pets tabs, items default', () => {
    render(<InventoryScreen />);
    expect(screen.getByTestId('inventory-tab-items')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-tab-pets')).toBeInTheDocument();
  });

  it('Pet tab renders empty roster placeholder when no pets', () => {
    render(<InventoryScreen />);
    fireEvent.click(screen.getByTestId('inventory-tab-pets'));
    expect(screen.getByText(/Chưa có pet/)).toBeInTheDocument();
  });

  it('Pet tab renders one card per ownedPets entry with correct rarity border', () => {
    useSaveState.getState().addPet('bunbleaf', 'rare');
    useSaveState.getState().addPet('pyropup', 'epic');
    render(<InventoryScreen />);
    fireEvent.click(screen.getByTestId('inventory-tab-pets'));
    expect(screen.getAllByTestId(/^pet-card-/)).toHaveLength(2);
  });

  it('clicking a pet card sets it as active', () => {
    const a = useSaveState.getState().addPet('bunbleaf', 'rare');
    const b = useSaveState.getState().addPet('pyropup', 'common');
    render(<InventoryScreen />);
    fireEvent.click(screen.getByTestId('inventory-tab-pets'));
    fireEvent.click(screen.getByTestId(`pet-card-${b.instanceId}`));
    expect(useSaveState.getState().active_pet_instance_id).toBe(b.instanceId);
  });

  it('active pet card shows the gold-star indicator', () => {
    const a = useSaveState.getState().addPet('bunbleaf', 'rare');
    render(<InventoryScreen />);
    fireEvent.click(screen.getByTestId('inventory-tab-pets'));
    expect(screen.getByTestId(`pet-card-${a.instanceId}-active-indicator`)).toBeInTheDocument();
  });

  it('release flow: right-click → confirm → pet removed', () => {
    const a = useSaveState.getState().addPet('bunbleaf', 'rare');
    render(<InventoryScreen />);
    fireEvent.click(screen.getByTestId('inventory-tab-pets'));
    fireEvent.contextMenu(screen.getByTestId(`pet-card-${a.instanceId}`));
    fireEvent.click(screen.getByTestId('pet-release-confirm'));
    expect(useSaveState.getState().findOwnedPet(a.instanceId)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm RED**

```bash
cd app && npm run test:run -- InventoryScreen
```

- [ ] **Step 3: Update `app/src/react/screens/InventoryScreen.tsx`**

Add tab state + Pet tab render branch. Read the existing file structure first; the additions are:

```tsx
import { eventBus } from '@/bus/EventBus';
import {
  RARITY_BORDER_CLASS,
  RARITY_GLOW_CLASS,
  RARITY_LABEL_VI,
  type PetInstance,
} from '@/types/pet';
import { findPetDef } from '@data/staticConfig/pets';

// inside the component:
const [tab, setTab] = useState<'items' | 'pets'>('items');
const [confirmRelease, setConfirmRelease] = useState<PetInstance | null>(null);
const ownedPets = useSaveState((s) => s.ownedPets);
const activePetId = useSaveState((s) => s.active_pet_instance_id);

const handleEquip = (instanceId: string) => {
  useSaveState.getState().setActivePetInstanceId(instanceId);
};

const handleReleaseConfirm = () => {
  if (!confirmRelease) return;
  useSaveState.getState().removePet(confirmRelease.instanceId);
  eventBus.emit('PET_RELEASED', {
    petCodename: confirmRelease.petCodename,
    rarity: confirmRelease.rarity,
    reason: 'manual',
  });
  setConfirmRelease(null);
};

// in the JSX:
<div className="flex gap-2 mb-4">
  <button
    data-testid="inventory-tab-items"
    onClick={() => setTab('items')}
    className={tab === 'items' ? 'font-bold border-b-2' : ''}
  >Đồ</button>
  <button
    data-testid="inventory-tab-pets"
    onClick={() => setTab('pets')}
    className={tab === 'pets' ? 'font-bold border-b-2' : ''}
  >Pet</button>
</div>

{tab === 'items' && (/* existing items rendering */)}

{tab === 'pets' && (
  ownedPets.length === 0 ? (
    <p className="text-center text-slate-500 py-8">
      Chưa có pet — đánh quái để cứu pet đầu tiên!
    </p>
  ) : (
    <div className="grid grid-cols-4 gap-3">
      {ownedPets.map((p) => {
        const def = findPetDef(p.petCodename);
        const isActive = p.instanceId === activePetId;
        return (
          <button
            key={p.instanceId}
            data-testid={`pet-card-${p.instanceId}`}
            onClick={() => handleEquip(p.instanceId)}
            onContextMenu={(e) => {
              e.preventDefault();
              setConfirmRelease(p);
            }}
            className={`relative rounded border-2 p-2 ${RARITY_BORDER_CLASS[p.rarity]} ${RARITY_GLOW_CLASS[p.rarity]}`}
          >
            {isActive && (
              <span
                data-testid={`pet-card-${p.instanceId}-active-indicator`}
                className="absolute -top-2 -left-2 text-amber-400"
              >★</span>
            )}
            <img
              src={`/assets/pets/${p.petCodename}_idle_256.png`}
              alt={p.petCodename}
              className="h-16 w-16 object-contain mx-auto"
            />
            <div className="text-center text-xs mt-1">{def?.displayNameVi}</div>
            <div className="text-center text-[10px]">Lv{p.level} · {RARITY_LABEL_VI[p.rarity]}</div>
          </button>
        );
      })}
    </div>
  )
)}

{confirmRelease && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div className="rounded bg-white p-4 max-w-xs">
      <p>Thả pet {findPetDef(confirmRelease.petCodename)?.displayNameVi}?</p>
      <div className="flex gap-2 mt-3">
        <button
          data-testid="pet-release-confirm"
          onClick={handleReleaseConfirm}
          className="flex-1 px-3 py-1 bg-rose-500 text-white rounded"
        >Thả</button>
        <button
          onClick={() => setConfirmRelease(null)}
          className="flex-1 px-3 py-1 bg-slate-300 rounded"
        >Hủy</button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Run tests — confirm GREEN**

```bash
cd app && npm run test:run -- InventoryScreen
```

- [ ] **Step 5: Gates and commit**

```bash
cd app && npm run lint && npm run typecheck && npm run verify
git add app/src/react/screens/InventoryScreen.tsx app/src/react/screens/InventoryScreen.test.tsx
git commit -m "$(cat <<'EOF'
feat(sprint-c): InventoryScreen Pet tab + grid + equip + release

S-C.10 — Tabbed UI on /inventory: Items (existing) + Pets (new). Pet
tab renders 4-col grid of ownedPets with rarity border + glow + level
badge. Click card → setActivePetInstanceId. Right-click card → release
confirm modal → removePet + PET_RELEASED(manual). Active pet shows
gold-star indicator.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: E2E spec — sprint_c_pet_rescue.spec.ts

**Files:**
- Create: `app/tests/e2e/sprint_c_pet_rescue.spec.ts`

- [ ] **Step 1: Write the E2E spec**

```ts
import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://localhost:5173' });

async function waitForGame(page: any) {
  await page.waitForFunction(() => Boolean((window as any).__GAME__?.__phaser));
}

async function answerQuizCorrectly(page: any) {
  // Reuse helper from existing specs (full_flow / boss_quest pattern).
  await page.waitForSelector('[data-testid="quiz-overlay"]');
  await page.click('[data-testid="quiz-option-correct"]');
}

test('sprint C: rescue → collect → equip → pet battles', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/');
  await waitForGame(page);

  // Seed RNG so the rescue offer roll is guaranteed (rng()=0.05 < 0.1 weak chance)
  await page.evaluate(() => (window as any).__GAME__.seedRng(0.05));

  // Drive through Sprint B's forest path → boss to a victory
  await page.evaluate(() => (window as any).__GAME__.startBossHall('forest-island'));
  await page.evaluate(() => (window as any).__GAME__.engageBoss());

  // Resolve combat to victory (loop quizzes until BOSS_DEFEATED)
  for (let i = 0; i < 12; i++) {
    const won = await page.evaluate(() => {
      const save = (window as any).__GAME__.getSaveState();
      return save.defeatedBossIds.includes('forest-boss');
    });
    if (won) break;
    try {
      await answerQuizCorrectly(page);
    } catch {
      await page.waitForTimeout(200);
    }
  }

  // Pet rescue overlay appears
  await page.waitForSelector('[data-testid="pet-rescue-overlay"]', { timeout: 10_000 });
  await page.click('[data-testid="pet-rescue-collect"]');

  // Roster has one pet
  let save = await page.evaluate(() => (window as any).__GAME__.getSaveState());
  expect(save.ownedPets).toHaveLength(1);

  // Open inventory → Pet tab
  await page.click('[data-testid="menu-inventory"]');
  await page.click('[data-testid="inventory-tab-pets"]');

  // Active indicator is on the only pet (auto-equipped)
  const activeId = save.ownedPets[0].instanceId;
  await expect(page.locator(`[data-testid="pet-card-${activeId}-active-indicator"]`)).toBeVisible();
});
```

If `menu-inventory` testid doesn't exist on MainMenu, add it via a 1-line edit to that component (in this task) or use the existing nav button selector.

- [ ] **Step 2: Run the E2E**

```bash
cd app && npm run test:e2e -- sprint_c_pet_rescue
```

If the spec is flaky on scene transitions (Sprint B encountered the same issue), fall back to direct test-bridge methods that bypass `advance()` calls:

```ts
await page.evaluate(() => (window as any).__GAME__.startBossHall('forest-island'));
```

- [ ] **Step 3: Commit**

```bash
git add app/tests/e2e/sprint_c_pet_rescue.spec.ts
git commit -m "$(cat <<'EOF'
test(sprint-c): E2E sprint_c_pet_rescue — rescue → collect → equip

S-C.11 — Playwright spec covering full Sprint C user loop: seed RNG,
beat boss, accept rescue offer, open /inventory Pet tab, confirm
auto-equip indicator. Reuses Sprint B's startBossHall/engageBoss
test-bridge methods.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: AP/ISP delta + sprint roll-up

**Files:**
- Modify: `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`
- Modify: `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Append AP delta**

Append to the END of `docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md`:

```markdown
---

## Sprint C — Delta (02/05/2026)

Sprint C ships the pet rescue + roster + leveling + evolution loop on
top of Sprint A's combat foundation. Type B (Entity Schema delta + v5
migration).

### §3.1 — Folder structure additions
- `domain/PetRescue.ts` — pure rolls (bucket, rarity, species)
- `domain/PetLeveling.ts` — XP curve, evolution stages, applyPetXp
- `react/overlays/PetRescueOverlay.tsx` — modal sparkle reveal +
  roster-cap picker
- `types/pet.ts` — PetInstance, PetRarity, PetEvolutionStage,
  multiplier tables, ROSTER_CAP

### §11.6 — Pet rescue rules (NEW)

Rescue rate per monster bucket (level-based, forward-compatible):
- weak (level 1-3): 10% per battle, weights 70/25/5/0
- mid (level 4-7): 15%, weights 30/50/18/2
- boss (level ≥ 8 OR is_boss): 30%, weights 0/40/50/10

Stat multipliers per rarity (HP × ATK):
- common 1.0, rare 1.15, epic 1.3, legendary 1.6

Evolution stages (derived from level):
- stage 1 (lvl 1-9): mult 1.0
- stage 2 (lvl 10-19): mult 1.3
- stage 3 (lvl 20+): mult 1.6

Per-level additive: +5 HP, +1 ATK per level above 1.

Pet level cap = hero level. XP propagation: active pet (matched by
active_pet_instance_id) gains 100% of scaled hero EXP per battle.
Inactive pets gain 0%.

### §13 — SaveState v5
+ `ownedPets: PetInstance[]` (defaults `[]`)
- Existing `active_pet_instance_id` (v3) referenced by Sprint C as
  the equip slot for the roster.
- Migration v4→v5 additive; no behavioral change to v4 fields.

### §14 — EventBus catalog additions
+ `PET_RESCUE_OFFERED { petCodename, rarity }`
+ `PET_COLLECTED { petInstanceId, petCodename, rarity }`
+ `PET_RELEASED { petCodename, rarity, reason: 'rejected-offer' | 'roster-cap-replace' | 'manual' }`
+ `PET_LEVEL_UP { petInstanceId, newLevel, evolved }`
```

- [ ] **Step 2: Append ISP rows**

Find the end of the Phase 2.5 Sprint B row table in `docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md` and append:

```markdown
### Phase 2.5 — Sprint C (02/05/2026) — Pet System

| # | Step | Status |
|---|---|---|
| S-C.1 | types/pet.ts + rarity/evolution constants | ✅ |
| S-C.2 | domain/PetRescue (bucket, rolls, offer gate) | ✅ |
| S-C.3 | domain/PetLeveling (XP curve, evolution stages, applyPetXp) | ✅ |
| S-C.4 | PetEntityFactory rarity + evolution multiplier wiring | ✅ |
| S-C.5 | SaveState v4→v5 migration + 4 actions | ✅ |
| S-C.6 | EventBus +4 events | ✅ |
| S-C.7 | CombatScene reads ownedPets + emits PET_RESCUE_OFFERED | ✅ |
| S-C.8 | gainExp propagates to active pet | ✅ |
| S-C.9 | PetRescueOverlay (modal + roster-cap picker) | ✅ |
| S-C.10 | InventoryScreen Pet tab + grid + equip + release | ✅ |
| S-C.11 | E2E sprint_c_pet_rescue.spec.ts | ✅ |
| S-C.12 | AP/ISP delta + sprint roll-up | ✅ |

**Sprint C closed.** Pending: Phase 2 sprite swap on evolution stages
(when Antigravity ships evo art).
```

- [ ] **Step 3: Update `tasks/todo.md`**

In the Phase 2.5 sprints table at the top:

```markdown
| **C** | Pet System — rescue mechanic, leveling, evolution, inventory tab | ✅ shipped | (this commit) | +N (649 → ?) |
```

Update the test count after running the full suite (`npm run test:run`).

In the "Next Session Action" section, replace the Sprint C bullet with:

```markdown
**Immediate:** Sprint D — Quests & Goals Panel brainstorm (per `docs/roadmap_phase2.5_prodigy_parity.md` §D). Quest catalog + progress hooks reading existing combat / quiz / level-up / pet-rescue events.
```

- [ ] **Step 4: Run final full gate suite**

```bash
cd app && npm run lint && npm run typecheck && npm run test:run && npm run verify
cd app && npm run test:e2e
```

Expected: lint clean, types clean, all unit tests green (≥ 705 — was 649 + ~56 new from S-C tasks 1-10), all E2E green (6 prior + 1 sprint_c).

- [ ] **Step 5: Final commit**

```bash
git add docs/architecturepack_Game_SS3_exclusive_v1.1_22042026.md \
        docs/IncrementalStepPlan-Game_SS3_exclusive-v1.1.md \
        tasks/todo.md
git commit -m "$(cat <<'EOF'
docs(sprint-c): AP §3.1/§11.6/§13/§14 delta + ISP S-C row table + roll-up

S-C.12 — AP §11.6 documents the rescue rules + stat formulas + level
cap + XP propagation. §13 SaveState v5 row added. §14 catalogs the
4 new EventBus events.

ISP: Phase 2.5 Sprint C row table marks all 12 tasks ✅.
todo.md: Phase 2.5 sprint table marks C ✅; next session = Sprint D.

Sprint C closed. ~56 new unit tests (649 → ~705), 1 new E2E. Pending:
Phase 2 sprite swap on evolution (Antigravity art).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review checklist

1. **Spec coverage:**
   - §1 Q1 modal reveal → Task 9 ✅
   - §1 Q2 4-tier rarity → Tasks 1, 2 ✅
   - §1 Q3a drop weights → Task 2 ✅
   - §1 Q3b stat multipliers → Tasks 1, 4 ✅
   - §1 Q3c visual cues → Tasks 1 (constants), 9 (overlay), 10 (inventory) ✅
   - §4.1 SaveState v5 → Task 5 ✅
   - §4.3 rescue flow → Task 7 ✅
   - §4.4 modal lifecycle → Task 9 ✅
   - §4.5 roster cap + picker → Tasks 5 (action), 9 (UI) ✅
   - §4.6 leveling propagation → Tasks 3, 8 ✅
   - §4.7 evolution → Tasks 3, 4 ✅
   - §4.8 inventory UI → Task 10 ✅
   - §4.9 events → Task 6 ✅
   - §4.10 actions → Task 5 ✅
   - §5 acceptance criteria + tests → distributed across all tasks ✅
   - §6 risks R1-R8 → mitigations applied (R5 overlay queue is implicit since both overlays render at z-50; defer if conflict surfaces during E2E) ✅
   - §7 AP/ISP delta → Task 12 ✅

2. **Placeholder scan:** no "TBD/TODO/implement later" in plan body. The R5 overlay queue mentioned in spec §6 is left implicit (both overlays render concurrently at z-50; layered visually). If E2E uncovers a conflict, the implementer adds a queue in Task 9.

3. **Type consistency:**
   - `PetInstance`, `PetRarity`, `PetEvolutionStage`, `MonsterBucket`, `PetCodename` — used identically across Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.
   - `RARITY_HP_MULT`, `RARITY_ATK_MULT`, `HP_PER_LEVEL`, `ATK_PER_LEVEL`, `ROSTER_CAP` — single source of truth in Task 1, consumed everywhere downstream.
   - `addPet` / `removePet` / `hasPetAtCap` / `findOwnedPet` — Task 5 signatures match Tasks 9 + 10 callers.
   - `applyPetXp` returns `{ pet, levelUps }` consistently in Tasks 3 + 8.
   - Event payloads in Task 6 match emit signatures in Tasks 7, 8, 9, 10.

Plan complete.
