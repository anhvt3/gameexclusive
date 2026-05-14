// app/src/domain/performBreedingStart.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { rollOffspring } from './PetBreedingEngine';
import { validateAction } from './ServerValidator';
import { durationFor } from './BreedingDurations';
import { ROSTER_CAP } from '@/types/pet';
import type { BreedingFailureReason, BreedingSession, PetInstanceId } from '@/types/breeding';

export type BreedingStartResult =
  | { ok: true; session: BreedingSession }
  | { ok: false; reason: BreedingFailureReason };

export async function performBreedingStart(
  parentAId: PetInstanceId,
  parentBId: PetInstanceId,
  now: number = Date.now(),
  rng: () => number = Math.random
): Promise<BreedingStartResult> {
  const state = useSaveState.getState();

  if (state.breedingChamber !== null) return { ok: false, reason: 'chamber_busy' };
  if (state.ownedPets.length >= ROSTER_CAP) return { ok: false, reason: 'roster_full' };
  if (parentAId === parentBId) return { ok: false, reason: 'same_parent' };

  const parentA = state.ownedPets.find((p) => p.instanceId === parentAId);
  const parentB = state.ownedPets.find((p) => p.instanceId === parentBId);
  if (!parentA || !parentB) return { ok: false, reason: 'parent_not_found' };

  const offspring = rollOffspring(parentA, parentB, rng);
  if (state.battleStars < offspring.costBattleStars) {
    return { ok: false, reason: 'insufficient_stars' };
  }

  const server = await validateAction('/api/breed/validate', {
    parentA: parentAId,
    parentB: parentBId,
    cost: offspring.costBattleStars,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as BreedingFailureReason };
  }

  const duration = durationFor(offspring.rarity);
  const session: BreedingSession = {
    parentA: parentAId,
    parentB: parentBId,
    startedAt: now,
    hatchAt: now + duration,
    costBattleStars: offspring.costBattleStars,
    offspringSpec: {
      codename: offspring.codename,
      rarity: offspring.rarity,
      level: offspring.level,
    },
    rushedAt: null,
  };

  useSaveState.getState().startBreeding(session);

  eventBus.emit('BREEDING_STARTED', {
    parentA: parentAId,
    parentB: parentBId,
    durationMs: duration,
    expectedRarity: offspring.rarity,
  });

  return { ok: true, session };
}
