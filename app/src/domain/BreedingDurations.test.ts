import { describe, it, expect } from 'vitest';
import { BREEDING_DURATIONS, durationFor } from './BreedingDurations';

const MIN = 60_000;

describe('BREEDING_DURATIONS (Q2)', () => {
  it('common = 5 min', () => {
    expect(BREEDING_DURATIONS.common).toBe(5 * MIN);
  });
  it('rare = 15 min', () => {
    expect(BREEDING_DURATIONS.rare).toBe(15 * MIN);
  });
  it('epic = 60 min', () => {
    expect(BREEDING_DURATIONS.epic).toBe(60 * MIN);
  });
  it('legendary = 120 min', () => {
    expect(BREEDING_DURATIONS.legendary).toBe(120 * MIN);
  });
});

describe('durationFor', () => {
  it('returns duration for given rarity', () => {
    expect(durationFor('common')).toBe(5 * MIN);
    expect(durationFor('legendary')).toBe(120 * MIN);
  });
});
