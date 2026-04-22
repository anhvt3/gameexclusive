/**
 * Item registry — AP v1.1 §11.1 / ISP Step 22.7 / Appendix H.
 *
 * Phase 1 ships 10 starter items (3 hats, 3 outfits, 3 wands, 1 boots)
 * aligned with the Nano Banana Pro prompts in Appendix H. Each entry's
 * `iconKey` / `spriteKey` / `spritePath` follow the Appendix H naming
 * convention so Phase 2 asset delivery drops straight in.
 *
 * `modifiers` are copied verbatim from Appendix H hints. See
 * docs/appendix_E_task_classification_examples.md for the review gate
 * required to edit this registry (Type B for new items, Type C for
 * modifier-kind extensions).
 */

import type { EquipmentSlot, ItemModifier, ItemRarity } from '@/types/item';

export interface ItemDef {
  id: string;
  slot: EquipmentSlot;
  displayNameVi: string;
  rarity: ItemRarity;
  iconKey: string;
  spriteKey: string;
  iconPath: string;
  spritePath: string;
  modifiers: readonly ItemModifier[];
  drop_weight: number;
  minLevel: number;
}

export const ITEM_REGISTRY: readonly ItemDef[] = [
  // --- Hats ------------------------------------------------------------
  {
    id: 'hat-apprentice-01',
    slot: 'hat',
    displayNameVi: 'Nón Học Việc',
    rarity: 'common',
    iconKey: 'item_hat_apprentice_01_icon',
    spriteKey: 'item_hat_apprentice_01_sprite',
    iconPath: '/assets/items/hat/hat-apprentice-01_icon.png',
    spritePath: '/assets/items/hat/hat-apprentice-01_sprite.png',
    modifiers: [{ kind: 'expGain', pct: 2 }],
    drop_weight: 10,
    minLevel: 1,
  },
  {
    id: 'hat-fire-01',
    slot: 'hat',
    displayNameVi: 'Nón Phù Thủy Lửa',
    rarity: 'rare',
    iconKey: 'item_hat_fire_01_icon',
    spriteKey: 'item_hat_fire_01_sprite',
    iconPath: '/assets/items/hat/hat-fire-01_icon.png',
    spritePath: '/assets/items/hat/hat-fire-01_sprite.png',
    modifiers: [{ kind: 'spellDamage', element: 'Fire', pct: 5 }],
    drop_weight: 4,
    minLevel: 2,
  },
  {
    id: 'hat-storm-01',
    slot: 'hat',
    displayNameVi: 'Nón Hiền Triết Bão',
    rarity: 'epic',
    iconKey: 'item_hat_storm_01_icon',
    spriteKey: 'item_hat_storm_01_sprite',
    iconPath: '/assets/items/hat/hat-storm-01_icon.png',
    spritePath: '/assets/items/hat/hat-storm-01_sprite.png',
    modifiers: [{ kind: 'critChance', pct: 4 }],
    drop_weight: 2,
    minLevel: 4,
  },

  // --- Outfits ---------------------------------------------------------
  {
    id: 'outfit-apprentice-01',
    slot: 'outfit',
    displayNameVi: 'Áo Học Việc',
    rarity: 'common',
    iconKey: 'item_outfit_apprentice_01_icon',
    spriteKey: 'item_outfit_apprentice_01_sprite',
    iconPath: '/assets/items/outfit/outfit-apprentice-01_icon.png',
    spritePath: '/assets/items/outfit/outfit-apprentice-01_sprite.png',
    modifiers: [{ kind: 'maxHp', delta: 5 }],
    drop_weight: 10,
    minLevel: 1,
  },
  {
    id: 'outfit-fire-01',
    slot: 'outfit',
    displayNameVi: 'Áo Choàng Hỏa Pháp',
    rarity: 'rare',
    iconKey: 'item_outfit_fire_01_icon',
    spriteKey: 'item_outfit_fire_01_sprite',
    iconPath: '/assets/items/outfit/outfit-fire-01_icon.png',
    spritePath: '/assets/items/outfit/outfit-fire-01_sprite.png',
    modifiers: [
      { kind: 'maxHp', delta: 8 },
      { kind: 'spellDamage', element: 'Fire', pct: 3 },
    ],
    drop_weight: 4,
    minLevel: 2,
  },
  {
    id: 'outfit-ice-01',
    slot: 'outfit',
    displayNameVi: 'Áo Choàng Hộ Băng',
    rarity: 'epic',
    iconKey: 'item_outfit_ice_01_icon',
    spriteKey: 'item_outfit_ice_01_sprite',
    iconPath: '/assets/items/outfit/outfit-ice-01_icon.png',
    spritePath: '/assets/items/outfit/outfit-ice-01_sprite.png',
    modifiers: [
      { kind: 'maxHp', delta: 12 },
      { kind: 'spellDamage', element: 'Ice', pct: 5 },
    ],
    drop_weight: 2,
    minLevel: 4,
  },

  // --- Wands -----------------------------------------------------------
  {
    id: 'wand-apprentice-01',
    slot: 'wand',
    displayNameVi: 'Đũa Phép Học Việc',
    rarity: 'common',
    iconKey: 'item_wand_apprentice_01_icon',
    spriteKey: 'item_wand_apprentice_01_sprite',
    iconPath: '/assets/items/wand/wand-apprentice-01_icon.png',
    spritePath: '/assets/items/wand/wand-apprentice-01_sprite.png',
    modifiers: [{ kind: 'spellDamage', element: 'Astral', pct: 2 }],
    drop_weight: 10,
    minLevel: 1,
  },
  {
    id: 'wand-fire-01',
    slot: 'wand',
    displayNameVi: 'Đũa Hỏa Tinh',
    rarity: 'rare',
    iconKey: 'item_wand_fire_01_icon',
    spriteKey: 'item_wand_fire_01_sprite',
    iconPath: '/assets/items/wand/wand-fire-01_icon.png',
    spritePath: '/assets/items/wand/wand-fire-01_sprite.png',
    modifiers: [{ kind: 'spellDamage', element: 'Fire', pct: 10 }],
    drop_weight: 3,
    minLevel: 2,
  },
  {
    id: 'wand-plant-01',
    slot: 'wand',
    displayNameVi: 'Đũa Thảo Linh',
    rarity: 'rare',
    iconKey: 'item_wand_plant_01_icon',
    spriteKey: 'item_wand_plant_01_sprite',
    iconPath: '/assets/items/wand/wand-plant-01_icon.png',
    spritePath: '/assets/items/wand/wand-plant-01_sprite.png',
    modifiers: [{ kind: 'spellDamage', element: 'Plant', pct: 10 }],
    drop_weight: 3,
    minLevel: 2,
  },

  // --- Boots -----------------------------------------------------------
  {
    id: 'shoes-apprentice-01',
    slot: 'shoes',
    displayNameVi: 'Giày Học Việc',
    rarity: 'common',
    iconKey: 'item_shoes_apprentice_01_icon',
    spriteKey: 'item_shoes_apprentice_01_sprite',
    iconPath: '/assets/items/shoes/shoes-apprentice-01_icon.png',
    spritePath: '/assets/items/shoes/shoes-apprentice-01_sprite.png',
    modifiers: [{ kind: 'expGain', pct: 3 }],
    drop_weight: 10,
    minLevel: 1,
  },
];

const BY_ID = new Map(ITEM_REGISTRY.map((i) => [i.id, i]));

export function findItemDef(itemId: string): ItemDef | undefined {
  return BY_ID.get(itemId);
}
