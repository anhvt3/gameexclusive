import { describe, it, expect } from 'vitest';
import { SHOP_CATALOG } from './shopCatalog';
import { ITEM_REGISTRY } from './items';

describe('SHOP_CATALOG', () => {
  it('has at least 10 entries (covers full registry)', () => {
    expect(SHOP_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(SHOP_CATALOG.length).toBeLessThanOrEqual(15);
  });

  it('every itemId resolves to a real ItemDef', () => {
    for (const entry of SHOP_CATALOG) {
      const exists = ITEM_REGISTRY.some((i) => i.id === entry.itemId);
      expect(exists, `itemId "${entry.itemId}" not in ITEM_REGISTRY`).toBe(true);
    }
  });

  it('common prices are 25-50 stars (Q2)', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'common')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(25);
      expect(e.basePrice).toBeLessThanOrEqual(50);
    }
  });

  it('rare prices are 100-200 stars (Q2)', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'rare')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(100);
      expect(e.basePrice).toBeLessThanOrEqual(200);
    }
  });

  it('epic prices are 400-600 stars (Q2)', () => {
    for (const e of SHOP_CATALOG.filter((e) => e.rarity === 'epic')) {
      expect(e.basePrice).toBeGreaterThanOrEqual(400);
      expect(e.basePrice).toBeLessThanOrEqual(600);
    }
  });

  it('has at least 3 common + 1 rare + 1 epic entries (cycle limits)', () => {
    const common = SHOP_CATALOG.filter((e) => e.rarity === 'common').length;
    const rare = SHOP_CATALOG.filter((e) => e.rarity === 'rare').length;
    const epic = SHOP_CATALOG.filter((e) => e.rarity === 'epic').length;
    expect(common).toBeGreaterThanOrEqual(3);
    expect(rare).toBeGreaterThanOrEqual(1);
    expect(epic).toBeGreaterThanOrEqual(1);
  });

  it('all itemIds are unique', () => {
    const ids = SHOP_CATALOG.map((e) => e.itemId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('rarity matches ITEM_REGISTRY rarity', () => {
    for (const e of SHOP_CATALOG) {
      const def = ITEM_REGISTRY.find((i) => i.id === e.itemId)!;
      expect(def.rarity).toBe(e.rarity);
    }
  });
});
