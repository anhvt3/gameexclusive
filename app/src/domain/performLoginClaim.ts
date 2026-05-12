import { eventBus } from '@/bus/EventBus';
import { useSaveState } from '@/persistence/SaveStateStore';
import { dailyAnchor } from './QuestCycle';
import { evaluateLoginClaimable } from './LoginCalendar';
import { rollDrop } from './LevelUpReward';
import { ITEM_REGISTRY, type ItemDef } from '@/data/staticConfig/items';
import type { InventoryItem } from '@/types/item';

export interface LoginClaimResult {
  dayOfCycle: number;
  streak: number;
  itemsMinted: ItemDef[];
  starsEarned: number;
}

/**
 * Sprint F — Login claim orchestration (Task 9).
 *
 * Bridges `evaluateLoginClaimable` (pure) with SaveState v8 actions
 * + LOGIN_CLAIMED event emit. Deferred from Task 4 because it requires
 * SaveState v8 actions (Task 6) + LOGIN_CLAIMED event (Task 7).
 *
 * Lives in domain/ because it is pure orchestration — no React, no Phaser.
 *
 * Returns null if not claimable (already claimed today or same UTC+7 anchor).
 */
// Sentinel level used ONLY for the day-7 'mixed' rare item slot. Rare items
// have minLevel: 2 but day-7 rewards must always succeed regardless of the
// hero's actual level. Do NOT use for common 'item' path (days 1-3, 5-6) —
// those use real hero level so future minLevel changes are properly respected.
const GUARANTEED_LEVEL = 99;

export function performLoginClaim(
  now: number = Date.now(),
  rng: () => number = Math.random
): LoginClaimResult | null {
  const initialState = useSaveState.getState();
  const info = evaluateLoginClaimable(
    initialState.lastLoginAnchorUtc7,
    initialState.loginStreak,
    now
  );
  if (!info.claimable) return null;

  const heroLevel = initialState.level;
  const itemsMinted: ItemDef[] = [];
  let starsEarned = 0;

  // Re-fetch store reference for all mutating action calls. Zustand actions
  // are stable on the singleton, but re-fetching avoids any future drift if
  // middleware (e.g., immer) is added.
  const store = useSaveState.getState();

  if (info.reward.kind === 'item') {
    // Common items (days 1-3, 5-6) — real level-gating applies so that any
    // future common item with minLevel > 1 is correctly filtered.
    const rewardRarity = info.reward.rarity;
    for (let i = 0; i < info.reward.qty; i++) {
      const pool = ITEM_REGISTRY.filter((item) => item.rarity === rewardRarity);
      const item = rollDrop({ pool, level: heroLevel, rng });
      if (!item) continue;
      itemsMinted.push(item);
      const instance: InventoryItem = {
        instanceId: genInstanceId(),
        itemId: item.id,
        acquiredAt: Date.now(),
      };
      store.addInventoryItem(instance);
    }
  } else if (info.reward.kind === 'stars') {
    starsEarned = info.reward.amount;
    store.addBattleStars(starsEarned);
  } else {
    // 'mixed' (day 7) — rare item + stars bonus. Rare items have minLevel: 2
    // but day-7 reward must always succeed for level-1 players, so we bypass
    // minLevel gating using GUARANTEED_LEVEL for this single slot only.
    const rewardRarity = info.reward.rarity;
    const pool = ITEM_REGISTRY.filter((item) => item.rarity === rewardRarity);
    const item = rollDrop({ pool, level: GUARANTEED_LEVEL, rng });
    if (item) {
      itemsMinted.push(item);
      const instance: InventoryItem = {
        instanceId: genInstanceId(),
        itemId: item.id,
        acquiredAt: Date.now(),
      };
      store.addInventoryItem(instance);
    }
    starsEarned = info.reward.starsBonus;
    store.addBattleStars(starsEarned);
  }

  store.commitLoginClaim(dailyAnchor(now), info.newStreak);

  eventBus.emit('LOGIN_CLAIMED', {
    dayOfCycle: info.todayDayOfCycle,
    streak: info.newStreak,
    items: itemsMinted.map((i) => i.id),
  });

  return {
    dayOfCycle: info.todayDayOfCycle,
    streak: info.newStreak,
    itemsMinted,
    starsEarned,
  };
}

function genInstanceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
