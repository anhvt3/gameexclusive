// app/src/domain/performBreedingStart.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performBreedingStart } from './performBreedingStart';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performBreedingStart', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
  });

  function addPair() {
    const a = useSaveState.getState().addPet('pyropup', 'common', 3, 0);
    const b = useSaveState.getState().addPet('aquakit', 'common', 5, 0);
    return { aId: a.instanceId, bId: b.instanceId };
  }

  it('returns chamber_busy when session already active', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(300);
    await performBreedingStart(aId, bId, Date.now(), () => 0.99);
    const result = await performBreedingStart(aId, bId, Date.now(), () => 0.99);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('chamber_busy');
  });

  it('returns parent_not_found for invalid ID', async () => {
    useSaveState.getState().addBattleStars(300);
    const result = await performBreedingStart('non-id-a', 'non-id-b');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('parent_not_found');
  });

  it('returns same_parent when same instanceId twice', async () => {
    const { aId } = addPair();
    useSaveState.getState().addBattleStars(300);
    const result = await performBreedingStart(aId, aId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('same_parent');
  });

  it('returns insufficient_stars when below cost', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(10);
    const result = await performBreedingStart(aId, bId, Date.now(), () => 0.99);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_stars');
  });

  it('returns roster_full when ownedPets at cap', async () => {
    // Fill to cap (ROSTER_CAP=12 from @/types/pet)
    for (let i = 0; i < 12; i++) {
      useSaveState.getState().addPet('pyropup', 'common', 1, 0);
    }
    useSaveState.getState().addBattleStars(500);
    const pets = useSaveState.getState().ownedPets;
    const result = await performBreedingStart(pets[0]!.instanceId, pets[1]!.instanceId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('roster_full');
  });

  it('happy path: locks chamber, charges stars, emits BREEDING_STARTED', async () => {
    const { aId, bId } = addPair();
    useSaveState.getState().addBattleStars(300);
    const received: unknown[] = [];
    const off = eventBus.on('BREEDING_STARTED', (p) => received.push(p));
    const NOW = 5_000_000;
    const result = await performBreedingStart(aId, bId, NOW, () => 0.99);
    expect(result.ok).toBe(true);
    const chamber = useSaveState.getState().breedingChamber!;
    expect(chamber.startedAt).toBe(NOW);
    // Phase 4: hatchAt = startedAt + duration. For common offspring (rng=0.99 → no upgrade), duration = 5min.
    expect(chamber.hatchAt).toBe(NOW + 5 * 60_000);
    expect(chamber.rushedAt).toBeNull();
    expect(useSaveState.getState().battleStars).toBeLessThan(300);
    expect(received).toHaveLength(1);
    off();
  });
});
