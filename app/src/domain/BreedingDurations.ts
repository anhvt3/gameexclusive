// app/src/domain/BreedingDurations.ts

import type { PetRarity } from '@/types/pet';

const MIN = 60_000;

/**
 * Phase 4 — Breeding incubation duration per offspring rarity (Q2 override).
 *
 * Tradeoff: 5min common (coffee break) · 15min rare (class break) ·
 * 60min epic (homework session) · 120min legendary (overnight OR Rush).
 */
export const BREEDING_DURATIONS: Readonly<Record<PetRarity, number>> = {
  common: 5 * MIN,
  rare: 15 * MIN,
  epic: 60 * MIN,
  legendary: 120 * MIN,
};

export function durationFor(rarity: PetRarity): number {
  return BREEDING_DURATIONS[rarity];
}
