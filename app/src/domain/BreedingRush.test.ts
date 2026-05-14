import { describe, it, expect } from 'vitest';
import { RUSH_COSTS, rushCostFor, validateRush } from './BreedingRush';
import { BREEDING_COSTS } from '@/data/staticConfig/breedingCosts';

describe('RUSH_COSTS', () => {
  it('parity with BREEDING_COSTS (Q3)', () => {
    expect(RUSH_COSTS).toEqual(BREEDING_COSTS);
  });
});

describe('rushCostFor', () => {
  it('returns cost per rarity', () => {
    expect(rushCostFor('common')).toBe(50);
    expect(rushCostFor('rare')).toBe(200);
    expect(rushCostFor('epic')).toBe(500);
    expect(rushCostFor('legendary')).toBe(1000);
  });
});

describe('validateRush', () => {
  const baseChamber = {
    hatchAt: 1000000,
    rushedAt: null as number | null,
    offspringSpec: { rarity: 'common' as const },
  };
  const NOW = 500000;

  it('ok when chamber active + not rushed + not ready + sufficient stars', () => {
    expect(validateRush(baseChamber, 100, NOW)).toEqual({ ok: true });
  });

  it('fails no_active_session when chamber null', () => {
    expect(validateRush(null, 100, NOW)).toEqual({ ok: false, reason: 'no_active_session' });
  });

  it('fails already_rushed when rushedAt set', () => {
    expect(validateRush({ ...baseChamber, rushedAt: 600000 }, 100, NOW)).toEqual({
      ok: false,
      reason: 'already_rushed',
    });
  });

  it('fails already_ready when now >= hatchAt', () => {
    expect(validateRush(baseChamber, 100, baseChamber.hatchAt + 1)).toEqual({
      ok: false,
      reason: 'already_ready',
    });
  });

  it('fails insufficient_stars when balance < cost', () => {
    expect(validateRush(baseChamber, 10, NOW)).toEqual({ ok: false, reason: 'insufficient_stars' });
  });
});
