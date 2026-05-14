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

  it('returns not_ready when now < hatchAt', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      hatchAt: now + 5000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 1 },
      rushedAt: null,
    });
    const result = performBreedingHatch(now + 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_ready');
  });

  it('happy path with rushedAt=null: emits wasRushed=false', () => {
    useSaveState.getState().addBattleStars(100);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now,
      hatchAt: now,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity: 'common', level: 5 },
      rushedAt: null,
    });
    const received: Array<{ wasRushed?: boolean }> = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    const result = performBreedingHatch(now);
    expect(result.ok).toBe(true);
    expect(received[0]?.wasRushed).toBe(false);
    off();
  });

  it('happy path with rushedAt=non-null: emits wasRushed=true', () => {
    useSaveState.getState().addBattleStars(200);
    const now = Date.now();
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: now - 1000,
      hatchAt: now,
      costBattleStars: 50,
      offspringSpec: { codename: 'aquakit', rarity: 'rare', level: 5 },
      rushedAt: now,
    });
    const received: Array<{ wasRushed?: boolean }> = [];
    const off = eventBus.on('EGG_HATCHED', (p) => received.push(p));
    performBreedingHatch(now);
    expect(received[0]?.wasRushed).toBe(true);
    off();
  });
});
