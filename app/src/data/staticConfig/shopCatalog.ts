import type { ShopCatalogEntry } from '@/types/shop';

/**
 * Phase 3 — Shop catalog (AP §11.10, Q2 pricing tiers).
 *
 * Covers all 10 ITEM_REGISTRY entries. ShopEngine.rollStock samples
 * 3 common + 1 rare + 1 epic per UTC+7 cycle (Q1+Q3 hard caps).
 */
export const SHOP_CATALOG: ReadonlyArray<ShopCatalogEntry> = [
  // ── common (25-50 stars) ──
  { itemId: 'hat-apprentice-01', rarity: 'common', basePrice: 30 },
  { itemId: 'outfit-apprentice-01', rarity: 'common', basePrice: 40 },
  { itemId: 'wand-apprentice-01', rarity: 'common', basePrice: 35 },
  { itemId: 'shoes-apprentice-01', rarity: 'common', basePrice: 25 },

  // ── rare (100-200 stars) ──
  { itemId: 'hat-fire-01', rarity: 'rare', basePrice: 150 },
  { itemId: 'outfit-fire-01', rarity: 'rare', basePrice: 180 },
  { itemId: 'wand-fire-01', rarity: 'rare', basePrice: 200 },
  { itemId: 'wand-plant-01', rarity: 'rare', basePrice: 170 },

  // ── epic (400-600 stars) ──
  { itemId: 'hat-storm-01', rarity: 'epic', basePrice: 500 },
  { itemId: 'outfit-ice-01', rarity: 'epic', basePrice: 600 },
];
