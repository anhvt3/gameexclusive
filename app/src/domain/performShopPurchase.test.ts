// app/src/domain/performShopPurchase.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performShopPurchase } from './performShopPurchase';
import { useSaveState } from '@/persistence/SaveStateStore';
import { eventBus } from '@/bus/EventBus';

describe('performShopPurchase', () => {
  beforeEach(() => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    useSaveState.getState().addBattleStars(1000);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as never);
  });

  it('happy path: mints item, debits stars, emits SHOP_PURCHASE_COMPLETED', async () => {
    const slot = useSaveState.getState().shopStock[0]!;
    const received: unknown[] = [];
    const off = eventBus.on('SHOP_PURCHASE_COMPLETED', (p) => received.push(p));
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().inventory.length).toBe(1);
    expect(useSaveState.getState().battleStars).toBe(1000 - slot.priceBattleStars);
    expect(received).toHaveLength(1);
    off();
  });

  it('returns insufficient_stars when balance < price', async () => {
    useSaveState.getState().reset();
    useSaveState.getState().refreshShopStockIfNeeded(Date.now());
    const slot = useSaveState.getState().shopStock[0]!;
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_stars');
  });

  it('returns not_in_stock for unknown itemId', async () => {
    const result = await performShopPurchase('does-not-exist');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_in_stock');
  });

  it('returns stock_exhausted on second buy of same item', async () => {
    const slot = useSaveState.getState().shopStock[0]!;
    await performShopPurchase(slot.itemId);
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('stock_exhausted');
  });

  it('aborts on server HMAC mismatch (no mutation)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, reason: 'hmac_mismatch' }),
    } as never);
    const slot = useSaveState.getState().shopStock[0]!;
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('server_');
    expect(useSaveState.getState().inventory.length).toBe(0);
    expect(useSaveState.getState().battleStars).toBe(1000);
  });

  it('soft-fails through on network error (still mutates)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slot = useSaveState.getState().shopStock[0]!;
    const result = await performShopPurchase(slot.itemId);
    expect(result.ok).toBe(true);
    expect(useSaveState.getState().inventory.length).toBe(1);
  });
});
