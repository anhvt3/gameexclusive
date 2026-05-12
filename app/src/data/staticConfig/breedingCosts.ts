// app/src/data/staticConfig/breedingCosts.ts
import type { PetRarity } from '@/types/pet';

/**
 * Phase 3 — Breeding cost per offspring rarity (Q4 anh override).
 *
 * Cost charged at performBreedingStart (before chamber lock).
 * Parents stay in roster regardless of outcome.
 */
export const BREEDING_COSTS: Readonly<Record<PetRarity, number>> = {
  common: 50,
  rare: 200,
  epic: 500,
  legendary: 1000,
};
