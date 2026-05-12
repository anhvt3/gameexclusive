// app/src/data/staticConfig/breedingCosts.test.ts
import { describe, it, expect } from 'vitest';
import { BREEDING_COSTS } from './breedingCosts';

describe('BREEDING_COSTS', () => {
  it('has costs for all 4 rarities (Q4)', () => {
    expect(BREEDING_COSTS.common).toBe(50);
    expect(BREEDING_COSTS.rare).toBe(200);
    expect(BREEDING_COSTS.epic).toBe(500);
    expect(BREEDING_COSTS.legendary).toBe(1000);
  });

  it('costs strictly ascend with rarity', () => {
    expect(BREEDING_COSTS.common).toBeLessThan(BREEDING_COSTS.rare);
    expect(BREEDING_COSTS.rare).toBeLessThan(BREEDING_COSTS.epic);
    expect(BREEDING_COSTS.epic).toBeLessThan(BREEDING_COSTS.legendary);
  });
});
