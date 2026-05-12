import { describe, it, expect } from 'vitest';
import {
  needsShopRefresh,
  rollStock,
  validatePurchase,
  SHOP_CYCLE_LIMITS,
  SHOP_SLOTS_PER_CYCLE,
} from './ShopEngine';
import { dailyAnchor } from './QuestCycle';
import { SHOP_CATALOG } from '@/data/staticConfig/shopCatalog';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 4, 12, 10, 0, 0);

describe('needsShopRefresh', () => {
  it('returns true when never refreshed (refreshedAt=0)', () => {
    expect(needsShopRefresh(0, NOW)).toBe(true);
  });

  it('returns false when same-day', () => {
    expect(needsShopRefresh(dailyAnchor(NOW), NOW)).toBe(false);
  });

  it('returns true after cross-day boundary', () => {
    const yesterday = dailyAnchor(NOW) - DAY_MS;
    expect(needsShopRefresh(yesterday, NOW)).toBe(true);
  });
});

describe('SHOP_CYCLE_LIMITS', () => {
  it('is 3 common / 1 rare / 1 epic per Q3', () => {
    expect(SHOP_CYCLE_LIMITS.common).toBe(3);
    expect(SHOP_CYCLE_LIMITS.rare).toBe(1);
    expect(SHOP_CYCLE_LIMITS.epic).toBe(1);
  });

  it('SHOP_SLOTS_PER_CYCLE = 5 (sum)', () => {
    expect(SHOP_SLOTS_PER_CYCLE).toBe(5);
  });
});

describe('rollStock', () => {
  it('returns 5 total slots (3+1+1)', () => {
    const stock = rollStock(NOW, () => 0.5);
    expect(stock.length).toBe(5);
  });

  it('all slots start with stockRemaining=1 and cycleLimit=1', () => {
    const stock = rollStock(NOW, () => 0.5);
    for (const slot of stock) {
      expect(slot.stockRemaining).toBe(1);
      expect(slot.cycleLimit).toBe(1);
    }
  });

  it('slot rarities sum to 3 common + 1 rare + 1 epic', () => {
    const stock = rollStock(NOW, () => 0.5);
    let common = 0,
      rare = 0,
      epic = 0;
    for (const slot of stock) {
      const entry = SHOP_CATALOG.find((e) => e.itemId === slot.itemId);
      if (entry?.rarity === 'common') common++;
      else if (entry?.rarity === 'rare') rare++;
      else if (entry?.rarity === 'epic') epic++;
    }
    expect(common).toBe(3);
    expect(rare).toBe(1);
    expect(epic).toBe(1);
  });

  it('priceBattleStars matches catalog basePrice', () => {
    const stock = rollStock(NOW, () => 0.5);
    for (const slot of stock) {
      const entry = SHOP_CATALOG.find((e) => e.itemId === slot.itemId);
      expect(slot.priceBattleStars).toBe(entry?.basePrice);
    }
  });
});

describe('validatePurchase', () => {
  const slot = {
    itemId: 'hat-apprentice-01',
    priceBattleStars: 30,
    stockRemaining: 1,
    cycleLimit: 1,
  };

  it('ok when in stock + sufficient stars', () => {
    expect(validatePurchase(slot, 100)).toEqual({ ok: true });
  });

  it('fails not_in_stock when slot is null', () => {
    expect(validatePurchase(null, 100)).toEqual({ ok: false, reason: 'not_in_stock' });
  });

  it('fails stock_exhausted when remaining=0', () => {
    expect(validatePurchase({ ...slot, stockRemaining: 0 }, 100)).toEqual({
      ok: false,
      reason: 'stock_exhausted',
    });
  });

  it('fails insufficient_stars when balance < price', () => {
    expect(validatePurchase(slot, 10)).toEqual({ ok: false, reason: 'insufficient_stars' });
  });
});
