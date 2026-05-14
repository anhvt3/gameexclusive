// app/src/domain/performBreedingHatch.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import type { BreedingFailureReason } from '@/types/breeding';
import type { PetInstance } from '@/types/pet';

export type BreedingHatchResult =
  | { ok: true; offspring: PetInstance }
  | { ok: false; reason: BreedingFailureReason };

export function performBreedingHatch(now: number = Date.now()): BreedingHatchResult {
  const state = useSaveState.getState();
  const session = state.breedingChamber;
  if (!session) return { ok: false, reason: 'no_active_session' };
  if (now < session.hatchAt) return { ok: false, reason: 'not_ready' };

  const wasRushed = session.rushedAt !== null;

  const offspring = useSaveState
    .getState()
    .addPet(
      session.offspringSpec.codename,
      session.offspringSpec.rarity,
      session.offspringSpec.level,
      0
    );

  useSaveState.getState().clearBreeding();

  eventBus.emit('EGG_HATCHED', {
    offspringInstanceId: offspring.instanceId,
    rarity: offspring.rarity,
    codename: offspring.petCodename,
    wasRushed,
  });

  return { ok: true, offspring };
}
