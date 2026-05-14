// app/src/domain/performBreedingRush.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { validateRush, rushCostFor } from './BreedingRush';
import { validateAction } from './ServerValidator';
import { trackBreedingRush } from '@/observability/Telemetry';
import type { BreedingFailureReason } from '@/types/breeding';

export type BreedingRushResult =
  | { ok: true; costPaid: number; newHatchAt: number }
  | { ok: false; reason: BreedingFailureReason };

export async function performBreedingRush(now: number = Date.now()): Promise<BreedingRushResult> {
  const state = useSaveState.getState();
  const validation = validateRush(state.breedingChamber, state.battleStars, now);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason! };
  }

  const chamber = state.breedingChamber!;
  const cost = rushCostFor(chamber.offspringSpec.rarity);

  const server = await validateAction('/api/breed/validate', {
    action: 'rush',
    parentA: chamber.parentA,
    parentB: chamber.parentB,
    cost,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as BreedingFailureReason };
  }

  const timeRemainingMs = chamber.hatchAt - now;
  useSaveState.getState().rushBreeding(now, cost);
  void trackBreedingRush({
    offspringRarity: chamber.offspringSpec.rarity,
    costPaid: cost,
    timeRemainingMs,
  });

  return { ok: true, costPaid: cost, newHatchAt: now };
}
