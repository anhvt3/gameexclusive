// app/src/data/staticConfig/breedingPairs.test.ts
import { describe, it, expect } from 'vitest';
import { BREEDING_PAIRS, lookupPair } from './breedingPairs';
import { STARTER_PETS } from './pets';

describe('BREEDING_PAIRS', () => {
  it('has at least 6 cross-element pairs', () => {
    expect(BREEDING_PAIRS.length).toBeGreaterThanOrEqual(6);
  });

  it('every offspringCodename resolves to a real PetDef', () => {
    const validCodenames = new Set(STARTER_PETS.map((p) => p.codename));
    for (const pair of BREEDING_PAIRS) {
      expect(
        validCodenames.has(pair.offspringCodename),
        `codename "${pair.offspringCodename}" not in STARTER_PETS`
      ).toBe(true);
    }
  });

  it('elementA != elementB for every pair', () => {
    for (const p of BREEDING_PAIRS) {
      expect(p.elementA).not.toBe(p.elementB);
    }
  });

  it('has no duplicate unordered (elementA, elementB) pairs', () => {
    const seen = new Set<string>();
    for (const p of BREEDING_PAIRS) {
      const key = [p.elementA, p.elementB].sort().join('|');
      expect(seen.has(key), `duplicate pair: ${key}`).toBe(false);
      seen.add(key);
    }
  });
});

describe('lookupPair', () => {
  it('finds pair regardless of element order', () => {
    const sample = BREEDING_PAIRS[0]!;
    expect(lookupPair(sample.elementA, sample.elementB)?.offspringCodename).toBe(
      sample.offspringCodename
    );
    expect(lookupPair(sample.elementB, sample.elementA)?.offspringCodename).toBe(
      sample.offspringCodename
    );
  });

  it('returns null for same-element pair (by design — caller falls back)', () => {
    expect(lookupPair('Fire', 'Fire')).toBeNull();
  });
});
