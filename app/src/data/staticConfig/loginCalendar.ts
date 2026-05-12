import type { LoginDayReward } from '@/types/dailyReward';

/**
 * Sprint F — 7-day login calendar template (Q4 default).
 *
 * Day 1-3, 5, 6: random common item (qty 1)
 * Day 4: 50 battle stars
 * Day 7 (boss-of-week): rare item + 100 stars bonus
 *
 * Multiplier from streak tier applies via `applyMultiplier`.
 */
export const LOGIN_CALENDAR_TEMPLATE: ReadonlyArray<LoginDayReward> = [
  { kind: 'item', rarity: 'common', qty: 1 }, // Day 1
  { kind: 'item', rarity: 'common', qty: 1 }, // Day 2
  { kind: 'item', rarity: 'common', qty: 1 }, // Day 3
  { kind: 'stars', amount: 50 }, // Day 4
  { kind: 'item', rarity: 'common', qty: 1 }, // Day 5
  { kind: 'item', rarity: 'common', qty: 1 }, // Day 6
  { kind: 'mixed', rarity: 'rare', starsBonus: 100 }, // Day 7
];

/**
 * Apply streak multiplier to a base reward. Stars/starsBonus rounded;
 * item qty floored at 1.
 */
export function applyMultiplier(reward: LoginDayReward, mult: number): LoginDayReward {
  if (reward.kind === 'stars') {
    return { ...reward, amount: Math.round(reward.amount * mult) };
  }
  if (reward.kind === 'mixed') {
    return { ...reward, starsBonus: Math.round(reward.starsBonus * mult) };
  }
  // reward.kind === 'item'
  return { ...reward, qty: Math.max(1, Math.round(reward.qty * mult)) };
}
