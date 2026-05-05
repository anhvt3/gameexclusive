/**
 * QuestReward — thin wrapper over Sprint A's rollDrop that maps quest
 * reward tier → rarity filter. Returns null when the registry has no
 * eligible items (caller surfaces "Phần thưởng chưa sẵn sàng").
 */

import { rollDrop } from './LevelUpReward';
import { ITEM_REGISTRY, type ItemDef } from '@data/staticConfig/items';
import type { QuestRewardTier } from '@/types/quest';

export const RARITY_FILTER: Readonly<Record<QuestRewardTier, ReadonlyArray<ItemDef['rarity']>>> = {
  common: ['common'],
  rare: ['rare'],
  epic: ['epic'],
};

export function rollQuestReward(
  tier: QuestRewardTier,
  level: number,
  rng: () => number = Math.random
): ItemDef | null {
  const eligible = ITEM_REGISTRY.filter((it) => RARITY_FILTER[tier].includes(it.rarity));
  if (eligible.length === 0) return null;
  return rollDrop({ pool: eligible, level, rng });
}
