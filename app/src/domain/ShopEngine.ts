/**
 * Phase 3 — Shop engine (AP §11.10, Q1+Q3 defaults).
 *
 * Pure functions. State mutations live in SaveState actions
 * (refreshShopStockIfNeeded, applyShopPurchase) — which use an
 * inline copy of rollStock to avoid circular import. This file is
 * for external consumers (performShopPurchase orchestration).
 */

import { dailyAnchor } from './QuestCycle';
import { SHOP_CATALOG } from '@/data/staticConfig/shopCatalog';
import type { ShopCatalogEntry, ShopItemSlot, ShopPurchaseFailureReason } from '@/types/shop';

export const SHOP_CYCLE_LIMITS = { common: 3, rare: 1, epic: 1 } as const;
export const SHOP_SLOTS_PER_CYCLE =
  SHOP_CYCLE_LIMITS.common + SHOP_CYCLE_LIMITS.rare + SHOP_CYCLE_LIMITS.epic; // 5

/**
 * True when refreshedAt is from a previous UTC+7 calendar day,
 * or refreshedAt = 0 (never refreshed).
 */
export function needsShopRefresh(refreshedAt: number, now: number): boolean {
  return dailyAnchor(now) > refreshedAt;
}

/**
 * Sample without replacement — shuffle array and take first n.
 * Used by rollStock to pick random items from rarity pools.
 */
function sampleWithoutReplacement<T>(pool: readonly T[], n: number, rng: () => number): T[] {
  if (n >= pool.length) return [...pool];
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Roll a fresh shop stock (5 slots: 3 common + 1 rare + 1 epic).
 * Each slot starts with stockRemaining=1, cycleLimit=1.
 * priceBattleStars pulled from SHOP_CATALOG basePrice.
 *
 * @param _now — unused, for consistency with other refresh functions
 * @param rng — PRNG for deterministic testing; defaults Math.random
 */
export function rollStock(_now: number, rng: () => number = Math.random): ShopItemSlot[] {
  const slots: ShopItemSlot[] = [];
  for (const rarity of ['common', 'rare', 'epic'] as const) {
    const pool: ShopCatalogEntry[] = SHOP_CATALOG.filter((e) => e.rarity === rarity);
    const picks = sampleWithoutReplacement(pool, SHOP_CYCLE_LIMITS[rarity], rng);
    for (const entry of picks) {
      slots.push({
        itemId: entry.itemId,
        priceBattleStars: entry.basePrice,
        stockRemaining: 1,
        cycleLimit: 1,
      });
    }
  }
  return slots;
}

/**
 * Result of a purchase validation check.
 */
export interface PurchaseValidation {
  ok: boolean;
  reason?: ShopPurchaseFailureReason;
}

/**
 * Validate a purchase against a slot and available battle stars.
 *
 * @param slot — slot from shop stock, or null if not found
 * @param battleStars — player's current balance
 * @returns { ok: true } if purchase is allowed, or { ok: false, reason: "..." } otherwise
 */
export function validatePurchase(
  slot: ShopItemSlot | null,
  battleStars: number
): PurchaseValidation {
  if (!slot) return { ok: false, reason: 'not_in_stock' };
  if (slot.stockRemaining <= 0) return { ok: false, reason: 'stock_exhausted' };
  if (battleStars < slot.priceBattleStars) return { ok: false, reason: 'insufficient_stars' };
  return { ok: true };
}
