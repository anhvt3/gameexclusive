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
 *
 * Bucket mapping uses `MonsterDef.tier` (starter / mid / rare / boss)
 * since the registry classifies monsters by tier rather than numeric
 * level. `tier='rare'` is treated as the mid difficulty bucket.
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

export const RARITY_WEIGHTS: Readonly<Record<MonsterBucket, Readonly<Record<PetRarity, number>>>> =
  {
    weak: { common: 0.7, rare: 0.25, epic: 0.05, legendary: 0.0 },
    mid: { common: 0.3, rare: 0.5, epic: 0.18, legendary: 0.02 },
    boss: { common: 0.0, rare: 0.4, epic: 0.5, legendary: 0.1 },
  };

export function monsterBucket(monster: MonsterDef): MonsterBucket {
  if (monster.is_boss || monster.tier === 'boss') return 'boss';
  if (monster.tier === 'mid' || monster.tier === 'rare') return 'mid';
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
