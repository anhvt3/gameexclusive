/**
 * Quest system types — Sprint D.
 *
 * QuestDef is what lives in data/staticConfig/quests.ts catalog. The
 * runtime per-player progress lives in SaveState.questProgress +
 * claimedRewards + questCycleAnchors.
 *
 * QuestEngine subscribes to GameEvent's source channel and runs each
 * quest's `match` against the payload, returning a delta to add. Engine
 * is pure-TS — no Phaser / React / DOM imports.
 */

import type { GameEvent } from '@/bus/EventBus';

export type QuestId = string;

export type QuestTier = 'daily' | 'weekly' | 'main';

export type QuestRewardTier = 'common' | 'rare' | 'epic';

/** All event names that any quest can match against. */
export type QuestSourceEvent = GameEvent['type'];

export interface QuestDef {
  readonly id: QuestId;
  readonly tier: QuestTier;
  readonly displayNameVi: string;
  readonly description: string;
  readonly target: number;
  readonly rewardTier: QuestRewardTier;
  readonly source: QuestSourceEvent;
  /** Returns increment delta (0 = no contribution). */
  readonly match: (payload: never) => number;
}

/** Per-player runtime progress. */
export interface QuestCycleAnchors {
  /** Date.now() at last UTC+7 midnight that triggered a daily refresh. */
  readonly dailyEpochUtc7: number;
  /** Date.now() at last UTC+7 Sunday-midnight that triggered a weekly refresh. */
  readonly weeklyEpochUtc7: number;
}

export const TIER_REWARD: Readonly<Record<QuestTier, QuestRewardTier>> = {
  daily: 'common',
  weekly: 'rare',
  main: 'epic',
};

export const TIER_LABEL_VI: Readonly<Record<QuestTier, string>> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  main: 'Cốt truyện chính',
};
