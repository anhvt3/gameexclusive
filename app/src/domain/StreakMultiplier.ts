import type { StreakFlameVariant, StreakTierDef } from '@/types/dailyReward';

/**
 * Sprint F — Streak multiplier stair (Q3 default).
 *
 * Sorted descending by minDays so `find` returns the highest-eligible
 * tier first. Tier table:
 *
 *   30+ days → ×2.0 (large flame)
 *    7+ days → ×1.5 (medium flame)
 *    3+ days → ×1.2 (small flame)
 *    1-2 day → ×1.0 (no flame)
 */
export const STREAK_TIERS: ReadonlyArray<StreakTierDef> = [
  { minDays: 30, multiplier: 2.0, flameVariant: 'large' },
  { minDays: 7, multiplier: 1.5, flameVariant: 'medium' },
  { minDays: 3, multiplier: 1.2, flameVariant: 'small' },
  { minDays: 1, multiplier: 1.0, flameVariant: null },
];

export function streakMultiplier(streak: number): number {
  return STREAK_TIERS.find((t) => streak >= t.minDays)?.multiplier ?? 1.0;
}

export function streakFlameVariant(streak: number): StreakFlameVariant | null {
  return STREAK_TIERS.find((t) => streak >= t.minDays)?.flameVariant ?? null;
}
