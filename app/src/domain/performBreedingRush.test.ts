import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performBreedingRush } from './performBreedingRush';
import { useSaveState } from '@/persistence/SaveStateStore';

describe('performBreedingRush', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
  });

  const BASE_NOW = Date.now();
  function seedChamber(
    rushedAt: number | null = null,
    rarity: 'common' | 'rare' | 'epic' = 'common',
    stars = 500
  ) {
    useSaveState.getState().addBattleStars(stars);
    useSaveState.getState().startBreeding({
      parentA: 'a',
      parentB: 'b',
      startedAt: BASE_NOW,
      hatchAt: BASE_NOW + 5 * 60_000,
      costBattleStars: 50,
      offspringSpec: { codename: 'pyropup', rarity, level: 1 },
      rushedAt,
    });
  }

  it('happy path: spends cost, sets hatchAt=now, rushedAt=now', async () => {
    seedChamber();
    const NOW = 50_000;
    const result = await performBreedingRush(NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.costPaid).toBe(50);
      expect(result.newHatchAt).toBe(NOW);
    }
    const chamber = useSaveState.getState().breedingChamber!;
    expect(chamber.hatchAt).toBe(NOW);
    expect(chamber.rushedAt).toBe(NOW);
  });

  it('returns no_active_session when chamber null', async () => {
    const result = await performBreedingRush(Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_active_session');
  });

  it('returns already_rushed when rushedAt !== null', async () => {
    seedChamber(99);
    const result = await performBreedingRush(Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('already_rushed');
  });

  it('returns already_ready when now >= hatchAt', async () => {
    seedChamber();
    const chamber = useSaveState.getState().breedingChamber!;
    const result = await performBreedingRush(chamber.hatchAt + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('already_ready');
  });

  it('returns insufficient_stars when balance < cost', async () => {
    seedChamber(null, 'epic', 100); // epic rush cost 500 > 50 balance after startBreeding spend
    const result = await performBreedingRush(Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_stars');
  });

  it('aborts on server HMAC mismatch', async () => {
    seedChamber();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, reason: 'hmac_mismatch' }),
    } as never);
    const result = await performBreedingRush(Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('server_');
  });
});
