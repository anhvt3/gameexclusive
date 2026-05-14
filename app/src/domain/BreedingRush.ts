import type { PetRarity } from '@/types/pet';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';

/**
 * Phase 4 — Rush cost = breeding cost (Q3 override). Total spend for
 * rushed legendary = 2000 stars (~1 week earn).
 */
export const RUSH_COSTS: Readonly<Record<PetRarity, number>> = BREEDING_COSTS;

export function rushCostFor(rarity: PetRarity): number {
  return RUSH_COSTS[rarity];
}

export interface RushValidation {
  ok: boolean;
  reason?: 'no_active_session' | 'already_rushed' | 'already_ready' | 'insufficient_stars';
}

export function validateRush(
  chamber: {
    hatchAt: number;
    rushedAt: number | null;
    offspringSpec: { rarity: PetRarity };
  } | null,
  battleStars: number,
  now: number
): RushValidation {
  if (!chamber) return { ok: false, reason: 'no_active_session' };
  if (chamber.rushedAt !== null) return { ok: false, reason: 'already_rushed' };
  if (now >= chamber.hatchAt) return { ok: false, reason: 'already_ready' };
  const cost = RUSH_COSTS[chamber.offspringSpec.rarity];
  if (battleStars < cost) return { ok: false, reason: 'insufficient_stars' };
  return { ok: true };
}
