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
export function applyPetXp(pet: PetInstance, heroLevel: number, amount: number): ApplyPetXpResult {
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
