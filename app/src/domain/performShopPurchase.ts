// app/src/domain/performShopPurchase.ts

import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';
import { validatePurchase } from './ShopEngine';
import { validateAction } from './ServerValidator';
import { ITEM_REGISTRY } from '@/data/staticConfig/items';
import type { ItemDef } from '@/data/staticConfig/items';
import type { ShopPurchaseFailureReason } from '@/types/shop';

export type ShopPurchaseResult =
  | { ok: true; itemMinted: ItemDef; priceCharged: number }
  | { ok: false; reason: ShopPurchaseFailureReason };

/**
 * Phase 3 — Shop purchase orchestration.
 *
 * Validates → server-validates → atomically mints item via
 * SaveState.applyShopPurchase → emits SHOP_PURCHASE_COMPLETED.
 *
 * Soft-fail policy: if ServerValidator returns `fetch_failed_soft_allow`
 * the purchase still completes (advisory validation only).
 */
export async function performShopPurchase(itemId: string): Promise<ShopPurchaseResult> {
  const state = useSaveState.getState();
  const slot = state.shopStock.find((s) => s.itemId === itemId) ?? null;
  const validation = validatePurchase(slot, state.battleStars);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason! };
  }

  const server = await validateAction('/api/shop/validate', {
    itemId,
    price: slot!.priceBattleStars,
  });
  if (!server.ok) {
    return { ok: false, reason: `server_${server.reason}` as ShopPurchaseFailureReason };
  }

  useSaveState.getState().applyShopPurchase(itemId, slot!.priceBattleStars);

  const itemDef = ITEM_REGISTRY.find((i) => i.id === itemId)!;
  const remainingAfter =
    useSaveState.getState().shopStock.find((s) => s.itemId === itemId)?.stockRemaining ?? 0;
  eventBus.emit('SHOP_PURCHASE_COMPLETED', {
    itemId,
    priceCharged: slot!.priceBattleStars,
    stockRemaining: remainingAfter,
  });

  return { ok: true, itemMinted: itemDef, priceCharged: slot!.priceBattleStars };
}
