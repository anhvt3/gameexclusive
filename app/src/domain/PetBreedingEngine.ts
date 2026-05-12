// app/src/domain/PetBreedingEngine.ts

import type { PetInstance, PetRarity } from '@/types/pet';
import type { CompatResult, OffspringSpec } from '@/types/breeding';
import { lookupPair } from '@/data/staticConfig/breedingPairs';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';
import { STARTER_PETS } from '@/data/staticConfig/pets';

/**
 * Phase 3 — Pet Breeding engine (AP §11.11, Q4+Q6 defaults).
 *
 * Pure functions. State mutations live in performBreedingStart +
 * performBreedingHatch orchestration helpers (Task 11).
 *
 * Element derived from PetInstance.petCodename via STARTER_PETS lookup
 * (PetInstance has no element field; element is part of static PetDef).
 */

const RARITY_ORDER: PetRarity[] = ['common', 'rare', 'epic', 'legendary'];

function rarityIndex(r: PetRarity): number {
  return RARITY_ORDER.indexOf(r);
}

function maxRarity(a: PetRarity, b: PetRarity): PetRarity {
  return rarityIndex(a) >= rarityIndex(b) ? a : b;
}

function nextRarityTier(r: PetRarity): PetRarity {
  const idx = rarityIndex(r);
  return RARITY_ORDER[Math.min(idx + 1, RARITY_ORDER.length - 1)]!;
}

function elementOf(pet: PetInstance) {
  const def = STARTER_PETS.find((p) => p.codename === pet.petCodename);
  return def?.element;
}

export function computeCompatibility(parentA: PetInstance, parentB: PetInstance): CompatResult {
  const elemA = elementOf(parentA);
  const elemB = elementOf(parentB);
  if (!elemA || !elemB) return { level: 'low', multiplier: 0.5 };
  if (elemA === elemB) return { level: 'medium', multiplier: 1.0 };
  const pair = lookupPair(elemA, elemB);
  if (pair) return { level: 'high', multiplier: 1.5 };
  return { level: 'low', multiplier: 0.5 };
}

export function rollOffspring(
  parentA: PetInstance,
  parentB: PetInstance,
  rng: () => number = Math.random
): OffspringSpec {
  const elemA = elementOf(parentA);
  const elemB = elementOf(parentB);
  const baseLevel = Math.max(parentA.level, parentB.level);
  const compat = computeCompatibility(parentA, parentB);

  // Same element OR unknown lookup → higher-rarity parent fallback
  if (!elemA || !elemB || elemA === elemB) {
    const higher = rarityIndex(parentA.rarity) >= rarityIndex(parentB.rarity) ? parentA : parentB;
    return {
      codename: higher.petCodename,
      rarity: higher.rarity,
      level: baseLevel,
      costBattleStars: BREEDING_COSTS[higher.rarity],
    };
  }

  const pair = lookupPair(elemA, elemB);
  if (!pair) {
    const higher = rarityIndex(parentA.rarity) >= rarityIndex(parentB.rarity) ? parentA : parentB;
    return {
      codename: higher.petCodename,
      rarity: higher.rarity,
      level: baseLevel,
      costBattleStars: BREEDING_COSTS[higher.rarity],
    };
  }

  const parentRarity = maxRarity(parentA.rarity, parentB.rarity);
  const upgradeChance = compat.multiplier * 0.3;
  const upgrade = rng() < upgradeChance;
  const offspringRarity = upgrade ? nextRarityTier(parentRarity) : parentRarity;

  return {
    codename: pair.offspringCodename,
    rarity: offspringRarity,
    level: baseLevel,
    costBattleStars: BREEDING_COSTS[offspringRarity],
  };
}
