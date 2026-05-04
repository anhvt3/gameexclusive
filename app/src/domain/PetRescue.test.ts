import { describe, expect, it } from 'vitest';
import {
  monsterBucket,
  rollRarity,
  rollSpecies,
  maybeOfferPetRescue,
  RESCUE_CHANCE,
  RARITY_WEIGHTS,
} from './PetRescue';
import type { MonsterDef } from '@data/staticConfig/monsters';

function mkMonster(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: 1,
    codename: 'embershed',
    displayNameVi: 'Embershed',
    element: 'Fire',
    tier: 'starter',
    baseHp: 30,
    spritePath: '/assets/monsters/embershed_idle_128.png',
    placeholderColor: 0xff6b35,
    ...over,
  } as MonsterDef;
}

describe('monsterBucket', () => {
  it('classifies tier=starter as weak', () => {
    expect(monsterBucket(mkMonster({ tier: 'starter' }))).toBe('weak');
  });

  it('classifies tier=mid as mid', () => {
    expect(monsterBucket(mkMonster({ tier: 'mid' }))).toBe('mid');
  });

  it('classifies tier=rare as mid (mid-tier difficulty bucket)', () => {
    expect(monsterBucket(mkMonster({ tier: 'rare' }))).toBe('mid');
  });

  it('classifies tier=boss as boss', () => {
    expect(monsterBucket(mkMonster({ tier: 'boss' }))).toBe('boss');
  });

  it('classifies is_boss=true as boss regardless of tier', () => {
    expect(monsterBucket(mkMonster({ tier: 'starter', is_boss: true }))).toBe('boss');
  });
});

describe('RESCUE_CHANCE', () => {
  it('weak=10%, mid=15%, boss=30%', () => {
    expect(RESCUE_CHANCE.weak).toBe(0.1);
    expect(RESCUE_CHANCE.mid).toBe(0.15);
    expect(RESCUE_CHANCE.boss).toBe(0.3);
  });
});

describe('rollRarity', () => {
  it('weak bucket: rng=0 → common, rng=0.69 → common, rng=0.7 → rare', () => {
    expect(rollRarity('weak', () => 0)).toBe('common');
    expect(rollRarity('weak', () => 0.69)).toBe('common');
    expect(rollRarity('weak', () => 0.7)).toBe('rare');
    expect(rollRarity('weak', () => 0.94)).toBe('rare');
    expect(rollRarity('weak', () => 0.95)).toBe('epic');
    expect(rollRarity('weak', () => 0.999)).toBe('epic');
  });

  it('boss bucket: never returns common; legendary at top end', () => {
    expect(rollRarity('boss', () => 0)).toBe('rare');
    expect(rollRarity('boss', () => 0.39)).toBe('rare');
    expect(rollRarity('boss', () => 0.4)).toBe('epic');
    expect(rollRarity('boss', () => 0.89)).toBe('epic');
    expect(rollRarity('boss', () => 0.9)).toBe('legendary');
    expect(rollRarity('boss', () => 0.999)).toBe('legendary');
  });

  it('weights sum to 1.0 per bucket', () => {
    for (const bucket of ['weak', 'mid', 'boss'] as const) {
      const sum = (Object.values(RARITY_WEIGHTS[bucket]) as number[]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });
});

describe('rollSpecies', () => {
  it('returns one of the 6 starter codenames', () => {
    const validNames = ['bunbleaf', 'pyropup', 'aquakit', 'frostfae', 'voltchick', 'terraowl'];
    for (let i = 0; i < 100; i++) {
      const codename = rollSpecies(() => i / 100);
      expect(validNames).toContain(codename);
    }
  });

  it('uniformly distributes — rng=0 → bunbleaf, rng≈0.999 → terraowl', () => {
    expect(rollSpecies(() => 0)).toBe('bunbleaf');
    expect(rollSpecies(() => 0.999)).toBe('terraowl');
  });
});

describe('maybeOfferPetRescue', () => {
  it('returns null when first rng roll exceeds the bucket chance', () => {
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ tier: 'starter' }),
      rng: stubRng([0.5]),
    });
    expect(offer).toBeNull();
  });

  it('returns offer when first roll under chance, with bucket-correct rarity', () => {
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ tier: 'starter' }),
      rng: stubRng([0.05, 0.0, 0.0]),
    });
    expect(offer).toEqual({ codename: 'bunbleaf', rarity: 'common' });
  });

  it('boss bucket: 30% chance, no commons', () => {
    const offer = maybeOfferPetRescue({
      monster: mkMonster({ is_boss: true, tier: 'starter' }),
      rng: stubRng([0.2, 0.5, 0.5]),
    });
    expect(offer).not.toBeNull();
    expect(offer!.rarity).toBe('epic');
  });
});

function stubRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++] ?? 0;
}
