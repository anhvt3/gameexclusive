// app/src/domain/PetBreedingEngine.test.ts
import { describe, it, expect } from 'vitest';
import { computeCompatibility, rollOffspring } from './PetBreedingEngine';
import type { PetInstance } from '@/types/pet';

function mockPet(overrides: Partial<PetInstance>): PetInstance {
  return {
    instanceId: 'inst-1',
    petCodename: 'pyropup',
    rarity: 'common',
    level: 1,
    xp: 0,
    capturedAt: 0,
    ...overrides,
  };
}

describe('computeCompatibility', () => {
  it('same codename (=same element) returns medium compat', () => {
    const a = mockPet({ petCodename: 'pyropup' }); // Fire
    const b = mockPet({ petCodename: 'pyropup' }); // Fire
    expect(computeCompatibility(a, b)).toEqual({ level: 'medium', multiplier: 1.0 });
  });

  it('cross-element with matrix pair returns high compat (Fire + Water)', () => {
    const a = mockPet({ petCodename: 'pyropup' }); // Fire
    const b = mockPet({ petCodename: 'aquakit' }); // Water
    expect(computeCompatibility(a, b)).toEqual({ level: 'high', multiplier: 1.5 });
  });

  it('cross-element with matrix pair returns high compat (Plant + Water)', () => {
    const a = mockPet({ petCodename: 'bunbleaf' }); // Plant
    const b = mockPet({ petCodename: 'aquakit' }); // Water
    expect(computeCompatibility(a, b)).toEqual({ level: 'high', multiplier: 1.5 });
  });
});

describe('rollOffspring', () => {
  it('same codename returns higher-rarity parent codename, no rarity upgrade', () => {
    const a = mockPet({ petCodename: 'pyropup', rarity: 'common', level: 3 });
    const b = mockPet({ petCodename: 'pyropup', rarity: 'rare', level: 5 });
    const offspring = rollOffspring(a, b, () => 0.99);
    expect(offspring.codename).toBe('pyropup');
    expect(offspring.rarity).toBe('rare');
    expect(offspring.level).toBe(5);
  });

  it('cross-element uses BREEDING_PAIRS lookup codename (Fire+Water → aquakit)', () => {
    const a = mockPet({ petCodename: 'pyropup', rarity: 'common' }); // Fire
    const b = mockPet({ petCodename: 'aquakit', rarity: 'common' }); // Water
    // rng=0.99 → no upgrade (chance = 1.5×0.3 = 0.45)
    const offspring = rollOffspring(a, b, () => 0.99);
    expect(offspring.codename).toBe('aquakit'); // per BREEDING_PAIRS[0]
    expect(offspring.rarity).toBe('common');
  });

  it('rarity upgrade fires when rng < compat.multiplier * 0.3 (high compat → 0.45)', () => {
    const a = mockPet({ petCodename: 'pyropup', rarity: 'common' }); // Fire
    const b = mockPet({ petCodename: 'aquakit', rarity: 'common' }); // Water
    const offspring = rollOffspring(a, b, () => 0.4); // 0.4 < 0.45
    expect(offspring.rarity).toBe('rare');
  });

  it('costBattleStars matches offspring rarity (common = 50)', () => {
    const a = mockPet({ petCodename: 'pyropup', rarity: 'common' });
    const b = mockPet({ petCodename: 'aquakit', rarity: 'common' });
    const offspring = rollOffspring(a, b, () => 0.99);
    expect(offspring.costBattleStars).toBe(50);
  });

  it('costBattleStars matches offspring rarity (rare = 200 after upgrade)', () => {
    const a = mockPet({ petCodename: 'pyropup', rarity: 'common' });
    const b = mockPet({ petCodename: 'aquakit', rarity: 'common' });
    const offspring = rollOffspring(a, b, () => 0.4);
    expect(offspring.rarity).toBe('rare');
    expect(offspring.costBattleStars).toBe(200);
  });

  it('offspring level = max(parentA.level, parentB.level)', () => {
    const a = mockPet({ petCodename: 'pyropup', level: 7 });
    const b = mockPet({ petCodename: 'aquakit', level: 3 });
    expect(rollOffspring(a, b, () => 0.99).level).toBe(7);
  });
});
