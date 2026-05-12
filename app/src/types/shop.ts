/**
 * Phase 3 — Shop types (AP §11.10).
 *
 * Pure types — no logic. Consumed by Tasks 2-15.
 */

import type { ItemRarity } from '@/types/item';

export type ItemId = string;

export interface ShopItemSlot {
  readonly itemId: ItemId;
  readonly priceBattleStars: number;
  stockRemaining: number;
  readonly cycleLimit: number;
}

export interface ShopCatalogEntry {
  readonly itemId: ItemId;
  readonly rarity: ItemRarity;
  readonly basePrice: number;
}

export type ShopPurchaseFailureReason =
  | 'not_in_stock'
  | 'stock_exhausted'
  | 'insufficient_stars'
  | 'server_hmac_mismatch'
  | 'server_bad_nonce'
  | 'server_fetch_failed_soft_allow';
