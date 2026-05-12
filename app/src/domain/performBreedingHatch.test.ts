// app/src/domain/performBreedingHatch.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { performBreedingHatch } from './performBreedingHatch';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performBreedingHatch', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
  });

  it('returns no_active_session when chamber empty', () => {
    const result = performBreedingHatch();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_active_session');
  });

  it('returns not_ready when elapsed < durationMs', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      durationMs: 5000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
    });
    const result = performBreedingHatch(now + 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_ready');
  });

  it('happy path: mints offspring via addPet, clears chamber, emits EGG_HATCHED', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      durationMs: 0,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 5 },
    });
    const before = useSaveState.getState().ownedPets.length;
    const received: unknown[] = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    const result = performBreedingHatch(now);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().breedingChamber).toBeNull();
    expect(useSaveState.getState().ownedPets.length).toBe(before + 1);
    expect(received).toHaveLength(1);
    off();
  });
});
