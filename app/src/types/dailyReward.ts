// app/src/types/dailyReward.ts

/**
 * Sprint F — Daily Reward types (AP §11.9).
 *
 * Discriminated union for login calendar reward shapes + streak tier
 * metadata. Pure types — no logic.
 */

export type LoginDayRewardKind = 'item' | 'stars' | 'mixed';

export interface LoginDayItemReward {
  kind: 'item';
  rarity: 'common' | 'rare';
  qty: number;
}

export interface LoginDayStarsReward {
  kind: 'stars';
  amount: number;
}

export interface LoginDayMixedReward {
  kind: 'mixed';
  rarity: 'rare';
  starsBonus: number;
}

export type LoginDayReward = LoginDayItemReward | LoginDayStarsReward | LoginDayMixedReward;

export type StreakFlameVariant = 'small' | 'medium' | 'large';

export interface StreakTierDef {
  readonly minDays: number;
  readonly multiplier: number;
  readonly flameVariant: StreakFlameVariant | null;
}
