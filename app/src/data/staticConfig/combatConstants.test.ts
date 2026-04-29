import { describe, expect, it } from 'vitest';
import {
  PET_DAMAGE_BASE_MULTIPLIER,
  PET_DAMAGE_JITTER_PCT,
  HERO_SPELL_DIFFICULTY_BONUS,
  CRIT_DAMAGE_MULTIPLIER,
} from './combatConstants';

describe('combatConstants', () => {
  it('exports the four POSUP-tunable balance numbers', () => {
    expect(PET_DAMAGE_BASE_MULTIPLIER).toBe(8);
    expect(PET_DAMAGE_JITTER_PCT).toBe(0.1);
    expect(HERO_SPELL_DIFFICULTY_BONUS).toBe(0.1);
    expect(CRIT_DAMAGE_MULTIPLIER).toBe(1.5);
  });

  it('jitter pct stays within [0, 1)', () => {
    expect(PET_DAMAGE_JITTER_PCT).toBeGreaterThanOrEqual(0);
    expect(PET_DAMAGE_JITTER_PCT).toBeLessThan(1);
  });
});
