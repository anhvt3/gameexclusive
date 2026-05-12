import { describe, it, expect } from 'vitest';
import { streakMultiplier, streakFlameVariant, STREAK_TIERS } from './StreakMultiplier';

describe('streakMultiplier', () => {
  it('returns 1.0 for streak 0/1/2', () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(1)).toBe(1.0);
    expect(streakMultiplier(2)).toBe(1.0);
  });

  it('returns 1.2 for streak 3..6', () => {
    expect(streakMultiplier(3)).toBe(1.2);
    expect(streakMultiplier(6)).toBe(1.2);
  });

  it('returns 1.5 for streak 7..29', () => {
    expect(streakMultiplier(7)).toBe(1.5);
    expect(streakMultiplier(29)).toBe(1.5);
  });

  it('returns 2.0 for streak 30+', () => {
    expect(streakMultiplier(30)).toBe(2.0);
    expect(streakMultiplier(100)).toBe(2.0);
  });
});

describe('streakFlameVariant', () => {
  it('returns null for streak < 3', () => {
    expect(streakFlameVariant(0)).toBeNull();
    expect(streakFlameVariant(2)).toBeNull();
  });

  it('returns small for 3..6, medium for 7..29, large for 30+', () => {
    expect(streakFlameVariant(3)).toBe('small');
    expect(streakFlameVariant(7)).toBe('medium');
    expect(streakFlameVariant(30)).toBe('large');
  });
});

describe('STREAK_TIERS', () => {
  it('is sorted descending by minDays for first-match lookup', () => {
    const days = STREAK_TIERS.map((t) => t.minDays);
    const sortedDesc = [...days].sort((a, b) => b - a);
    expect(days).toEqual(sortedDesc);
  });
});
